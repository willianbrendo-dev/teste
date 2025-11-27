import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Smartphone, Printer, Clock, Wifi, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { nativePrintService } from "@/lib/printer/print-service-native";
import { webusbPrinter } from "@/lib/printer/webusb";

interface DeviceProfile {
  deviceId: string;
  lastConnection: string | null;
  printerConnected: boolean;
  printerInfo: string;
  isNativeMode: boolean;
  platform: string;
}

const PrintBridgeProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DeviceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkAuthorization = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/login');
        return;
      }

      const { data: hasPrintBridgeRole } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'print_bridge'
      });

      if (!hasPrintBridgeRole) {
        toast.error("Acesso negado");
        navigate('/');
        return;
      }

      await loadDeviceProfile();
    };

    checkAuthorization();
  }, [navigate]);

  const loadDeviceProfile = async () => {
    try {
      const platform = Capacitor.getPlatform();
      const isAndroid = platform === 'android';
      const isNativeMode = isAndroid;

      // Obtém o ID do dispositivo armazenado
      let deviceId = localStorage.getItem('print_bridge_device_id');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('print_bridge_device_id', deviceId);
      }

      // Obtém última conexão
      const lastConnection = localStorage.getItem('print_bridge_last_connection');

      // Verifica status da impressora
      let printerConnected = false;
      let printerInfo = "Nenhuma impressora conectada";

      if (isAndroid) {
        const status = await nativePrintService.getPrinterStatus();
        printerConnected = status.connected;
        
        if (status.connected && status.deviceId) {
          printerInfo = `${status.deviceId} (VID:${status.vendorId} PID:${status.productId})`;
        }
      } else {
        printerConnected = webusbPrinter.isConnected();
        
        if (printerConnected) {
          printerInfo = "Impressora USB conectada (WebUSB)";
        }
      }

      setProfile({
        deviceId,
        lastConnection,
        printerConnected,
        printerInfo,
        isNativeMode,
        platform: platform.charAt(0).toUpperCase() + platform.slice(1)
      });

      // Atualiza timestamp da última conexão
      localStorage.setItem('print_bridge_last_connection', new Date().toISOString());
    } catch (error) {
      console.error('[PrintBridgeProfile] Erro ao carregar perfil:', error);
      toast.error("Erro ao carregar informações do dispositivo");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("ID copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar ID");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <div className="w-16 h-16 rounded-full gradient-primary animate-pulse shadow-glow" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Não foi possível carregar o perfil do dispositivo.</p>
            <Button onClick={() => navigate('/print-bridge')} className="mt-4">
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/print-bridge')}
            className="text-foreground hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Perfil do Dispositivo</h1>
        </div>

        {/* Informações do Dispositivo */}
        <Card className="border-border/50 bg-card/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Informações do Dispositivo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ID do Dispositivo</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(profile.deviceId)}
                  className="h-8 gap-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="p-3 bg-muted/50 rounded-md font-mono text-sm break-all">
                {profile.deviceId}
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plataforma</span>
              <Badge variant="secondary" className="font-mono">
                {profile.platform}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Modo de Impressão</span>
              <Badge variant={profile.isNativeMode ? "default" : "outline"}>
                {profile.isNativeMode ? "Nativo (OTG)" : "WebUSB"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Status da Impressora */}
        <Card className="border-border/50 bg-card/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Status da Impressora
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status da Conexão</span>
              <Badge variant={profile.printerConnected ? "default" : "secondary"}>
                {profile.printerConnected ? "Conectada" : "Desconectada"}
              </Badge>
            </div>

            {profile.printerConnected && (
              <>
                <Separator />
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Informações</span>
                  <div className="p-3 bg-muted/50 rounded-md text-sm">
                    {profile.printerInfo}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Última Conexão */}
        <Card className="border-border/50 bg-card/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico de Conexão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Última Conexão</span>
              <span className="text-sm font-medium">
                {profile.lastConnection
                  ? new Date(profile.lastConnection).toLocaleString('pt-BR')
                  : "Primeira conexão"}
              </span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status do Backend</span>
              <Badge variant="default" className="gap-1">
                <Wifi className="h-3 w-3" />
                Conectado
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/print-bridge')}
            className="flex-1"
            variant="outline"
          >
            Voltar ao Print Bridge
          </Button>
          <Button
            onClick={() => loadDeviceProfile()}
            className="flex-1"
          >
            Atualizar Informações
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrintBridgeProfile;
