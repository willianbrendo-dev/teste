import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Printer, CheckCircle, XCircle, Info } from "lucide-react";
import { nativePrintService } from "@/lib/printer/print-service-native";
import { useToast } from "@/hooks/use-toast";

interface BematechDiagnosticsProps {
  isConnected: boolean;
  isNativeMode: boolean;
}

export const BematechDiagnostics = ({ isConnected, isNativeMode }: BematechDiagnosticsProps) => {
  const { toast } = useToast();
  const [testingLevel, setTestingLevel] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, boolean>>({});

  const runProgressiveTest = async (level: 1 | 2 | 3 | 4) => {
    if (!isConnected || !isNativeMode) {
      toast({
        title: "Teste não disponível",
        description: "Conecte uma impressora Bematech via USB OTG primeiro",
        variant: "destructive",
      });
      return;
    }

    setTestingLevel(level);
    
    const levelNames = {
      1: "Inicialização (INIT)",
      2: "Texto Simples",
      3: "Formatação (Bold/Center)",
      4: "Corte de Papel"
    };

    console.log(`\n${'='.repeat(60)}`);
    console.log(`TESTE PROGRESSIVO NÍVEL ${level}: ${levelNames[level]}`);
    console.log(`${'='.repeat(60)}`);

    try {
      let result = false;
      
      switch (level) {
        case 1:
          console.log('📝 Enviando comando INIT (ESC @)...');
          result = await nativePrintService.testLevel1Init();
          break;
        case 2:
          console.log('📝 Enviando INIT + texto "TESTE" + line feed...');
          result = await nativePrintService.testLevel2Text();
          break;
        case 3:
          console.log('📝 Enviando texto com formatação (bold, center)...');
          result = await nativePrintService.testLevel3Format();
          break;
        case 4:
          console.log('📝 Enviando texto com comando de corte...');
          result = await nativePrintService.testLevel4Cut();
          break;
      }

      console.log(`📥 Resultado: ${result ? '✅ SUCESSO' : '❌ FALHA'}`);
      console.log(`${'='.repeat(60)}\n`);

      setTestResults(prev => ({ ...prev, [level]: result }));
      
      if (result) {
        toast({
          title: `✅ Nível ${level} OK`,
          description: levelNames[level],
        });
      } else {
        toast({
          title: `❌ Nível ${level} Falhou`,
          description: "Verifique os logs detalhados",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(`❌ Exceção no teste nível ${level}:`, error);
      const errorMsg = error instanceof Error ? error.message : "Erro desconhecido";
      
      setTestResults(prev => ({ ...prev, [level]: false }));

      toast({
        title: "Erro no teste",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setTestingLevel(null);
    }
  };

  const getTestStatus = (level: number) => {
    if (testResults[level] === true) {
      return <CheckCircle className="h-4 w-4 text-success" />;
    } else if (testResults[level] === false) {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    return null;
  };

  if (!isNativeMode) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Diagnóstico Bematech disponível apenas em modo Android OTG
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Diagnóstico Bematech MP-4200 TH
        </CardTitle>
        <CardDescription>
          Testes progressivos de comunicação ESC/POS com a impressora Bematech
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Execute os testes em ordem. Cada nível adiciona mais complexidade aos comandos ESC/POS.
            {!isConnected && (
              <span className="block mt-2 text-destructive font-semibold">
                ⚠️ Conecte a impressora primeiro
              </span>
            )}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {getTestStatus(1)}
              <div>
                <div className="font-medium">Nível 1: Inicialização</div>
                <div className="text-sm text-muted-foreground">Comando ESC @ (Init)</div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => runProgressiveTest(1)}
              disabled={!isConnected || testingLevel !== null}
            >
              {testingLevel === 1 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Testar
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {getTestStatus(2)}
              <div>
                <div className="font-medium">Nível 2: Texto Simples</div>
                <div className="text-sm text-muted-foreground">Init + "TESTE" + Line Feed</div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => runProgressiveTest(2)}
              disabled={!isConnected || testingLevel !== null}
            >
              {testingLevel === 2 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Testar
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {getTestStatus(3)}
              <div>
                <div className="font-medium">Nível 3: Formatação</div>
                <div className="text-sm text-muted-foreground">Bold, Center, Align</div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => runProgressiveTest(3)}
              disabled={!isConnected || testingLevel !== null}
            >
              {testingLevel === 3 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Testar
            </Button>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-2">
              {getTestStatus(4)}
              <div>
                <div className="font-medium">Nível 4: Corte de Papel</div>
                <div className="text-sm text-muted-foreground">Texto + comando de corte GS V</div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => runProgressiveTest(4)}
              disabled={!isConnected || testingLevel !== null}
            >
              {testingLevel === 4 && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Testar
            </Button>
          </div>
        </div>

        {Object.keys(testResults).length > 0 && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="font-medium mb-2">Resumo dos Testes</div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(level => (
                <Badge
                  key={level}
                  variant={
                    testResults[level] === true ? "default" :
                    testResults[level] === false ? "destructive" : "outline"
                  }
                >
                  N{level}: {testResults[level] === true ? "✓" : testResults[level] === false ? "✗" : "?"}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
