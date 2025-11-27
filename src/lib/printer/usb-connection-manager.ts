/**
 * Gerenciador de Conexão USB/OTG
 * Implementa lógica robusta de conexão, retry e recuperação
 * Baseado em melhores práticas para impressoras Bematech MP-4200 TH
 */

import { Capacitor } from '@capacitor/core';
import OTGPrint from './otg-printer';

export interface USBDeviceInfo {
  deviceId: string;
  vendorId: number;
  productId: number;
  connected: boolean;
  lastError?: string;
  lastSuccessfulPrint?: Date;
}

export interface ConnectionConfig {
  maxRetries: number;
  retryDelayMs: number;
  connectionTimeoutMs: number;
  transferTimeoutMs: number;
}

const DEFAULT_CONFIG: ConnectionConfig = {
  maxRetries: 3,
  retryDelayMs: 500,
  connectionTimeoutMs: 5000,
  transferTimeoutMs: 3000,
};

export class USBConnectionManager {
  private device: USBDeviceInfo | null = null;
  private config: ConnectionConfig;
  private isAndroid = Capacitor.getPlatform() === 'android';
  private connectionAttempts = 0;
  private lastConnectionTime: Date | null = null;

  constructor(config: Partial<ConnectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Conecta à impressora com retry automático
   */
  async connect(): Promise<USBDeviceInfo> {
    if (!this.isAndroid) {
      throw new Error('USB OTG only supported on Android');
    }

    this.connectionAttempts = 0;

    while (this.connectionAttempts < this.config.maxRetries) {
      this.connectionAttempts++;

      try {
        console.log(`[USB Manager] Tentativa de conexão ${this.connectionAttempts}/${this.config.maxRetries}`);

        const result = await this.attemptConnection();
        
        if (result.success) {
          this.device = {
            deviceId: result.deviceId || 'unknown',
            vendorId: result.vendorId || 0,
            productId: result.productId || 0,
            connected: true,
          };
          
          this.lastConnectionTime = new Date();
          console.log('[USB Manager] ✓ Conectado com sucesso:', this.device);
          
          return this.device;
        }

        throw new Error(result.error || 'Connection failed');

      } catch (error) {
        console.error(`[USB Manager] Tentativa ${this.connectionAttempts} falhou:`, error);

        if (this.connectionAttempts >= this.config.maxRetries) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Falha ao conectar após ${this.config.maxRetries} tentativas: ${errorMsg}`);
        }

        // Aguarda antes de tentar novamente
        await this.delay(this.config.retryDelayMs * this.connectionAttempts);
      }
    }

    throw new Error('Failed to connect to printer');
  }

  /**
   * Tenta conexão única
   */
  private async attemptConnection() {
    return await Promise.race([
      OTGPrint.connectToUsbPrinter(),
      this.timeout(this.config.connectionTimeoutMs, 'Connection timeout'),
    ]);
  }

  /**
   * Desconecta da impressora
   */
  async disconnect(): Promise<boolean> {
    if (!this.isAndroid || !this.device) {
      return false;
    }

    try {
      const result = await OTGPrint.disconnectUsbPrinter();
      
      if (result.success) {
        console.log('[USB Manager] ✓ Desconectado com sucesso');
        this.device = null;
        this.lastConnectionTime = null;
        return true;
      }

      return false;
    } catch (error) {
      console.error('[USB Manager] Erro ao desconectar:', error);
      this.device = null;
      return false;
    }
  }

  /**
   * Verifica status da conexão
   */
  async getStatus(): Promise<USBDeviceInfo | null> {
    if (!this.isAndroid) {
      return null;
    }

    try {
      const status = await OTGPrint.getPrinterStatus();
      
      if (status.connected) {
        // Se já temos um device registrado, atualiza o status
        if (this.device) {
          this.device.connected = true;
          return this.device;
        }
        
        // Se não temos device registrado mas a impressora está conectada,
        // cria um novo device com as informações disponíveis
        console.log('[USB Manager] ✓ Impressora detectada automaticamente:', status);
        this.device = {
          deviceId: status.deviceId || 'auto-detected',
          vendorId: status.vendorId || 0,
          productId: status.productId || 0,
          connected: true,
        };
        this.lastConnectionTime = new Date();
        return this.device;
      }

      // Impressora não está conectada
      this.device = null;
      return null;

    } catch (error) {
      console.error('[USB Manager] Erro ao verificar status:', error);
      this.device = null;
      return null;
    }
  }

  /**
   * Envia dados com retry automático
   */
  async sendData(data: Uint8Array): Promise<{ success: boolean; bytesSent?: number; error?: string }> {
    if (!this.isAndroid) {
      return { success: false, error: 'Not running on Android' };
    }

    if (!this.device?.connected) {
      return { success: false, error: 'Printer not connected' };
    }

    let attempt = 0;

    while (attempt < this.config.maxRetries) {
      attempt++;

      try {
        console.log(`[USB Manager] 📤 Enviando dados - tentativa ${attempt}/${this.config.maxRetries}`);
        console.log(`[USB Manager] - Tamanho: ${data.length} bytes`);
        console.log(`[USB Manager] - Device ID: ${this.device.deviceId}`);

        const result = await this.sendWithTimeout(data);

        console.log(`[USB Manager] 📥 Resultado da tentativa ${attempt}:`, JSON.stringify(result, null, 2));

        if (result.success) {
          console.log('[USB Manager] ✅ Dados enviados com sucesso:', result.bytesSent, 'bytes');
          console.log('[USB Manager] - Tentativas necessárias:', result.attempts || 1);
          
          if (this.device) {
            this.device.lastSuccessfulPrint = new Date();
            this.device.lastError = undefined;
          }

          return result;
        }

        throw new Error(result.error || 'Send failed');

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[USB Manager] ❌ Tentativa ${attempt} de envio falhou:`, errorMsg);

        if (this.device) {
          this.device.lastError = errorMsg;
        }

        if (attempt >= this.config.maxRetries) {
          console.error('[USB Manager] ❌ TODAS as tentativas falharam');
          return {
            success: false,
            error: `Falha ao enviar após ${this.config.maxRetries} tentativas: ${errorMsg}`,
          };
        }

        // Tenta reconectar se houver erro de transferência
        if (errorMsg.includes('transfer') || errorMsg.includes('timeout')) {
          console.log('[USB Manager] 🔄 Erro de transferência detectado. Tentando reconectar...');
          
          try {
            await this.disconnect();
            await this.delay(this.config.retryDelayMs);
            await this.connect();
            console.log('[USB Manager] ✅ Reconectado com sucesso');
          } catch (reconnectError) {
            console.error('[USB Manager] ❌ Falha na reconexão:', reconnectError);
          }
        }

        await this.delay(this.config.retryDelayMs * attempt);
      }
    }

    return { success: false, error: 'Failed to send data after all retries' };
  }

  /**
   * Envia dados com timeout
   */
  private async sendWithTimeout(data: Uint8Array) {
    const base64 = btoa(String.fromCharCode(...Array.from(data)));

    return await Promise.race([
      OTGPrint.sendEscPosBuffer({ data: base64 }),
      this.timeout(this.config.transferTimeoutMs, 'Transfer timeout'),
    ]);
  }

  /**
   * Cria um timeout como Promise
   */
  private timeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  /**
   * Delay assíncrono
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.device?.connected === true;
  }

  /**
   * Retorna informações do dispositivo
   */
  getDeviceInfo(): USBDeviceInfo | null {
    return this.device;
  }

  /**
   * Reseta o gerenciador
   */
  reset(): void {
    this.device = null;
    this.connectionAttempts = 0;
    this.lastConnectionTime = null;
  }
}

// Instância singleton
export const usbManager = new USBConnectionManager();
