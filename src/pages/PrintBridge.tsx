import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Printer, LogOut, CheckCircle, XCircle, Clock, Usb, AlertTriangle, FileText, Smartphone, Wifi, WifiOff, FlaskConical, User, Bell, BellOff, Info, Zap, Network, AlertCircle, Search } from "lucide-react";
import { PrinterTroubleshooting } from "@/components/PrinterTroubleshooting";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { webusbPrinter } from "@/lib/printer/webusb";
import { printService } from "@/lib/printer/print-service";
import { nativePrintService } from "@/lib/printer/print-service-native";
import { NetworkPrinter } from "@/lib/printer/network-printer";
import { Capacitor } from '@capacitor/core';
import { PrintBridgeRealtime, PrintJob as RealtimePrintJob } from "@/lib/printer/print-bridge-realtime";
import { PrintJobTimeline } from "@/components/PrintJobTimeline";
import { PrintBridgeTests } from "@/components/PrintBridgeTests";
import { USBPermissionHelper } from "@/components/USBPermissionHelper";
import { BematechDiagnostics } from "@/components/BematechDiagnostics";
import { notificationSounds } from "@/utils/notificationSounds";

interface PrintJob {
  id: string;
  timestamp: string;
  status: "success" | "error";
  description: string;
  content?: string;
}

interface DiagnosticLog {
  id: string;
  timestamp: string;
  action: string;
  status: "success" | "error" | "info";
  details?: string;
  data?: any;
}

interface PrintBridgeStatus {
  isOnline: boolean;
  printerConnected: boolean;
  deviceId: string;
  lastCheck: number;
}

const STORAGE_KEY = 'printBridgeStatus';
const JOBS_STORAGE_KEY = 'printBridgeJobs';

type ConnectionMethod = 'usb' | 'wifi';

const PrintBridge = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [deviceInfo, setDeviceInfo] = useState<string>("");
  const [status, setStatus] = useState<PrintBridgeStatus>({
    isOnline: true,
    printerConnected: false,
    deviceId: "",
    lastCheck: Date.now()
  });
  const [usbHostSupported, setUsbHostSupported] = useState(true);
  const [isNativeMode, setIsNativeMode] = useState(false);
  const [connectionError, setConnectionError] = useState<string>();
  const [realtimeStatus, setRealtimeStatus] = useState<"connected" | "disconnected" | "reconnecting">("disconnected");
  const realtimeServiceRef = useRef<PrintBridgeRealtime | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [soundsEnabled, setSoundsEnabled] = useState(notificationSounds.isEnabled());
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [desktopNotificationsEnabled, setDesktopNotificationsEnabled] = useState(false);
  const [showUSBPermissionHelp, setShowUSBPermissionHelp] = useState(false);
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [diagnosticLogs, setDiagnosticLogs] = useState<DiagnosticLog[]>([]);
  
  // Network printer states
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>(() => {
    const saved = localStorage.getItem('print_bridge_connection_method') as ConnectionMethod;
    return saved || 'usb';
  });
  const [networkPrinterIP, setNetworkPrinterIP] = useState(() => 
    localStorage.getItem('network_printer_ip') || '192.168.0.129'
  );
  const [networkPrinterPort, setNetworkPrinterPort] = useState(() => 
    localStorage.getItem('network_printer_port') || '9100'
  );
  const [networkPrinter, setNetworkPrinter] = useState<NetworkPrinter | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<'success' | 'error' | null>(null);
  
  // Wi-Fi scanning states
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<Array<{ ip: string; port: number; status: string }>>([]);

  // Solicita permissão para notificações desktop
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if ('Notification' in window && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setDesktopNotificationsEnabled(permission === 'granted');
      } else if ('Notification' in window && Notification.permission === 'granted') {
        setDesktopNotificationsEnabled(true);
      }
    };
    requestNotificationPermission();
  }, []);

  // Função para mostrar notificação desktop
  const showDesktopNotification = (title: string, body: string, icon?: string) => {
    if (desktopNotificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: icon || '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'print-bridge',
        requireInteraction: false,
      });
    }
  };

  // Verifica se o usuário tem permissão para acessar esta página
  useEffect(() => {
    const checkAuthorization = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log('[PrintBridge] Sem sessão, redirecionando para login');
        navigate('/login');
        return;
      }

      console.log('[PrintBridge] Verificando autorização para usuário:', session.user.email);

      const { data: hasPrintBridgeRole, error } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'print_bridge'
      });

      if (error) {
        console.error('[PrintBridge] Erro ao verificar role:', error);
        toast({
          title: "Erro de autorização",
          description: "Não foi possível verificar suas permissões.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      console.log('[PrintBridge] hasPrintBridgeRole:', hasPrintBridgeRole);

      if (!hasPrintBridgeRole) {
        console.log('[PrintBridge] Usuário sem permissão, redirecionando');
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta página.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      console.log('[PrintBridge] Usuário autorizado');
      setIsAuthorized(true);
    };

    checkAuthorization();
  }, [navigate, toast]);

  // Monitoramento mínimo de sessão - Supabase já gerencia auto-refresh
  useEffect(() => {
    if (!isAuthorized) return;

    console.log('[PrintBridge] 🔐 Monitoramento de sessão ativo (auto-refresh do Supabase)');

    // Apenas escuta eventos de auth para detectar logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        console.log('[PrintBridge] 🚪 Sessão finalizada, redirecionando');
        navigate('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isAuthorized, navigate]);

  // Load persistent state from localStorage
  useEffect(() => {
    const savedStatus = localStorage.getItem(STORAGE_KEY);
    if (savedStatus) {
      try {
        const parsed = JSON.parse(savedStatus);
        setStatus(parsed);
      } catch (e) {
        console.error("Erro ao carregar status:", e);
      }
    }

    const savedJobs = localStorage.getItem(JOBS_STORAGE_KEY);
    if (savedJobs) {
      try {
        const parsed = JSON.parse(savedJobs);
        setPrintJobs(parsed);
      } catch (e) {
        console.error("Erro ao carregar jobs:", e);
      }
    }
  }, []);

  // Verifica quantidade de jobs pendentes na fila (uma única vez via Realtime)
  useEffect(() => {
    if (!isAuthorized || !status.deviceId) return;

    const checkQueueCount = async () => {
      try {
        const { data, error } = await supabase
          .from('print_jobs')
          .select('id', { count: 'exact', head: false })
          .eq('device_id', status.deviceId)
          .eq('status', 'pending');

        if (error) {
          console.error('[PrintBridge] Erro ao verificar fila:', error);
          return;
        }

        const count = data?.length || 0;
        setPendingQueueCount(count);
        
        if (count > 0) {
          console.log(`[PrintBridge] 📋 ${count} job(s) pendente(s) na fila`);
        }
      } catch (error) {
        console.error('[PrintBridge] Exceção ao verificar fila:', error);
      }
    };

    // Verifica apenas ao montar/mudar deviceId
    checkQueueCount();

    // Escuta mudanças em tempo real via Supabase Realtime
    const channel = supabase
      .channel('print_jobs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'print_jobs',
          filter: `device_id=eq.${status.deviceId}`
        },
        () => {
          console.log('[PrintBridge] Job atualizado, recarregando contagem');
          checkQueueCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthorized, status.deviceId]);

  // Save status to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
  }, [status]);

  // Save jobs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(printJobs));
  }, [printJobs]);
  
  const addPrintJob = (job: PrintJob) => {
    setPrintJobs(prev => [job, ...prev].slice(0, 5)); // Keep only last 5 jobs
  };

  const addDiagnosticLog = (log: Omit<DiagnosticLog, 'id' | 'timestamp'>) => {
    const newLog: DiagnosticLog = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('pt-BR'),
    };
    setDiagnosticLogs(prev => [newLog, ...prev]);
    console.log('[Diagnostic]', newLog.action, newLog.details);
  };

  // Inicialização de impressoras e monitoramento
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const isAndroid = platform === 'android';
    setIsNativeMode(isAndroid);

    const checkSupport = async () => {
      if (isAndroid) {
        // Modo nativo Android
        const supported = await nativePrintService.checkSupport();
        setUsbHostSupported(supported);
        
        if (!supported) {
          toast({
            title: "USB Host não suportado",
            description: "Este dispositivo não possui suporte a USB Host/OTG.",
            variant: "destructive",
          });
          return;
        }

        // Verifica status da impressora
        const printerStatus = await nativePrintService.getPrinterStatus();
        
        if (printerStatus.connected && printerStatus.deviceId) {
          const deviceInfoText = `${printerStatus.deviceId} (VID:${printerStatus.vendorId} PID:${printerStatus.productId})`;
          setDeviceInfo(deviceInfoText);
          setIsConnected(true);
          
          setStatus(prev => ({
            ...prev,
            printerConnected: true,
            deviceId: printerStatus.deviceId || '',
            lastCheck: Date.now()
          }));
          
          // Notificação de detecção automática
          toast({
            title: "🖨️ Impressora Detectada",
            description: (
              <div className="space-y-1">
                <p className="font-medium">Conectada automaticamente via OTG</p>
                <p className="text-xs text-muted-foreground">{deviceInfoText}</p>
              </div>
            ),
          });
          
          const newJob: PrintJob = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleString('pt-BR'),
            status: "success",
            description: "Impressora detectada automaticamente (OTG)",
            content: deviceInfoText
          };
          addPrintJob(newJob);
        } else {
          setIsConnected(false);
        }
      } else {
        // Modo WebUSB (navegador)
        if (!('usb' in navigator)) {
          setUsbHostSupported(false);
          toast({
            title: "Navegador não suportado",
            description: "Este navegador não suporta impressão via USB. Use Chrome, Edge ou Opera.",
            variant: "destructive",
          });
        }

        const connected = webusbPrinter.isConnected();
        setIsConnected(connected);
        
        setStatus(prev => ({
          ...prev,
          printerConnected: connected,
          lastCheck: Date.now()
        }));
      }
    };

    checkSupport();

    // Monitor contínuo para detectar conexão/desconexão de impressora (apenas Android)
    let monitorInterval: NodeJS.Timeout | undefined;
    if (isAndroid) {
      monitorInterval = setInterval(async () => {
        const printerStatus = await nativePrintService.getPrinterStatus();
        
        // Se detectar uma impressora que não estava conectada antes
        if (printerStatus.connected && !isConnected && printerStatus.deviceId) {
          const deviceInfoText = `${printerStatus.deviceId} (VID:${printerStatus.vendorId} PID:${printerStatus.productId})`;
          setDeviceInfo(deviceInfoText);
          setIsConnected(true);
          
          setStatus(prev => ({
            ...prev,
            printerConnected: true,
            deviceId: printerStatus.deviceId || '',
            lastCheck: Date.now()
          }));
          
          // Notificação de nova conexão
          toast({
            title: "🖨️ Impressora Conectada",
            description: (
              <div className="space-y-1">
                <p className="font-medium">Nova impressora OTG detectada</p>
                <p className="text-xs text-muted-foreground">{deviceInfoText}</p>
              </div>
            ),
          });
          
          const newJob: PrintJob = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleString('pt-BR'),
            status: "success",
            description: "Impressora conectada via OTG",
            content: deviceInfoText
          };
          addPrintJob(newJob);
        }
        // Se detectar desconexão
        else if (!printerStatus.connected && isConnected) {
          setIsConnected(false);
          setDeviceInfo("");
          
          setStatus(prev => ({
            ...prev,
            printerConnected: false,
            deviceId: '',
            lastCheck: Date.now()
          }));
          
          toast({
            title: "⚠️ Impressora Desconectada",
            description: "A impressora OTG foi desconectada.",
            variant: "destructive",
          });
        }
      }, 3000); // Verifica a cada 3 segundos
    }

    // Inicializa serviço de comunicação realtime (UMA ÚNICA VEZ)
    const initRealtimeService = async () => {
      try {
        // Obtém info do usuário
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('[PrintBridge] Sem usuário autenticado');
          return;
        }

        // Cria ou recupera ID único para o dispositivo
        let deviceId = localStorage.getItem('print_bridge_device_id');

        // Se ainda não houver um deviceId salvo, tenta reutilizar o deviceId de jobs pendentes
        if (!deviceId) {
          try {
            const { data: pendingJobs, error: pendingError } = await supabase
              .from('print_jobs')
              .select('device_id')
              .eq('status', 'pending')
              .not('device_id', 'is', null)
              .order('created_at', { ascending: true })
              .limit(1);

            if (!pendingError && pendingJobs && pendingJobs.length > 0 && pendingJobs[0].device_id) {
              deviceId = pendingJobs[0].device_id as string;
              console.log('[PrintBridge] ✅ Reutilizando deviceId de jobs pendentes:', deviceId);
            }
          } catch (error) {
            console.error('[PrintBridge] Erro ao buscar deviceId de jobs pendentes:', error);
          }
        }

        // Se ainda assim não tiver um deviceId, gera um novo
        if (!deviceId) {
          deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          console.log('[PrintBridge] ✨ Novo deviceId gerado:', deviceId);
        }

        // Sempre persiste o deviceId atual
        localStorage.setItem('print_bridge_device_id', deviceId);
        
        // Atualiza status local com deviceId
        setStatus(prev => ({ ...prev, deviceId }));

        console.log('[PrintBridge] 🚀 Inicializando conexão PERSISTENTE com backend');
        console.log('[PrintBridge] Device ID:', deviceId);

        // Inicializa serviço realtime
        realtimeServiceRef.current = new PrintBridgeRealtime(
          deviceId,
          isAndroid,
          {
            onJobReceived: (job: RealtimePrintJob) => {
              console.log('[PrintBridge UI] Job recebido:', job.jobId);
              
              // Toca som de notificação
              notificationSounds.playJobReceived();
              
              // Notificação desktop
              showDesktopNotification(
                '📥 Job de Impressão Recebido',
                `Processando ${job.documentType || 'documento'}`,
              );
              
              // Define job como sendo processado
              setProcessingJobId(job.jobId);
              
              // Adiciona ao log visual
              const logEntry: PrintJob = {
                id: job.jobId,
                timestamp: new Date().toLocaleString('pt-BR'),
                status: "success",
                description: `📥 Job recebido: ${job.documentType || 'documento'}`,
                content: job.metadata?.description || 'Processando...',
              };
              addPrintJob(logEntry);

              toast({
                title: "📥 Job recebido",
                description: `Processando ${job.jobId.slice(0, 8)}...`,
              });
            },
            onJobStatusChange: (jobId, status, error) => {
              console.log('[PrintBridge UI] Job status:', jobId, status);
              
              if (status === "completed") {
                notificationSounds.playSuccess();
                showDesktopNotification(
                  '✅ Impressão Concluída',
                  `Job ${jobId.slice(0, 8)} concluído`,
                );
                
                const logEntry: PrintJob = {
                  id: jobId + '_completed',
                  timestamp: new Date().toLocaleString('pt-BR'),
                  status: "success",
                  description: `✅ Impressão concluída`,
                  content: `Job ${jobId.slice(0, 8)} processado com sucesso`,
                };
                addPrintJob(logEntry);
                setProcessingJobId(null);
                
                toast({
                  title: "✅ Impressão concluída",
                  description: `Job ${jobId.slice(0, 8)} impresso com sucesso`,
                });
              } else if (status === "failed") {
                notificationSounds.playError();
                
                // Notificação desktop
                showDesktopNotification(
                  '❌ Erro na Impressão',
                  error || `Job ${jobId.slice(0, 8)} falhou`,
                );
                
                const logEntry: PrintJob = {
                  id: jobId + '_failed',
                  timestamp: new Date().toLocaleString('pt-BR'),
                  status: "error",
                  description: `❌ Falha na impressão`,
                  content: error || `Job ${jobId.slice(0, 8)} falhou`,
                };
                addPrintJob(logEntry);
                setProcessingJobId(null);
                
                toast({
                  title: "❌ Erro na impressão",
                  description: error || `Job ${jobId.slice(0, 8)} falhou`,
                  variant: "destructive",
                });
              }
            },
            onStatusChange: (status) => {
              console.log('[PrintBridge UI] Status mudou:', status);
              setRealtimeStatus(status);
              
              if (status === "connected") {
                toast({
                  title: "✅ Conectado ao backend",
                  description: "Pronto para receber trabalhos de impressão",
                });
              } else if (status === "disconnected") {
                toast({
                  title: "❌ Desconectado",
                  description: "Sem conexão com o backend",
                  variant: "destructive",
                });
              }
            }
          }
        );

        // Configura método de impressão baseado no modo e método salvo
        const savedMethod = connectionMethod;
        console.log(`[PrintBridge] Configurando método de impressão: ${savedMethod}`);
        realtimeServiceRef.current.setPrintMethod(savedMethod);
        
        // CONEXÃO DIRETA PERSISTENTE - conecta e mantém até logout
        console.log('[PrintBridge] 🔌 Estabelecendo conexão PERSISTENTE com backend...');
        const connected = await realtimeServiceRef.current.connect();
        
        if (connected) {
          console.log('[PrintBridge] ✅ Conexão persistente estabelecida com sucesso!');
          console.log('[PrintBridge] ♾️  Mantendo conexão ativa até logout manual');
          toast({
            title: "✅ Conectado ao Backend",
            description: "Conexão persistente estabelecida. Pronto para receber jobs!",
          });
        } else {
          console.error('[PrintBridge] ❌ Falha ao estabelecer conexão');
          setRealtimeStatus("disconnected");
          toast({
            title: "⚠️ Falha na conexão",
            description: "Não foi possível conectar. A reconexão será automática.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('[PrintBridge UI] Erro ao inicializar realtime:', error);
        setRealtimeStatus("disconnected");
      }
    };

    initRealtimeService();

    // Cleanup
    return () => {
      if (monitorInterval) {
        clearInterval(monitorInterval);
      }
      realtimeServiceRef.current?.disconnect();
      notificationSounds.dispose();
    };
  }, [toast, isAuthorized]);
  
  // Monitora APENAS eventos críticos de rede - Reconexão é automática via PrintBridgeRealtime
  useEffect(() => {
    if (!isAuthorized || !realtimeServiceRef.current) return;

    const handleOnline = () => {
      console.log('[PrintBridge] 🌐 Rede restaurada - reconexão automática em andamento');
      toast({
        title: "🌐 Rede Restaurada",
        description: "Reconectando ao backend automaticamente...",
      });
    };

    const handleOffline = () => {
      console.log('[PrintBridge] ⚠️ Rede offline - aguardando restauração');
      setRealtimeStatus("disconnected");
      toast({
        title: "⚠️ Sem Rede",
        description: "Aguardando conexão de internet...",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAuthorized, toast]);

  // Atualiza método de impressão no serviço realtime quando connectionMethod mudar
  useEffect(() => {
    // Salva método no localStorage
    localStorage.setItem('print_bridge_connection_method', connectionMethod);
    
    // Atualiza no serviço realtime
    if (realtimeServiceRef.current) {
      const method = connectionMethod === 'wifi' ? 'wifi' : 'usb';
      console.log(`[PrintBridge] Método de impressão alterado para: ${method}`);
      realtimeServiceRef.current.setPrintMethod(method);
    }
  }, [connectionMethod]);

  // Monitora mudanças nos logs de jobs para detectar conclusões/erros
  // Agora gerenciado pelo callback onJobStatusChange
  // useEffect removido pois não é mais necessário

  const handleConnect = async () => {
    if (!usbHostSupported && connectionMethod === 'usb') {
      toast({
        title: "USB não suportado",
        description: "Este dispositivo ou navegador não suporta USB Host.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    const modeLabel = connectionMethod === 'usb' 
      ? (isNativeMode ? 'OTG Nativo (Android) com Bematech MP-4200 TH' : 'WebUSB (navegador)')
      : 'Wi-Fi';
    
    console.log('='.repeat(60));
    console.log('INICIANDO CONEXÃO COM IMPRESSORA');
    console.log('='.repeat(60));
    console.log('Método:', connectionMethod);
    console.log('Modo Nativo:', isNativeMode);
    console.log('Impressora: Bematech MP-4200 TH');
    console.log('='.repeat(60));

    try {
      if (connectionMethod === 'wifi') {
        // Modo Wi-Fi
        console.log("📡 Conectando impressora Wi-Fi...");
        localStorage.setItem('network_printer_ip', networkPrinterIP);
        localStorage.setItem('network_printer_port', networkPrinterPort);
        
        const printer = new NetworkPrinter(networkPrinterIP, parseInt(networkPrinterPort));
        const connected = await printer.connect();
        
        if (connected) {
          setNetworkPrinter(printer);
          setIsConnected(true);
          const deviceId = `${networkPrinterIP}:${networkPrinterPort}`;
          setDeviceInfo(deviceId);
          
          setStatus(prev => ({
            ...prev,
            printerConnected: true,
            deviceId,
            lastCheck: Date.now()
          }));
          
          const newJob: PrintJob = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleString('pt-BR'),
            status: "success",
            description: "Impressora Wi-Fi conectada",
            content: deviceId
          };
          addPrintJob(newJob);
          
          toast({
            title: "✅ Conectado",
            description: `Impressora Wi-Fi conectada em ${deviceId}`,
          });
        } else {
          throw new Error("Falha ao conectar com impressora Wi-Fi");
        }
      } else if (isNativeMode) {
        // Modo nativo Android com Bematech MP-4200 TH
        console.log('📱 Modo Android OTG detectado');
        console.log('🖨️  Impressora alvo: Bematech MP-4200 TH');
        
        console.log('⏳ Chamando nativePrintService.connectPrinter()...');
        const result = await nativePrintService.connectPrinter();
        
        console.log('📥 Resposta recebida:', JSON.stringify(result, null, 2));
        
        addDiagnosticLog({
          action: result.success ? "✅ Bematech Conectada" : "❌ Falha na Conexão",
          status: result.success ? "success" : "error",
          details: result.success 
            ? `Device: ${result.deviceId}\nVendor ID: 0x${result.vendorId?.toString(16)}\nProduct ID: 0x${result.productId?.toString(16)}\nModelo: Bematech MP-4200 TH`
            : `Erro: ${result.error}`,
          data: result
        });
        
        if (result.success) {
          setIsConnected(true);
          setConnectionError(undefined); // Limpa o erro quando conecta com sucesso
          const deviceId = `Bematech MP-4200 TH (VID:0x${result.vendorId?.toString(16)} PID:0x${result.productId?.toString(16)})`;
          setDeviceInfo(deviceId);
          
          setStatus(prev => ({
            ...prev,
            printerConnected: true,
            deviceId: result.deviceId || "unknown",
            lastCheck: Date.now()
          }));
          
          const newJob: PrintJob = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleString('pt-BR'),
            status: "success",
            description: "✅ Bematech MP-4200 TH conectada",
            content: `${deviceId}\nPronta para imprimir via comandos ESC/POS`
          };
          addPrintJob(newJob);
          
          console.log('✅ CONEXÃO ESTABELECIDA COM SUCESSO');
          console.log('🖨️  Impressora pronta para receber comandos ESC/POS');
          
          toast({
            title: "✅ Bematech Conectada",
            description: "Impressora Bematech MP-4200 TH pronta para uso!",
          });
        } else {
          // Salva o erro para exibir troubleshooting
          setConnectionError(result.error || "Falha na conexão com Bematech MP-4200 TH");
          throw new Error(result.error || "Falha na conexão com Bematech MP-4200 TH");
        }
      } else {
        // Modo WebUSB (navegador)
        const device = await webusbPrinter.requestDevice();
        if (device) {
          await webusbPrinter.connect(device);
          setIsConnected(true);
          setConnectionError(undefined); // Limpa o erro quando conecta com sucesso
          setShowUSBPermissionHelp(false);
          
          const info = webusbPrinter.getDeviceInfo();
          const deviceId = `${info.name || 'Desconhecido'} (VID: ${device.vendorId}, PID: ${device.productId})`;
          setDeviceInfo(deviceId);
          
          // Garante que o serviço de impressão saiba que existe uma impressora USB ativa
          printService.saveConfig({
            type: 'usb',
            name: info.name || 'Impressora WebUSB',
          });
          
          setStatus(prev => ({
            ...prev,
            printerConnected: true,
            deviceId: deviceId,
            lastCheck: Date.now()
          }));
          
          const newJob: PrintJob = {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleString('pt-BR'),
            status: "success",
            description: "Impressora conectada com sucesso (WebUSB)",
            content: deviceId
          };
          addPrintJob(newJob);
          
          toast({
            title: "Conectado",
            description: "Impressora conectada com sucesso!",
          });
        }
      }
    } catch (error) {
      console.error("Erro ao conectar impressora:", error);
      
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Detecta erro de permissão USB e mostra helper automaticamente
      const isPermissionError = errorMsg.includes('Acesso negado') || 
                                 errorMsg.includes('Access denied') ||
                                 errorMsg.includes('SecurityError');
      
      if (isPermissionError && connectionMethod === 'usb') {
        setShowUSBPermissionHelp(true);
      }
      
      // Salva o erro para exibir troubleshooting
      setConnectionError(errorMsg);
      
      setStatus(prev => ({
        ...prev,
        printerConnected: false,
        deviceId: "",
        lastCheck: Date.now()
      }));
      
      const newJob: PrintJob = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('pt-BR'),
        status: "error",
        description: `Erro ao conectar: ${errorMsg}`,
      };
      addPrintJob(newJob);
      
      toast({
        title: "❌ Erro ao conectar",
        description: isPermissionError && connectionMethod === 'usb'
          ? "Acesso USB negado. Veja o guia de solução abaixo." 
          : errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestPrint = async () => {
    if (!isConnected) {
      toast({
        title: "Impressora não conectada",
        description: "Conecte uma impressora antes de testar",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    
    console.log('='.repeat(60));
    console.log('INICIANDO TESTE DE IMPRESSÃO');
    console.log('='.repeat(60));
    console.log('Modo:', isNativeMode ? 'OTG Android' : 'WebUSB/Wi-Fi');
    console.log('='.repeat(60));
    
    try {
      if (isNativeMode && connectionMethod === 'usb') {
        console.log('📝 Chamando nativePrintService.testPrint()...');
        const success = await nativePrintService.testPrint("TECNOBOOK - Sistema de Ordens");
        
        console.log('📥 Resposta:', success ? '✅ SUCESSO' : '❌ FALHA');
        
        const newJob: PrintJob = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString('pt-BR'),
          status: success ? "success" : "error",
          description: success ? "✅ Teste impresso na Bematech" : "❌ Falha no teste",
          content: success 
            ? "Cupom de teste com cabeçalho, formatações e corte de papel" 
            : "Verifique conexão USB OTG"
        };
        addPrintJob(newJob);
        
        if (success) {
          console.log('✅ TESTE DE IMPRESSÃO CONCLUÍDO');
          toast({
            title: "✅ Teste enviado à Bematech",
            description: "Verifique se o cupom foi impresso na Bematech MP-4200 TH",
          });
        } else {
          throw new Error("Falha ao enviar comandos ESC/POS - verifique conexão USB");
        }
      } else {
        await printService.testPrint("TECNOBOOK - Teste WebUSB");
        
        const newJob: PrintJob = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString('pt-BR'),
          status: "success",
          description: `Teste de impressão (WebUSB)`,
          content: "Impresso: Cupom de teste"
        };
        addPrintJob(newJob);
        
        toast({
          title: "Teste realizado",
          description: "Impressão de teste enviada com sucesso!",
        });
      }
    } catch (error) {
      console.error("Erro no teste de impressão:", error);
      
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      
      const newJob: PrintJob = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('pt-BR'),
        status: "error",
        description: `Erro no teste: ${errorMsg}`,
      };
      addPrintJob(newJob);
      
      toast({
        title: "❌ Erro no teste",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestNetworkConnection = () => {
    // Valida formato do IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    
    if (!networkPrinterIP) {
      toast({
        title: "IP obrigatório",
        description: "Informe o endereço IP da impressora",
        variant: "destructive",
      });
      return;
    }
    
    if (!ipRegex.test(networkPrinterIP)) {
      toast({
        title: "IP inválido",
        description: "Digite um endereço IP válido (ex: 192.168.0.129)",
        variant: "destructive",
      });
      return;
    }

    setConnectionTestResult('success');
    
    toast({
      title: "✅ IP validado",
      description: "Clique em 'Conectar Impressora de Rede' para testar a conexão real",
    });
  };

  const handleTestLevel = async (level: 1 | 2 | 3 | 4) => {
    if (!isConnected) {
      toast({
        title: "Impressora não conectada",
        description: "Conecte uma impressora antes de testar",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    
    const levelNames = {
      1: "Nível 1: INIT apenas",
      2: "Nível 2: INIT + Texto",
      3: "Nível 3: Com formatação",
      4: "Nível 4: Com corte"
    };

    try {
      if (!isNativeMode) {
        toast({
          title: "Não disponível",
          description: "Testes progressivos só funcionam em Android OTG",
          variant: "destructive",
        });
        return;
      }

      let result = false;
      switch (level) {
        case 1:
          result = await nativePrintService.testLevel1Init();
          break;
        case 2:
          result = await nativePrintService.testLevel2Text();
          break;
        case 3:
          result = await nativePrintService.testLevel3Format();
          break;
        case 4:
          result = await nativePrintService.testLevel4Cut();
          break;
      }

      const newJob: PrintJob = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString('pt-BR'),
        status: result ? "success" : "error",
        description: `${levelNames[level]}`,
        content: result ? "Comando enviado" : "Falha no envio"
      };
      addPrintJob(newJob);

      if (result) {
        toast({
          title: `${levelNames[level]} OK`,
          description: "Comando enviado com sucesso",
        });
      } else {
        toast({
          title: `${levelNames[level]} Falhou`,
          description: "Verifique os diagnósticos",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const toggleSounds = () => {
    const newState = !soundsEnabled;
    setSoundsEnabled(newState);
    notificationSounds.setEnabled(newState);
    
    // Feedback visual e sonoro
    if (newState) {
      notificationSounds.playSuccess();
      toast({
        title: "🔔 Sons ativados",
        description: "Você receberá notificações sonoras dos jobs",
      });
    } else {
      toast({
        title: "🔕 Sons desativados",
        description: "Notificações sonoras foram desativadas",
      });
    }
  };

  const handleScanNetwork = async () => {
    setIsScanning(true);
    setScanResults([]);

    toast({
      title: "🔍 Buscando impressoras",
      description: "Testando conexões na rede...",
    });

    const commonIPs = [
      '192.168.0.100', '192.168.0.101', '192.168.0.200',
      '192.168.1.100', '192.168.1.101', '192.168.1.200',
      '10.0.0.100', '10.0.0.101', '10.0.0.200'
    ];

    const results: Array<{ ip: string; port: number; status: string }> = [];

    for (const ip of commonIPs) {
      try {
        const response = await supabase.functions.invoke('network-print-test', {
          body: { ip, port: 9100 }
        });

        if (response.data?.success) {
          results.push({ ip, port: 9100, status: 'online' });
        }
      } catch (error) {
        // Ignora erros de conexão
      }
    }

    setScanResults(results);
    setIsScanning(false);

    if (results.length > 0) {
      toast({
        title: "✅ Impressoras encontradas",
        description: `${results.length} impressora(s) detectada(s)`,
      });
    } else {
      toast({
        title: "⚠️ Nenhuma impressora encontrada",
        description: "Verifique se a impressora está ligada e na mesma rede",
        variant: "destructive",
      });
    }
  };

  const handleTestConnection = async () => {
    if (!networkPrinterIP) {
      toast({
        title: "IP obrigatório",
        description: "Informe o endereço IP da impressora",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);

    try {
      const response = await supabase.functions.invoke('network-print-test', {
        body: { ip: networkPrinterIP, port: networkPrinterPort }
      });

      if (response.data?.success) {
        setConnectionTestResult('success');
        toast({
          title: "✅ Conexão bem-sucedida",
          description: "Impressora respondeu corretamente",
        });
      } else {
        setConnectionTestResult('error');
        toast({
          title: "❌ Falha na conexão",
          description: response.data?.error || "Não foi possível conectar",
          variant: "destructive",
        });
      }
    } catch (error) {
      setConnectionTestResult('error');
      toast({
        title: "❌ Erro ao testar",
        description: "Verifique o IP e se a impressora está ligada",
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const getStatusBadge = () => {
    if (!usbHostSupported) {
      return (
        <Badge variant="destructive" className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Sem suporte USB Host
        </Badge>
      );
    }
    
    if (isConnected) {
      return (
        <Badge variant="default" className="flex items-center gap-2 bg-green-500">
          <CheckCircle className="w-4 h-4" />
          Conectada
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="flex items-center gap-2">
        <XCircle className="w-4 h-4" />
        Desconectada
      </Badge>
    );
  };

  // Aguarda verificação de autorização
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <div className="w-16 h-16 rounded-full gradient-primary animate-pulse shadow-glow" />
      </div>
    );
  }

  // Se não autorizado, não renderiza nada (o useEffect vai redirecionar)
  if (isAuthorized === false) {
    return null;
  }

  const isOnlineForRemoteJobs = realtimeStatus === "connected" && isConnected;

  return (
    <div className="min-h-screen gradient-dark flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Ponte de Impressão</h1>
              <p className="text-sm text-muted-foreground">Módulo OTG/USB</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Badge de Status Grande - PRONTO PARA IMPRIMIR */}
            {isOnlineForRemoteJobs && (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600 px-4 py-2 text-base font-bold animate-pulse">
                <Zap className="w-5 h-5 mr-2" />
                ✅ PRONTO PARA IMPRIMIR
              </Badge>
            )}
            
            {/* Indicador de Fila */}
            {pendingQueueCount > 0 && (
              <Badge variant="secondary" className="bg-orange-500 text-white hover:bg-orange-600 px-3 py-2 font-bold">
                <Clock className="w-4 h-4 mr-2" />
                {pendingQueueCount} na fila
              </Badge>
            )}
            
            {getStatusBadge()}
            
            <Button
              onClick={toggleSounds}
              variant="outline"
              size="icon"
              className="text-foreground hover:bg-white/10"
              title={soundsEnabled ? "Desativar sons" : "Ativar sons"}
            >
              {soundsEnabled ? (
                <Bell className="h-5 w-5" />
              ) : (
                <BellOff className="h-5 w-5" />
              )}
            </Button>
            <Button
              onClick={() => navigate('/print-bridge/profile')}
              variant="outline"
              size="icon"
              className="text-foreground hover:bg-white/10"
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Banner de Status Online/Offline */}
          <Card className={`border-2 ${isOnlineForRemoteJobs ? 'border-green-500 bg-green-500/10' : 'border-orange-500 bg-orange-500/10'}`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${isOnlineForRemoteJobs ? 'bg-green-500' : 'bg-orange-500'} shadow-lg`}>
                  {isOnlineForRemoteJobs ? (
                    <Wifi className="w-8 h-8 text-white" />
                  ) : (
                    <WifiOff className="w-8 h-8 text-white" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className={`text-2xl font-bold ${isOnlineForRemoteJobs ? 'text-green-500' : 'text-orange-500'}`}>
                      {isOnlineForRemoteJobs ? 'ONLINE' : 'OFFLINE'}
                    </h2>
                    <Badge 
                      variant={isOnlineForRemoteJobs ? "default" : "secondary"}
                      className={isOnlineForRemoteJobs ? "bg-green-500" : ""}
                    >
                      {isOnlineForRemoteJobs ? 'Pronto para receber jobs' : 'Não está recebendo jobs'}
                    </Badge>
                  </div>
                  
                  {isOnlineForRemoteJobs ? (
                    <div className="space-y-2">
                      <p className="text-foreground font-medium">
                        ✅ Esta ponte está visível para o backend e pronta para receber trabalhos de impressão remotos.
                      </p>
                      {pendingQueueCount > 0 && (
                        <Alert className="bg-orange-500/10 border-orange-500">
                          <Clock className="h-4 w-4 text-orange-500" />
                          <AlertDescription className="text-orange-500 font-medium">
                            🔄 {pendingQueueCount} job(s) aguardando na fila. Serão processados automaticamente.
                          </AlertDescription>
                        </Alert>
                      )}
                      <p className="text-muted-foreground text-sm">
                        Quando usuários Admin ou Atendente clicarem em "Imprimir" em qualquer módulo do sistema, 
                        os jobs serão enviados automaticamente para esta ponte.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-orange-500 font-medium">
                        ⚠️ Esta ponte NÃO está visível para o backend. Impressões remotas não funcionarão.
                      </p>
                      
                      <div className="bg-background/50 rounded-lg p-4 space-y-2">
                        <p className="text-foreground font-medium text-sm">Para ficar ONLINE:</p>
                        <ul className="text-muted-foreground text-sm space-y-1 ml-4">
                          {!isConnected && (
                            <li className="flex items-start gap-2">
                              <span className="text-orange-500 mt-0.5">▸</span>
                              <span>Conecte uma impressora USB/OTG usando o botão "Conectar Impressora"</span>
                            </li>
                          )}
                          {realtimeStatus !== "connected" && (
                            <li className="flex items-start gap-2">
                              <span className="text-orange-500 mt-0.5">▸</span>
                              <span>Aguarde a conexão com o backend (status Realtime: {realtimeStatus})</span>
                            </li>
                          )}
                          <li className="flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">▸</span>
                            <span>Mantenha esta página aberta (não minimize o app/navegador)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-orange-500 mt-0.5">▸</span>
                            <span>Certifique-se de estar logado com usuário que tem permissão "print_bridge"</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Indicador de Job em Processamento */}
          {processingJobId && (
            <Card className="border-2 border-blue-500 bg-blue-500/10 animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500">
                    <Printer className="w-5 h-5 text-white animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground font-medium">
                      🖨️ Processando impressão...
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Job ID: {processingJobId.slice(0, 8)}... • Enviando dados para impressora
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Helper de Permissões USB - exibido quando há erro de permissão */}
          {showUSBPermissionHelp && (
            <USBPermissionHelper />
          )}
          
          {/* USB Host Alert */}
          {!usbHostSupported && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Este dispositivo ou navegador não possui suporte a USB Host. 
                Use um dispositivo Android com suporte OTG ou um navegador compatível (Chrome, Edge, Opera).
              </AlertDescription>
            </Alert>
          )}

          {/* System Status Card */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Usb className="w-5 h-5" />
                Status do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Modo</p>
                  <Badge variant="outline" className="gap-1">
                    {isNativeMode ? (
                      <>
                        <Smartphone className="h-3 w-3" />
                        OTG Nativo
                      </>
                    ) : (
                      "WebUSB"
                    )}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Backend</p>
                  <Badge 
                    variant={realtimeStatus === "connected" ? "default" : realtimeStatus === "reconnecting" ? "secondary" : "destructive"}
                    className="gap-1"
                  >
                    {realtimeStatus === "connected" ? (
                      <>
                        <Wifi className="h-3 w-3" />
                        Conectado
                      </>
                    ) : realtimeStatus === "reconnecting" ? (
                      "Reconectando..."
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3" />
                        Desconectado
                      </>
                    )}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">USB Host</p>
                  <Badge variant={usbHostSupported ? "default" : "destructive"}>
                    {usbHostSupported ? "Suportado" : "Não suportado"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Impressora</p>
                  <Badge variant={status.printerConnected ? "default" : "secondary"}>
                    {status.printerConnected ? "Conectada" : "Desconectada"}
                  </Badge>
                </div>
              </div>
              {deviceInfo && (
                <div className="space-y-1 pt-2 border-t border-border/30">
                  <p className="text-xs text-muted-foreground">Dispositivo USB</p>
                  <p className="text-sm font-mono text-foreground bg-background/50 p-2 rounded">
                    {deviceInfo}
                  </p>
                </div>
              )}
              <div className="space-y-1 pt-2 border-t border-border/30">
                <p className="text-xs text-muted-foreground">Última verificação</p>
                <p className="text-sm text-foreground">
                  {new Date(status.lastCheck).toLocaleString('pt-BR')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Connection Card */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Conexão com Impressora</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Troubleshooting Guide - Aparece quando há erro de conexão */}
              {connectionError && (
                <PrinterTroubleshooting 
                  error={connectionError}
                  platform={isNativeMode ? 'android' : 'web'}
                />
              )}
              
              {/* Seletor de Método: USB vs Wi-Fi */}
              <Tabs value={connectionMethod} onValueChange={(v) => setConnectionMethod(v as ConnectionMethod)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="usb" disabled={isConnected}>
                    <Usb className="w-4 h-4 mr-2" />
                    USB
                  </TabsTrigger>
                  <TabsTrigger value="wifi" disabled={isConnected}>
                    <Wifi className="w-4 h-4 mr-2" />
                    Wi-Fi
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="usb" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Conecte uma impressora via USB/OTG. Certifique-se de que a impressora está ligada.
                  </p>
                  
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Use Chrome, Edge ou Opera no PC. Em Android, use cabo OTG.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
                
                <TabsContent value="wifi" className="space-y-4 mt-4">
                  <Alert className="bg-blue-500/10 border-blue-500/50">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        Instruções para conexão Wi-Fi:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
                        <li>Certifique-se que a impressora está conectada na mesma rede Wi-Fi</li>
                        <li>Clique em "Buscar Impressoras na Rede" para encontrar automaticamente</li>
                        <li>Ou insira o endereço IP manualmente</li>
                        <li>Teste a conexão e salve a configuração</li>
                      </ol>
                    </div>
                  </Alert>

                  <div className="space-y-3">
                    <Button
                      onClick={handleScanNetwork}
                      disabled={isScanning}
                      variant="outline"
                      className="w-full"
                    >
                      {isScanning ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Buscando...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4 mr-2" />
                          Buscar Impressoras na Rede
                        </>
                      )}
                    </Button>

                    {scanResults.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Impressoras Encontradas:</Label>
                        <div className="space-y-2">
                          {scanResults.map((result, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              className="w-full justify-start"
                              onClick={() => {
                                setNetworkPrinterIP(result.ip);
                                setNetworkPrinterPort(result.port.toString());
                              }}
                            >
                              <Wifi className="w-4 h-4 mr-2 text-green-500" />
                              <div className="text-left">
                                <p className="font-medium">{result.ip}:{result.port}</p>
                                <p className="text-xs text-muted-foreground">Online e disponível</p>
                              </div>
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Label htmlFor="network-ip" className="text-sm">Endereço IP</Label>
                        <Input
                          id="network-ip"
                          value={networkPrinterIP}
                          onChange={(e) => setNetworkPrinterIP(e.target.value)}
                          placeholder="192.168.0.129"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="network-port" className="text-sm">Porta</Label>
                        <Input
                          id="network-port"
                          value={networkPrinterPort}
                          onChange={(e) => setNetworkPrinterPort(e.target.value)}
                          placeholder="9100"
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleTestConnection}
                      disabled={isTestingConnection || !networkPrinterIP}
                      variant="secondary"
                      className="w-full"
                    >
                      {isTestingConnection ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Testando...
                        </>
                      ) : (
                        <>
                          <Network className="w-4 h-4 mr-2" />
                          Testar Conexão
                        </>
                      )}
                    </Button>

                    {connectionTestResult && (
                      <Alert variant={connectionTestResult === 'success' ? 'default' : 'destructive'}>
                        {connectionTestResult === 'success' ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            <AlertDescription>
                              Impressora respondeu! Use o botão "Conectar Impressora Wi-Fi" abaixo.
                            </AlertDescription>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4" />
                            <AlertDescription>
                              Falha na conexão. Verifique IP e se a impressora está ligada.
                            </AlertDescription>
                          </>
                        )}
                      </Alert>
                    )}
                  </div>
                </TabsContent>
                
                
              </Tabs>

              <div className="grid gap-3">
                <Button 
                  onClick={handleConnect} 
                  disabled={isConnecting || isConnected || (!usbHostSupported && connectionMethod === 'usb')}
                  className="w-full h-14 text-lg gradient-primary shadow-glow"
                >
                  <Printer className="w-5 h-5 mr-2" />
                  {isConnecting ? "Conectando..." : isConnected ? "Impressora Conectada" :
                    connectionMethod === 'usb' ? "Conectar Impressora USB" : "Conectar Impressora Wi-Fi"}
                </Button>
                
                <Button 
                  onClick={handleTestPrint} 
                  disabled={!isConnected || isTesting}
                  variant="outline"
                  className="w-full h-12"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  {isTesting ? "Testando..." : "Teste Completo"}
                </Button>

                {isNativeMode && isConnected && connectionMethod === 'usb' && (
                  <div className="space-y-2 pt-2 border-t border-border/30">
                    <p className="text-xs text-muted-foreground">
                      💡 Use o painel "Diagnóstico Bematech" abaixo para testes progressivos detalhados
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bematech Diagnostics Component */}
          <BematechDiagnostics 
            isConnected={isConnected}
            isNativeMode={isNativeMode}
          />

          {/* Print Jobs Log */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Histórico Local
                </div>
                  <Badge variant="outline" className="text-xs">
                    {printJobs.length} / 5 registros
                  </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {printJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Nenhum trabalho de impressão registrado</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {printJobs.map((job) => (
                    <div 
                      key={job.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/30 hover:bg-background/70 transition-colors"
                    >
                      {job.status === "success" ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{job.description}</p>
                        {job.content && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {job.content}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{job.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline de Jobs do Banco */}
          <PrintJobTimeline />

          {/* Testes Automáticos */}
          <PrintBridgeTests isNativeMode={isNativeMode} />
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur border-t border-border/50 p-4 safe-area-bottom">
        <div className="max-w-4xl mx-auto grid grid-cols-2 gap-3">
          <Button 
            onClick={() => navigate('/print-bridge/profile')}
            variant="outline"
          >
            <User className="w-4 h-4 mr-2" />
            Perfil do Dispositivo
          </Button>
          <Button 
            onClick={handleLogout} 
            variant="outline"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PrintBridge;
