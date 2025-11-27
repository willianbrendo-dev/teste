import { Button } from "@/components/ui/button";
import { Send, Printer, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { PrintStatus } from "@/hooks/use-remote-print";

interface PrintButtonProps {
  onClick: () => void;
  status: PrintStatus;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

/**
 * Botão de impressão remota com estados visuais
 */
export function PrintButton({ 
  onClick, 
  status, 
  disabled, 
  className,
  fullWidth = false 
}: PrintButtonProps) {
  const isProcessing = status === "sending" || status === "waiting";
  
  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled || isProcessing}
      className={`${fullWidth ? 'w-full' : 'w-full sm:w-auto'} ${className || ''}`}
    >
      {status === "sending" && (
        <>
          <Send className="w-4 h-4 mr-2 animate-pulse" />
          Enviando impressão...
        </>
      )}
      {status === "waiting" && (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Aguardando ponte...
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
          Impressão concluída
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="w-4 h-4 mr-2 text-red-500" />
          Erro na impressão
        </>
      )}
      {status === "idle" && (
        <>
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </>
      )}
    </Button>
  );
}
