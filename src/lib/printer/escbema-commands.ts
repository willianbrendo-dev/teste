/**
 * Comandos ESC/BEMA para impressoras térmicas Bematech mais antigas
 * Baseado na documentação Bematech para modelos MP-20, MP-40, MP-2000, etc.
 * 
 * ESC/BEMA é uma variação proprietária do ESC/POS usado em impressoras Bematech antigas.
 * A principal diferença está em alguns comandos de formatação e inicialização.
 */

export class ESCBEMACommands {
  // ========== COMANDOS BÁSICOS ESC/BEMA ==========
  
  /** Inicializa a impressora (ESC/BEMA usa sequência diferente) */
  static INIT = new Uint8Array([0x1B, 0x40, 0x1B, 0x55]);
  
  /** Reset da impressora */
  static RESET = new Uint8Array([0x1B, 0x3F]);
  
  /** Line feed (nova linha) */
  static LF = new Uint8Array([0x0A]);
  
  /** Carriage return */
  static CR = new Uint8Array([0x0D]);
  
  /** Beep (sinal sonoro) */
  static BEEP = new Uint8Array([0x07]);

  // ========== ALINHAMENTO (ESC/BEMA) ==========
  
  /** Alinha à esquerda */
  static ALIGN_LEFT = new Uint8Array([0x1B, 0x6A, 0x00]);
  
  /** Alinha ao centro */
  static ALIGN_CENTER = new Uint8Array([0x1B, 0x6A, 0x01]);
  
  /** Alinha à direita */
  static ALIGN_RIGHT = new Uint8Array([0x1B, 0x6A, 0x02]);

  // ========== FORMATAÇÃO DE TEXTO (ESC/BEMA) ==========
  
  /** Ativa negrito */
  static BOLD_ON = new Uint8Array([0x1B, 0x45]);
  
  /** Desativa negrito */
  static BOLD_OFF = new Uint8Array([0x1B, 0x46]);
  
  /** Ativa sublinhado */
  static UNDERLINE_ON = new Uint8Array([0x1B, 0x2D, 0x31]);
  
  /** Desativa sublinhado */
  static UNDERLINE_OFF = new Uint8Array([0x1B, 0x2D, 0x30]);
  
  /** Ativa modo expandido (largura dupla) */
  static EXPANDED_ON = new Uint8Array([0x1B, 0x57, 0x01]);
  
  /** Desativa modo expandido */
  static EXPANDED_OFF = new Uint8Array([0x1B, 0x57, 0x00]);
  
  /** Ativa modo condensado */
  static CONDENSED_ON = new Uint8Array([0x0F]);
  
  /** Desativa modo condensado */
  static CONDENSED_OFF = new Uint8Array([0x12]);

  // ========== TAMANHO DE TEXTO (ESC/BEMA) ==========
  
  /** Tamanho normal */
  static SIZE_NORMAL = new Uint8Array([0x1B, 0x21, 0x00]);
  
  /** Largura dupla */
  static SIZE_DOUBLE_WIDTH = new Uint8Array([0x1B, 0x21, 0x20]);
  
  /** Altura dupla */
  static SIZE_DOUBLE_HEIGHT = new Uint8Array([0x1B, 0x21, 0x10]);
  
  /** Largura e altura duplas */
  static SIZE_DOUBLE = new Uint8Array([0x1B, 0x21, 0x30]);

  // ========== CORTE DE PAPEL (ESC/BEMA) ==========
  
  /** Corte total */
  static CUT_FULL = new Uint8Array([0x1B, 0x6D]);
  
  /** Corte parcial */
  static CUT_PARTIAL = new Uint8Array([0x1B, 0x6D]);
  
  /** Avança papel e corta */
  static CUT_FULL_FEED = new Uint8Array([0x0A, 0x0A, 0x0A, 0x1B, 0x6D]);

  // ========== GAVETA (ESC/BEMA) ==========
  
  /** Abre gaveta */
  static OPEN_DRAWER = new Uint8Array([0x1B, 0x76]);

  // ========== HELPERS ==========
  
  /**
   * Converte texto em bytes (CP850/Latin-1)
   */
  static text(str: string): Uint8Array {
    // ESC/BEMA usa codepage 850 ou Latin-1
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      // Converte caracteres especiais para CP850
      bytes.push(code > 255 ? this.convertToCP850(code) : code);
    }
    return new Uint8Array(bytes);
  }
  
  /**
   * Converte caracteres Unicode para CP850
   */
  private static convertToCP850(code: number): number {
    const cp850Map: Record<number, number> = {
      // Caracteres acentuados comuns em português
      0x00E1: 0xA0, // á
      0x00E0: 0x85, // à
      0x00E2: 0x83, // â
      0x00E3: 0xC6, // ã
      0x00E9: 0x82, // é
      0x00EA: 0x88, // ê
      0x00ED: 0xA1, // í
      0x00F3: 0xA2, // ó
      0x00F4: 0x93, // ô
      0x00F5: 0xE4, // õ
      0x00FA: 0xA3, // ú
      0x00E7: 0x87, // ç
      0x00C1: 0xB5, // Á
      0x00C0: 0xB7, // À
      0x00C2: 0xB6, // Â
      0x00C3: 0xC7, // Ã
      0x00C9: 0x90, // É
      0x00CA: 0xD2, // Ê
      0x00CD: 0xD6, // Í
      0x00D3: 0xE0, // Ó
      0x00D4: 0xE2, // Ô
      0x00D5: 0xE5, // Õ
      0x00DA: 0xE9, // Ú
      0x00C7: 0x80, // Ç
    };
    return cp850Map[code] || 0x3F; // '?' para caracteres não mapeados
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

  // ========== CONVERSÃO ESC/POS PARA ESC/BEMA ==========
  
  /**
   * Converte dados ESC/POS para ESC/BEMA
   * Faz substituição dos comandos principais
   */
  static convertFromESCPOS(escposData: Uint8Array): Uint8Array {
    const data = Array.from(escposData);
    const result: number[] = [];
    
    let i = 0;
    while (i < data.length) {
      // ESC @ (Init) -> ESC @ ESC U
      if (data[i] === 0x1B && data[i + 1] === 0x40) {
        result.push(0x1B, 0x40, 0x1B, 0x55);
        i += 2;
        continue;
      }
      
      // ESC a n (Alignment) -> ESC j n
      if (data[i] === 0x1B && data[i + 1] === 0x61) {
        result.push(0x1B, 0x6A, data[i + 2] || 0x00);
        i += 3;
        continue;
      }
      
      // ESC E n (Bold) -> ESC E / ESC F
      if (data[i] === 0x1B && data[i + 1] === 0x45) {
        if (data[i + 2] === 0x01) {
          result.push(0x1B, 0x45); // Bold ON
        } else {
          result.push(0x1B, 0x46); // Bold OFF
        }
        i += 3;
        continue;
      }
      
      // GS ! n (Size) -> ESC ! n
      if (data[i] === 0x1D && data[i + 1] === 0x21) {
        result.push(0x1B, 0x21, data[i + 2] || 0x00);
        i += 3;
        continue;
      }
      
      // GS V n (Cut) -> ESC m
      if (data[i] === 0x1D && data[i + 1] === 0x56) {
        result.push(0x0A, 0x0A, 0x0A, 0x1B, 0x6D);
        i += (data[i + 2] === 0x41) ? 4 : 3;
        continue;
      }
      
      // Mantém outros bytes
      result.push(data[i]);
      i++;
    }
    
    return new Uint8Array(result);
  }

  // ========== TEMPLATES PRONTOS (ESC/BEMA) ==========
  
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

export type PrintLanguage = 'escpos' | 'escbema';

/**
 * Serviço de fallback de linguagem de impressão
 */
export class PrintLanguageFallback {
  private static STORAGE_KEY = 'printer_language_preference';
  
  /**
   * Obtém a linguagem preferida para uma impressora
   */
  static getPreferredLanguage(printerId?: string): PrintLanguage {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        if (printerId && prefs[printerId]) {
          return prefs[printerId] as PrintLanguage;
        }
        if (prefs.default) {
          return prefs.default as PrintLanguage;
        }
      }
    } catch (e) {
      console.error('[PrintLanguage] Erro ao ler preferência:', e);
    }
    return 'escpos'; // Padrão é ESC/POS
  }
  
  /**
   * Salva a linguagem bem-sucedida para uma impressora
   */
  static saveSuccessfulLanguage(language: PrintLanguage, printerId?: string): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const prefs = stored ? JSON.parse(stored) : {};
      
      if (printerId) {
        prefs[printerId] = language;
      }
      prefs.default = language;
      prefs.lastUpdated = new Date().toISOString();
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
      console.log(`[PrintLanguage] Linguagem ${language} salva como preferida`);
    } catch (e) {
      console.error('[PrintLanguage] Erro ao salvar preferência:', e);
    }
  }
  
  /**
   * Converte dados para a linguagem especificada
   */
  static convertToLanguage(data: Uint8Array, targetLanguage: PrintLanguage): Uint8Array {
    if (targetLanguage === 'escbema') {
      return ESCBEMACommands.convertFromESCPOS(data);
    }
    return data;
  }
}
