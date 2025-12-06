/**
 * Sync Service - manages synchronization between IndexedDB and Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import { offlineDb, SyncQueueItem, isLocalId, generateLocalId } from './db';
import { pwaLogger } from './debug-logger';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

interface SyncCallbacks {
  onStatusChange?: (status: SyncStatus) => void;
  onSyncComplete?: (synced: number, failed: number) => void;
  onConflict?: (item: SyncQueueItem) => void;
}

class SyncService {
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private callbacks: SyncCallbacks = {};
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    window.addEventListener('online', () => {
      pwaLogger.logOfflineEvent('Back online - initiating sync');
      this.isOnline = true;
      this.sync();
    });

    window.addEventListener('offline', () => {
      pwaLogger.logOfflineEvent('Gone offline - data will be saved locally');
      this.isOnline = false;
      this.callbacks.onStatusChange?.('offline');
    });
  }

  setCallbacks(callbacks: SyncCallbacks) {
    this.callbacks = callbacks;
  }

  getIsOnline(): boolean {
    return this.isOnline;
  }

  // Start periodic sync
  startPeriodicSync(intervalMs: number = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync();
      }
    }, intervalMs);
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Add item to sync queue
  async addToQueue(
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: any,
    localId?: string,
    remoteId?: string
  ): Promise<void> {
    const item: SyncQueueItem = {
      table,
      operation,
      data,
      localId: localId || generateLocalId(),
      remoteId,
      createdAt: Date.now(),
      attempts: 0
    };

    await offlineDb.sync_queue.add(item);
    pwaLogger.logSyncEvent('Added to queue', { table, operation, localId: item.localId });

    // Try immediate sync if online
    if (this.isOnline && !this.isSyncing) {
      this.sync();
    }
  }

  // Get pending sync count
  async getPendingCount(): Promise<number> {
    return await offlineDb.sync_queue.count();
  }

  // Main sync function
  async sync(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline || this.isSyncing) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.callbacks.onStatusChange?.('syncing');

    let synced = 0;
    let failed = 0;

    try {
      const items = await offlineDb.sync_queue.orderBy('createdAt').toArray();
      
      pwaLogger.logSyncEvent('Starting sync', { pendingItems: items.length });

      for (const item of items) {
        try {
          const success = await this.syncItem(item);
          if (success) {
            await offlineDb.sync_queue.delete(item.id!);
            synced++;
            pwaLogger.logSyncEvent('Item synced successfully', { table: item.table, operation: item.operation });
          } else {
            failed++;
            pwaLogger.warn('SYNC', 'Item sync returned false', { table: item.table });
          }
        } catch (error) {
          pwaLogger.error('SYNC', 'Error syncing item', { table: item.table, error: error instanceof Error ? error.message : error });
          await offlineDb.sync_queue.update(item.id!, {
            attempts: item.attempts + 1,
            lastError: error instanceof Error ? error.message : 'Unknown error'
          });
          failed++;
        }
      }

      pwaLogger.logSyncEvent('Sync complete', { synced, failed });

      this.callbacks.onStatusChange?.(failed > 0 ? 'error' : 'idle');
      this.callbacks.onSyncComplete?.(synced, failed);
    } catch (error) {
      console.error('[SyncService] Sync error:', error);
      this.callbacks.onStatusChange?.('error');
    } finally {
      this.isSyncing = false;
    }

    return { synced, failed };
  }

  // Sync a single item
  private async syncItem(item: SyncQueueItem): Promise<boolean> {
    const { table, operation, data, localId, remoteId } = item;

    // Map table names to Supabase tables
    const tableMap: Record<string, string> = {
      ordens_servico: 'ordens_servico',
      clientes: 'clientes',
      checklists: 'checklists',
      garantias: 'garantias',
      transacoes: 'transacoes',
      caixa_diario: 'caixa_diario'
    };

    const supabaseTable = tableMap[table];
    if (!supabaseTable) {
      console.error('[SyncService] Unknown table:', table);
      return false;
    }

    // Remove local-only fields
    const cleanData = { ...data };
    delete cleanData.localId;
    
    // If the ID is a local ID, remove it so Supabase generates a new one
    if (isLocalId(cleanData.id)) {
      delete cleanData.id;
    }

    switch (operation) {
      case 'insert': {
        const { data: result, error } = await (supabase
          .from(supabaseTable as any)
          .insert(cleanData)
          .select()
          .single());

        if (error) throw error;

        // Update local record with remote ID
        if (result && localId) {
          await this.updateLocalWithRemoteId(table, localId, (result as any).id);
        }
        return true;
      }

      case 'update': {
        const id = remoteId || cleanData.id;
        if (!id || isLocalId(id)) {
          console.error('[SyncService] Cannot update without remote ID');
          return false;
        }

        const { error } = await (supabase
          .from(supabaseTable as any)
          .update(cleanData)
          .eq('id', id));

        if (error) throw error;
        return true;
      }

      case 'delete': {
        const id = remoteId || cleanData.id;
        if (!id || isLocalId(id)) {
          // If it's a local-only record, just remove it
          return true;
        }

        const { error } = await (supabase
          .from(supabaseTable as any)
          .delete()
          .eq('id', id));

        if (error) throw error;
        return true;
      }

      default:
        return false;
    }
  }

  // Update local record with remote ID after sync
  private async updateLocalWithRemoteId(
    table: string,
    localId: string,
    remoteId: string
  ): Promise<void> {
    const tableRef = offlineDb.table(table);
    const record = await tableRef.where('localId').equals(localId).first();
    
    if (record) {
      await tableRef.delete(record.id);
      await tableRef.put({ ...record, id: remoteId, localId: undefined });
    }
  }

  // Clear all local data (use with caution)
  async clearAllLocalData(): Promise<void> {
    await offlineDb.ordens_servico.clear();
    await offlineDb.clientes.clear();
    await offlineDb.checklists.clear();
    await offlineDb.garantias.clear();
    await offlineDb.transacoes.clear();
    await offlineDb.caixa_diario.clear();
    await offlineDb.sync_queue.clear();
    await offlineDb.cached_lookups.clear();
  }
}

export const syncService = new SyncService();
