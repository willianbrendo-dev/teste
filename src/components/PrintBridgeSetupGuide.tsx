import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, CheckCircle, Laptop, Printer, Wifi, Chrome, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintBridgeSetupGuideProps {
  onClose?: () => void;
}

export function PrintBridgeSetupGuide({ onClose }: PrintBridgeSetupGuideProps) {
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            <CardTitle>Como Configurar Print Bridge no Notebook</CardTitle>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Ocultar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>Print Bridge</strong> transforma este notebook Windows em uma ponte de impressão.
            Jobs enviados do celular/tablet chegam aqui via internet e são impressos automaticamente.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">1</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold flex items-center gap-2 mb-1">
                <Printer className="w-4 h-4" />
                Conectar Impressora ao Notebook
              </h4>
              <p className="text-sm text-muted-foreground">
                Conecte sua impressora térmica ao notebook via <strong>USB</strong> e instale
                o driver Windows fornecido pelo fabricante (ex: driver Bematech/Elgin).
              </p>
              <Badge variant="secondary" className="mt-2">
                ✓ Driver instalado = impressora funciona no Windows
              </Badge>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">2</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold flex items-center gap-2 mb-1">
                <Chrome className="w-4 h-4" />
                Abrir esta Página no Navegador
              </h4>
              <p className="text-sm text-muted-foreground">
                Use <strong>Chrome</strong>, <strong>Edge</strong> ou <strong>Opera</strong> (navegadores com suporte WebUSB).
                Mantenha esta aba aberta e ativa.
              </p>
              <Badge variant="secondary" className="mt-2">
                URL: {window.location.href}
              </Badge>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">3</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold flex items-center gap-2 mb-1">
                <Wifi className="w-4 h-4" />
                Verificar Conexão com Backend
              </h4>
              <p className="text-sm text-muted-foreground">
                Aguarde o indicador <strong>"✅ PRONTO PARA IMPRIMIR"</strong> aparecer.
                Isso significa que o notebook está conectado ao backend e pronto para receber jobs.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">4</span>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold flex items-center gap-2 mb-1">
                <Globe className="w-4 h-4" />
                Enviar Jobs do Celular/Tablet
              </h4>
              <p className="text-sm text-muted-foreground">
                No app mobile, ao imprimir uma ordem de serviço, selecione <strong>"Print Bridge"</strong>
                como método de impressão. O job será enviado para este notebook via internet.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1">
                Tudo Pronto!
              </h4>
              <p className="text-sm text-muted-foreground">
                Deixe esta aba aberta. Quando um job chegar, você verá/ouvirá uma notificação
                e a impressão será automática.
              </p>
            </div>
          </div>
        </div>

        <Alert className="bg-blue-500/10 border-blue-500/20">
          <AlertDescription className="text-sm">
            <strong>💡 Dica:</strong> Para melhor experiência, habilite notificações do navegador.
            Você será alertado mesmo em outras abas.
          </AlertDescription>
        </Alert>

        <Alert className="bg-amber-500/10 border-amber-500/20">
          <AlertDescription className="text-sm">
            <strong>⚠️ Importante:</strong> Mantenha o notebook ligado e conectado à internet.
            Se fechar o navegador, o Print Bridge ficará offline.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
