/**
 * IndexedDB database for offline storage using Dexie
 */

import Dexie, { Table } from 'dexie';

// Interfaces for offline data
export interface OfflineOrdemServico {
  id: string;
  localId?: string;
  numero?: number;
  cliente_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  // ... other fields
  [key: string]: any;
}

export interface OfflineCliente {
  id: string;
  localId?: string;
  nome: string;
  telefone?: string;
  email?: string;
  cpf?: string;
  endereco?: string;
  bairro?: string;
  apelido?: string;
  created_at: string;
  updated_at: string;
}

export interface OfflineChecklist {
  id: string;
  localId?: string;
  ordem_servico_id: string;
  tipo: string;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface OfflineGarantia {
  id: string;
  localId?: string;
  ordem_servico_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface OfflineTransacao {
  id: string;
  localId?: string;
  tipo: 'receita' | 'despesa';
  valor: number;
  data: string;
  descricao?: string;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface OfflineCaixaDiario {
  id: string;
  localId?: string;
  data: string;
  status: string;
  valor_abertura: number;
  valor_fechamento?: number;
  created_at: string;
  updated_at: string;
  [key: string]: any;
}

export interface SyncQueueItem {
  id?: number;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  localId: string;
  remoteId?: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface CachedLookup {
  key: string;
  table: string;
  data: any[];
  cachedAt: number;
}

class OfflineDatabase extends Dexie {
  ordens_servico!: Table<OfflineOrdemServico, string>;
  clientes!: Table<OfflineCliente, string>;
  checklists!: Table<OfflineChecklist, string>;
  garantias!: Table<OfflineGarantia, string>;
  transacoes!: Table<OfflineTransacao, string>;
  caixa_diario!: Table<OfflineCaixaDiario, string>;
  sync_queue!: Table<SyncQueueItem, number>;
  cached_lookups!: Table<CachedLookup, string>;

  constructor() {
    super('OrderSistemOffline');
    
    this.version(1).stores({
      ordens_servico: 'id, localId, numero, cliente_id, status, created_at',
      clientes: 'id, localId, nome, telefone',
      checklists: 'id, localId, ordem_servico_id, tipo, status',
      garantias: 'id, localId, ordem_servico_id, status',
      transacoes: 'id, localId, tipo, data',
      caixa_diario: 'id, localId, data, status',
      sync_queue: '++id, table, operation, localId, createdAt',
      cached_lookups: 'key, table, cachedAt'
    });
  }
}

export const offlineDb = new OfflineDatabase();

// Helper to generate local IDs
export function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Check if an ID is local (not synced yet)
export function isLocalId(id: string): boolean {
  return id?.startsWith('local_');
}
