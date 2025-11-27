// Network printer service for TCP/IP Ethernet printing
import { PrinterConfig } from './print-service';

export class NetworkPrinterService {
  async print(config: PrinterConfig, data: Uint8Array): Promise<void> {
    if (!config.ipAddress || !config.port) {
      throw new Error('IP e porta são obrigatórios para impressão em rede');
    }

    console.log('=== Iniciando impressão via rede ===');
    console.log('IP:', config.ipAddress);
    console.log('Porta:', config.port);
    console.log('Tamanho dos dados:', data.length, 'bytes');

    try {
      // Convert Uint8Array to base64 for transmission
      const base64Data = btoa(String.fromCharCode(...Array.from(data)));

      // Send to edge function that will handle TCP connection
      const response = await fetch(
        `https://uisvtoooeutqmklgbkxy.supabase.co/functions/v1/network-print`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ip: config.ipAddress,
            port: config.port,
            data: base64Data,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao enviar para impressora de rede');
      }

      const result = await response.json();
      console.log('✓ Impressão via rede concluída:', result);
    } catch (error) {
      console.error('Erro na impressão via rede:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Falha ao conectar com a impressora de rede'
      );
    }
  }

  async testConnection(ip: string, port: number): Promise<boolean> {
    try {
      const response = await fetch(
        `https://uisvtoooeutqmklgbkxy.supabase.co/functions/v1/network-print-test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ip, port }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Erro ao testar conexão:', error);
      return false;
    }
  }
}

export const networkPrinterService = new NetworkPrinterService();

// Classe para gerenciar conexão direta com impressora de rede
// (similar à interface do webusbPrinter para consistência)
export class NetworkPrinter {
  private ip: string;
  private port: number;
  private connected: boolean = false;

  constructor(ip: string, port: number) {
    this.ip = ip;
    this.port = port;
  }

  async connect(): Promise<boolean> {
    try {
      console.log(`🌐 Testando conexão com impressora de rede ${this.ip}:${this.port}...`);
      const isReachable = await networkPrinterService.testConnection(this.ip, this.port);
      
      if (isReachable) {
        this.connected = true;
        console.log(`✅ Conexão estabelecida com ${this.ip}:${this.port}`);
      } else {
        console.warn(`⚠️ Não foi possível conectar com ${this.ip}:${this.port}`);
      }
      
      return this.connected;
    } catch (error) {
      console.error('Erro ao conectar impressora de rede:', error);
      this.connected = false;
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log(`🔌 Desconectado de ${this.ip}:${this.port}`);
  }

  async print(data: Uint8Array): Promise<void> {
    if (!this.connected) {
      throw new Error('Impressora de rede não está conectada');
    }

    await networkPrinterService.print(
      {
        type: 'network',
        name: `Impressora de Rede ${this.ip}`,
        ipAddress: this.ip,
        port: this.port,
      },
      data
    );
  }

  isConnected(): boolean {
    return this.connected;
  }

  getDeviceInfo() {
    return {
      id: `${this.ip}:${this.port}`,
      name: `Impressora de Rede`,
      type: 'network' as const,
      connected: this.connected,
      ipAddress: this.ip,
      port: this.port,
    };
  }
}
