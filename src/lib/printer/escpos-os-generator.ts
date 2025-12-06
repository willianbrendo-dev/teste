import { ESCPOSPrinter } from "./escpos";
import { parseISO, format } from "date-fns";

interface OrdemServicoData {
  numero: number;
  created_at: string;
  cliente_nome: string;
  cliente_telefone?: string | null;
  marca_nome?: string | null;
  modelo_nome?: string | null;
  numero_serie?: string | null;
  cor_aparelho?: string | null;
  senha_aparelho?: string | null;
  tipo_senha?: string | null;
  descricao_problema?: string | null;
  estado_fisico?: string | null;
  servico_realizar?: string | null;
  observacoes?: string | null;
  status: string;
  valor_estimado?: number | null;
  valor_entrada?: number | null;
  valor_total?: number | null;
  data_prevista_entrega?: string | null;
  atendente_nome?: string | null;
  situacao_atual?: string | null;
  termos_servico?: string[] | null;
  acessorios_entregues?: string | null;
  relato_cliente?: string | null;
}

interface ChecklistData {
  tipo: 'entrada' | 'saida';
  components: Record<string, string>;
  observacoes?: string | null;
  atendente_nome?: string | null;
}

/**
 * Quebra texto longo em linhas de até maxChars caracteres
 */
function wrapText(text: string, maxChars: number = 48): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxChars) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Mapeia os termos de serviço para seus textos completos
 */
function getTermoTextoCompleto(termo: string): string {
  const termosMap: Record<string, string> = {
    'Não da pra testar': 'Estou ciente que o equipamento que deixei não da pra testar e caso seja encontrado algum defeito diferente do informado imunizo esta assistência técnica de qualquer responsabilidade sobre desfeitos adicionais encontrados.',
    'nao_da_pra_testar': 'Estou ciente que o equipamento que deixei não da pra testar e caso seja encontrado algum defeito diferente do informado imunizo esta assistência técnica de qualquer responsabilidade sobre desfeitos adicionais encontrados.',
    'Bloqueado': 'Estou ciente de que o aparelho deixado está bloqueado. Portanto, se após o desbloqueio seja encontrado algum defeito diferente como por exemplo: não pega chip, wi-fi/bluetooth não funciona e etc. Imunizo esta assistência técnica de qualquer responsabilidade sobre defeitos adicionais encontrados.',
    'bloqueado': 'Estou ciente de que o aparelho deixado está bloqueado. Portanto, se após o desbloqueio seja encontrado algum defeito diferente como por exemplo: não pega chip, wi-fi/bluetooth não funciona e etc. Imunizo esta assistência técnica de qualquer responsabilidade sobre defeitos adicionais encontrados.',
    'Aberto por outros': 'Estou ciente de que o equipamento já foi aberto ou tem sinais de tentativa de abertura. Portanto, caso após a análise percebermos que esteja faltando alguma peça ou com alguma parte danificada, imunizo esta assistência técnica de qualquer responsabilidade sobre defeitos adicionais.',
    'aberto_por_outros': 'Estou ciente de que o equipamento já foi aberto ou tem sinais de tentativa de abertura. Portanto, caso após a análise percebermos que esteja faltando alguma peça ou com alguma parte danificada, imunizo esta assistência técnica de qualquer responsabilidade sobre defeitos adicionais.',
    'Molhou': 'Estou ciente que meu aparelho entrou em contato com líquido por isso o serviço que será executado NÃO TERÁ GARANTIA, mesmo que o aparelho volte a funcionar existem riscos de tempo depois do procedimento de reparo apresentar outros defeitos ou até mesmo a parada total do aparelho pois a placa eletrônica foi molhada e caso o aparelho esteja funcionando parcialmente não é garantia que deixe de funcionar totalmente devido ao grande índice de defeitos causados existe uma probabilidade de ocorrer defeitos causados pelo tempo de que o aparelho foi exposto ao líquido. Isentando essa assistência e técnicos de qualquer responsabilidade sobre o mesmo aparelho neste caso.',
    'molhou': 'Estou ciente que meu aparelho entrou em contato com líquido por isso o serviço que será executado NÃO TERÁ GARANTIA, mesmo que o aparelho volte a funcionar existem riscos de tempo depois do procedimento de reparo apresentar outros defeitos ou até mesmo a parada total do aparelho pois a placa eletrônica foi molhada e caso o aparelho esteja funcionando parcialmente não é garantia que deixe de funcionar totalmente devido ao grande índice de defeitos causados existe uma probabilidade de ocorrer defeitos causados pelo tempo de que o aparelho foi exposto ao líquido. Isentando essa assistência e técnicos de qualquer responsabilidade sobre o mesmo aparelho neste caso.',
    'Troca de vidro': 'Estou ciente de que a troca de vidro que solicitei é um reparo complexo e muito arriscado e que durante o procedimento de troca do vidro pode ocorrer a quebra ou até mesmo a parada parcial ou total do touch do aparelho. por isso, imunizo esta assistência técnica da responsabilidade de me ressarcir caso isso ocorra.',
    'troca_de_vidro': 'Estou ciente de que a troca de vidro que solicitei é um reparo complexo e muito arriscado e que durante o procedimento de troca do vidro pode ocorrer a quebra ou até mesmo a parada parcial ou total do touch do aparelho. por isso, imunizo esta assistência técnica da responsabilidade de me ressarcir caso isso ocorra.'
  };
  
  return termosMap[termo] || termo;
}

function getTermoTitulo(termo: string): string {
  const titleMap: Record<string, string> = {
    'nao_da_pra_testar': 'Não da pra testar',
    'bloqueado': 'Bloqueado',
    'aberto_por_outros': 'Aberto por outros',
    'molhou': 'Molhou',
    'troca_de_vidro': 'Troca de vidro',
  };

  return titleMap[termo] || termo;
}

/**
 * Formata data/hora de previsão exatamente como digitado (sem fuso horário)
 */
function formatPrevisaoEntrega(raw: string | null | undefined): { data: string; hora?: string } | null {
  if (!raw) return null;

  // Aceita formatos como:
  // - '2025-11-27'
  // - '2025-11-27T15:30'
  // - '2025-11-27T15:30:00'
  // - '2025-11-27T15:30:00+00:00'
  const [datePart, timePartRaw] = raw.split('T');
  if (!datePart) return null;

  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return null;

  const data = `${day}/${month}/${year}`;

  let hora: string | undefined;
  if (timePartRaw) {
    const match = timePartRaw.match(/^(\d{2}):(\d{2})/);
    if (match) {
      hora = `${match[1]}:${match[2]}`;
    }
  }

  return { data, hora };
}

/**
 * Gera dados ESC/POS para impressão da VIA DA EMPRESA da Ordem de Serviço
 */
export function generateOrdemServicoViaEmpresa(ordem: OrdemServicoData): Uint8Array {
  const printer = new ESCPOSPrinter();
  
  const lines: Array<{
    text: string;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    doubleSize?: boolean;
  }> = [];

  // Header
  lines.push(
    { text: "TECNOBOOK", align: "center", bold: true, doubleSize: true },
    { text: "Ordem de Servico", align: "center" },
    { text: "================================", align: "center" }
  );

  // Número da O.S. e Data/Hora
  const dataAbertura = parseISO(ordem.created_at);
  lines.push(
    { text: `O.S. #${ordem.numero}`, bold: true, doubleSize: true },
    { text: `Data: ${format(dataAbertura, "dd/MM/yyyy")}` },
    { text: `Horario: ${format(dataAbertura, "HH:mm")}` }
  );
  
  if (ordem.atendente_nome) {
    lines.push({ text: `Atendente: ${ordem.atendente_nome}` });
  }
  
  lines.push({ text: "--------------------------------" });

  // Cliente
  lines.push(
    { text: "CLIENTE:", bold: true },
    { text: ordem.cliente_nome }
  );
  
  if (ordem.cliente_telefone) {
    lines.push({ text: `Tel: ${ordem.cliente_telefone}` });
  }
  lines.push({ text: "" }); // Linha em branco

  // Equipamento
  if (ordem.marca_nome || ordem.modelo_nome) {
    lines.push({ text: "EQUIPAMENTO:", bold: true });
    
    if (ordem.marca_nome && ordem.modelo_nome) {
      lines.push({ text: `${ordem.marca_nome} ${ordem.modelo_nome}` });
    } else if (ordem.marca_nome) {
      lines.push({ text: ordem.marca_nome });
    } else if (ordem.modelo_nome) {
      lines.push({ text: ordem.modelo_nome });
    }
    
    if (ordem.numero_serie) {
      lines.push({ text: `S/N: ${ordem.numero_serie}` });
    }
    
    if (ordem.cor_aparelho) {
      lines.push({ text: `COR: ${ordem.cor_aparelho}` });
    }
    lines.push({ text: "" });
  }

  // Senha
  if (ordem.tipo_senha === 'PADRAO') {
    lines.push(
      { text: "SENHA: PADRAO DE DESBLOQUEIO", bold: true },
      { text: "Desenhe o padrao abaixo:", bold: true },
      { text: "" },
      { text: "  O   O   O", align: "center" },
      { text: "", align: "center" },
      { text: "  O   O   O", align: "center" },
      { text: "", align: "center" },
      { text: "  O   O   O", align: "center" },
      { text: "" }
    );
  } else if (ordem.tipo_senha === 'LIVRE' && ordem.senha_aparelho) {
    lines.push({ text: `SENHA: ${ordem.senha_aparelho}`, bold: true });
    lines.push({ text: "" });
  }

  // Status
  lines.push({ text: `STATUS: ${ordem.status.toUpperCase()}`, bold: true });
  lines.push({ text: "" });

  // Situação Atual
  if (ordem.situacao_atual) {
    lines.push({ text: "SITUACAO ATUAL:", bold: true });
    lines.push({ text: ordem.situacao_atual });
    lines.push({ text: "" });
  }

  // Relato do Cliente
  if (ordem.relato_cliente) {
    lines.push({ text: "RELATO DO CLIENTE:", bold: true });
    lines.push({ text: ordem.relato_cliente });
    lines.push({ text: "" });
  }

  // Descrição do Problema
  if (ordem.descricao_problema) {
    lines.push({ text: "PROBLEMA:", bold: true });
    lines.push({ text: ordem.descricao_problema });
    lines.push({ text: "" });
  }

  // Acessórios Entregues
  if (ordem.acessorios_entregues) {
    lines.push({ text: "ACESSORIOS ENTREGUES:", bold: true });
    lines.push({ text: ordem.acessorios_entregues });
    lines.push({ text: "" });
  }

  // Estado Físico
  if (ordem.estado_fisico) {
    lines.push({ text: "ESTADO FISICO:", bold: true });
    lines.push({ text: ordem.estado_fisico });
    lines.push({ text: "" });
  }

  // Serviço a Realizar
  if (ordem.servico_realizar) {
    lines.push({ text: "SERVICO A REALIZAR:", bold: true });
    lines.push({ text: ordem.servico_realizar });
    lines.push({ text: "" });
  }

  // Valores
  lines.push({ text: "--------------------------------" });
  
  if (ordem.valor_estimado || ordem.valor_total) {
    const valor = ordem.valor_total || ordem.valor_estimado || 0;
    lines.push({ text: `Valor: R$ ${valor.toFixed(2)}` });
  }

  if (ordem.valor_entrada) {
    lines.push({ text: `Entrada: R$ ${ordem.valor_entrada.toFixed(2)}` });
    
    const valorRestante = (ordem.valor_total || ordem.valor_estimado || 0) - ordem.valor_entrada;
    if (valorRestante > 0) {
      lines.push({ text: `Restante: R$ ${valorRestante.toFixed(2)}`, bold: true });
    }
  }

  if (ordem.data_prevista_entrega) {
    lines.push({ text: "" });
    const previsao = formatPrevisaoEntrega(ordem.data_prevista_entrega);
    if (previsao) {
      lines.push({ text: `Prev. Entrega: ${previsao.data}` });
      if (previsao.hora) {
        lines.push({ text: `Horario: ${previsao.hora}` });
      }
    }
  }

  // Termos de Serviço
  if (ordem.termos_servico && ordem.termos_servico.length > 0) {
    lines.push(
      { text: "" },
      { text: "================================" },
      { text: "TERMOS DE SERVICO", align: "center", bold: true },
      { text: "================================" },
      { text: "" }
    );
    ordem.termos_servico.forEach((termo) => {
      const titulo = getTermoTitulo(termo);
      lines.push({ text: `${titulo.toUpperCase()}:`, bold: true });
      lines.push({ text: "" });
      
      // Quebra o texto em múltiplas linhas para caber na impressora
      const textoCompleto = getTermoTextoCompleto(termo);
      const linhasTexto = wrapText(textoCompleto, 48);
      linhasTexto.forEach((linha) => {
        lines.push({ text: linha });
      });
      
      lines.push({ text: "" });
    });
  }

  // Observações
  if (ordem.observacoes) {
    lines.push(
      { text: "" },
      { text: "--------------------------------" },
      { text: "OBSERVACOES:", bold: true },
      { text: ordem.observacoes }
    );
  }

  // Footer via empresa
  lines.push(
    { text: "" },
    { text: "================================", align: "center" },
    { text: "VIA EMPRESA/TECNICO", align: "center", bold: true },
    { text: "TECNOBOOK - Sistema de O.S.", align: "center" },
    { text: new Date().toLocaleString("pt-BR"), align: "center" },
    { text: "" },
    { text: "" },
    { text: "" }
  );

  return printer.buildReceipt(lines);
}

/**
 * Gera dados ESC/POS para impressão da VIA DO CLIENTE com assinatura
 */
export function generateOrdemServicoViaCliente(ordem: OrdemServicoData): Uint8Array {
  const printer = new ESCPOSPrinter();
  
  const lines: Array<{
    text: string;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    doubleSize?: boolean;
  }> = [];

  // Header
  lines.push(
    { text: "TECNOBOOK", align: "center", bold: true, doubleSize: true },
    { text: "Ordem de Servico - VIA CLIENTE", align: "center", bold: true },
    { text: "================================", align: "center" }
  );

  // Número da O.S. e Data/Hora
  const dataAbertura = parseISO(ordem.created_at);
  lines.push(
    { text: `O.S. #${ordem.numero}`, bold: true, doubleSize: true },
    { text: `Data: ${format(dataAbertura, "dd/MM/yyyy")}` },
    { text: `Horario: ${format(dataAbertura, "HH:mm")}` }
  );
  
  if (ordem.atendente_nome) {
    lines.push({ text: `Atendente: ${ordem.atendente_nome}` });
  }
  
  lines.push({ text: "--------------------------------" });

  // Cliente
  lines.push(
    { text: "CLIENTE:", bold: true },
    { text: ordem.cliente_nome }
  );
  
  if (ordem.cliente_telefone) {
    lines.push({ text: `Tel: ${ordem.cliente_telefone}` });
  }
  lines.push({ text: "" });

  // Equipamento
  if (ordem.marca_nome || ordem.modelo_nome) {
    lines.push({ text: "EQUIPAMENTO:", bold: true });
    
    if (ordem.marca_nome && ordem.modelo_nome) {
      lines.push({ text: `${ordem.marca_nome} ${ordem.modelo_nome}` });
    } else if (ordem.marca_nome) {
      lines.push({ text: ordem.marca_nome });
    } else if (ordem.modelo_nome) {
      lines.push({ text: ordem.modelo_nome });
    }
    
    if (ordem.numero_serie) {
      lines.push({ text: `S/N: ${ordem.numero_serie}` });
    }
    
    if (ordem.cor_aparelho) {
      lines.push({ text: `COR: ${ordem.cor_aparelho}` });
    }
    lines.push({ text: "" });
  }

  // Senha
  if (ordem.tipo_senha === 'PADRAO') {
    lines.push(
      { text: "SENHA: PADRAO DE DESBLOQUEIO", bold: true },
      { text: "Desenhe o padrao abaixo:", bold: true },
      { text: "" },
      { text: "  O   O   O", align: "center" },
      { text: "", align: "center" },
      { text: "  O   O   O", align: "center" },
      { text: "", align: "center" },
      { text: "  O   O   O", align: "center" },
      { text: "" }
    );
  } else if (ordem.tipo_senha === 'LIVRE' && ordem.senha_aparelho) {
    lines.push({ text: `SENHA: ${ordem.senha_aparelho}`, bold: true });
    lines.push({ text: "" });
  }

  // Status
  lines.push({ text: `STATUS: ${ordem.status.toUpperCase()}`, bold: true });
  lines.push({ text: "" });

  // Situação Atual
  if (ordem.situacao_atual) {
    lines.push({ text: "SITUACAO ATUAL:", bold: true });
    lines.push({ text: ordem.situacao_atual });
    lines.push({ text: "" });
  }

  // Relato do Cliente
  if (ordem.relato_cliente) {
    lines.push({ text: "RELATO DO CLIENTE:", bold: true });
    lines.push({ text: ordem.relato_cliente });
    lines.push({ text: "" });
  }

  // Descrição do Problema
  if (ordem.descricao_problema) {
    lines.push({ text: "PROBLEMA:", bold: true });
    lines.push({ text: ordem.descricao_problema });
    lines.push({ text: "" });
  }

  // Acessórios Entregues
  if (ordem.acessorios_entregues) {
    lines.push({ text: "ACESSORIOS ENTREGUES:", bold: true });
    lines.push({ text: ordem.acessorios_entregues });
    lines.push({ text: "" });
  }

  // Serviço a Realizar
  if (ordem.servico_realizar) {
    lines.push({ text: "SERVICO A REALIZAR:", bold: true });
    lines.push({ text: ordem.servico_realizar });
    lines.push({ text: "" });
  }

  // Valores
  lines.push({ text: "--------------------------------" });
  
  if (ordem.valor_estimado || ordem.valor_total) {
    const valor = ordem.valor_total || ordem.valor_estimado || 0;
    lines.push({ text: `Valor: R$ ${valor.toFixed(2)}` });
  }

  if (ordem.valor_entrada) {
    lines.push({ text: `Entrada: R$ ${ordem.valor_entrada.toFixed(2)}` });
    
    const valorRestante = (ordem.valor_total || ordem.valor_estimado || 0) - ordem.valor_entrada;
    if (valorRestante > 0) {
      lines.push({ text: `Restante: R$ ${valorRestante.toFixed(2)}`, bold: true });
    }
  }

  if (ordem.data_prevista_entrega) {
    lines.push({ text: "" });
    const previsao = formatPrevisaoEntrega(ordem.data_prevista_entrega);
    if (previsao) {
      lines.push({ text: `Prev. Entrega: ${previsao.data}` });
      if (previsao.hora) {
        lines.push({ text: `Horario: ${previsao.hora}` });
      }
    }
  }

  // Observações
  if (ordem.observacoes) {
    lines.push(
      { text: "" },
      { text: "--------------------------------" },
      { text: "OBSERVACOES:", bold: true },
      { text: ordem.observacoes }
    );
  }

  // Termos de Serviço
  if (ordem.termos_servico && ordem.termos_servico.length > 0) {
    lines.push(
      { text: "" },
      { text: "================================" },
      { text: "TERMOS DE SERVICO", align: "center", bold: true },
      { text: "================================" },
      { text: "" }
    );
    ordem.termos_servico.forEach((termo) => {
      lines.push({ text: `${termo.toUpperCase()}:`, bold: true });
      lines.push({ text: "" });
      
      // Quebra o texto em múltiplas linhas para caber na impressora
      const textoCompleto = getTermoTextoCompleto(termo);
      const linhasTexto = wrapText(textoCompleto, 48);
      linhasTexto.forEach((linha) => {
        lines.push({ text: linha });
      });
      
      lines.push({ text: "" });
    });
  }

  // Assinatura
  lines.push(
    { text: "" },
    { text: "" },
    { text: "--------------------------------" },
    { text: "ASSINATURA DO CLIENTE", align: "center", bold: true },
    { text: "" },
    { text: "" },
    { text: "_______________________________", align: "center" },
    { text: ordem.cliente_nome, align: "center" },
    { text: "" },
    { text: "" },
    { text: "Declaro que recebi o equipamento", align: "center" },
    { text: "acima nas condicoes descritas", align: "center" },
    { text: "" },
    { text: "================================", align: "center" },
    { text: "TECNOBOOK - Sistema de O.S.", align: "center" },
    { text: new Date().toLocaleString("pt-BR"), align: "center" },
    { text: "" },
    { text: "" },
    { text: "" }
  );

  return printer.buildReceipt(lines);
}
