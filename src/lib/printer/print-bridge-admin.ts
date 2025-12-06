// Funções auxiliares para administradores enviarem trabalhos de impressão

import { supabase } from "@/integrations/supabase/client";
import { escposPrinter } from "./escpos";

export interface SendPrintJobOptions {
  documentType: "service_order" | "checklist" | "receipt" | "custom";
  escposDataBase64?: string; // Se fornecido, usa este dado
  ordemServico?: any; // Para gerar automaticamente
  checklist?: any;
  customReceipt?: Array<{
    text: string;
    align?: "left" | "center" | "right";
    bold?: boolean;
    doubleSize?: boolean;
  }>;
  metadata?: {
    ordemId?: string;
    checklistId?: string;
    description?: string;
  };
}

/**
 * Envia trabalho de impressão para todos os dispositivos PRINT_BRIDGE conectados
 */
export async function sendPrintJobToDevices(options: SendPrintJobOptions): Promise<{
  success: boolean;
  jobId: string;
  error?: string;
}> {
  try {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let escposDataBase64: string;

    // Se dados já fornecidos, usa direto
    if (options.escposDataBase64) {
      escposDataBase64 = options.escposDataBase64;
    } else {
      // Gera dados ESC/POS baseado no tipo
      let data: Uint8Array;

      if (options.documentType === "service_order" && options.ordemServico) {
        data = generateServiceOrderReceipt(options.ordemServico);
      } else if (options.documentType === "checklist" && options.checklist) {
        data = generateChecklistReceipt(options.checklist);
      } else if (options.documentType === "custom" && options.customReceipt) {
        data = escposPrinter.buildReceipt(options.customReceipt);
      } else {
        throw new Error("Dados insuficientes para gerar recibo");
      }

      // Converte para base64
      escposDataBase64 = btoa(String.fromCharCode(...Array.from(data)));
    }

    // Envia via broadcast para canal print-bridge-jobs
    const channel = supabase.channel("print-bridge-jobs");
    
    await channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.send({
          type: "broadcast",
          event: "print_job",
          payload: {
            jobId,
            action: "print",
            escposDataBase64,
            documentType: options.documentType,
            metadata: options.metadata,
          },
        });

        console.log(`[PrintBridge Admin] Job ${jobId} enviado`);
        
        // Desconecta após enviar
        setTimeout(() => {
          channel.unsubscribe();
        }, 1000);
      }
    });

    return {
      success: true,
      jobId,
    };
  } catch (error) {
    console.error("[PrintBridge Admin] Erro ao enviar job:", error);
    return {
      success: false,
      jobId: "",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/**
 * Gera recibo ESC/POS para ordem de serviço
 */
function generateServiceOrderReceipt(ordem: any): Uint8Array {
  return escposPrinter.buildReceipt([
    { text: "ORDEM DE SERVIÇO", align: "center", bold: true, doubleSize: true },
    { text: `N° ${ordem.numero}`, align: "center", bold: true },
    { text: "================================", align: "center" },
    { text: "" },
    { text: "CLIENTE", align: "left", bold: true },
    { text: ordem.clientes?.nome || "N/A", align: "left" },
    { text: ordem.clientes?.telefone || "", align: "left" },
    { text: "" },
    { text: "EQUIPAMENTO", align: "left", bold: true },
    { text: `${ordem.marcas?.nome || ""} ${ordem.modelos?.nome || ""}`, align: "left" },
    { text: "" },
    { text: "PROBLEMA RELATADO", align: "left", bold: true },
    { text: ordem.descricao_problema || "N/A", align: "left" },
    { text: "" },
    { text: "SERVIÇO A REALIZAR", align: "left", bold: true },
    { text: ordem.servico_realizar || "N/A", align: "left" },
    { text: "" },
    { text: "================================", align: "center" },
    { text: `Valor: R$ ${(ordem.valor_total || 0).toFixed(2)}`, align: "right" },
    { text: `Entrada: R$ ${(ordem.valor_entrada || 0).toFixed(2)}`, align: "right" },
    { text: "" },
    { text: "Data: " + new Date().toLocaleString("pt-BR"), align: "center" },
    { text: "" },
  ]);
}

/**
 * Gera recibo ESC/POS para checklist
 */
function generateChecklistReceipt(checklist: any): Uint8Array {
  const lines: Array<{
    text: string;
    align?: "left" | "center" | "right";
    bold?: boolean;
  }> = [
    { text: "CHECKLIST TÉCNICO", align: "center", bold: true },
    { text: "================================", align: "center" },
    { text: "" },
    { text: `Tipo: ${checklist.tipo === "android" ? "Android" : "iOS"}`, align: "left" },
    { text: "" },
  ];

  // Adiciona componentes verificados
  const components = [
    { label: "Touch", value: checklist.situacao_touch },
    { label: "Display/Carcaça", value: checklist.situacao_carcaca },
    { label: "Câmera Frontal", value: checklist.camera_frontal },
    { label: "Câmera Traseira", value: checklist.camera_traseira },
    { label: "Flash", value: checklist.flash },
    { label: "Alto-falante", value: checklist.alto_falante },
    { label: "Auricular", value: checklist.auricular },
    { label: "Microfone", value: checklist.microfone },
    { label: "Conector de Carga", value: checklist.conector_carga },
    { label: "Botão Power", value: checklist.botao_power },
    { label: "Botão Volume", value: checklist.botao_volume },
    { label: "Wi-Fi", value: checklist.wifi },
    { label: "Bluetooth", value: checklist.bluetooth },
  ];

  components.forEach((comp) => {
    if (comp.value) {
      const status = comp.value === "funcionando" ? "OK" : comp.value === "com_defeito" ? "DEFEITO" : "N/T";
      lines.push({ text: `${comp.label}: ${status}`, align: "left" });
    }
  });

  if (checklist.observacoes) {
    lines.push({ text: "" });
    lines.push({ text: "OBSERVAÇÕES:", align: "left", bold: true });
    lines.push({ text: checklist.observacoes, align: "left" });
  }

  lines.push({ text: "" });
  lines.push({ text: "================================", align: "center" });
  lines.push({ text: new Date().toLocaleString("pt-BR"), align: "center" });

  return escposPrinter.buildReceipt(lines);
}

/**
 * Escuta respostas dos dispositivos ponte
 */
export function listenToPrintJobResponses(
  onResponse: (response: {
    jobId: string;
    status: "OK" | "ERROR";
    timestamp: number;
    deviceId: string;
    error?: string;
  }) => void
): () => void {
  const channel = supabase.channel("print-bridge-jobs");

  channel
    .on("broadcast", { event: "print_job_response" }, (payload) => {
      console.log("[PrintBridge Admin] Resposta recebida:", payload);
      onResponse(payload.payload);
    })
    .subscribe();

  // Retorna função de cleanup
  return () => {
    channel.unsubscribe();
  };
}
