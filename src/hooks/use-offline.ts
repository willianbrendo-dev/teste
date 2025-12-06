/**
 * Hook for offline functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { syncService, SyncStatus } from '@/lib/offline/sync-service';
import { cacheService } from '@/lib/offline/cache-service';
import { offlineDb, isLocalId } from '@/lib/offline/db';
import { pwaLogger, getConnectionInfo } from '@/lib/offline/debug-logger';
import { toast } from 'sonner';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      pwaLogger.logOfflineEvent('Connection restored', getConnectionInfo());
      toast.success('Conexão restaurada', {
        description: 'Sincronizando alterações...'
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      pwaLogger.logOfflineEvent('Connection lost', getConnectionInfo());
      toast.warning('Você está offline', {
        description: 'Os dados serão salvos localmente'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Setup sync service callbacks
    syncService.setCallbacks({
      onStatusChange: (status) => {
        setSyncStatus(status);
        pwaLogger.logSyncEvent('Status changed', { status });
      },
      onSyncComplete: async (synced, failed) => {
        pwaLogger.logSyncEvent('Sync complete', { synced, failed });
        const count = await syncService.getPendingCount();
        setPendingCount(count);
        
        if (synced > 0 && failed === 0) {
          toast.success(`${synced} alteração(ões) sincronizada(s)`);
        } else if (failed > 0) {
          toast.error(`Erro ao sincronizar ${failed} item(ns)`);
        }
      }
    });

    // Start periodic sync
    syncService.startPeriodicSync(30000);

    // Initial pending count
    syncService.getPendingCount().then(count => {
      setPendingCount(count);
      pwaLogger.logSyncEvent('Initial pending count', { count });
    });

    // Log initial state
    pwaLogger.logOfflineEvent('Hook initialized', {
      online: navigator.onLine,
      ...getConnectionInfo()
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      syncService.stopPeriodicSync();
    };
  }, []);

  const forceSync = useCallback(async () => {
    if (isOnline) {
      pwaLogger.logSyncEvent('Force sync triggered');
      const result = await syncService.sync();
      const count = await syncService.getPendingCount();
      setPendingCount(count);
      return result;
    }
    return { synced: 0, failed: 0 };
  }, [isOnline]);

  return {
    isOnline,
    syncStatus,
    pendingCount,
    forceSync
  };
}

// Hook for offline-aware data fetching
export function useOfflineData<T>(
  table: 'ordens_servico' | 'clientes' | 'checklists' | 'garantias' | 'transacoes' | 'caixa_diario',
  queryFn?: (q: any) => any,
  deps: any[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isOnline } = useOffline();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await cacheService.fetchAndCache<T>(table, queryFn);
      setData(result);
    } catch (err) {
      console.error(`[useOfflineData] Error fetching ${table}:`, err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      // Try to get from cache
      const cached = await cacheService.getFromCache<T>(table);
      setData(cached);
    } finally {
      setLoading(false);
    }
  }, [table, ...deps]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveItem = useCallback(async (item: Partial<T>, isNew: boolean = true): Promise<T> => {
    const saved = await cacheService.saveLocally(table, item, isNew);
    
    // Add to sync queue
    await syncService.addToQueue(
      table,
      isNew ? 'insert' : 'update',
      saved,
      saved.localId,
      isNew ? undefined : saved.id
    );

    // Update local state
    setData(prev => {
      if (isNew) {
        return [saved, ...prev];
      }
      return prev.map(i => (i as any).id === saved.id ? saved : i);
    });

    return saved as T;
  }, [table]);

  const deleteItem = useCallback(async (id: string) => {
    await cacheService.deleteLocally(table, id);
    
    // Only add to sync queue if it's not a local-only record
    if (!isLocalId(id)) {
      await syncService.addToQueue(table, 'delete', { id }, id, id);
    }

    // Update local state
    setData(prev => prev.filter(i => (i as any).id !== id));
  }, [table]);

  return {
    data,
    loading,
    error,
    isOnline,
    refetch: fetchData,
    saveItem,
    deleteItem
  };
}
