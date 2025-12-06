import { WebPlugin } from '@capacitor/core';
import type { OTGPrintPlugin } from './otg-printer';
import { sendToPrinter } from './webusb';

// Implementação web usando WebUSB como fallback
export class OTGPrintWeb extends WebPlugin implements OTGPrintPlugin {
  private device: USBDevice | null = null;

  async checkUsbHostSupport(): Promise<{ supported: boolean }> {
    return { supported: 'usb' in navigator };
  }

  async connectToUsbPrinter(): Promise<{
    success: boolean;
    deviceId?: string;
    vendorId?: number;
    productId?: number;
    error?: string;
  }> {
    if (!('usb' in navigator)) {
      return {
        success: false,
        error: 'WebUSB not supported in this browser',
      };
    }

    try {
      const device = await navigator.usb.requestDevice({
        filters: [],
      });

      await device.open();
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);

      // Guarda o dispositivo para reutilizar no envio ESC/POS
      this.device = device;

      return {
        success: true,
        deviceId: device.serialNumber || `${device.vendorId}-${device.productId}`,
        vendorId: device.vendorId,
        productId: device.productId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async disconnectUsbPrinter(): Promise<{ success: boolean }> {
    if (this.device && this.device.opened) {
      try {
        await this.device.close();
      } catch (error) {
        console.warn('Erro ao desconectar dispositivo WebUSB:', error);
      }
    }
    this.device = null;
    return { success: true };
  }

  async sendEscPosBuffer(options: { data: number[] | string }): Promise<{
    success: boolean;
    bytesSent?: number;
    error?: string;
  }> {
    if (!this.device) {
      return { success: false, error: 'Nenhuma impressora WebUSB conectada' };
    }

    try {
      const data = options.data;
      let buffer: Uint8Array;

      if (typeof data === 'string') {
        // Assume base64 para compatibilidade com nativo
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        buffer = bytes;
      } else {
        buffer = new Uint8Array(data);
      }

      const result = await sendToPrinter(this.device, buffer);
      return { success: true, bytesSent: result.bytesWritten };
    } catch (error) {
      console.error('Erro ao enviar ESC/POS via WebUSB:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao enviar ESC/POS via WebUSB',
      };
    }
  }

  async getPrinterStatus(): Promise<{
    connected: boolean;
    deviceId?: string;
    vendorId?: number;
    productId?: number;
  }> {
    if (!this.device) {
      return { connected: false };
    }

    return {
      connected: true,
      deviceId: this.device.serialNumber || `${this.device.vendorId}-${this.device.productId}`,
      vendorId: this.device.vendorId,
      productId: this.device.productId,
    };
  }
}
