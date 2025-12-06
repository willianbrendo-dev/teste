import { supabase } from "@/integrations/supabase/client";

export interface RemotePrintResponse {
  success: boolean;
  message: string;
  jobId?: string;
  deviceId?: string;
  queued?: boolean;
  error?: string;
}

/**
 * Envia job de impressão para dispositivo Print Bridge via backend
 */
export async function sendRemotePrintJob(
  osId: string,
  escposData: Uint8Array
): Promise<RemotePrintResponse> {
  try {
    // Obter usuário atual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      throw new Error("Usuário não autenticado");
    }

    // Converter Uint8Array para base64
    const base64Data = btoa(
      Array.from(escposData)
        .map(byte => String.fromCharCode(byte))
        .join('')
    );

    console.log('[RemotePrint] Enviando job para backend...');
    console.log('[RemotePrint] O.S. ID:', osId);
    console.log('[RemotePrint] Tamanho dos dados:', escposData.length, 'bytes');

    // Chamar edge function
    const { data, error } = await supabase.functions.invoke('send-print-job', {
      body: {
        userId: user.id,
        osId: osId,
        escposBase64: base64Data
      }
    });

    if (error) {
      console.error('[RemotePrint] Erro na chamada:', error);
      throw error;
    }

    console.log('[RemotePrint] Resposta do backend:', data);

    return data as RemotePrintResponse;

  } catch (error) {
    console.error('[RemotePrint] Erro ao enviar job:', error);
    
    return {
      success: false,
      message: "Erro ao enviar impressão",
      error: error instanceof Error ? error.message : "Erro desconhecido"
    };
  }
}

/**
 * Monitora status de um job de impressão
 */
export async function getJobStatus(jobId: string) {
  try {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('status, error_message, finished_at, processing_duration_ms')
      .eq('job_id', jobId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('[RemotePrint] Erro ao buscar status:', error);
    return null;
  }
}
