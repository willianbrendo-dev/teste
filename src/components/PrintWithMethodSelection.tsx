import { useState } from "react";
import { PrintButton } from "./PrintButton";
import { PrintMethodDialog, PrintMethod } from "./PrintMethodDialog";
import { PrintStatus } from "@/hooks/use-remote-print";

interface PrintWithMethodSelectionProps {
  onPrint: (method: PrintMethod) => void | Promise<void>;
  status?: PrintStatus;
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

/**
 * Botão de impressão com dialog de seleção de método
 * Permite escolher entre impressora de rede ou Print Bridge
 */
export function PrintWithMethodSelection({
  onPrint,
  status = "idle",
  disabled,
  className,
  fullWidth,
}: PrintWithMethodSelectionProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleButtonClick = () => {
    setShowDialog(true);
  };

  const handleConfirm = async (method: PrintMethod) => {
    // Previne duplo clique
    if (isProcessing) {
      console.log("[PrintMethodDialog] Já está processando, ignorando clique...");
      return;
    }

    setIsProcessing(true);
    console.log("[PrintMethodDialog] Iniciando impressão com método:", method);

    try {
      await onPrint(method);
      console.log("[PrintMethodDialog] Impressão concluída, fechando dialog");
      setShowDialog(false);
    } catch (error) {
      console.error("[PrintMethodDialog] Erro ao imprimir:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <PrintButton
        onClick={handleButtonClick}
        status={status}
        disabled={disabled || isProcessing}
        className={className}
        fullWidth={fullWidth}
      />

      <PrintMethodDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onConfirm={handleConfirm}
        isProcessing={isProcessing}
      />
    </>
  );
}
