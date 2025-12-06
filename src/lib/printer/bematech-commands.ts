/**
 * Comandos ESC/POS específicos para Impressoras Bematech MP-4200 TH
 * Baseado na documentação oficial Bematech e melhores práticas
 */

export class BematechCommands {
  // ========== COMANDOS BÁSICOS ==========
  
  /** Inicializa a impressora */
  static INIT = new Uint8Array([0x1B, 0x40]);
  
  /** Line feed (nova linha) */
  static LF = new Uint8Array([0x0A]);
  
  /** Carriage return */
  static CR = new Uint8Array([0x0D]);
  
  /** Beep */
  static BEEP = new Uint8Array([0x1B, 0x42, 0x05, 0x09]);

  // ========== ALINHAMENTO ==========
  
  /** Alinha à esquerda */
  static ALIGN_LEFT = new Uint8Array([0x1B, 0x61, 0x00]);
  
  /** Alinha ao centro */
  static ALIGN_CENTER = new Uint8Array([0x1B, 0x61, 0x01]);
  
  /** Alinha à direita */
  static ALIGN_RIGHT = new Uint8Array([0x1B, 0x61, 0x02]);

  // ========== FORMATAÇÃO DE TEXTO ==========
  
  /** Ativa negrito */
  static BOLD_ON = new Uint8Array([0x1B, 0x45, 0x01]);
  
  /** Desativa negrito */
  static BOLD_OFF = new Uint8Array([0x1B, 0x45, 0x00]);
  
  /** Ativa sublinhado */
  static UNDERLINE_ON = new Uint8Array([0x1B, 0x2D, 0x01]);
  
  /** Desativa sublinhado */
  static UNDERLINE_OFF = new Uint8Array([0x1B, 0x2D, 0x00]);
  
  /** Ativa modo invertido */
  static INVERSE_ON = new Uint8Array([0x1D, 0x42, 0x01]);
  
  /** Desativa modo invertido */
  static INVERSE_OFF = new Uint8Array([0x1D, 0x42, 0x00]);

  // ========== TAMANHO DE TEXTO ==========
  
  /** Tamanho normal */
  static SIZE_NORMAL = new Uint8Array([0x1D, 0x21, 0x00]);
  
  /** Largura dupla */
  static SIZE_DOUBLE_WIDTH = new Uint8Array([0x1D, 0x21, 0x10]);
  
  /** Altura dupla */
  static SIZE_DOUBLE_HEIGHT = new Uint8Array([0x1D, 0x21, 0x01]);
  
  /** Largura e altura duplas */
  static SIZE_DOUBLE = new Uint8Array([0x1D, 0x21, 0x11]);
  
  /** Triplo (3x largura, 3x altura) */
  static SIZE_TRIPLE = new Uint8Array([0x1D, 0x21, 0x22]);

  // ========== CORTE DE PAPEL ==========
  
  /** Corte total */
  static CUT_FULL = new Uint8Array([0x1D, 0x56, 0x00]);
  
  /** Corte parcial */
  static CUT_PARTIAL = new Uint8Array([0x1D, 0x56, 0x01]);
  
  /** Corte total com alimentação */
  static CUT_FULL_FEED = new Uint8Array([0x1D, 0x56, 0x41, 0x03]);

  // ========== GAVETA ==========
  
  /** Abre gaveta (pulso 1) */
  static OPEN_DRAWER_1 = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
  
  /** Abre gaveta (pulso 2) */
  static OPEN_DRAWER_2 = new Uint8Array([0x1B, 0x70, 0x01, 0x19, 0xFA]);

  // ========== CÓDIGO DE BARRAS ==========
  
  /**
   * Imprime código de barras CODE128
   * @param data - Dados do código de barras (string)
   */
  static barcode(data: string): Uint8Array {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    
    // GS h n (altura do código de barras - 50 dots)
    const height = new Uint8Array([0x1D, 0x68, 0x32]);
    
    // GS w n (largura - 2 dots)
    const width = new Uint8Array([0x1D, 0x77, 0x02]);
    
    // GS H n (posição do HRI - abaixo)
    const hri = new Uint8Array([0x1D, 0x48, 0x02]);
    
    // GS k m n d1...dn (CODE128 = 73)
    const header = new Uint8Array([0x1D, 0x6B, 0x49, dataBytes.length]);
    
    // Combina tudo
    const result = new Uint8Array(
      height.length + width.length + hri.length + header.length + dataBytes.length
    );
    
    let offset = 0;
    result.set(height, offset); offset += height.length;
    result.set(width, offset); offset += width.length;
    result.set(hri, offset); offset += hri.length;
    result.set(header, offset); offset += header.length;
    result.set(dataBytes, offset);
    
    return result;
  }

  // ========== QR CODE ==========
  
  /**
   * Imprime QR Code
   * @param data - Dados do QR Code (string)
   * @param size - Tamanho do módulo (1-16, padrão 6)
   */
  static qrcode(data: string, size: number = 6): Uint8Array {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    
    // Configuração do modelo (GS ( k pL pH cn fn n1 n2)
    const model = new Uint8Array([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);
    
    // Configuração do tamanho
    const sizeCmd = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size]);
    
    // Configuração do nível de correção (L=48, M=49, Q=50, H=51)
    const errorLevel = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x49]);
    
    // Armazena dados
    const pL = (dataBytes.length + 3) % 256;
    const pH = Math.floor((dataBytes.length + 3) / 256);
    const store = new Uint8Array([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]);
    
    // Imprime
    const print = new Uint8Array([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);
    
    // Combina tudo
    const result = new Uint8Array(
      model.length + sizeCmd.length + errorLevel.length + 
      store.length + dataBytes.length + print.length
    );
    
    let offset = 0;
    result.set(model, offset); offset += model.length;
    result.set(sizeCmd, offset); offset += sizeCmd.length;
    result.set(errorLevel, offset); offset += errorLevel.length;
    result.set(store, offset); offset += store.length;
    result.set(dataBytes, offset); offset += dataBytes.length;
    result.set(print, offset);
    
    return result;
  }

  // ========== HELPERS ==========
  
  /**
   * Converte texto em bytes
   */
  static text(str: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }
  
  /**
   * Combina múltiplos comandos
   */
  static combine(...commands: Uint8Array[]): Uint8Array {
    const totalLength = commands.reduce((sum, cmd) => sum + cmd.length, 0);
    const result = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const cmd of commands) {
      result.set(cmd, offset);
      offset += cmd.length;
    }
    
    return result;
  }
  
  /**
   * Adiciona linhas em branco
   */
  static feed(lines: number = 1): Uint8Array {
    return new Uint8Array(Array(lines).fill(0x0A));
  }

  // ========== TEMPLATES PRONTOS ==========
  
  /**
   * Cria cabeçalho padrão
   */
  static header(title: string, subtitle?: string): Uint8Array {
    const commands: Uint8Array[] = [
      this.INIT,
      this.ALIGN_CENTER,
      this.BOLD_ON,
      this.SIZE_DOUBLE,
      this.text(title),
      this.LF,
      this.SIZE_NORMAL,
      this.BOLD_OFF,
    ];
    
    if (subtitle) {
      commands.push(
        this.text(subtitle),
        this.LF
      );
    }
    
    commands.push(
      this.text('================================'),
      this.LF,
      this.ALIGN_LEFT
    );
    
    return this.combine(...commands);
  }
  
  /**
   * Cria linha separadora
   */
  static separator(char: string = '-', width: number = 32): Uint8Array {
    return this.text(char.repeat(width) + '\n');
  }
  
  /**
   * Cria rodapé com data/hora
   */
  static footer(): Uint8Array {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR');
    
    return this.combine(
      this.LF,
      this.separator(),
      this.ALIGN_CENTER,
      this.text(`${dateStr} ${timeStr}`),
      this.LF,
      this.feed(3),
      this.CUT_FULL_FEED
    );
  }
}
