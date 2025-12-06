// Main print service that handles all printing operations
import { escposPrinter } from './escpos';
import { webusbPrinter } from './webusb';
import { format } from 'date-fns';

export interface PrinterConfig {
  type: 'usb' | 'network' | 'serial';
  name: string;
  ipAddress?: string;
  port?: number;
}

export class PrintService {
  private config: PrinterConfig | null = null;

  // Load saved configuration
  loadConfig(): PrinterConfig | null {
    const saved = localStorage.getItem('printer_config');
    if (saved) {
      this.config = JSON.parse(saved);
      return this.config;
    }
    return null;
  }

  // Save configuration
  saveConfig(config: PrinterConfig): void {
    this.config = config;
    localStorage.setItem('printer_config', JSON.stringify(config));
  }

  // Test printer with sample receipt
  async testPrint(companyName: string = 'Sistema de Ordem de Serviço'): Promise<void> {
    const lines = [
      { text: companyName, align: 'center' as const, bold: true, doubleSize: true },
      { text: '================================', align: 'center' as const },
      { text: 'TESTE DE IMPRESSÃO', align: 'center' as const, bold: true },
      { text: '================================', align: 'center' as const },
      { text: '', align: 'left' as const },
      { text: `Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, align: 'left' as const },
      { text: '', align: 'left' as const },
      { text: 'Esta é uma impressão de teste.', align: 'left' as const },
      { text: 'Se você pode ler isto, a', align: 'left' as const },
      { text: 'impressora está funcionando!', align: 'left' as const },
      { text: '', align: 'left' as const },
      { text: 'QR Code de Teste:', align: 'center' as const, bold: true },
      { text: '', align: 'center' as const, qrcode: { data: 'TEST-PRINT-' + Date.now(), size: 6 } },
      { text: '', align: 'left' as const },
      { text: 'Código de Barras:', align: 'center' as const, bold: true },
      { text: '', align: 'center' as const, barcode: { data: '12345678', type: 'CODE128' as const } },
      { text: '', align: 'left' as const },
      { text: '================================', align: 'center' as const },
      { text: 'Obrigado!', align: 'center' as const, bold: true },
    ];

    const data = escposPrinter.buildReceipt(lines);
    await this.sendToPrinter(data);
  }

  // Print service order
  async printServiceOrder(ordem: any): Promise<void> {
    const lines = [
      { text: 'ORDEM DE SERVIÇO', align: 'center' as const, bold: true, doubleSize: true },
      { text: '================================', align: 'center' as const },
      { text: '', align: 'left' as const },
      { text: `OS Nº: ${ordem.numero}`, align: 'left' as const, bold: true },
      { text: '', align: 'center' as const, qrcode: { data: `OS-${ordem.numero}-${ordem.id}`, size: 6 } },
      { text: '', align: 'left' as const },
      { text: `Data: ${format(new Date(ordem.data_entrada), 'dd/MM/yyyy')}`, align: 'left' as const },
      { text: `Status: ${ordem.status.toUpperCase()}`, align: 'left' as const },
      { text: '', align: 'left' as const },
      { text: 'CLIENTE:', align: 'left' as const, bold: true },
      { text: ordem.clientes?.nome || 'N/A', align: 'left' as const },
      { text: ordem.clientes?.telefone || '', align: 'left' as const },
      { text: '', align: 'left' as const },
      { text: 'EQUIPAMENTO:', align: 'left' as const, bold: true },
      { text: `${ordem.marcas?.nome || ''} ${ordem.modelos?.nome || ''}`, align: 'left' as const },
      { text: `IMEI: ${ordem.imei || 'N/A'}`, align: 'left' as const },
      { text: '', align: 'left' as const },
      { text: 'DEFEITO RECLAMADO:', align: 'left' as const, bold: true },
      { text: ordem.defeito_reclamado || 'N/A', align: 'left' as const },
      { text: '', align: 'left' as const },
      { text: 'OBSERVAÇÕES:', align: 'left' as const, bold: true },
      { text: ordem.observacoes || 'Nenhuma', align: 'left' as const },
      { text: '', align: 'left' as const },
      { text: '================================', align: 'center' as const },
      { text: 'Assinatura: __________________', align: 'left' as const },
    ];

    const data = escposPrinter.buildReceipt(lines);
    await this.sendToPrinter(data);
  }

  // Print checklist
  async printChecklist(checklist: any): Promise<void> {
    const componentStatus = (status: string) => {
      switch (status) {
        case 'funcionando': return '[OK]';
        case 'com_defeito': return '[DEFEITO]';
        case 'nao_testado': return '[N/T]';
        default: return '[ ]';
      }
    };

    const lines = [
      { text: 'CHECKLIST TÉCNICO', align: 'center' as const, bold: true, doubleSize: true },
      { text: '================================', align: 'center' as const },
      { text: '', align: 'left' as const },
      { text: `OS Nº: ${checklist.ordens_servico?.numero || 'N/A'}`, align: 'left' as const, bold: true },
      { text: '', align: 'center' as const, qrcode: { data: `CHECKLIST-${checklist.id}`, size: 5 } },
      { text: '', align: 'left' as const },
      { text: `Cliente: ${checklist.ordens_servico?.clientes?.nome || 'N/A'}`, align: 'left' as const },
      { text: `Data: ${format(new Date(checklist.created_at), 'dd/MM/yyyy HH:mm')}`, align: 'left' as const },
      { text: `Tipo: ${checklist.tipo.toUpperCase()}`, align: 'left' as const },
      { text: '', align: 'left' as const },
      { text: 'COMPONENTES:', align: 'left' as const, bold: true },
      { text: '--------------------------------', align: 'left' as const },
    ];

    // Add all components
    const components = [
      { label: 'Alto-falante', key: 'alto_falante' },
      { label: 'Auricular', key: 'auricular' },
      { label: 'Touch Screen', key: 'situacao_touch' },
      { label: 'Carregador', key: 'carregador' },
      { label: 'Conector Carga', key: 'conector_carga' },
      { label: 'Microfone', key: 'microfone' },
      { label: 'Flash', key: 'flash' },
      { label: 'Fone Ouvido', key: 'fone_ouvido' },
      { label: 'Botão Home', key: 'botao_home' },
      { label: 'Botão Power', key: 'botao_power' },
      { label: 'Botão Volume', key: 'botao_volume' },
      { label: 'Bluetooth', key: 'bluetooth' },
      { label: 'Câmera Traseira', key: 'camera_traseira' },
      { label: 'Câmera Frontal', key: 'camera_frontal' },
      { label: 'Biometria', key: 'biometria' },
      { label: 'Face ID', key: 'face_id' },
      { label: 'Parafusos', key: 'parafuso' },
      { label: 'Sensor Proximidade', key: 'sensor_proximidade' },
      { label: 'Vibra Call', key: 'vibra_call' },
      { label: 'Wi-Fi', key: 'wifi' },
      { label: 'Slot SIM', key: 'slot_sim' },
      { label: 'SIM Chip', key: 'sim_chip' },
      { label: 'Carcaça', key: 'situacao_carcaca' },
    ];

    components.forEach(({ label, key }) => {
      if (checklist[key]) {
        const status = componentStatus(checklist[key]);
        lines.push({ text: `${status} ${label}`, align: 'left' as const });
      }
    });

    if (checklist.observacoes) {
      lines.push({ text: '', align: 'left' as const });
      lines.push({ text: 'OBSERVAÇÕES:', align: 'left' as const, bold: true });
      lines.push({ text: checklist.observacoes, align: 'left' as const });
    }

    lines.push({ text: '', align: 'left' as const });
    lines.push({ text: '================================', align: 'center' as const });

    const data = escposPrinter.buildReceipt(lines);
    await this.sendToPrinter(data);
  }

  // Send data to printer
  private async sendToPrinter(data: Uint8Array): Promise<void> {
    console.log('=== Iniciando impressão ===');
    console.log('Tamanho dos dados:', data.length, 'bytes');
    
    // Se não há configuração mas o WebUSB está conectado, usa-o diretamente
    if (!this.config) {
      console.log('Sem configuração, verificando conexão direta WebUSB...');
      if (webusbPrinter.isConnected()) {
        console.log('WebUSB conectado, usando impressora direta...');
        await webusbPrinter.print(data);
        console.log('✓ Impressão concluída com sucesso!');
        return;
      }
      throw new Error('Impressora não conectada. Conecte a impressora primeiro.');
    }

    console.log('Configuração carregada:', this.config);

    if (this.config.type === 'usb') {
      // Use WebUSB
      console.log('Verificando conexão USB...');
      
      if (!webusbPrinter.isConnected()) {
        console.log('Impressora não conectada, tentando reconectar...');
        const devices = await webusbPrinter.getPairedDevices();
        console.log(`Dispositivos pareados encontrados: ${devices.length}`);
        
        if (devices.length === 0) {
          throw new Error('Nenhuma impressora USB conectada. Conecte a impressora primeiro.');
        }
        
        console.log('Reconectando ao primeiro dispositivo pareado...');
        await webusbPrinter.connect(devices[0]);
      }
      
      console.log('Conexão confirmada, enviando dados...');
      await webusbPrinter.print(data);
      console.log('✓ Impressão concluída com sucesso!');
      
    } else if (this.config.type === 'network') {
      // Use network printing via edge function
      console.log('Impressão via rede selecionada');
      const { networkPrinterService } = await import('./network-printer');
      await networkPrinterService.print(this.config, data);
    } else {
      throw new Error('Tipo de impressora não suportado.');
    }
  }

  // Check if printer is configured
  isConfigured(): boolean {
    return this.config !== null;
  }

  // Get current configuration
  getConfig(): PrinterConfig | null {
    return this.config;
  }
}

export const printService = new PrintService();
