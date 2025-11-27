// ESC/POS Commands for thermal printers (Bematech MP-4200 TH compatible)

export class ESCPOSPrinter {
  // ESC/POS Command constants
  private readonly ESC = 0x1b;
  private readonly GS = 0x1d;
  private readonly LF = 0x0a;
  private readonly CR = 0x0d;

  // Initialize printer
  initialize(): number[] {
    return [this.ESC, 0x40]; // ESC @
  }

  // Text alignment
  alignLeft(): number[] {
    return [this.ESC, 0x61, 0x00]; // ESC a 0
  }

  alignCenter(): number[] {
    return [this.ESC, 0x61, 0x01]; // ESC a 1
  }

  alignRight(): number[] {
    return [this.ESC, 0x61, 0x02]; // ESC a 2
  }

  // Text formatting
  bold(enable: boolean): number[] {
    return [this.ESC, 0x45, enable ? 0x01 : 0x00]; // ESC E n
  }

  doubleSize(enable: boolean): number[] {
    if (enable) {
      return [this.GS, 0x21, 0x11]; // GS ! 17 (double width and height)
    }
    return [this.GS, 0x21, 0x00]; // GS ! 0 (normal)
  }

  // Line feed
  lineFeed(lines: number = 1): number[] {
    const result: number[] = [];
    for (let i = 0; i < lines; i++) {
      result.push(this.LF);
    }
    return result;
  }

  // Barcode printing
  printBarcode(data: string, type: 'CODE128' | 'CODE39' | 'EAN13' = 'CODE128'): number[] {
    const commands: number[] = [];
    
    // Set barcode height (default 50 dots)
    commands.push(this.GS, 0x68, 50);
    
    // Set barcode width (2-6, default 3)
    commands.push(this.GS, 0x77, 0x02);
    
    // Set HRI position (text below barcode)
    commands.push(this.GS, 0x48, 0x02);
    
    // Select barcode type and print
    const barcodeType = type === 'CODE128' ? 0x49 : type === 'CODE39' ? 0x45 : 0x43;
    const encodedData = this.encodeText(data);
    
    commands.push(this.GS, 0x6B, barcodeType, encodedData.length);
    commands.push(...encodedData);
    
    return commands;
  }

  // QR Code printing
  printQRCode(data: string, size: number = 6): number[] {
    const commands: number[] = [];
    const encodedData = this.encodeText(data);
    const pL = (encodedData.length + 3) % 256;
    const pH = Math.floor((encodedData.length + 3) / 256);
    
    // Set QR code model
    commands.push(this.GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    
    // Set QR code size
    commands.push(this.GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size);
    
    // Set error correction level (L=48, M=49, Q=50, H=51)
    commands.push(this.GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31);
    
    // Store QR code data
    commands.push(this.GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30);
    commands.push(...encodedData);
    
    // Print QR code
    commands.push(this.GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);
    
    return commands;
  }

  // Cut paper
  cutPaper(): number[] {
    return [this.GS, 0x56, 0x00]; // GS V 0 (full cut)
  }

  partialCutPaper(): number[] {
    return [this.GS, 0x56, 0x01]; // GS V 1 (partial cut)
  }

  // Text encoding
  encodeText(text: string): number[] {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(text));
  }

  // Build complete command sequence
  buildReceipt(lines: Array<{
    text: string;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    doubleSize?: boolean;
    barcode?: { data: string; type: 'CODE128' | 'CODE39' | 'EAN13' };
    qrcode?: { data: string; size?: number };
  }>): Uint8Array {
    const commands: number[] = [];

    // Initialize
    commands.push(...this.initialize());

    // Process each line
    lines.forEach((line) => {
      // Set alignment
      if (line.align === 'center') {
        commands.push(...this.alignCenter());
      } else if (line.align === 'right') {
        commands.push(...this.alignRight());
      } else {
        commands.push(...this.alignLeft());
      }

      // Set bold
      if (line.bold) {
        commands.push(...this.bold(true));
      }

      // Set double size
      if (line.doubleSize) {
        commands.push(...this.doubleSize(true));
      }

      // Add text
      commands.push(...this.encodeText(line.text));
      commands.push(...this.lineFeed());

      // Add barcode if specified
      if (line.barcode) {
        commands.push(...this.alignCenter());
        commands.push(...this.printBarcode(line.barcode.data, line.barcode.type));
        commands.push(...this.lineFeed(2));
      }

      // Add QR code if specified
      if (line.qrcode) {
        commands.push(...this.alignCenter());
        commands.push(...this.printQRCode(line.qrcode.data, line.qrcode.size));
        commands.push(...this.lineFeed(2));
      }

      // Reset formatting
      if (line.bold) {
        commands.push(...this.bold(false));
      }
      if (line.doubleSize) {
        commands.push(...this.doubleSize(false));
      }
    });

    // Cut paper
    commands.push(...this.lineFeed(3));
    commands.push(...this.cutPaper());

    return new Uint8Array(commands);
  }
}

export const escposPrinter = new ESCPOSPrinter();
