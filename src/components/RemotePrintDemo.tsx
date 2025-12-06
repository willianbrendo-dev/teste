// Componente de demonstração para administradores testarem impressão remota
// Este componente pode ser adicionado em qualquer página admin

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  sendPrintJobToDevices, 
  listenToPrintJobResponses 
} from "@/lib/printer/print-bridge-admin";
import { Printer, Send, CheckCircle, XCircle } from "lucide-react";

interface JobResponse {
  jobId: string;
  status: "OK" | "ERROR";
  timestamp: number;
  deviceId: string;
  error?: string;
}

export default function RemotePrintDemo() {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [responses, setResponses] = useState<JobResponse[]>([]);
  const [customText, setCustomText] = useState(
    "TESTE DE IMPRESSÃO REMOTA\n\nEsta é uma impressão enviada via backend.\n\nData: " +
    new Date().toLocaleString("pt-BR")
  );

  useEffect(() => {
    // Escuta respostas dos dispositivos
    const unsubscribe = listenToPrintJobResponses((response) => {
      console.log("[Admin] Resposta recebida:", response);
      setResponses((prev) => [response, ...prev].slice(0, 10));

      if (response.status === "OK") {
        toast({
          title: "Impressão concluída",
          description: `Job ${response.jobId.slice(0, 8)}... impresso por ${response.deviceId.slice(0, 15)}...`,
        });
      } else {
        toast({
          title: "Erro na impressão",
          description: response.error || "Erro desconhecido",
          variant: "destructive",
        });
      }
    });

    return unsubscribe;
  }, [toast]);

  const handleSendTestPrint = async () => {
    setIsSending(true);
    try {
      // Divide o texto em linhas
      const lines = customText.split("\n").map((line) => ({
        text: line || " ", // Linha vazia = espaço
        align: "left" as const,
      }));

      // Adiciona cabeçalho e rodapé
      const receipt = [
        { text: "================================", align: "center" as const },
        ...lines,
        { text: "================================", align: "center" as const },
        { text: "", align: "left" as const },
      ];

      const result = await sendPrintJobToDevices({
        documentType: "custom",
        customReceipt: receipt,
        metadata: {
          description: "Teste de impressão remota via admin",
        },
      });

      if (result.success) {
        toast({
          title: "Job enviado",
          description: `ID: ${result.jobId}`,
        });
      } else {
        toast({
          title: "Erro ao enviar",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            Impressão Remota - Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Conteúdo para imprimir:
            </label>
            <Textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              rows={6}
              className="font-mono text-sm"
              placeholder="Digite o texto a ser impresso..."
            />
          </div>

          <Button
            onClick={handleSendTestPrint}
            disabled={isSending || !customText.trim()}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? "Enviando..." : "Enviar para Dispositivos Ponte"}
          </Button>

          <div className="text-xs text-muted-foreground">
            Este comando será enviado para todos os dispositivos PRINT_BRIDGE
            conectados no momento.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Respostas dos Dispositivos</CardTitle>
        </CardHeader>
        <CardContent>
          {responses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Printer className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma resposta ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {responses.map((response) => (
                <div
                  key={response.jobId + response.timestamp}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/30"
                >
                  {response.status === "OK" ? (
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={response.status === "OK" ? "default" : "destructive"}
                      >
                        {response.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(response.timestamp).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm font-mono truncate">
                      Job: {response.jobId}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      Device: {response.deviceId}
                    </p>
                    {response.error && (
                      <p className="text-xs text-destructive mt-1">
                        Erro: {response.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
