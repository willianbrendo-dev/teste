// Serviço de impressão adaptado para usar OTG nativo em Android
import { usbManager } from './usb-connection-manager';
import { BematechCommands } from './bematech-commands';
import { escposPrinter } from './escpos';
import { Capacitor } from '@capacitor/core';

export class NativePrintService {
  private isAndroid = Capacitor.getPlatform() === 'android';

  async checkSupport(): Promise<boolean> {
    return this.isAndroid;
  }

  async connectPrinter(): Promise<{
    success: boolean;
    deviceId?: string;
    vendorId?: number;
    productId?: number;
    error?: string;
  }> {
    if (!this.isAndroid) {
      return { success: false, error: 'Not running on Android' };
    }

    try {
      const device = await usbManager.connect();
      console.log('[Print Service] Conectado:', device);
      
      return {
        success: true,
        deviceId: device.deviceId,
        vendorId: device.vendorId,
        productId: device.productId,
      };
    } catch (error) {
      console.error('[Print Service] Erro ao conectar:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async disconnectPrinter(): Promise<boolean> {
    if (!this.isAndroid) {
      return false;
    }

    try {
      return await usbManager.disconnect();
    } catch (error) {
      console.error('[Print Service] Erro ao desconectar:', error);
      return false;
    }
  }

  async getPrinterStatus(): Promise<{
    connected: boolean;
    deviceId?: string;
    vendorId?: number;
    productId?: number;
  }> {
    if (!this.isAndroid) {
      return { connected: false };
    }

    try {
      const status = await usbManager.getStatus();
      
      if (!status) {
        return { connected: false };
      }
      
      return {
        connected: status.connected,
        deviceId: status.deviceId,
        vendorId: status.vendorId,
        productId: status.productId,
      };
    } catch (error) {
      console.error('[Print Service] Erro ao obter status:', error);
      return { connected: false };
    }
  }

  // Teste Nível 1: Apenas inicialização (mais básico possível)
  async testLevel1Init(): Promise<boolean> {
    try {
      console.log('[Print Service] 🔵 TESTE NÍVEL 1: Apenas INIT');
      const commands = BematechCommands.INIT;
      console.log('[Print Service] - Bytes:', commands.length, '| Hex:', 
        Array.from(commands).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));
      return await this.sendRawData(commands);
    } catch (error) {
      console.error('[Print Service] ❌ Nível 1 falhou:', error);
      return false;
    }
  }

  // Teste Nível 2: INIT + Texto simples + Line Feed
  async testLevel2Text(): Promise<boolean> {
    try {
      console.log('[Print Service] 🟢 TESTE NÍVEL 2: INIT + Texto + LF');
      const commands = BematechCommands.combine(
        BematechCommands.INIT,
        BematechCommands.text('TESTE\n'),
        BematechCommands.LF,
        BematechCommands.LF,
        BematechCommands.LF
      );
      console.log('[Print Service] - Bytes:', commands.length);
      return await this.sendRawData(commands);
    } catch (error) {
      console.error('[Print Service] ❌ Nível 2 falhou:', error);
      return false;
    }
  }

  // Teste Nível 3: Com formatação (Bold, Center)
  async testLevel3Format(): Promise<boolean> {
    try {
      console.log('[Print Service] 🟡 TESTE NÍVEL 3: Com formatação');
      const commands = BematechCommands.combine(
        BematechCommands.INIT,
        BematechCommands.ALIGN_CENTER,
        BematechCommands.BOLD_ON,
        BematechCommands.text('TESTE BOLD\n'),
        BematechCommands.BOLD_OFF,
        BematechCommands.LF,
        BematechCommands.LF,
        BematechCommands.LF
      );
      console.log('[Print Service] - Bytes:', commands.length);
      return await this.sendRawData(commands);
    } catch (error) {
      console.error('[Print Service] ❌ Nível 3 falhou:', error);
      return false;
    }
  }

  // Teste Nível 4: Com corte de papel
  async testLevel4Cut(): Promise<boolean> {
    try {
      console.log('[Print Service] 🟠 TESTE NÍVEL 4: Com corte');
      const commands = BematechCommands.combine(
        BematechCommands.INIT,
        BematechCommands.text('TESTE COM CORTE\n'),
        BematechCommands.LF,
        BematechCommands.LF,
        BematechCommands.LF,
        BematechCommands.CUT_FULL_FEED
      );
      console.log('[Print Service] - Bytes:', commands.length);
      return await this.sendRawData(commands);
    } catch (error) {
      console.error('[Print Service] ❌ Nível 4 falhou:', error);
      return false;
    }
  }

  // Teste completo (original)
  async testPrint(companyName: string = 'TecnoBook'): Promise<boolean> {
    try {
      console.log('[Print Service] 🔴 TESTE COMPLETO');
      console.log('[Print Service] - Empresa:', companyName);
      
      const commands = BematechCommands.combine(
        BematechCommands.INIT,
        BematechCommands.header(companyName, 'TESTE DE IMPRESSÃO'),
        BematechCommands.ALIGN_LEFT,
        BematechCommands.text(`Data: ${new Date().toLocaleString('pt-BR')}\n`),
        BematechCommands.text('Status: Impressora Conectada\n'),
        BematechCommands.LF,
        BematechCommands.text('Este é um teste de impressão\n'),
        BematechCommands.text('via USB OTG nativo Android\n'),
        BematechCommands.text('Impressora Bematech MP-4200 TH\n'),
        BematechCommands.LF,
        BematechCommands.ALIGN_CENTER,
        BematechCommands.BOLD_ON,
        BematechCommands.SIZE_DOUBLE,
        BematechCommands.text('✓ TESTE OK!\n'),
        BematechCommands.SIZE_NORMAL,
        BematechCommands.BOLD_OFF,
        BematechCommands.footer()
      );

      console.log('[Print Service] - Total bytes:', commands.length);
      return await this.sendRawData(commands);
    } catch (error) {
      console.error('[Print Service] ❌ Teste completo falhou:', error);
      return false;
    }
  }

  async printServiceOrder(ordem: any): Promise<boolean> {
    try {
      console.log('[Print Service] Imprimindo Ordem de Serviço:', ordem.numero);
      
      const commands = BematechCommands.combine(
        BematechCommands.INIT,
        BematechCommands.header('ORDEM DE SERVIÇO', `Nº ${ordem.numero}`),
        BematechCommands.LF,
        BematechCommands.BOLD_ON,
        BematechCommands.text('CLIENTE\n'),
        BematechCommands.BOLD_OFF,
        BematechCommands.text(`${ordem.clientes?.nome || 'N/A'}\n`),
        BematechCommands.text(`${ordem.clientes?.telefone || ''}\n`),
        BematechCommands.LF,
        BematechCommands.BOLD_ON,
        BematechCommands.text('EQUIPAMENTO\n'),
        BematechCommands.BOLD_OFF,
        BematechCommands.text(`${ordem.marcas?.nome || ''} ${ordem.modelos?.nome || ''}\n`),
        BematechCommands.LF,
        BematechCommands.BOLD_ON,
        BematechCommands.text('PROBLEMA RELATADO\n'),
        BematechCommands.BOLD_OFF,
        BematechCommands.text(`${ordem.descricao_problema || 'N/A'}\n`),
        BematechCommands.LF,
        BematechCommands.BOLD_ON,
        BematechCommands.text('SERVIÇO A REALIZAR\n'),
        BematechCommands.BOLD_OFF,
        BematechCommands.text(`${ordem.servico_realizar || 'N/A'}\n`),
        BematechCommands.LF,
        BematechCommands.separator(),
        BematechCommands.ALIGN_RIGHT,
        BematechCommands.text(`Valor: R$ ${(ordem.valor_total || 0).toFixed(2)}\n`),
        BematechCommands.text(`Entrada: R$ ${(ordem.valor_entrada || 0).toFixed(2)}\n`),
        BematechCommands.footer()
      );

      const result = await this.sendRawData(commands);
      
      if (result) {
        console.log('[Print Service] ✓ Ordem de serviço impressa com sucesso');
      }
      
      return result;
    } catch (error) {
      console.error('[Print Service] Erro ao imprimir ordem de serviço:', error);
      return false;
    }
  }

  async sendRawData(data: Uint8Array): Promise<boolean> {
    if (!this.isAndroid) {
      console.error('[Print Service] ❌ Não está rodando no Android');
      return false;
    }

    try {
      console.log('[Print Service] 📤 Preparando envio...');
      console.log('[Print Service] - Tamanho do buffer:', data.length, 'bytes');
      console.log('[Print Service] - Primeiros 20 bytes:', Array.from(data.slice(0, 20)).map(b => `0x${b.toString(16).padStart(2, '0')}`).join(' '));
      
      const result = await usbManager.sendData(data);
      
      console.log('[Print Service] 📥 Resposta do USB Manager:', JSON.stringify(result, null, 2));
      
      if (!result.success) {
        console.error('[Print Service] ❌ Falha no envio:', result.error);
        console.error('[Print Service] - Código de erro:', result.error);
        return false;
      }

      console.log('[Print Service] ✅ Enviado', result.bytesSent, 'bytes com sucesso');
      console.log('[Print Service] - Confirmação: buffer foi entregue ao endpoint USB');
      return true;
    } catch (error) {
      console.error('[Print Service] ❌ Exceção ao enviar dados:', error);
      console.error('[Print Service] - Tipo:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('[Print Service] - Mensagem:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  // Listeners para eventos USB (delegado para o OTGPrint diretamente)
  addUsbListener(
    event: 'attached' | 'detached',
    callback: (info: { deviceId?: string; vendorId?: number; productId?: number }) => void
  ) {
    if (!this.isAndroid) {
      return { remove: () => {} };
    }

    const OTGPrint = require('./otg-printer').default;
    const eventName = event === 'attached' ? 'usbDeviceAttached' : 'usbDeviceDetached';
    return OTGPrint.addListener(eventName, callback);
  }
}

export const nativePrintService = new NativePrintService();
