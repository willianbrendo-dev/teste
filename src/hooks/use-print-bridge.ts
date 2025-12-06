/**
 * Hook centralizado para impressão via Print Bridge
 * TODA impressão passa pelo Print Bridge - nenhuma impressão direta
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generateOrdemServicoViaEmpresa, generateOrdemServicoViaCliente } from '@/lib/printer/escpos-os-generator';
import { generateChecklistESCPOS } from '@/lib/printer/escpos-checklist-generator';
import { generateWarrantyViaEmpresa, generateWarrantyViaCliente, WarrantyData } from '@/lib/printer/escpos-warranty-generator';
import { escposPrinter } from '@/lib/printer/escpos';

export type PrintBridgeStatus = 'idle' | 'sending' | 'waiting' | 'success' | 'error';

export interface PrintBridgeResult {
  success: boolean;
  jobId?: string;
  error?: string;
}

interface UsePrintBridgeOptions {
  onSuccess?: (jobId: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook centralizado para todas as impressões via Print Bridge
 * Substitui useLocalPrint - toda impressão agora passa pelo Print Bridge
 */
export function usePrintBridge(options?: UsePrintBridgeOptions) {
  const [status, setStatus] = useState<PrintBridgeStatus>('idle');
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Envia dados ESC/POS para o Print Bridge (interno, sem verificação de loading)
   */
  const sendToPrintBridgeInternal = async (
    osId: string,
    escposData: Uint8Array,
    documentType: 'service_order' | 'checklist' | 'receipt' | 'custom' = 'custom',
    description?: string,
    showToast: boolean = true
  ): Promise<PrintBridgeResult> => {
    try {
      setStatus('sending');

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuário não autenticado');
      }

      // Converte para base64
      const base64Data = btoa(
        Array.from(escposData)
          .map(byte => String.fromCharCode(byte))
          .join('')
      );

      console.log('[PrintBridge] Enviando job para backend...');
      console.log('[PrintBridge] Tipo:', documentType);
      console.log('[PrintBridge] Descrição:', description);
      console.log('[PrintBridge] Tamanho:', escposData.length, 'bytes');

      setStatus('waiting');

      const { data, error } = await supabase.functions.invoke('send-print-job', {
        body: {
          userId: user.id,
          osId,
          escposBase64: base64Data,
          documentType,
          metadata: { description }
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setJobId(data.jobId || null);

        if (showToast) {
          toast.success(
            data.queued ? 'Impressão adicionada à fila' : 'Impressão enviada',
            { description: description || `Job ID: ${data.jobId?.slice(0, 8)}...` }
          );
        }

        console.log('[PrintBridge] Job enviado com sucesso:', data.jobId);
        return { success: true, jobId: data.jobId };
      } else {
        throw new Error(data?.error || 'Falha ao enviar impressão');
      }
    } catch (error) {
      console.error('[PrintBridge] Erro:', error);

      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      if (errorMessage.includes('Print Bridge') || errorMessage.includes('dispositivo')) {
        toast.error('Nenhum Print Bridge conectado', {
          description: 'Configure um dispositivo na página Print Bridge',
          duration: 6000,
        });
      } else {
        toast.error('Erro ao enviar impressão', { description: errorMessage });
      }

      return { success: false, error: errorMessage };
    }
  };

  /**
   * Envia dados ESC/POS para o Print Bridge (API pública)
   */
  const sendToPrintBridge = useCallback(async (
    osId: string,
    escposData: Uint8Array,
    documentType: 'service_order' | 'checklist' | 'receipt' | 'custom' = 'custom',
    description?: string
  ): Promise<PrintBridgeResult> => {
    if (loading) {
      console.log('[PrintBridge] Job já está sendo processado, ignorando...');
      return { success: false, error: 'Job em processamento' };
    }

    setLoading(true);
    const result = await sendToPrintBridgeInternal(osId, escposData, documentType, description, true);
    
    if (result.success) {
      setStatus('success');
      options?.onSuccess?.(result.jobId!);
    } else {
      setStatus('error');
      options?.onError?.(new Error(result.error || 'Erro desconhecido'));
    }

    setTimeout(() => {
      setStatus('idle');
      setLoading(false);
      setJobId(null);
    }, 2000);

    return result;
  }, [loading, options]);

  /**
   * Imprime Ordem de Serviço (via empresa + via cliente + checklist)
   * Envia 3 documentos sequencialmente para o Print Bridge
   */
  const printServiceOrder = useCallback(async (ordem: any, checklist?: any): Promise<PrintBridgeResult> => {
    if (loading) {
      console.log('[PrintBridge] Impressão em andamento, aguarde...');
      return { success: false, error: 'Impressão em andamento' };
    }

    setLoading(true);
    console.log('[PrintBridge] Iniciando impressão O.S. #', ordem.numero);
    console.log('[PrintBridge] Documentos a imprimir: Via Empresa, Via Cliente' + (checklist ? ', Checklist' : ''));

    try {
      // 1. Via Empresa
      toast.info('Enviando Via Empresa...', { duration: 1500 });
      const viaEmpresa = generateOrdemServicoViaEmpresa(ordem);
      const result1 = await sendToPrintBridgeInternal(
        ordem.id,
        viaEmpresa,
        'service_order',
        `O.S. #${ordem.numero} - Via Empresa`,
        false
      );

      if (!result1.success) {
        setStatus('error');
        setLoading(false);
        toast.error('Falha ao enviar Via Empresa');
        return result1;
      }

      // Delay antes de enviar próximo
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 2. Via Cliente
      toast.info('Enviando Via Cliente...', { duration: 1500 });
      const viaCliente = generateOrdemServicoViaCliente(ordem);
      const result2 = await sendToPrintBridgeInternal(
        ordem.id,
        viaCliente,
        'service_order',
        `O.S. #${ordem.numero} - Via Cliente`,
        false
      );

      if (!result2.success) {
        setStatus('error');
        setLoading(false);
        toast.error('Falha ao enviar Via Cliente');
        return result2;
      }

      // 3. Checklist (se existir)
      if (checklist) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        toast.info('Enviando Checklist...', { duration: 1500 });
        const checklistEscpos = generateChecklistESCPOS(checklist);
        const result3 = await sendToPrintBridgeInternal(
          ordem.id,
          checklistEscpos,
          'checklist',
          `Checklist O.S. #${ordem.numero}`,
          false
        );

        if (!result3.success) {
          // Mesmo se checklist falhar, consideramos sucesso parcial
          console.warn('[PrintBridge] Checklist falhou mas OS foi enviada');
          toast.warning('O.S. enviada, mas checklist falhou');
        }
      }

      // Sucesso total
      setStatus('success');
      const totalDocs = checklist ? 3 : 2;
      toast.success(`${totalDocs} documentos enviados para impressão`, {
        description: `O.S. #${ordem.numero}` + (checklist ? ' + Checklist' : '')
      });

      options?.onSuccess?.(result1.jobId!);

      setTimeout(() => {
        setStatus('idle');
        setLoading(false);
        setJobId(null);
      }, 2000);

      return { success: true, jobId: result1.jobId };

    } catch (error) {
      console.error('[PrintBridge] Erro na impressão:', error);
      setStatus('error');
      setLoading(false);
      toast.error('Erro ao enviar impressão');
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }, [loading, options]);

  /**
   * Imprime Checklist
   */
  const printChecklist = useCallback(async (checklist: any, osId?: string): Promise<PrintBridgeResult> => {
    console.log('[PrintBridge] Imprimindo checklist');

    const escposData = generateChecklistESCPOS(checklist);
    
    return sendToPrintBridge(
      osId || checklist.ordem_servico_id || crypto.randomUUID(),
      escposData,
      'checklist',
      `Checklist ${checklist.tipo}`
    );
  }, [sendToPrintBridge]);

  /**
   * Imprime Termo de Garantia (via empresa + via cliente)
   * Usado no módulo de Entregas após conclusão
   */
  const printWarrantyTerms = useCallback(async (data: WarrantyData): Promise<PrintBridgeResult> => {
    if (loading) {
      console.log('[PrintBridge] Impressão em andamento, aguarde...');
      return { success: false, error: 'Impressão em andamento' };
    }

    setLoading(true);
    console.log('[PrintBridge] Iniciando impressão Termo de Garantia O.S. #', data.osNumero);
    console.log('[PrintBridge] Documentos a imprimir: Via Empresa, Via Cliente');

    try {
      // 1. Via Empresa
      toast.info('Enviando Via Empresa...', { duration: 1500 });
      const viaEmpresa = generateWarrantyViaEmpresa(data);
      const result1 = await sendToPrintBridgeInternal(
        data.osId,
        viaEmpresa,
        'receipt',
        `Termo Garantia O.S. #${data.osNumero} - Via Empresa`,
        false
      );

      if (!result1.success) {
        setStatus('error');
        setLoading(false);
        toast.error('Falha ao enviar Via Empresa');
        return result1;
      }

      // Delay antes de enviar próximo
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 2. Via Cliente
      toast.info('Enviando Via Cliente...', { duration: 1500 });
      const viaCliente = generateWarrantyViaCliente(data);
      const result2 = await sendToPrintBridgeInternal(
        data.osId,
        viaCliente,
        'receipt',
        `Termo Garantia O.S. #${data.osNumero} - Via Cliente`,
        false
      );

      if (!result2.success) {
        setStatus('error');
        setLoading(false);
        toast.error('Falha ao enviar Via Cliente');
        return result2;
      }

      // Sucesso total
      setStatus('success');
      toast.success('2 vias do termo de garantia enviadas para impressão', {
        description: `O.S. #${data.osNumero}`
      });

      options?.onSuccess?.(result1.jobId!);

      setTimeout(() => {
        setStatus('idle');
        setLoading(false);
        setJobId(null);
      }, 2000);

      return { success: true, jobId: result1.jobId };

    } catch (error) {
      console.error('[PrintBridge] Erro na impressão:', error);
      setStatus('error');
      setLoading(false);
      toast.error('Erro ao enviar impressão');
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }, [loading, options]);

  /**
   * Imprime recibo customizado
   */
  const printCustomReceipt = useCallback(async (
    lines: Array<{
      text: string;
      align?: 'left' | 'center' | 'right';
      bold?: boolean;
      doubleSize?: boolean;
    }>,
    osId?: string
  ): Promise<PrintBridgeResult> => {
    console.log('[PrintBridge] Imprimindo recibo customizado');

    const escposData = escposPrinter.buildReceipt(lines);
    
    return sendToPrintBridge(
      osId || crypto.randomUUID(),
      escposData,
      'receipt',
      'Recibo customizado'
    );
  }, [sendToPrintBridge]);

  /**
   * Reset status
   */
  const reset = useCallback(() => {
    setStatus('idle');
    setLoading(false);
    setJobId(null);
  }, []);

  return {
    // Estado
    status,
    jobId,
    loading,
    isPrinting: loading || status === 'sending' || status === 'waiting',
    isSuccess: status === 'success',
    isError: status === 'error',
    
    // Funções
    sendToPrintBridge,
    printServiceOrder,
    printChecklist,
    printWarrantyTerms,
    printCustomReceipt,
    reset,
  };
}
