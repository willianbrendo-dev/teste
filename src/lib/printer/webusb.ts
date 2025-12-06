// WebUSB printer connection manager
/// <reference path="./webusb.d.ts" />

export interface PrinterInfo {
  id: string;
  name: string;
  type: 'usb' | 'network' | 'serial';
  connected: boolean;
  vendorId?: number;
  productId?: number;
}

export class WebUSBPrinter {
  private device: USBDevice | null = null;
  private endpoint: USBEndpoint | null = null;

  // Check if WebUSB is supported
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  }

  // Request USB device access
  async requestDevice(): Promise<USBDevice> {
    if (!WebUSBPrinter.isSupported()) {
      throw new Error('WebUSB não é suportado neste navegador. Use Chrome, Edge ou Opera.');
    }

    try {
      console.log('Solicitando acesso ao dispositivo USB...');
      
      // Verifica se estamos em contexto seguro (HTTPS ou localhost)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        throw new Error(
          'WebUSB requer conexão segura (HTTPS). ' +
          'Acesse via HTTPS ou localhost para usar impressão USB.'
        );
      }
      
      // Request device with multiple vendor IDs including Bematech
      this.device = await navigator.usb!.requestDevice({
        filters: [
          { vendorId: 0x0dd4 }, // Bematech vendor ID
          { vendorId: 0x0483 }, // Bematech alternate VID
          { vendorId: 0x0b1b }, // Generic printer vendor ID
          { classCode: 0x07 }    // Printer class
        ]
      });

      console.log('Dispositivo USB selecionado:', {
        vendorId: this.device.vendorId,
        productId: this.device.productId,
        name: this.device.productName
      });

      return this.device;
    } catch (error) {
      console.error('Erro ao solicitar dispositivo USB:', error);
      
      if (error instanceof DOMException) {
        if (error.name === 'NotFoundError') {
          throw new Error('Nenhum dispositivo USB selecionado ou impressora não encontrada.');
        } else if (error.name === 'SecurityError') {
          throw new Error(
            'Acesso bloqueado por segurança. ' +
            'Certifique-se de estar em conexão HTTPS ou localhost.'
          );
        }
      }
      
      throw new Error('Falha ao solicitar acesso ao dispositivo USB: ' + (error instanceof Error ? error.message : 'erro desconhecido'));
    }
  }

  // Get already paired devices
  async getPairedDevices(): Promise<USBDevice[]> {
    if (!WebUSBPrinter.isSupported()) {
      return [];
    }

    return await navigator.usb!.getDevices();
  }

  // Connect to a specific device
  async connect(device: USBDevice): Promise<void> {
    try {
      console.log('Conectando ao dispositivo USB...');
      this.device = device;
      
      // Verifica se o dispositivo já está aberto
      if (this.device.opened) {
        console.log('Dispositivo já está aberto, fechando primeiro...');
        try {
          await this.device.close();
          // Pequeno delay para garantir que o SO libere o dispositivo
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (closeError) {
          console.warn('Aviso ao fechar dispositivo:', closeError);
        }
      }
      
      console.log('Abrindo dispositivo...');
      try {
        await this.device.open();
      } catch (openError) {
        console.error('Erro ao abrir dispositivo:', openError);
        
        // Verifica se é erro de permissão
        if (openError instanceof DOMException && openError.name === 'SecurityError') {
          throw new Error(
            'Acesso negado ao dispositivo USB. ' +
            'Verifique se:\n' +
            '1. Você concedeu permissão no navegador\n' +
            '2. Nenhuma outra aba/programa está usando a impressora\n' +
            '3. No Windows, desinstale drivers conflitantes da impressora (use apenas o driver do fabricante)\n' +
            '4. Reinicie o navegador e tente novamente'
          );
        }
        
        throw openError;
      }

      // Select configuration
      if (this.device.configuration === null) {
        console.log('Selecionando configuração 1...');
        await this.device.selectConfiguration(1);
      }

      console.log('Configuração ativa:', this.device.configuration?.configurationValue);

      // Find the printer interface and endpoint
      const interfaces = this.device.configuration?.interfaces || [];
      console.log(`Encontradas ${interfaces.length} interfaces`);
      
      for (const iface of interfaces) {
        console.log(`Tentando interface ${iface.interfaceNumber}...`);
        
        try {
          await this.device.claimInterface(iface.interfaceNumber);
          console.log(`Interface ${iface.interfaceNumber} reivindicada com sucesso`);

          // Find OUT endpoint for printing
          const endpoints = iface.alternate.endpoints;
          console.log(`Interface tem ${endpoints.length} endpoints:`, 
            endpoints.map(ep => ({ 
              num: ep.endpointNumber, 
              dir: ep.direction, 
              type: ep.type 
            }))
          );

          const outEndpoint = endpoints.find(
            (ep) => ep.direction === 'out' && (ep.type === 'bulk' || ep.type === 'interrupt')
          );

          if (outEndpoint) {
            this.endpoint = outEndpoint;
            console.log('Endpoint de saída encontrado:', {
              number: outEndpoint.endpointNumber,
              type: outEndpoint.type,
              packetSize: outEndpoint.packetSize
            });
            break;
          }
        } catch (ifaceError) {
          console.warn(`Erro ao reivindicar interface ${iface.interfaceNumber}:`, ifaceError);
          continue;
        }
      }

      if (!this.endpoint) {
        throw new Error('Endpoint de impressão não encontrado');
      }

      console.log('✓ Conexão estabelecida com sucesso!');
    } catch (error) {
      console.error('Erro detalhado na conexão:', error);
      throw new Error(`Falha ao conectar com a impressora: ${error}`);
    }
  }

  // Disconnect from device
  async disconnect(): Promise<void> {
    if (this.device && this.device.opened) {
      await this.device.close();
    }
    this.device = null;
    this.endpoint = null;
  }

  // Print data with robust error handling and auto-retry
  async print(data: Uint8Array): Promise<void> {
    if (!this.device || !this.endpoint) {
      console.error('Estado da impressora:', {
        device: !!this.device,
        opened: this.device?.opened,
        endpoint: !!this.endpoint
      });
      throw new Error('Impressora não conectada');
    }

    if (!this.device.opened) {
      console.error('Dispositivo não está aberto!');
      throw new Error('Dispositivo USB não está aberto');
    }

    // Função interna que realiza o envio em si (pode ser chamada em tentativas)
    const sendChunks = async () => {
      console.log('Enviando dados para impressão...', {
        bytes: data.length,
        endpoint: this.endpoint!.endpointNumber,
        deviceOpened: this.device!.opened,
      });

      // Garante que temos um ArrayBuffer "puro"
      let buffer: ArrayBuffer;
      if (data.buffer instanceof ArrayBuffer) {
        buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      } else {
        const temp = new Uint8Array(data);
        buffer = temp.buffer;
      }

      console.log('Buffer preparado:', buffer.byteLength, 'bytes');

      // Muitos firmwares USB falham em transferências grandes.
      // Aqui dividimos em blocos menores (tamanho menor entre o endpoint e 32 bytes).
      const rawPacketSize = this.endpoint!.packetSize || 64;
      const packetSize = Math.min(rawPacketSize, 32);
      const bytes = new Uint8Array(buffer);
      let offset = 0;

      console.log('Configuração de envio WebUSB:', {
        totalBytes: bytes.length,
        rawPacketSize,
        usingPacketSize: packetSize,
        endpointNumber: this.endpoint!.endpointNumber,
      });

      // Garante que o endpoint não está em estado de HALT
      try {
        await this.device!.clearHalt('out', this.endpoint!.endpointNumber);
      } catch (clearError) {
        console.warn('Falha ao limpar HALT do endpoint (pode ser ignorado):', clearError);
      }

      while (offset < bytes.length) {
        const chunk = bytes.subarray(offset, offset + packetSize);
        console.log('Enviando chunk WebUSB...', {
          from: offset,
          to: offset + chunk.length,
          total: bytes.length,
          packetSize,
        });

        try {
          const result = await this.device!.transferOut(this.endpoint!.endpointNumber, chunk);

          console.log('Resultado do chunk:', {
            bytesWritten: result.bytesWritten,
            status: result.status,
          });

          if (result.status !== 'ok') {
            throw new Error(`Erro no transfer (status=${result.status})`);
          }
        } catch (chunkError) {
          console.error('Erro ao enviar chunk via WebUSB:', chunkError, {
            endpointNumber: this.endpoint!.endpointNumber,
            offset,
            remaining: bytes.length - offset,
          });
          throw chunkError instanceof Error
            ? new Error(`Falha ao enviar dados para a impressora (WebUSB): ${chunkError.message}`)
            : new Error('Falha ao enviar dados para a impressora (WebUSB): erro de transferência desconhecido');
        }

        offset += chunk.length;
        // Pequeno delay ajuda alguns dispositivos a processarem o buffer
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Delay final para garantir processamento
      await new Promise((resolve) => setTimeout(resolve, 150));
    };

    try {
      await sendChunks();
    } catch (error) {
      console.error('Erro ao enviar dados (WebUSB), tentativa de recuperação:', error);

      // Tratamento específico para erros de transferência
      const isTransferError =
        error instanceof Error &&
        (error.message.includes('transfer') ||
          error.message.includes('NetworkError') ||
          (typeof (error as any).name === 'string' && (error as any).name.includes('NetworkError')));

      if (!isTransferError || !this.device) {
        throw new Error(
          error instanceof Error
            ? `Falha ao imprimir: ${error.message}`
            : 'Falha ao imprimir: erro desconhecido ao enviar dados via WebUSB'
        );
      }

      console.warn('Erro de transferência detectado. Resetando dispositivo e tentando novamente...');

      try {
        if (this.device.opened) {
          await this.device.reset();
          console.log('Dispositivo USB resetado com sucesso');
        }
      } catch (resetError) {
        console.warn('Falha ao resetar dispositivo USB:', resetError);
      }

      // Após reset, precisamos reabrir, selecionar configuração e interface
      try {
        await this.connect(this.device);
        console.log('Reconexão WebUSB realizada. Reenviando dados...');
        await sendChunks();
      } catch (retryError) {
        console.error('Falha ao imprimir após tentativa de recuperação:', retryError);
        throw new Error(
          'Falha ao imprimir após tentar recuperar a conexão USB. ' +
            'Verifique o cabo, a energia da impressora e as permissões do navegador.'
        );
      }
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.device !== null && this.device.opened;
  }

  // Get device info
  getDeviceInfo(): PrinterInfo | null {
    if (!this.device) return null;

    return {
      id: this.device.serialNumber || 'unknown',
      name: `${this.device.manufacturerName || 'Unknown'} ${
        this.device.productName || 'Printer'
      }`,
      type: 'usb',
      connected: this.device.opened,
      vendorId: this.device.vendorId,
      productId: this.device.productId,
    };
  }
}

export const webusbPrinter = new WebUSBPrinter();

// Função utilitária padronizada para envio ESC/POS direto a um dispositivo WebUSB
export async function sendToPrinter(
  device: USBDevice,
  data: Uint8Array | string
): Promise<USBOutTransferResult> {
  const encoder = new TextEncoder();
  const buffer = data instanceof Uint8Array ? data : encoder.encode(data);

  const printer = new WebUSBPrinter();
  await printer.connect(device);
  await printer.print(buffer);

  // Como WebUSBPrinter.print não retorna o resultado baixo nível,
  // retornamos um objeto de sucesso genérico para manter compatibilidade
  return {
    bytesWritten: buffer.byteLength,
    status: 'ok',
  };
}
