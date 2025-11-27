import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Shield, RefreshCw, Chrome } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function USBPermissionHelper() {
  return (
    <Card className="border-red-500/50 bg-red-500/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <Shield className="w-5 h-5" />
          Como Resolver: Acesso USB Negado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            O navegador está bloqueando o acesso à impressora USB. Siga os passos abaixo.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-sm font-bold text-red-600">1</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Feche Outras Abas/Programas</h4>
              <p className="text-sm text-muted-foreground">
                Certifique-se de que nenhuma outra aba do navegador ou programa está usando a impressora.
                Feche o Gerenciador de Dispositivos do Windows se estiver aberto.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-sm font-bold text-red-600">2</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Verifique Drivers Conflitantes (Windows)</h4>
              <p className="text-sm text-muted-foreground mb-2">
                No Windows, drivers genéricos podem bloquear WebUSB. Siga estes passos:
              </p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal ml-4">
                <li>Desconecte a impressora USB</li>
                <li>Abra "Gerenciador de Dispositivos" (Win + X)</li>
                <li>Desinstale todos os drivers da impressora (incluindo drivers genéricos)</li>
                <li>Reinstale APENAS o driver oficial do fabricante (Bematech/Elgin)</li>
                <li>Reconecte a impressora USB</li>
                <li>Reinicie o navegador completamente</li>
              </ol>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-sm font-bold text-red-600">3</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1 flex items-center gap-2">
                <Chrome className="w-4 h-4" />
                Use Navegador Compatível
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                WebUSB só funciona em navegadores baseados em Chromium:
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge>✓ Chrome</Badge>
                <Badge>✓ Edge</Badge>
                <Badge>✓ Opera</Badge>
                <Badge variant="destructive">✗ Firefox</Badge>
                <Badge variant="destructive">✗ Safari</Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <span className="text-sm font-bold text-red-600">4</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Conexão Segura (HTTPS)</h4>
              <p className="text-sm text-muted-foreground">
                WebUSB requer HTTPS. Verifique se você está acessando via:
              </p>
              <div className="flex flex-col gap-1 mt-2">
                <Badge variant="outline" className="w-fit">
                  ✓ https://... (conexão segura)
                </Badge>
                <Badge variant="outline" className="w-fit">
                  ✓ localhost (desenvolvimento)
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">Após Corrigir</h4>
              <p className="text-sm text-muted-foreground">
                1. Reinicie o navegador completamente (feche TODAS as abas)<br />
                2. Volte a esta página<br />
                3. Clique em "Conectar Impressora" novamente<br />
                4. Quando aparecer o popup, selecione a impressora e clique em "Conectar"
              </p>
            </div>
          </div>
        </div>

        <Alert className="bg-amber-500/10 border-amber-500/20">
          <AlertDescription className="text-sm">
            <strong>💡 Alternativa:</strong> Se o problema persistir, considere usar o método 
            <strong> Print Bridge</strong> ao invés de WebUSB direto. Deixe este notebook como ponte 
            e envie jobs de impressão do celular/tablet.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
