import { Button } from "@/components/ui/button";
import { Printer, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { PrintBridgeStatus } from "@/hooks/use-print-bridge";

interface PrintButtonProps {
  onClick: () => void;
  status: PrintBridgeStatus;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
  label?: string;
}

/**
 * Botão de impressão via Print Bridge
 * TODA impressão passa pelo Print Bridge - não há impressão direta
 */
export function PrintButton({ 
  onClick, 
  status, 
  disabled, 
  className,
  fullWidth = false,
  label = 'Imprimir'
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
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Enviando...
        </>
      )}
      {status === "waiting" && (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Aguardando Print Bridge...
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
          Enviado!
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="w-4 h-4 mr-2 text-red-500" />
          Erro
        </>
      )}
      {status === "idle" && (
        <>
          <Printer className="w-4 h-4 mr-2" />
          {label}
        </>
      )}
    </Button>
  );
}
