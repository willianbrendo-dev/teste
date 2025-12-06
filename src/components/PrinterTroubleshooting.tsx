import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

interface PrinterTroubleshootingProps {
  error?: string;
  platform?: string;
}

export const PrinterTroubleshooting = ({ error, platform }: PrinterTroubleshootingProps) => {
  const isAccessDenied = error?.includes('Access denied') || error?.includes('SecurityError');
  const isWindows = platform === 'web';

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Problema de Conexão Detectado
        </CardTitle>
        <CardDescription>
          {isAccessDenied 
            ? "Acesso ao USB negado - drivers conflitantes detectados"
            : "Não foi possível conectar à impressora"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAccessDenied && isWindows && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Drivers Windows Conflitantes</AlertTitle>
            <AlertDescription className="mt-2 space-y-2">
              <p className="font-semibold">
                O Windows está bloqueando o acesso direto ao USB porque drivers da Bematech estão instalados.
              </p>
              <p>
                Os drivers .exe (Virtual Serial) são para programas desktop, não para navegadores web.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="solucao" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="solucao">✅ Solução</TabsTrigger>
            <TabsTrigger value="tecnico">🔧 Detalhes Técnicos</TabsTrigger>
          </TabsList>

          <TabsContent value="solucao" className="space-y-3">
            <div className="space-y-3">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Método Recomendado: Android OTG</AlertTitle>
                <AlertDescription className="mt-2">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Use um tablet ou celular Android</li>
                    <li>Conecte a impressora via cabo USB OTG</li>
                    <li>Abra esta aplicação no navegador do Android</li>
                    <li>Clique em "Conectar" - funcionará sem drivers!</li>
                  </ol>
                  <p className="mt-2 font-semibold text-success">
                    ✓ Funciona direto, sem configuração adicional
                  </p>
                </AlertDescription>
              </Alert>

              {isWindows && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Alternativa: Desinstalar Drivers no Windows</AlertTitle>
                  <AlertDescription className="mt-2">
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Painel de Controle → Programas → Desinstalar</li>
                      <li>Remova "Bematech MP-4200 TH Driver"</li>
                      <li>Gerenciador de Dispositivos → Desinstale o dispositivo USB</li>
                      <li>Reinicie o navegador</li>
                      <li>Tente conectar novamente</li>
                    </ol>
                    <p className="mt-2 text-sm text-muted-foreground">
                      ⚠️ Isso impedirá programas desktop de usar a impressora
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tecnico" className="space-y-3">
            <div className="space-y-2 text-sm">
              <h4 className="font-semibold">Por que o erro acontece?</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong>Drivers Windows (.exe):</strong> Criam uma porta COM virtual e "capturam" o dispositivo USB
                </li>
                <li>
                  <strong>WebUSB (navegador):</strong> Precisa de acesso direto ao USB, sem drivers intermediários
                </li>
                <li>
                  <strong>Conflito:</strong> Quando o driver está instalado, o Windows bloqueia o acesso direto
                </li>
              </ul>

              <h4 className="font-semibold mt-4">Como funciona cada método?</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                  <div>
                    <p className="font-medium">Android OTG (Nativo)</p>
                    <p className="text-muted-foreground">
                      Sistema operacional Android fornece acesso direto via USB Host API.
                      Sem drivers necessários, comunicação direta com comandos ESC/POS.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-warning mt-0.5" />
                  <div>
                    <p className="font-medium">WebUSB (Navegador Web)</p>
                    <p className="text-muted-foreground">
                      Navegadores modernos (Chrome/Edge) permitem acesso USB, mas o sistema
                      operacional NÃO pode ter drivers instalados para o dispositivo.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div>
                    <p className="font-medium">Drivers .exe (Incompatível)</p>
                    <p className="text-muted-foreground">
                      Drivers desktop criam porta COM virtual. Funcionam APENAS para programas
                      desktop Windows, NUNCA para web/mobile.
                    </p>
                  </div>
                </div>
              </div>

              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Sua aplicação JÁ está correta!</strong> Os comandos ESC/POS da Bematech
                  MP-4200 TH estão implementados. O problema é apenas configuração do sistema operacional.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-xs font-mono text-muted-foreground break-all">
              <strong>Erro técnico:</strong> {error}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
