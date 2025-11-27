import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wifi, Usb, Printer, AlertCircle } from "lucide-react";
import { printService } from "@/lib/printer/print-service";

export type PrintMethod = "wifi" | "usb";

interface PrintMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (method: PrintMethod) => void;
  isProcessing?: boolean;
}

export function PrintMethodDialog({
  open,
  onOpenChange,
  onConfirm,
  isProcessing = false,
}: PrintMethodDialogProps) {
  const [selectedMethod, setSelectedMethod] = useState<PrintMethod>("usb");
  const [hasNetworkPrinter, setHasNetworkPrinter] = useState(false);

  useEffect(() => {
    if (open) {
      // Carregar configuração da impressora
      const config = printService.loadConfig();
      const hasNetwork = config?.type === "network";
      setHasNetworkPrinter(hasNetwork);
      
      // Se não tem impressora de rede, selecionar USB por padrão
      if (!hasNetwork) {
        setSelectedMethod("usb");
      } else {
        setSelectedMethod("wifi");
      }
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm(selectedMethod);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Método de Impressão</DialogTitle>
          <DialogDescription>
            Escolha como deseja imprimir este documento
          </DialogDescription>
        </DialogHeader>

        {!hasNetworkPrinter && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhuma impressora de rede configurada. Configure uma impressora no módulo de Configuração de Impressora para habilitar impressão Wi-Fi.
            </AlertDescription>
          </Alert>
        )}

        <RadioGroup
          value={selectedMethod}
          onValueChange={(v) => setSelectedMethod(v as PrintMethod)}
          className="space-y-3"
        >
          <div className={`flex items-center space-x-3 p-4 border rounded-lg transition-colors ${
            hasNetworkPrinter 
              ? "cursor-pointer hover:bg-accent" 
              : "opacity-50 cursor-not-allowed bg-muted"
          }`}>
            <RadioGroupItem 
              value="wifi" 
              id="wifi" 
              disabled={!hasNetworkPrinter}
            />
            <Label
              htmlFor="wifi"
              className={`flex items-center gap-3 flex-1 ${
                hasNetworkPrinter ? "cursor-pointer" : "cursor-not-allowed"
              }`}
            >
              <Wifi className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Impressora Wi-Fi (Rede)</p>
                <p className="text-sm text-muted-foreground">
                  {hasNetworkPrinter 
                    ? "Impressora de rede configurada no módulo"
                    : "Configure uma impressora de rede primeiro"
                  }
                </p>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors">
            <RadioGroupItem value="usb" id="usb" />
            <Label
              htmlFor="usb"
              className="flex items-center gap-3 cursor-pointer flex-1"
            >
              <Usb className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Print Bridge USB</p>
                <p className="text-sm text-muted-foreground">
                  Enviar para Print Bridge com impressora USB/OTG
                </p>
              </div>
            </Label>
          </div>
        </RadioGroup>

        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1"
            disabled={isProcessing}
          >
            <Printer className="w-4 h-4 mr-2" />
            {isProcessing ? "Imprimindo..." : "Imprimir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
