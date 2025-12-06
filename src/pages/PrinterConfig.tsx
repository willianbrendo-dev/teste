import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, ArrowRight, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Página de Configuração de Impressora
 * Redireciona para o Print Bridge - toda impressão é centralizada
 */
const PrinterConfigPage = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Printer className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Configuração de Impressora</h1>
            <p className="text-muted-foreground">Sistema centralizado de impressão</p>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Sistema Print Bridge</AlertTitle>
          <AlertDescription>
            Todas as impressões do sistema são processadas através do <strong>Print Bridge</strong> - 
            um dispositivo dedicado que permanece conectado à impressora térmica.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Como funciona</CardTitle>
            <CardDescription>
              O Print Bridge centraliza todas as impressões do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  1
                </div>
                <div>
                  <p className="font-medium">Usuários enviam impressões</p>
                  <p className="text-sm text-muted-foreground">
                    Admin e Atendentes clicam em "Imprimir" nas O.S., checklists ou recibos
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  2
                </div>
                <div>
                  <p className="font-medium">Jobs são enfileirados</p>
                  <p className="text-sm text-muted-foreground">
                    O backend recebe e enfileira os jobs de impressão
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">Print Bridge executa</p>
                  <p className="text-sm text-muted-foreground">
                    O dispositivo Print Bridge recebe e imprime automaticamente
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                Para configurar o Print Bridge, acesse a página dedicada com o usuário PRINT BRIDGE.
              </p>
              <Button 
                onClick={() => navigate('/print-bridge')}
                className="w-full"
              >
                <Printer className="mr-2 h-4 w-4" />
                Acessar Print Bridge
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compatibilidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>ESC/POS</strong> - Impressoras térmicas modernas</p>
            <p>• <strong>ESC/BEMA</strong> - Impressoras Bematech legadas (fallback automático)</p>
            <p>• <strong>USB/OTG</strong> - Conexão direta no dispositivo Print Bridge</p>
            <p>• <strong>Wi-Fi</strong> - Impressoras de rede</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrinterConfigPage;
