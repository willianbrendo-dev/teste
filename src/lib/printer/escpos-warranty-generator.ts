/**
 * Gerador ESC/POS para Termo de Garantia
 * Gera duas vias: Empresa e Cliente
 */

import { escposPrinter } from './escpos';
import { format } from 'date-fns';

// Textos completos das garantias
const WARRANTY_TEXTS: Record<string, string> = {
  "Garantia de Serviço": "GARANTIA DE SERVICO: O servico realizado possui garantia de 90 dias contra defeitos de execucao. A garantia cobre apenas o servico executado, nao incluindo pecas trocadas. Nao cobre danos causados por mau uso, queda, contato com liquidos ou intervencao de terceiros.",
  "Garantia de Peças": "GARANTIA DE PECAS: As pecas utilizadas no reparo possuem garantia de 90 dias contra defeitos de fabricacao. A garantia nao cobre danos causados por mau uso, queda, contato com liquidos ou oxidacao. Pecas com sinais de violacao perdem a garantia.",
  "Garantia Total": "GARANTIA TOTAL: Servico e pecas possuem garantia de 90 dias. Cobre defeitos de execucao do servico e defeitos de fabricacao das pecas utilizadas. Nao cobre danos causados por mau uso, queda, contato com liquidos, oxidacao ou intervencao de terceiros. Qualquer violacao do aparelho apos a entrega invalida a garantia.",
  "Sem Garantia": "SEM GARANTIA: Este servico foi realizado SEM GARANTIA conforme acordado com o cliente. Nao ha cobertura para qualquer defeito que possa surgir apos a entrega do aparelho. O cliente esta ciente e de acordo com esta condicao."
};

export interface WarrantyData {
  osNumero: number;
  osId: string;
  clienteNome: string;
  clienteTelefone?: string | null;
  marcaNome?: string | null;
  modeloNome?: string | null;
  valorServico?: number | null;
  metodoPagamento?: string | null;
  warrantyTypes: string[];
  dataEntrega?: Date;
}

function wrapText(text: string, maxWidth: number = 48): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

/**
 * Gera Via Empresa do Termo de Garantia
 */
export function generateWarrantyViaEmpresa(data: WarrantyData): Uint8Array {
  const dataEntrega = data.dataEntrega || new Date();
  
  const lines: Array<{ text: string; align?: 'left' | 'center' | 'right'; bold?: boolean; doubleSize?: boolean }> = [
    { text: "TERMO DE GARANTIA", align: "center", bold: true, doubleSize: true },
    { text: "*** VIA EMPRESA ***", align: "center", bold: true },
    { text: "================================", align: "center" },
    { text: "", align: "left" },
    { text: `O.S: #${data.osNumero}`, align: "left", bold: true },
    { text: `Cliente: ${data.clienteNome.toUpperCase()}`, align: "left" },
  ];

  if (data.clienteTelefone) {
    lines.push({ text: `Telefone: ${data.clienteTelefone}`, align: "left" });
  }

  if (data.marcaNome || data.modeloNome) {
    lines.push({ text: `Aparelho: ${data.marcaNome || ''} ${data.modeloNome || ''}`.trim().toUpperCase(), align: "left" });
  }

  lines.push(
    { text: `Data Entrega: ${format(dataEntrega, "dd/MM/yyyy HH:mm")}`, align: "left" },
  );

  if (data.valorServico) {
    lines.push({ text: `Valor: R$ ${data.valorServico.toFixed(2)}`, align: "left", bold: true });
  }

  if (data.metodoPagamento) {
    lines.push({ text: `Pagamento: ${data.metodoPagamento.toUpperCase()}`, align: "left" });
  }

  lines.push(
    { text: "", align: "left" },
    { text: "================================", align: "center" },
    { text: "TERMOS DE GARANTIA", align: "center", bold: true },
    { text: "================================", align: "center" },
    { text: "", align: "left" },
  );

  // Add warranty terms
  data.warrantyTypes.forEach(warranty => {
    const warrantyText = WARRANTY_TEXTS[warranty];
    if (warrantyText) {
      const wrappedLines = wrapText(warrantyText, 48);
      wrappedLines.forEach(line => {
        lines.push({ text: line, align: "left" });
      });
      lines.push({ text: "", align: "left" });
    }
  });

  lines.push(
    { text: "================================", align: "center" },
    { text: "", align: "left" },
    { text: "Assinatura do Cliente:", align: "left" },
    { text: "", align: "left" },
    { text: "", align: "left" },
    { text: "_____________________________", align: "center" },
    { text: data.clienteNome.toUpperCase(), align: "center" },
    { text: "", align: "left" },
    { text: "", align: "left" },
  );

  return escposPrinter.buildReceipt(lines);
}

/**
 * Gera Via Cliente do Termo de Garantia
 */
export function generateWarrantyViaCliente(data: WarrantyData): Uint8Array {
  const dataEntrega = data.dataEntrega || new Date();
  
  const lines: Array<{ text: string; align?: 'left' | 'center' | 'right'; bold?: boolean; doubleSize?: boolean }> = [
    { text: "TERMO DE GARANTIA", align: "center", bold: true, doubleSize: true },
    { text: "*** VIA CLIENTE ***", align: "center", bold: true },
    { text: "================================", align: "center" },
    { text: "", align: "left" },
    { text: `O.S: #${data.osNumero}`, align: "left", bold: true },
    { text: `Cliente: ${data.clienteNome.toUpperCase()}`, align: "left" },
  ];

  if (data.clienteTelefone) {
    lines.push({ text: `Telefone: ${data.clienteTelefone}`, align: "left" });
  }

  if (data.marcaNome || data.modeloNome) {
    lines.push({ text: `Aparelho: ${data.marcaNome || ''} ${data.modeloNome || ''}`.trim().toUpperCase(), align: "left" });
  }

  lines.push(
    { text: `Data Entrega: ${format(dataEntrega, "dd/MM/yyyy HH:mm")}`, align: "left" },
  );

  if (data.valorServico) {
    lines.push({ text: `Valor: R$ ${data.valorServico.toFixed(2)}`, align: "left", bold: true });
  }

  if (data.metodoPagamento) {
    lines.push({ text: `Pagamento: ${data.metodoPagamento.toUpperCase()}`, align: "left" });
  }

  lines.push(
    { text: "", align: "left" },
    { text: "================================", align: "center" },
    { text: "TERMOS DE GARANTIA", align: "center", bold: true },
    { text: "================================", align: "center" },
    { text: "", align: "left" },
  );

  // Add warranty terms
  data.warrantyTypes.forEach(warranty => {
    const warrantyText = WARRANTY_TEXTS[warranty];
    if (warrantyText) {
      const wrappedLines = wrapText(warrantyText, 48);
      wrappedLines.forEach(line => {
        lines.push({ text: line, align: "left" });
      });
      lines.push({ text: "", align: "left" });
    }
  });

  lines.push(
    { text: "================================", align: "center" },
    { text: "", align: "left" },
    { text: "GUARDE ESTE COMPROVANTE", align: "center", bold: true },
    { text: "Apresente este termo em caso de", align: "center" },
    { text: "acionamento da garantia.", align: "center" },
    { text: "", align: "left" },
    { text: "", align: "left" },
  );

  return escposPrinter.buildReceipt(lines);
}
