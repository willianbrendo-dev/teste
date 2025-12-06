import { useState } from "react";
import { toast } from "sonner";
import { sendRemotePrintJob } from "@/lib/printer/remote-print-service";

export type PrintStatus = "idle" | "sending" | "waiting" | "success" | "error";

interface UseRemotePrintOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook centralizado para gerenciar impressão remota via Print Bridge
 */
export function useRemotePrint(options?: UseRemotePrintOptions) {
  const [status, setStatus] = useState<PrintStatus>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const print = async (osId: string, escposData: Uint8Array) => {
    // Previne múltiplas execuções simultâneas
    if (loading) {
      console.log("[RemotePrint] Job já está sendo processado, ignorando...");
      return;
    }

    try {
      setLoading(true);
      setStatus("sending");

      console.log("[RemotePrint] ===== INICIANDO ENVIO DE JOB =====");
      console.log("[RemotePrint] O.S. ID:", osId);
      console.log("[RemotePrint] Tamanho dos dados:", escposData.length, "bytes");

      setStatus("waiting");
      const result = await sendRemotePrintJob(osId, escposData);

      console.log("[RemotePrint] Resultado:", result);

      if (result.success) {
        setStatus("success");
        setJobId(result.jobId || null);

        toast.success(
          result.queued
            ? "Impressão adicionada à fila"
            : "Impressão enviada com sucesso",
          {
            description: result.jobId
              ? `Job ID: ${result.jobId.slice(0, 8)}... | Device: ${result.deviceId?.slice(0, 8)}...`
              : undefined,
          }
        );

        options?.onSuccess?.();

        // Reset após 2 segundos
        setTimeout(() => {
          setStatus("idle");
          setLoading(false);
          setJobId(null);
        }, 2000);
      } else {
        throw new Error(result.error || "Falha ao enviar impressão");
      }
    } catch (error) {
      console.error("[RemotePrint] ===== ERRO NO ENVIO =====");
      console.error("[RemotePrint] Erro:", error);
      setStatus("error");

      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      
      // Mensagem especial quando não há Print Bridge conectado
      if (errorMessage.includes("Print Bridge") || errorMessage.includes("dispositivo")) {
        toast.error("Nenhum dispositivo Print Bridge conectado", {
          description: "Configure um dispositivo Print Bridge para receber impressões. Acesse o menu Print Bridge para configurar.",
          duration: 6000,
        });
      } else {
        toast.error("Erro ao enviar impressão", {
          description: errorMessage,
        });
      }

      options?.onError?.(error instanceof Error ? error : new Error(errorMessage));

      // Reset após 3 segundos
      setTimeout(() => {
        setStatus("idle");
        setLoading(false);
        setJobId(null);
      }, 3000);
    }
  };

  const reset = () => {
    setStatus("idle");
    setLoading(false);
    setJobId(null);
  };

  return {
    print,
    status,
    jobId,
    loading,
    reset,
  };
}
