import { ESCPOSPrinter } from "./escpos";

type ComponentStatus = "ok" | "com_defeito" | "nao_testado" | "nao_possui";

interface ChecklistData {
  tipo: "entrada" | "saida";
  created_at: string;
  ordem_servico_numero: number;
  cliente_nome: string;
  atendente_nome?: string | null;
  alto_falante?: ComponentStatus | null;
  auricular?: ComponentStatus | null;
  situacao_touch?: ComponentStatus | null;
  carregador?: ComponentStatus | null;
  conector_carga?: ComponentStatus | null;
  microfone?: ComponentStatus | null;
  flash?: ComponentStatus | null;
  fone_ouvido?: ComponentStatus | null;
  botao_home?: ComponentStatus | null;
  botao_power?: ComponentStatus | null;
  botao_volume?: ComponentStatus | null;
  bluetooth?: ComponentStatus | null;
  camera_traseira?: ComponentStatus | null;
  camera_frontal?: ComponentStatus | null;
  biometria?: ComponentStatus | null;
  parafuso?: ComponentStatus | null;
  sensor_proximidade?: ComponentStatus | null;
  vibra_call?: ComponentStatus | null;
  wifi?: ComponentStatus | null;
  slot_sim?: ComponentStatus | null;
  sim_chip?: ComponentStatus | null;
  situacao_carcaca?: ComponentStatus | null;
  face_id?: ComponentStatus | null;
  observacoes?: string | null;
}

const componentesAndroid = [
  { key: "alto_falante", label: "Alto Falante" },
  { key: "auricular", label: "Auricular" },
  { key: "situacao_touch", label: "Situacao Touch" },
  { key: "carregador", label: "Carregador" },
  { key: "conector_carga", label: "Conector Carga" },
  { key: "microfone", label: "Microfone" },
  { key: "flash", label: "Flash" },
  { key: "fone_ouvido", label: "Fone Ouvido" },
  { key: "botao_home", label: "Botao Home" },
  { key: "botao_power", label: "Botao Power" },
  { key: "botao_volume", label: "Botao Volume" },
  { key: "bluetooth", label: "Bluetooth" },
  { key: "camera_traseira", label: "Cam. Traseira" },
  { key: "camera_frontal", label: "Cam. Frontal" },
  { key: "biometria", label: "Biometria" },
  { key: "parafuso", label: "Parafuso" },
  { key: "sensor_proximidade", label: "Sensor Prox." },
  { key: "vibra_call", label: "Vibra Call" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "slot_sim", label: "Slot SIM" },
  { key: "sim_chip", label: "SIM/Chip" },
  { key: "situacao_carcaca", label: "Carcaca" },
];

const componentesIOS = [
  ...componentesAndroid,
  { key: "face_id", label: "Face ID" },
];

const statusMap: Record<ComponentStatus, string> = {
  ok: "OK",
  com_defeito: "DEFEITO",
  nao_testado: "NAO TEST.",
  nao_possui: "N/A",
};

/**
 * Gera dados ESC/POS para impressão de Checklist
 */
export function generateChecklistESCPOS(checklist: ChecklistData): Uint8Array {
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
    { text: `Checklist ${checklist.tipo.toUpperCase()}`, align: "center" },
    { text: "================================", align: "center" }
  );

  // Informações da O.S.
  lines.push(
    { text: `O.S. #${checklist.ordem_servico_numero}`, bold: true },
    { text: `Cliente: ${checklist.cliente_nome}` },
    { text: `Data: ${new Date(checklist.created_at).toLocaleDateString("pt-BR")}` }
  );
  
  if (checklist.atendente_nome) {
    lines.push({ text: `Atendente: ${checklist.atendente_nome}` });
  }
  
  lines.push({ text: "--------------------------------" });

  // Componentes
  lines.push({ text: "COMPONENTES:", bold: true, align: "center" });
  lines.push({ text: "" });

  const componentesList = checklist.tipo === "saida" ? componentesIOS : componentesAndroid;

  componentesList.forEach((comp) => {
    const status = checklist[comp.key as keyof ChecklistData] as ComponentStatus | null;
    if (status) {
      const statusText = statusMap[status];
      lines.push({ text: `${comp.label}: ${statusText}` });
    }
  });

  // Observações
  if (checklist.observacoes) {
    lines.push(
      { text: "" },
      { text: "--------------------------------" },
      { text: "OBSERVACOES:", bold: true },
      { text: checklist.observacoes }
    );
  }

  // Footer
  lines.push(
    { text: "" },
    { text: "================================", align: "center" },
    { text: "TECNOBOOK - Sistema de O.S.", align: "center" },
    { text: new Date().toLocaleString("pt-BR"), align: "center" }
  );

  return printer.buildReceipt(lines);
}
