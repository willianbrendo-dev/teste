import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Printer, CheckCircle, XCircle, Usb, Network, AlertCircle, Search, Wifi } from "lucide-react";
import { printService, PrinterConfig } from "@/lib/printer/print-service";
import { webusbPrinter } from "@/lib/printer/webusb";
import { supabase } from "@/integrations/supabase/client";

const PrinterConfigPage = () => {
  const { toast } = useToast();
  const [printerType, setPrinterType] = useState<"usb" | "network">("usb");
  const [printerName, setPrinterName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [port, setPort] = useState("9100");
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [savedConfig, setSavedConfig] = useState<PrinterConfig | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<string[]>([]);

  useEffect(() => {
    // Load saved configuration
    const config = printService.loadConfig();
    if (config) {
      setSavedConfig(config);
      if (config.type === "usb" || config.type === "network") {
        setPrinterType(config.type);
      }
      setPrinterName(config.name);
      if (config.ipAddress) setIpAddress(config.ipAddress);
      if (config.port) setPort(config.port.toString());
    }

    // Check if WebUSB is supported
    if (!(webusbPrinter.constructor as typeof import("@/lib/printer/webusb").WebUSBPrinter).isSupported()) {
      toast({
        title: "WebUSB não suportado",
        description: "Use um navegador baseado em Chrome para conectar via USB.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleConnectUSB = async () => {
    try {
      const device = await webusbPrinter.requestDevice();
      await webusbPrinter.connect(device);
      
      const deviceInfo = webusbPrinter.getDeviceInfo();
      if (deviceInfo) {
        setPrinterName(deviceInfo.name);
        setIsConnected(true);
        toast({
          title: "Impressora conectada",
          description: `Conectado a ${deviceInfo.name}`,
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao conectar",
        description: error instanceof Error ? error.message : "Falha ao conectar com a impressora",
        variant: "destructive",
      });
    }
  };

  const handleSaveConfig = () => {
    if (!printerName) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para a impressora",
        variant: "destructive",
      });
      return;
    }

    if (printerType === "network" && !ipAddress) {
      toast({
        title: "IP obrigatório",
        description: "Digite o endereço IP da impressora",
        variant: "destructive",
      });
      return;
    }

    const config: PrinterConfig = {
      type: printerType,
      name: printerName,
      ...(printerType === "network" && {
        ipAddress,
        port: parseInt(port) || 9100,
      }),
    };

    printService.saveConfig(config);
    setSavedConfig(config);
    
    toast({
      title: "Configuração salva",
      description: "As configurações da impressora foram salvas com sucesso.",
    });
  };

  const handleScanNetwork = async () => {
    // Common printer IPs to suggest
    const commonIPs = [
      "192.168.1.100", "192.168.1.101", "192.168.1.200",
      "192.168.0.100", "192.168.0.101", "192.168.0.200",
      "10.0.0.100", "10.0.0.101", "10.0.0.200",
    ];
    
    setScanResults(commonIPs);
    toast({
      title: "IPs Comuns Sugeridos",
      description: "Selecione ou insira o IP da sua impressora",
    });
  };

  const handleTestConnection = async () => {
    if (!ipAddress) {
      toast({
        title: "IP obrigatório",
        description: "Digite o endereço IP da impressora",
        variant: "destructive",
      });
      return;
    }

    // Para IPs de rede local, apenas marcar como configurado
    setIsConnected(true);
    toast({
      title: "IP Configurado",
      description: "Verifique o IP e teste com uma impressão real",
    });
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    try {
      await printService.testPrint("Sistema de Ordem de Serviço");
      toast({
        title: "Teste enviado",
        description: "Comando de impressão enviado. Verifique a impressora.",
      });
    } catch (error) {
      toast({
        title: "Erro ao imprimir",
        description: error instanceof Error ? error.message : "Falha ao enviar para a impressora",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Printer className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Configuração de Impressora</h1>
            <p className="text-muted-foreground">Configure sua impressora térmica Bematech MP-4200 TH</p>
          </div>
        </div>

        {savedConfig && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Impressora Configurada
                </CardTitle>
                <Badge variant="outline" className="bg-background">
                  {savedConfig.type === "usb" ? "USB" : "Rede"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{savedConfig.name}</p>
              {savedConfig.type === "network" && (
                <p className="text-sm text-muted-foreground">
                  {savedConfig.ipAddress}:{savedConfig.port}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Tipo de Conexão</CardTitle>
            <CardDescription>Selecione como a impressora está conectada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup value={printerType} onValueChange={(v) => setPrinterType(v as "usb" | "network")}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="usb" id="usb" />
                <Label htmlFor="usb" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Usb className="h-4 w-4" />
                  <div>
                    <p className="font-medium">USB</p>
                    <p className="text-sm text-muted-foreground">Conexão direta via USB (requer Chrome)</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg">
                <RadioGroupItem value="network" id="network" />
                <Label htmlFor="network" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Wifi className="h-4 w-4" />
                  <div>
                    <p className="font-medium">Wi-Fi</p>
                    <p className="text-sm text-muted-foreground">Buscar e conectar via rede sem fio</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {printerType === "usb" && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        Instruções para conexão USB:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
                        <li>Conecte a impressora Bematech MP-4200 TH na porta USB</li>
                        <li>Clique em "Conectar Impressora USB" abaixo</li>
                        <li>Selecione a impressora na janela que aparecer</li>
                        <li>Após conectar, salve a configuração</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleConnectUSB} 
                  className="w-full"
                  variant="outline"
                  disabled={isConnected}
                >
                  {isConnected ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Conectado
                    </>
                  ) : (
                    <>
                      <Usb className="mr-2 h-4 w-4" />
                      Conectar Impressora USB
                    </>
                  )}
                </Button>

                <div className="space-y-2">
                  <Label htmlFor="printer-name">Nome da Impressora</Label>
                  <Input
                    id="printer-name"
                    value={printerName}
                    onChange={(e) => setPrinterName(e.target.value)}
                    placeholder="Ex: Bematech MP-4200 TH"
                  />
                </div>
              </div>
            )}

            {printerType === "network" && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex gap-3">
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
                  </div>
                </div>

                <Button 
                  onClick={handleScanNetwork} 
                  variant="outline"
                  className="w-full"
                >
                  <Search className="mr-2 h-4 w-4" />
                  Ver IPs Comuns
                </Button>

                {scanResults.length > 0 && (
                  <div className="space-y-2">
                    <Label>IPs Comuns de Impressoras</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {scanResults.map((ip) => (
                        <Button
                          key={ip}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => {
                            setIpAddress(ip);
                            setScanResults([]);
                          }}
                        >
                          <Network className="mr-2 h-4 w-4" />
                          {ip}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="printer-name">Nome da Impressora</Label>
                  <Input
                    id="printer-name"
                    value={printerName}
                    onChange={(e) => setPrinterName(e.target.value)}
                    placeholder="Ex: Bematech Rede"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ip-address">Endereço IP</Label>
                  <Input
                    id="ip-address"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    placeholder="192.168.1.100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="port">Porta</Label>
                  <Input
                    id="port"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="9100"
                  />
                </div>

                <Button 
                  onClick={handleTestConnection}
                  variant="outline"
                  className="w-full"
                  disabled={!ipAddress}
                >
                  {isConnected ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      IP Configurado
                    </>
                  ) : (
                    "Confirmar IP"
                  )}
                </Button>
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleSaveConfig} className="flex-1">
                Salvar Configuração
              </Button>
              <Button 
                onClick={handleTestPrint} 
                variant="outline"
                disabled={!printService.isConfigured() || isTesting}
              >
                {isTesting ? "Imprimindo..." : "Teste de Impressão"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compatibilidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Impressora Térmica ESC/POS</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Compatível
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Bematech MP-4200 TH</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Testado
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Navegador Chrome/Edge</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Recomendado
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PrinterConfigPage;
