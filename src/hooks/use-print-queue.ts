/**
 * Hook para gerenciar fila de impressão local
 * Mantém histórico dos últimos 3 jobs de impressão
 */

import { useState, useCallback, useEffect } from 'react';

export type PrintQueueStatus = 'pending' | 'printing' | 'success' | 'error';

export interface PrintQueueItem {
  id: string;
  documentType: 'ordem' | 'checklist' | 'recibo';
  documentNumber?: number;
  status: PrintQueueStatus;
  timestamp: number;
  error?: string;
}

const MAX_QUEUE_SIZE = 3;

/**
 * Hook para gerenciar fila de impressão
 */
export function usePrintQueue() {
  const [queue, setQueue] = useState<PrintQueueItem[]>([]);

  // Carrega fila do localStorage
  useEffect(() => {
    const stored = localStorage.getItem('print_queue');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setQueue(parsed);
      } catch (error) {
        console.error('[PrintQueue] Erro ao carregar fila:', error);
      }
    }
  }, []);

  // Salva fila no localStorage
  useEffect(() => {
    if (queue.length > 0) {
      localStorage.setItem('print_queue', JSON.stringify(queue));
    }
  }, [queue]);

  /**
   * Adiciona item à fila
   */
  const addToQueue = useCallback((item: Omit<PrintQueueItem, 'id' | 'timestamp' | 'status'>) => {
    const newItem: PrintQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      status: 'pending',
    };

    setQueue(prev => {
      const updated = [newItem, ...prev];
      // Mantém apenas os últimos 3
      return updated.slice(0, MAX_QUEUE_SIZE);
    });

    return newItem.id;
  }, []);

  /**
   * Atualiza status de um item
   */
  const updateStatus = useCallback((id: string, status: PrintQueueStatus, error?: string) => {
    setQueue(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, status, error }
          : item
      )
    );
  }, []);

  /**
   * Remove item da fila
   */
  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  /**
   * Limpa itens concluídos ou com erro
   */
  const clearCompleted = useCallback(() => {
    setQueue(prev => 
      prev.filter(item => 
        item.status === 'pending' || item.status === 'printing'
      )
    );
  }, []);

  /**
   * Limpa toda a fila
   */
  const clearAll = useCallback(() => {
    setQueue([]);
    localStorage.removeItem('print_queue');
  }, []);

  return {
    queue,
    addToQueue,
    updateStatus,
    removeFromQueue,
    clearCompleted,
    clearAll,
  };
}
