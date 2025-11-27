import { ESCPOSPrinter } from "./escpos";

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
}

interface ChecklistData {
  tipo: 'android' | 'ios';
  components: Record<string, string>;
  observacoes?: string | null;
  atendente_nome?: string | null;
}

/**
 * Gera dados ESC/POS para impressão de Ordem de Serviço
 * Imprime duas vias: uma para empresa/técnicos e outra para o cliente com checklist e assinatura
 */
export function generateOrdemServicoESCPOS(
  ordem: OrdemServicoData, 
  checklist?: ChecklistData
): Uint8Array {
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

  // Número da O.S. e Data
  lines.push(
    { text: `O.S. #${ordem.numero}`, bold: true, doubleSize: true },
    { text: `Data: ${new Date(ordem.created_at).toLocaleDateString("pt-BR")}` }
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

  // Descrição do Problema
  if (ordem.descricao_problema) {
    lines.push({ text: "PROBLEMA:", bold: true });
    lines.push({ text: ordem.descricao_problema });
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
    const dataEntrega = new Date(ordem.data_prevista_entrega);
    lines.push({ text: `Prev. Entrega: ${dataEntrega.toLocaleDateString("pt-BR")} as ${dataEntrega.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}` });
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

  // Se houver checklist, imprimir segunda via para o cliente
  if (checklist) {
    lines.push(
      { text: "================================", align: "center" },
      { text: "================================", align: "center" },
      { text: "" },
      { text: "TECNOBOOK", align: "center", bold: true, doubleSize: true },
      { text: "Ordem de Servico - VIA CLIENTE", align: "center", bold: true },
      { text: "================================", align: "center" }
    );

    // Número da O.S. e Data
    lines.push(
      { text: `O.S. #${ordem.numero}`, bold: true, doubleSize: true },
      { text: `Data: ${new Date(ordem.created_at).toLocaleDateString("pt-BR")}` }
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

    // Checklist
    lines.push(
      { text: "CHECKLIST DE ENTRADA", bold: true, align: "center" },
      { text: "--------------------------------" }
    );

    const componentLabels: Record<string, string> = {
      situacao_touch: "Tela Touch",
      alto_falante: "Alto-falante",
      auricular: "Auricular",
      carregador: "Carregador",
      conector_carga: "Conector de Carga",
      microfone: "Microfone",
      camera_frontal: "Camera Frontal",
      camera_traseira: "Camera Traseira",
      flash: "Flash",
      fone_ouvido: "Fone de Ouvido",
      wifi: "WiFi",
      bluetooth: "Bluetooth",
      biometria: "Biometria",
      face_id: "Face ID",
      botao_home: "Botao Home",
      botao_power: "Botao Power",
      botao_volume: "Botao Volume",
      sensor_proximidade: "Sensor Proximidade",
      vibra_call: "Vibra Call",
      situacao_carcaca: "Carcaca",
      sim_chip: "Chip SIM",
      slot_sim: "Slot SIM",
      parafuso: "Parafusos"
    };

    const statusMap: Record<string, string> = {
      funcionando: "OK",
      com_defeito: "DEFEITO",
      nao_testado: "NAO TESTADO",
      nao_possui: "NAO POSSUI"
    };

    for (const [key, label] of Object.entries(componentLabels)) {
      if (checklist.components[key]) {
        const status = statusMap[checklist.components[key]] || checklist.components[key].toUpperCase();
        lines.push({ text: `${label}: ${status}` });
      }
    }

    if (checklist.observacoes) {
      lines.push(
        { text: "" },
        { text: "OBSERVACOES:", bold: true },
        { text: checklist.observacoes }
      );
    }

    // Valores
    lines.push(
      { text: "" },
      { text: "--------------------------------" }
    );
    
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
      const dataEntrega = new Date(ordem.data_prevista_entrega);
      lines.push({ text: `Prev. Entrega: ${dataEntrega.toLocaleDateString("pt-BR")}` });
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
      { text: "================================", align: "center" },
      { text: "TECNOBOOK - Sistema de O.S.", align: "center" },
      { text: new Date().toLocaleString("pt-BR"), align: "center" }
    );
  }

  return printer.buildReceipt(lines);
}
