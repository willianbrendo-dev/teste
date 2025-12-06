import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from "jspdf";
import { ComboboxSelect } from "@/components/ui/combobox-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Trash2, Eye, Filter, ChevronDown, Edit, FileDown, RefreshCw, CalendarIcon } from "lucide-react";
import { PrintButton } from "@/components/PrintButton";
import { usePrintBridge } from "@/hooks/use-print-bridge";
import { generateChecklistESCPOS } from "@/lib/printer/escpos-checklist-generator";
import type { Database } from "@/integrations/supabase/types";
import { format } from "date-fns";

type ComponentStatus = Database["public"]["Enums"]["component_status"];
type ChecklistType = Database["public"]["Enums"]["checklist_type"];
type ChecklistStatus = Database["public"]["Enums"]["checklist_status"];

interface Checklist {
  id: string;
  ordem_servico_id: string;
  tipo: ChecklistType;
  status: ChecklistStatus;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  atendente_nome?: string;
  alto_falante: ComponentStatus | null;
  auricular: ComponentStatus | null;
  situacao_touch: ComponentStatus | null;
  carregador: ComponentStatus | null;
  conector_carga: ComponentStatus | null;
  microfone: ComponentStatus | null;
  flash: ComponentStatus | null;
  fone_ouvido: ComponentStatus | null;
  botao_home: ComponentStatus | null;
  botao_power: ComponentStatus | null;
  botao_volume: ComponentStatus | null;
  bluetooth: ComponentStatus | null;
  camera_traseira: ComponentStatus | null;
  camera_frontal: ComponentStatus | null;
  biometria: ComponentStatus | null;
  parafuso: ComponentStatus | null;
  sensor_proximidade: ComponentStatus | null;
  vibra_call: ComponentStatus | null;
  wifi: ComponentStatus | null;
  slot_sim: ComponentStatus | null;
  sim_chip: ComponentStatus | null;
  situacao_carcaca: ComponentStatus | null;
  face_id: ComponentStatus | null;
  observacoes: string | null;
  ordens_servico?: {
    numero: number;
    cliente_id: string;
    data_prevista_entrega: string | null;
    clientes?: {
      nome: string;
    };
  };
}

interface OrdemServico {
  id: string;
  numero: number;
  cliente_id: string;
  data_prevista_entrega: string | null;
  clientes?: {
    nome: string;
  };
}

const statusOptions: { value: ComponentStatus; label: string }[] = [
  { value: "ok", label: "Funcionando" },
  { value: "com_defeito", label: "Com Defeito" },
  { value: "nao_testado", label: "Não Testado" },
  { value: "nao_possui", label: "Não Possui" },
];

const componentesAndroid = [
  { key: "alto_falante", label: "Alto Falante" },
  { key: "auricular", label: "Auricular" },
  { key: "situacao_touch", label: "Situação do Touch" },
  { key: "carregador", label: "Carregador" },
  { key: "conector_carga", label: "Conector de Carga" },
  { key: "microfone", label: "Microfone" },
  { key: "flash", label: "Flash" },
  { key: "fone_ouvido", label: "Fone de Ouvido" },
  { key: "botao_home", label: "Botão Home" },
  { key: "botao_power", label: "Botão Power" },
  { key: "botao_volume", label: "Botão Volume" },
  { key: "bluetooth", label: "Bluetooth" },
  { key: "camera_traseira", label: "Câmera Traseira" },
  { key: "camera_frontal", label: "Câmera Frontal" },
  { key: "biometria", label: "Biometria" },
  { key: "parafuso", label: "Parafuso" },
  { key: "sensor_proximidade", label: "Sensor de Proximidade" },
  { key: "vibra_call", label: "Vibra Call" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "slot_sim", label: "Slot SIM" },
  { key: "sim_chip", label: "SIM/Chip" },
  { key: "situacao_carcaca", label: "Situação da Carcaça" },
];

const componentesIOS = [
  { key: "alto_falante", label: "Alto Falante" },
  { key: "auricular", label: "Auricular" },
  { key: "situacao_touch", label: "Situação do Touch" },
  { key: "carregador", label: "Carregador" },
  { key: "conector_carga", label: "Conector de Carga" },
  { key: "microfone", label: "Microfone" },
  { key: "flash", label: "Flash" },
  { key: "fone_ouvido", label: "Fone de Ouvido" },
  { key: "botao_home", label: "Botão Home" },
  { key: "botao_power", label: "Botão Power" },
  { key: "botao_volume", label: "Botão Volume" },
  { key: "bluetooth", label: "Bluetooth" },
  { key: "camera_traseira", label: "Câmera Traseira" },
  { key: "camera_frontal", label: "Câmera Frontal" },
  { key: "biometria", label: "Biometria" },
  { key: "face_id", label: "Face ID" },
  { key: "parafuso", label: "Parafuso" },
  { key: "sensor_proximidade", label: "Sensor de Proximidade" },
  { key: "vibra_call", label: "Vibra Call" },
  { key: "wifi", label: "Wi-Fi" },
  { key: "slot_sim", label: "Slot SIM" },
  { key: "sim_chip", label: "SIM/Chip" },
  { key: "situacao_carcaca", label: "Situação da Carcaça" },
];

interface ChecklistsContentProps {
  highlightOrdemId?: string;
}

export default function ChecklistsContent({ highlightOrdemId }: ChecklistsContentProps) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ChecklistType | null>(null);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [editingChecklist, setEditingChecklist] = useState<Checklist | null>(null);
  const [checklistToChangeStatus, setChecklistToChangeStatus] = useState<Checklist | null>(null);
  const [newStatus, setNewStatus] = useState<ChecklistStatus>("pendente");
  const [dataEntrega, setDataEntrega] = useState<string>("");
  const [formData, setFormData] = useState<Partial<Checklist>>({});
  const { 
    printChecklist, 
    status: printStatus, 
    isPrinting
  } = usePrintBridge();

  useEffect(() => {
    fetchChecklists();
    fetchOrdensServico();
    checkAtrasados();
  }, []);

  // Auto-open dialog for highlighted ordem without checklist
  useEffect(() => {
    if (!highlightOrdemId) return;

    const checkAndOpen = async () => {
      // Check if this ordem already has a checklist
      const { data: existingChecklist } = await supabase
        .from("checklists")
        .select("id")
        .eq("ordem_servico_id", highlightOrdemId)
        .maybeSingle();

      if (existingChecklist) return; // Already has checklist, don't auto-open

      // Auto-open type selection dialog
      setIsTypeDialogOpen(true);
      
      // Pre-select the ordem in form
      setFormData({ ordem_servico_id: highlightOrdemId });
    };

    // Delay to ensure ordensServico is loaded
    const timer = setTimeout(() => {
      checkAndOpen();
    }, 500);

    return () => clearTimeout(timer);
  }, [highlightOrdemId]);

  const checkAtrasados = async () => {
    try {
      await supabase.rpc('check_checklist_atraso');
      // Recarrega os checklists após verificar atrasos
      fetchChecklists();
    } catch (error) {
      console.error("Erro ao verificar checklists em atraso:", error);
    }
  };

  const fetchChecklists = async () => {
    const { data, error } = await supabase
      .from("checklists")
      .select(`
        *,
        ordens_servico (
          numero,
          cliente_id,
          data_prevista_entrega,
          clientes (
            nome
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar checklists", variant: "destructive" });
      return;
    }

    // Buscar nomes dos atendentes
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(c => c.created_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", userIds);
      
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const checklistsWithAtendente = data.map(checklist => ({
        ...checklist,
        atendente_nome: checklist.created_by ? profilesMap.get(checklist.created_by)?.nome : undefined
      }));
      
      setChecklists(checklistsWithAtendente as any);
    } else {
      setChecklists(data || []);
    }
  };

  const fetchOrdensServico = async () => {
    const { data, error } = await supabase
      .from("ordens_servico")
      .select(`
        id,
        numero,
        cliente_id,
        data_prevista_entrega,
        clientes (
          nome
        )
      `)
      .eq("status", "aberta")
      .order("numero", { ascending: false });

    if (error) {
      toast({ title: "Erro ao carregar ordens de serviço", variant: "destructive" });
      return;
    }

    setOrdensServico(data || []);
  };

  const handleSelectType = (type: ChecklistType) => {
    setSelectedType(type);
    setIsTypeDialogOpen(false);
    setIsDialogOpen(true);
    setFormData((prev) => ({ ...prev, tipo: type }));
  };

  const handleSubmit = async () => {
    if (!formData.ordem_servico_id || !formData.tipo) {
      toast({ title: "Selecione uma ordem de serviço", variant: "destructive" });
      return;
    }

    const componentesList = selectedType === "saida" ? componentesIOS : componentesAndroid;
    const componentesPreenchidos = componentesList.filter(
      (comp) => formData[comp.key as keyof Checklist] != null
    );

    if (componentesPreenchidos.length === 0) {
      toast({ 
        title: "Preencha pelo menos um componente", 
        description: "Você precisa avaliar ao menos um componente do checklist antes de salvar.",
        variant: "destructive" 
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("checklists")
      .insert([{
        ordem_servico_id: formData.ordem_servico_id!,
        tipo: formData.tipo!,
        created_by: user.id,
        alto_falante: formData.alto_falante || null,
        auricular: formData.auricular || null,
        situacao_touch: formData.situacao_touch || null,
        carregador: formData.carregador || null,
        conector_carga: formData.conector_carga || null,
        microfone: formData.microfone || null,
        flash: formData.flash || null,
        fone_ouvido: formData.fone_ouvido || null,
        botao_home: formData.botao_home || null,
        botao_power: formData.botao_power || null,
        botao_volume: formData.botao_volume || null,
        bluetooth: formData.bluetooth || null,
        camera_traseira: formData.camera_traseira || null,
        camera_frontal: formData.camera_frontal || null,
        biometria: formData.biometria || null,
        parafuso: formData.parafuso || null,
        sensor_proximidade: formData.sensor_proximidade || null,
        vibra_call: formData.vibra_call || null,
        wifi: formData.wifi || null,
        slot_sim: formData.slot_sim || null,
        sim_chip: formData.sim_chip || null,
        situacao_carcaca: formData.situacao_carcaca || null,
        face_id: formData.face_id || null,
        observacoes: formData.observacoes || null,
      }]);

    if (error) {
      toast({ title: "Erro ao salvar checklist", variant: "destructive" });
      return;
    }

    toast({ title: "Checklist salvo com sucesso!" });
    setIsDialogOpen(false);
    setFormData({});
    setSelectedType(null);
    fetchChecklists();
  };

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm("Deseja realmente excluir este checklist?");
    if (!confirmDelete) return;

    const { error } = await supabase.from("checklists").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir checklist", variant: "destructive" });
      return;
    }

    toast({ title: "Checklist excluído com sucesso!" });
    fetchChecklists();
  };

  const handleViewChecklist = (checklist: Checklist) => {
    setSelectedChecklist(checklist);
    setIsViewDialogOpen(true);
  };

  const handleEditChecklist = (checklist: Checklist) => {
    setEditingChecklist(checklist);
    setFormData(checklist);
    setSelectedType(checklist.tipo);
    setIsEditDialogOpen(true);
  };

  const handleUpdateChecklist = async () => {
    if (!editingChecklist) return;

    const componentesList = editingChecklist.tipo === "saida" ? componentesIOS : componentesAndroid;
    const componentesPreenchidos = componentesList.filter(
      (comp) => formData[comp.key as keyof Checklist] != null
    );

    if (componentesPreenchidos.length === 0) {
      toast({ 
        title: "Preencha pelo menos um componente", 
        description: "Você precisa avaliar ao menos um componente do checklist antes de salvar.",
        variant: "destructive" 
      });
      return;
    }

    const { error } = await supabase
      .from("checklists")
      .update({
        alto_falante: formData.alto_falante || null,
        auricular: formData.auricular || null,
        situacao_touch: formData.situacao_touch || null,
        carregador: formData.carregador || null,
        conector_carga: formData.conector_carga || null,
        microfone: formData.microfone || null,
        flash: formData.flash || null,
        fone_ouvido: formData.fone_ouvido || null,
        botao_home: formData.botao_home || null,
        botao_power: formData.botao_power || null,
        botao_volume: formData.botao_volume || null,
        bluetooth: formData.bluetooth || null,
        camera_traseira: formData.camera_traseira || null,
        camera_frontal: formData.camera_frontal || null,
        biometria: formData.biometria || null,
        parafuso: formData.parafuso || null,
        sensor_proximidade: formData.sensor_proximidade || null,
        vibra_call: formData.vibra_call || null,
        wifi: formData.wifi || null,
        slot_sim: formData.slot_sim || null,
        sim_chip: formData.sim_chip || null,
        situacao_carcaca: formData.situacao_carcaca || null,
        face_id: formData.face_id || null,
        observacoes: formData.observacoes || null,
      })
      .eq("id", editingChecklist.id);

    if (error) {
      toast({ title: "Erro ao atualizar checklist", variant: "destructive" });
      return;
    }

    toast({ title: "Checklist atualizado com sucesso!" });
    setIsEditDialogOpen(false);
    setEditingChecklist(null);
    setFormData({});
    setSelectedType(null);
    fetchChecklists();
  };

  const updateComponentStatus = (key: string, value: ComponentStatus) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handlePrint = async (checklist: Checklist) => {
    if (isPrinting) return;

    const checklistData = {
      tipo: checklist.tipo,
      created_at: checklist.created_at,
      ordem_servico_numero: checklist.ordens_servico?.numero || 0,
      ordem_servico_id: checklist.ordem_servico_id,
      cliente_nome: checklist.ordens_servico?.clientes?.nome || "N/A",
      atendente_nome: checklist.atendente_nome,
      alto_falante: checklist.alto_falante,
      auricular: checklist.auricular,
      situacao_touch: checklist.situacao_touch,
      carregador: checklist.carregador,
      conector_carga: checklist.conector_carga,
      microfone: checklist.microfone,
      flash: checklist.flash,
      fone_ouvido: checklist.fone_ouvido,
      botao_home: checklist.botao_home,
      botao_power: checklist.botao_power,
      botao_volume: checklist.botao_volume,
      bluetooth: checklist.bluetooth,
      camera_traseira: checklist.camera_traseira,
      camera_frontal: checklist.camera_frontal,
      biometria: checklist.biometria,
      parafuso: checklist.parafuso,
      sensor_proximidade: checklist.sensor_proximidade,
      vibra_call: checklist.vibra_call,
      wifi: checklist.wifi,
      slot_sim: checklist.slot_sim,
      sim_chip: checklist.sim_chip,
      situacao_carcaca: checklist.situacao_carcaca,
      face_id: checklist.face_id,
      observacoes: checklist.observacoes,
    };

    await printChecklist(checklistData, checklist.ordem_servico_id);
  };

  const handleGeneratePDF = (checklist: Checklist) => {
    const doc = new jsPDF();
    const componentesList = checklist.tipo === "saida" ? componentesIOS : componentesAndroid;
    const statusMap = {
      ok: "Funcionando",
      com_defeito: "Com Defeito",
      nao_testado: "Não Testado",
      nao_possui: "Não Possui",
    };

    doc.setFontSize(18);
    doc.text(`Checklist ${checklist.tipo.toUpperCase()}`, 14, 20);

    doc.setFontSize(12);
    doc.text(`Ordem de Serviço: #${checklist.ordens_servico?.numero}`, 14, 35);
    doc.text(`Cliente: ${checklist.ordens_servico?.clientes?.nome}`, 14, 45);
    doc.text(`Data: ${new Date(checklist.created_at).toLocaleDateString("pt-BR")}`, 14, 55);

    doc.setFontSize(14);
    doc.text("Componentes:", 14, 70);
    
    let yPosition = 80;
    doc.setFontSize(10);

    componentesList.forEach((comp) => {
      const status = checklist[comp.key as keyof Checklist] as ComponentStatus | null;
      const statusText = status ? statusMap[status] : "-";
      
      doc.text(`${comp.label}:`, 14, yPosition);
      doc.text(statusText, 100, yPosition);
      yPosition += 7;

      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
    });

    if (checklist.observacoes) {
      yPosition += 10;
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(12);
      doc.text("Observações:", 14, yPosition);
      yPosition += 7;
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(checklist.observacoes, 180);
      doc.text(splitText, 14, yPosition);
    }

    doc.save(`checklist-OS${checklist.ordens_servico?.numero}.pdf`);
    toast({ title: "PDF gerado com sucesso!" });
  };

  const handleLimparFiltros = () => {
    setSearchTerm("");
    setFilterTipo("todos");
    setFilterDataInicio("");
    setFilterDataFim("");
  };

  const filteredChecklists = checklists.filter((checklist) => {
    const ordemNumero = checklist.ordens_servico?.numero.toString() || "";
    const clienteNome = checklist.ordens_servico?.clientes?.nome || "";
    const tipo = checklist.tipo || "";
    
    const matchSearch = 
      ordemNumero.includes(searchTerm) ||
      clienteNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tipo.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchTipo = filterTipo === "todos" || checklist.tipo === filterTipo;
    
    let matchData = true;
    if (filterDataInicio) {
      const dataChecklist = new Date(checklist.created_at);
      const dataInicio = new Date(filterDataInicio);
      matchData = matchData && dataChecklist >= dataInicio;
    }
    if (filterDataFim) {
      const dataChecklist = new Date(checklist.created_at);
      const dataFim = new Date(filterDataFim);
      dataFim.setHours(23, 59, 59, 999);
      matchData = matchData && dataChecklist <= dataFim;
    }
    
    return matchSearch && matchTipo && matchData;
  });

  const getStatusBadge = (status: ComponentStatus | null) => {
    if (!status) return "-";
    
    const statusMap = {
      funcionando: { label: "Funcionando", color: "bg-green-500" },
      com_defeito: { label: "Com Defeito", color: "bg-red-500" },
      nao_testado: { label: "Não Testado", color: "bg-yellow-500" },
      nao_possui: { label: "Não Possui", color: "bg-gray-500" },
    };

    const config = statusMap[status];
    return (
      <span className={`px-2 py-1 rounded text-xs text-white ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getChecklistStatusBadge = (status: ChecklistStatus) => {
    const statusMap = {
      pendente: { label: "Pendente", color: "bg-yellow-500" },
      concluido: { label: "Concluído", color: "bg-green-500" },
      cancelado: { label: "Cancelado", color: "bg-gray-500" },
      em_atraso: { label: "Em Atraso", color: "bg-red-500" },
    };

    const config = statusMap[status];
    return (
      <span className={`px-2 py-1 rounded text-xs text-white font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const handleChangeStatus = (checklist: Checklist) => {
    setChecklistToChangeStatus(checklist);
    setNewStatus(checklist.status);
    
    // Preencher com a data prevista da ordem de serviço vinculada
    if (checklist.ordens_servico?.data_prevista_entrega) {
      // Garantir formato correto para datetime-local (YYYY-MM-DDTHH:mm)
      const dataOS = new Date(checklist.ordens_servico.data_prevista_entrega);
      // Ajustar para o timezone local
      const offset = dataOS.getTimezoneOffset();
      const dataAjustada = new Date(dataOS.getTime() - (offset * 60 * 1000));
      const dataFormatada = dataAjustada.toISOString().slice(0, 16);
      setDataEntrega(dataFormatada);
    } else {
      // Se não houver data prevista na OS, usar a data/hora atual
      const now = new Date();
      const offset = now.getTimezoneOffset();
      const nowAjustado = new Date(now.getTime() - (offset * 60 * 1000));
      setDataEntrega(nowAjustado.toISOString().slice(0, 16));
    }
    
    setIsStatusDialogOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!checklistToChangeStatus) return;

    // Se o status for "concluído", validar a data de entrega
    if (newStatus === "concluido" && !dataEntrega) {
      toast({ 
        title: "Data de entrega obrigatória", 
        description: "Por favor, informe a data e hora da entrega.",
        variant: "destructive" 
      });
      return;
    }

    // Atualizar o status do checklist
    const { error: checklistError } = await supabase
      .from("checklists")
      .update({ status: newStatus })
      .eq("id", checklistToChangeStatus.id);

    if (checklistError) {
      toast({ title: "Erro ao alterar status", variant: "destructive" });
      return;
    }

    // Se o status for "concluído", criar entrada na tabela garantias
    if (newStatus === "concluido") {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: garantiaError } = await supabase
        .from("garantias")
        .insert({
          ordem_servico_id: checklistToChangeStatus.ordem_servico_id,
          status: "aguardando",
          data_entrega: dataEntrega,
          created_by: user?.id || null
        });

      if (garantiaError) {
        // Se já existe uma garantia, apenas atualizar a data de entrega
        const { error: updateError } = await supabase
          .from("garantias")
          .update({ data_entrega: dataEntrega })
          .eq("ordem_servico_id", checklistToChangeStatus.ordem_servico_id);

        if (updateError) {
          console.error("Erro ao atualizar garantia:", updateError);
        }
      }
    }

    const statusLabels = {
      pendente: "Pendente",
      concluido: "Concluído",
      cancelado: "Cancelado",
      em_atraso: "Em Atraso",
    };

    toast({ title: `Status alterado para: ${statusLabels[newStatus]}` });
    setIsStatusDialogOpen(false);
    setChecklistToChangeStatus(null);
    setDataEntrega("");
    fetchChecklists();
  };

  return (
    <div className="space-y-6">
      <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <Card className="bg-card border-border">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  <CardTitle>Filtros e Busca</CardTitle>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Tipo</Label>
                <ComboboxSelect
                  value={filterTipo}
                  onValueChange={setFilterTipo}
                  options={[
                    { value: "todos", label: "Todos" },
                    { value: "android", label: "Android" },
                    { value: "ios", label: "iOS" },
                  ]}
                  placeholder="Todos"
                  allowCustom={false}
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Data Início</Label>
                <Input
                  type="date"
                  value={filterDataInicio}
                  onChange={(e) => setFilterDataInicio(e.target.value)}
                  placeholder="dd/mm/aaaa"
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Data Fim</Label>
                <Input
                  type="date"
                  value={filterDataFim}
                  onChange={(e) => setFilterDataFim(e.target.value)}
                  placeholder="dd/mm/aaaa"
                />
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleLimparFiltros}
              >
                Limpar Filtros
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="space-y-3">
        {filteredChecklists.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Nenhum checklist encontrado
            </CardContent>
          </Card>
        ) : (
          filteredChecklists.map((checklist) => (
            <Card key={checklist.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header: OS Number + Type + Status */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-lg">
                        OS #{checklist.ordens_servico?.numero}
                      </span>
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium uppercase">
                        {checklist.tipo}
                      </span>
                    </div>
                    {getChecklistStatusBadge(checklist.status)}
                  </div>

                  {/* Action Buttons Row 1: Edit, View */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditChecklist(checklist)}
                      title="Editar"
                      className="touch-manipulation"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewChecklist(checklist)}
                      title="Visualizar"
                      className="touch-manipulation"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Info + Action Buttons Row 2: Client, Print, Download, Delete */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>
                        <strong>Cliente:</strong> {checklist.ordens_servico?.clientes?.nome}
                      </div>
                      <div>
                        <strong>Data:</strong>{" "}
                        {new Date(checklist.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <PrintButton
                        onClick={() => handlePrint(checklist)}
                        status={printStatus}
                        disabled={isPrinting}
                        className="h-9 px-3"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGeneratePDF(checklist)}
                        title="Gerar PDF"
                        className="touch-manipulation"
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(checklist.id)}
                        title="Excluir"
                        className="touch-manipulation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-24 right-6 rounded-full h-14 w-14 min-w-[56px] min-h-[56px] shadow-lg z-50 touch-manipulation"
            size="icon"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selecione o Tipo de Checklist</DialogTitle>
          </DialogHeader>
          <div className="flex gap-4 mt-4">
            <Button
              className="flex-1"
              size="lg"
              onClick={() => handleSelectType("entrada")}
            >
              Checklist Android
            </Button>
            <Button
              className="flex-1"
              size="lg"
              variant="secondary"
              onClick={() => handleSelectType("saida")}
            >
              Checklist iOS
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Novo Checklist {selectedType === "entrada" ? "Android" : "iOS"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ordem de Serviço *</Label>
              <ComboboxSelect
                value={formData.ordem_servico_id || ""}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, ordem_servico_id: value }))
                }
                options={ordensServico.map((ordem) => ({
                  value: ordem.id,
                  label: `#${ordem.numero} - ${ordem.clientes?.nome}`,
                }))}
                placeholder="Selecione uma ordem de serviço"
                allowCustom={false}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(selectedType === "saida" ? componentesIOS : componentesAndroid).map((componente) => (
                <div key={componente.key}>
                  <Label>{componente.label}</Label>
                  <ComboboxSelect
                    value={(formData[componente.key as keyof Checklist] as ComponentStatus) || ""}
                    onValueChange={(value) =>
                      updateComponentStatus(componente.key, value as ComponentStatus)
                    }
                    options={statusOptions.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    placeholder="Selecione o status"
                    allowCustom={false}
                  />
                </div>
              ))}
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações adicionais..."
                value={formData.observacoes || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, observacoes: e.target.value }))
                }
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit}>Salvar Checklist</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar Checklist - Ordem #{editingChecklist?.ordens_servico?.numero}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <strong>Tipo:</strong> {selectedType?.toUpperCase()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(selectedType === "saida" ? componentesIOS : componentesAndroid).map((componente) => (
                <div key={componente.key}>
                  <Label>{componente.label}</Label>
                  <ComboboxSelect
                    value={(formData[componente.key as keyof Checklist] as ComponentStatus) || ""}
                    onValueChange={(value) =>
                      updateComponentStatus(componente.key, value as ComponentStatus)
                    }
                    options={statusOptions}
                    placeholder="Selecione o status"
                    allowCustom={false}
                  />
                </div>
              ))}
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações adicionais..."
                value={formData.observacoes || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, observacoes: e.target.value }))
                }
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateChecklist}>Atualizar Checklist</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Visualizar Checklist - Ordem #{selectedChecklist?.ordens_servico?.numero}
            </DialogTitle>
          </DialogHeader>
          {selectedChecklist && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <strong>Cliente:</strong> {selectedChecklist.ordens_servico?.clientes?.nome}
                </div>
                <div>
                  <strong>Tipo:</strong> {selectedChecklist.tipo.toUpperCase()}
                </div>
                <div>
                  <strong>Status:</strong> {getChecklistStatusBadge(selectedChecklist.status)}
                </div>
                <div>
                  <strong>Data:</strong> {new Date(selectedChecklist.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(selectedChecklist.tipo === "saida" ? componentesIOS : componentesAndroid).map((componente) => (
                  <div key={componente.key} className="flex justify-between items-center p-2 border rounded">
                    <span className="font-medium">{componente.label}:</span>
                    {getStatusBadge(selectedChecklist[componente.key as keyof Checklist] as ComponentStatus | null)}
                  </div>
                ))}
              </div>

              {selectedChecklist.observacoes && (
                <div className="p-4 bg-muted rounded-lg">
                  <strong>Observações:</strong>
                  <p className="mt-2">{selectedChecklist.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Status do Checklist</DialogTitle>
          </DialogHeader>
          {checklistToChangeStatus && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div>
                  <strong>O.S:</strong> #{checklistToChangeStatus.ordens_servico?.numero}
                </div>
                <div>
                  <strong>Cliente:</strong> {checklistToChangeStatus.ordens_servico?.clientes?.nome}
                </div>
                <div className="flex items-center gap-2">
                  <strong>Status Atual:</strong>
                  {getChecklistStatusBadge(checklistToChangeStatus.status)}
                </div>
              </div>

              <div>
                <Label>Novo Status</Label>
                <ComboboxSelect
                  value={newStatus}
                  onValueChange={(value) => setNewStatus(value as ChecklistStatus)}
                  options={[
                    { value: "pendente", label: "Pendente" },
                    { value: "concluido", label: "Concluído" },
                    { value: "cancelado", label: "Cancelado" },
                    { value: "em_atraso", label: "Em Atraso" },
                  ]}
                  placeholder="Selecione o novo status"
                  allowCustom={false}
                />
              </div>

              {newStatus === "concluido" && (
                <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <Label className="text-blue-900 dark:text-blue-100 font-semibold">Data e Hora da Entrega</Label>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                    Confirme ou ajuste a data e horário de entrega do aparelho ao cliente.
                  </p>
                  <Input
                    type="datetime-local"
                    value={dataEntrega}
                    onChange={(e) => setDataEntrega(e.target.value)}
                    className="touch-manipulation cursor-pointer font-medium"
                    placeholder="dd/mm/aaaa --:--"
                  />
                  {checklistToChangeStatus?.ordens_servico?.data_prevista_entrega && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Data prevista original: {format(new Date(checklistToChangeStatus.ordens_servico.data_prevista_entrega), "dd/MM/yyyy, HH:mm")}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmStatusChange}>
                  Confirmar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
