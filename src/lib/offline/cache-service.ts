/**
 * Cache Service - manages caching of Supabase data to IndexedDB
 */

import { supabase } from '@/integrations/supabase/client';
import { offlineDb } from './db';
import { pwaLogger } from './debug-logger';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

type TableName = 'ordens_servico' | 'clientes' | 'checklists' | 'garantias' | 'transacoes' | 'caixa_diario';

class CacheService {
  // Fetch and cache data from Supabase
  async fetchAndCache<T>(
    table: TableName,
    query?: (q: any) => any
  ): Promise<T[]> {
    const isOnline = navigator.onLine;

    if (isOnline) {
      try {
        let supabaseQuery = supabase.from(table as any).select('*');
        
        if (query) {
          supabaseQuery = query(supabaseQuery);
        }

        const { data, error } = await supabaseQuery;

        if (error) throw error;

        // Cache the data
        if (data && data.length > 0) {
          await this.cacheData(table, data);
        }

        return (data || []) as T[];
      } catch (error) {
        pwaLogger.error('CACHE', `Error fetching ${table}`, error);
        // Fall back to cache
        return await this.getFromCache<T>(table);
      }
    } else {
      // Offline - return cached data
      pwaLogger.logCacheEvent(`Offline - returning cached data for ${table}`);
      return await this.getFromCache<T>(table);
    }
  }

  // Cache data to IndexedDB
  private async cacheData(table: TableName, data: any[]): Promise<void> {
    const tableRef = offlineDb.table(table);
    
    // Use bulkPut to update or insert
    await tableRef.bulkPut(data);

    // Update cache timestamp
    await offlineDb.cached_lookups.put({
      key: table,
      table,
      data: [],
      cachedAt: Date.now()
    });

    pwaLogger.logCacheEvent(`Cached ${data.length} items for ${table}`);
  }

  // Get data from IndexedDB cache
  async getFromCache<T>(table: TableName): Promise<T[]> {
    const tableRef = offlineDb.table(table);
    const data = await tableRef.toArray();
    pwaLogger.logCacheEvent(`Retrieved ${data.length} items from cache for ${table}`);
    return data as T[];
  }

  // Get single item from cache
  async getFromCacheById<T>(table: TableName, id: string): Promise<T | undefined> {
    const tableRef = offlineDb.table(table);
    return await tableRef.get(id) as T | undefined;
  }

  // Check if cache is stale
  async isCacheStale(table: TableName): Promise<boolean> {
    const lookup = await offlineDb.cached_lookups.get(table);
    if (!lookup) return true;
    return Date.now() - lookup.cachedAt > CACHE_DURATION;
  }

  // Refresh cache if stale
  async refreshIfStale<T>(table: TableName, query?: (q: any) => any): Promise<T[]> {
    const isStale = await this.isCacheStale(table);
    if (isStale && navigator.onLine) {
      return await this.fetchAndCache<T>(table, query);
    }
    return await this.getFromCache<T>(table);
  }

  // Save item locally and queue for sync
  async saveLocally(
    table: TableName,
    data: any,
    isNew: boolean = true
  ): Promise<any> {
    const tableRef = offlineDb.table(table);
    
    if (isNew) {
      // New record
      const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const record = {
        ...data,
        id: localId,
        localId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await tableRef.put(record);
      return record;
    } else {
      // Update existing
      const record = {
        ...data,
        updated_at: new Date().toISOString()
      };
      
      await tableRef.put(record);
      return record;
    }
  }

  // Delete item locally
  async deleteLocally(table: TableName, id: string): Promise<void> {
    const tableRef = offlineDb.table(table);
    await tableRef.delete(id);
  }

  // Get cached lookups (marcas, modelos, categorias)
  async getLookupData(table: string): Promise<any[]> {
    const lookup = await offlineDb.cached_lookups.get(table);
    return lookup?.data || [];
  }

  // Cache lookup data
  async cacheLookupData(table: string, data: any[]): Promise<void> {
    await offlineDb.cached_lookups.put({
      key: table,
      table,
      data,
      cachedAt: Date.now()
    });
  }
}

export const cacheService = new CacheService();
