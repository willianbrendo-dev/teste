import { registerPlugin } from '@capacitor/core';

// Interface do plugin nativo
export interface OTGPrintPlugin {
  /**
   * Verifica se o dispositivo suporta USB Host
   */
  checkUsbHostSupport(): Promise<{ supported: boolean }>;
  
  /**
   * Solicita permissão e conecta à impressora USB
   */
  connectToUsbPrinter(): Promise<{
    success: boolean;
    deviceId?: string;
    vendorId?: number;
    productId?: number;
    error?: string;
    errorCode?: string;
  }>;
  
  /**
   * Desconecta da impressora USB
   */
  disconnectUsbPrinter(): Promise<{ success: boolean }>;
  
  /**
   * Envia buffer ESC/POS para impressora
   * @param data - Array de bytes ou base64
   */
  sendEscPosBuffer(options: { data: number[] | string }): Promise<{
    success: boolean;
    bytesSent?: number;
    error?: string;
    errorCode?: string;
    attempts?: number;
  }>;
  
  /**
   * Obtém status atual da impressora
   */
  getPrinterStatus(): Promise<{
    connected: boolean;
    deviceId?: string;
    vendorId?: number;
    productId?: number;
  }>;
  
  /**
   * Listener para eventos de conexão/desconexão USB
   */
  addListener(
    eventName: 'usbDeviceAttached' | 'usbDeviceDetached',
    listenerFunc: (info: { deviceId?: string; vendorId?: number; productId?: number }) => void
  ): Promise<{ remove: () => void }>;
}

// Registra o plugin
const OTGPrint = registerPlugin<OTGPrintPlugin>('OTGPrint', {
  web: () => import('./otg-printer-web').then(m => new m.OTGPrintWeb()),
});

export default OTGPrint;
