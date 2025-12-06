import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ArrowLeft, Eye, Download, Printer, Search, Filter, Edit, Trash2, ChevronDown, ChevronUp, Upload as UploadIcon, FileImage, Camera, ClipboardCheck, UserPlus, Building, Smartphone, ShieldCheck, Calendar as CalendarIcon, RefreshCw, DollarSign } from "lucide-react";
import ChecklistsContent from "@/components/ChecklistsContent";
import { ChecklistPendingBanner } from "@/components/ChecklistPendingBanner";
import { PasswordCredentialInput } from "@/components/PasswordCredentialInput";
import { QuickCreateCliente, QuickCreateMarca, QuickCreateModelo } from "@/components/QuickCreateDialog";
import { toast } from "sonner";
import { CameraPhotoCapture } from "@/components/CameraPhotoCapture";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ComboboxSelect } from "@/components/ui/combobox-select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { usePrintBridge } from "@/hooks/use-print-bridge";
import { PrintButton } from "@/components/PrintButton";
import { generateOrdemServicoViaEmpresa, generateOrdemServicoViaCliente } from "@/lib/printer/escpos-os-generator";
import { generateChecklistESCPOS } from "@/lib/printer/escpos-checklist-generator";
import { OrdemServicoDocument } from "@/components/OrdemServicoDocument";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { z } from "zod";
import { format } from "date-fns";

// Validation schema for service orders
const ordemSchema = z.object({
  cliente_id: z.string().uuid({ message: "Cliente inválido" }),
  marca_id: z.string().max(100, { message: "Marca muito longa" }).optional().or(z.literal("")),
  modelo_id: z.string().max(100, { message: "Modelo muito longo" }).optional().or(z.literal("")),
  numero_serie: z.string().max(100, { message: "Número de série muito longo" }).optional(),
  cor_aparelho: z.string().max(50, { message: "Cor muito longa" }).optional(),
  senha_aparelho: z.string().max(200, { message: "Senha muito longa" }).optional(),
  acessorios_entregues: z.string().max(500, { message: "Descrição muito longa" }).optional(),
  descricao_problema: z.string().max(1000, { message: "Descrição muito longa (máximo 1000 caracteres)" }).optional(),
  estado_fisico: z.string().max(1000, { message: "Descrição muito longa (máximo 1000 caracteres)" }).optional(),
  relato_cliente: z.string().max(1000, { message: "Relato muito longo (máximo 1000 caracteres)" }).optional(),
  servico_realizar: z.string().max(1000, { message: "Descrição muito longa (máximo 1000 caracteres)" }).optional(),
  observacoes: z.string().max(2000, { message: "Observações muito longas (máximo 2000 caracteres)" }).optional(),
  valor_estimado: z.string().refine((val) => {
    if (!val || val === "") return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 999999.99;
  }, { message: "Valor inválido (deve ser entre 0 e 999999.99)" }),
  valor_entrada: z.string().refine((val) => {
    if (!val || val === "") return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 999999.99;
  }, { message: "Valor inválido (deve ser entre 0 e 999999.99)" }),
  valor_adiantamento: z.string().refine((val) => {
    if (!val || val === "") return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 999999.99;
  }, { message: "Valor inválido (deve ser entre 0 e 999999.99)" }),
  valor_total: z.string().refine((val) => {
    if (!val || val === "") return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 999999.99;
  }, { message: "Valor inválido (deve ser entre 0 e 999999.99)" }),
  data_prevista_entrega: z.string().optional(),
  status: z.enum(["aberta", "em_andamento", "concluida", "cancelada"], { message: "Status inválido" }),
  eh_garantia: z.boolean().optional(),
  os_original_id: z.string().uuid().optional().or(z.literal("")),
  situacao_atual: z.enum(["aguardando_peca", "orcamento", "em_execucao", "em_atraso"], { message: "Situação inválida" }).optional(),
  termos_servico: z.array(z.string()).optional(),
});

interface OrdemServico {
  id: string;
  numero: number;
  cliente_id: string;
  marca_id: string | null;
  modelo_id: string | null;
  numero_serie: string | null;
  cor_aparelho: string | null;
  senha_aparelho: string | null;
  senha_desenho_url: string | null;
  acessorios_entregues: string | null;
  descricao_problema: string | null;
  estado_fisico: string | null;
  relato_cliente: string | null;
  servico_realizar: string | null;
  observacoes: string | null;
  status: string;
  valor_estimado: number | null;
  valor_entrada: number | null;
  valor_total: number | null;
  valor_adiantamento: number | null;
  data_prevista_entrega: string | null;
  fotos_aparelho: string[] | null;
  created_at: string;
  created_by: string | null;
  eh_garantia: boolean | null;
  os_original_id: string | null;
  situacao_atual: string | null;
  termos_servico: string[] | null;
  clientes?: { nome: string; telefone: string | null; endereco?: string | null; cpf?: string | null; apelido?: string | null; bairro?: string | null };
  atendente?: { nome?: string };
}

interface Modelo {
  id: string;
  nome: string;
  marca_id: string;
}

interface Peca {
  id: string;
  nome: string;
  descricao: string | null;
  quantidade: number;
  preco_unitario: number | null;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  cpf: string | null;
  apelido: string | null;
  endereco: string | null;
  bairro: string | null;
  email: string | null;
}

interface Marca {
  id: string;
  nome: string;
}

const OrdensServico = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [filteredOrdens, setFilteredOrdens] = useState<OrdemServico[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(true);
  const [senhaDesenhoFile, setSenhaDesenhoFile] = useState<File | null>(null);
  const [fotosAparelho, setFotosAparelho] = useState<File[]>([]);
  const [fotosPreview, setFotosPreview] = useState<string[]>([]);
  const [photoSignedUrls, setPhotoSignedUrls] = useState<string[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemServico | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterCliente, setFilterCliente] = useState("todos");
  const [filterGarantia, setFilterGarantia] = useState("todos");
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const {
    printServiceOrder,
    status: printStatus,
    isPrinting
  } = usePrintBridge();
  const [showQuickCreateCliente, setShowQuickCreateCliente] = useState(false);
  const [showQuickCreateMarca, setShowQuickCreateMarca] = useState(false);
  const [showQuickCreateModelo, setShowQuickCreateModelo] = useState(false);
  const [showChecklistPrompt, setShowChecklistPrompt] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [ordemToChangeStatus, setOrdemToChangeStatus] = useState<OrdemServico | null>(null);
  const [newStatus, setNewStatus] = useState<string>("aberta");
  const [dataEntrega, setDataEntrega] = useState<string>("");
  const [showBaixaDialog, setShowBaixaDialog] = useState(false);
  const [ordemParaBaixa, setOrdemParaBaixa] = useState<OrdemServico | null>(null);
  const [formaPagamentoBaixa, setFormaPagamentoBaixa] = useState<string>("");
  const [valorBaixa, setValorBaixa] = useState<string>("");
  const [formData, setFormData] = useState({
    cliente_id: "",
    marca_id: "",
    modelo_id: "",
    numero_serie: "",
    cor_aparelho: "",
    senha_aparelho: "",
    tipo_senha: "LIVRE",
    acessorios_entregues: "",
    descricao_problema: "",
    estado_fisico: "",
    relato_cliente: "",
    servico_realizar: "",
    observacoes: "",
    peca_id: "",
    valor_estimado: "",
    valor_entrada: "",
    valor_adiantamento: "",
    valor_total: "",
    data_prevista_entrega: "",
    status: "aberta",
    eh_garantia: false,
    os_original_id: "",
    situacao_atual: "",
    termos_servico: [] as string[],
    metodo_pagamento_adiantamento: "",
  });

  useEffect(() => {
    fetchOrdens();
    fetchClientes();
    fetchMarcas();
    fetchModelos();
    fetchPecas();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [ordens, searchTerm, filterStatus, filterCliente, filterGarantia, filterDataInicio, filterDataFim]);


  const applyFilters = () => {
    let result = [...ordens];

    // Filtro por busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (ordem) =>
          ordem.numero.toString().includes(term) ||
          ordem.clientes?.nome.toLowerCase().includes(term) ||
          ordem.descricao_problema?.toLowerCase().includes(term)
      );
    }

    // Filtro por status
    if (filterStatus !== "todos") {
      result = result.filter((ordem) => ordem.status === filterStatus);
    }

    // Filtro por cliente
    if (filterCliente !== "todos") {
      result = result.filter((ordem) => ordem.cliente_id === filterCliente);
    }

    // Filtro por garantia
    if (filterGarantia !== "todos") {
      const isGarantiaFilter = filterGarantia === "garantias";
      result = result.filter((ordem) => ordem.eh_garantia === isGarantiaFilter);
    }

    // Filtro por data
    if (filterDataInicio) {
      result = result.filter(
        (ordem) => new Date(ordem.created_at) >= new Date(filterDataInicio)
      );
    }
    if (filterDataFim) {
      result = result.filter(
        (ordem) => new Date(ordem.created_at) <= new Date(filterDataFim)
      );
    }

    setFilteredOrdens(result);
  };

  const fetchOrdens = async () => {
    try {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select(`
          *,
          clientes(nome, telefone, endereco)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Buscar nomes dos atendentes
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(o => o.created_by).filter(Boolean))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nome")
          .in("id", userIds);
        
        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const ordensWithAtendente = data.map(ordem => ({
          ...ordem,
          atendente: ordem.created_by ? profilesMap.get(ordem.created_by) : undefined
        }));
        
        setOrdens(ordensWithAtendente);
        setFilteredOrdens(ordensWithAtendente);
      } else {
        setOrdens(data || []);
        setFilteredOrdens(data || []);
      }
    } catch (error) {
      toast.error("Erro ao carregar ordens de serviço");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    const { data } = await supabase.from("clientes").select("id, nome, telefone, cpf, apelido, endereco, bairro, email");
    setClientes(data || []);
  };

  const fetchMarcas = async () => {
    const { data } = await supabase.from("marcas").select("id, nome");
    setMarcas(data || []);
  };

  const fetchModelos = async () => {
    const { data } = await supabase.from("modelos").select("id, nome, marca_id");
    setModelos(data || []);
  };

  const fetchPecas = async () => {
    const { data } = await supabase.from("pecas_estoque").select("id, nome, descricao, quantidade, preco_unitario");
    setPecas(data || []);
  };

  const getModelosByMarca = (marcaId: string) => {
    // If marcaId is text (not UUID), find matching marca by name
    const matchingMarca = marcas.find(m => m.nome.toUpperCase() === marcaId.toUpperCase());
    if (matchingMarca) {
      return modelos.filter((modelo) => modelo.marca_id === matchingMarca.id);
    }
    // If marcaId is UUID, use it directly
    return modelos.filter((modelo) => modelo.marca_id === marcaId);
  };

  // Helper function to ensure marca/modelo exist in their respective tables
  const ensureMarcaModeloExist = async (marcaNome: string, modeloNome: string, userId: string) => {
    let marcaId: string | null = null;

    // Ensure marca exists
    if (marcaNome && marcaNome.trim()) {
      const { data: existingMarca } = await supabase
        .from("marcas")
        .select("id")
        .ilike("nome", marcaNome.trim())
        .maybeSingle();

      if (existingMarca) {
        marcaId = existingMarca.id;
      } else {
        // Create new marca
        const { data: newMarca, error } = await supabase
          .from("marcas")
          .insert({ nome: marcaNome.trim().toUpperCase(), created_by: userId })
          .select("id")
          .maybeSingle();
        
        if (!error && newMarca) {
          marcaId = newMarca.id;
          // Refresh marcas list
          fetchMarcas();
        }
      }
    }

    // Ensure modelo exists (if marca exists)
    if (modeloNome && modeloNome.trim() && marcaId) {
      const { data: existingModelo } = await supabase
        .from("modelos")
        .select("id")
        .eq("marca_id", marcaId)
        .ilike("nome", modeloNome.trim())
        .maybeSingle();

      if (!existingModelo) {
        // Create new modelo
        const { error } = await supabase
          .from("modelos")
          .insert({ 
            nome: modeloNome.trim().toUpperCase(), 
            marca_id: marcaId, 
            created_by: userId 
          });
        
        if (!error) {
          // Refresh modelos list
          fetchModelos();
        }
      }
    }
  };

  const calculateValorRestante = () => {
    const estimado = parseFloat(formData.valor_estimado || "0");
    const adiantamento = parseFloat(formData.valor_adiantamento || "0");
    return (estimado - adiantamento).toFixed(2);
  };

  const handleFotosChange = (files: File[]) => {
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setFotosAparelho(files);
    setFotosPreview(newPreviews);
  };

  const removeFoto = (index: number) => {
    URL.revokeObjectURL(fotosPreview[index]);
    setFotosAparelho(prev => prev.filter((_, i) => i !== index));
    setFotosPreview(prev => prev.filter((_, i) => i !== index));
  };

  // Helper function to generate signed URLs from file paths
  const getSignedUrls = async (filePaths: string[]): Promise<string[]> => {
    const signedUrls: string[] = [];
    
    for (const path of filePaths) {
      const { data, error } = await supabase.storage
        .from("device-photos")
        .createSignedUrl(path, 3600); // 1 hour expiration

      if (error) {
        console.error("Erro ao gerar URL assinada:", error);
        continue;
      }

      if (data?.signedUrl) {
        signedUrls.push(data.signedUrl);
      }
    }

    return signedUrls;
  };

  const uploadFotos = async (ordemId: string): Promise<string[]> => {
    const uploadedPaths: string[] = [];

    for (const file of fotosAparelho) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${ordemId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("device-photos")
        .upload(fileName, file);

      if (error) {
        console.error("Erro ao fazer upload:", error);
        throw error;
      }

      // Store the file path, not the URL
      uploadedPaths.push(fileName);
    }

    return uploadedPaths;
  };

  const handleCreateOrdem = async () => {
    try {
      // Validate form data
      const validationResult = ordemSchema.safeParse(formData);
      
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast.error(firstError.message);
        return;
      }

      // Validar método de pagamento do adiantamento
      const valorAdiantamento = parseFloat(formData.valor_adiantamento || "0");
      if (valorAdiantamento > 0 && !formData.metodo_pagamento_adiantamento) {
        toast.error("Informe a forma de pagamento do adiantamento");
        return;
      }

      // Get current user with retry logic
      let userResult = await supabase.auth.getUser();
      
      // Se falhar, tenta refresh da sessão
      if (!userResult.data.user || userResult.error) {
        console.log('[OrdensServico] Sessão expirada, tentando refresh...');
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !session) {
          console.error('[OrdensServico] Erro ao refresh sessão:', refreshError);
          toast.error("Sessão expirada. Por favor, faça login novamente.");
          return;
        }
        
        userResult = await supabase.auth.getUser();
      }
      
      const user = userResult.data.user;
      if (!user) {
        toast.error("Usuário não autenticado. Faça login novamente.");
        return;
      }

      // Ensure marca/modelo exist in their respective tables
      await ensureMarcaModeloExist(formData.marca_id, formData.modelo_id, user.id);

      // First create the order to get the ID
      const { data: newOrdem, error: insertError } = await supabase
        .from("ordens_servico")
        .insert({
          cliente_id: formData.cliente_id,
          marca_id: formData.marca_id || null,
          modelo_id: formData.modelo_id || null,
          numero_serie: formData.numero_serie || null,
          cor_aparelho: formData.cor_aparelho || null,
          senha_aparelho: formData.senha_aparelho || null,
          tipo_senha: formData.tipo_senha || null,
          acessorios_entregues: formData.acessorios_entregues || null,
          descricao_problema: formData.descricao_problema || null,
          estado_fisico: formData.estado_fisico || null,
          relato_cliente: formData.relato_cliente || null,
          servico_realizar: formData.servico_realizar || null,
          observacoes: formData.observacoes || null,
          valor_estimado: formData.valor_estimado ? parseFloat(formData.valor_estimado) : null,
          valor_entrada: formData.valor_entrada ? parseFloat(formData.valor_entrada) : null,
          valor_adiantamento: formData.valor_adiantamento ? parseFloat(formData.valor_adiantamento) : null,
          valor_total: formData.valor_total ? parseFloat(formData.valor_total) : null,
          data_prevista_entrega: formData.data_prevista_entrega || null,
          status: "aberta",
          situacao_atual: formData.situacao_atual || null,
          termos_servico: formData.termos_servico.length > 0 ? formData.termos_servico : null,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Se houver adiantamento, criar transação automática no caixa
      const valorAdiantamentoNum = parseFloat(formData.valor_adiantamento || "0");
      if (valorAdiantamentoNum > 0 && newOrdem && formData.metodo_pagamento_adiantamento) {
        try {
          const { error: transacaoError } = await supabase
            .from("transacoes")
            .insert({
              tipo: "receita",
              valor: valorAdiantamentoNum,
              descricao: `Adiantamento recebido da Ordem #${newOrdem.numero}`,
              data: format(new Date(), "yyyy-MM-dd"),
              metodo_pagamento: formData.metodo_pagamento_adiantamento,
              ordem_servico_id: newOrdem.id,
              created_by: user.id,
            });

          if (transacaoError) {
            console.error("Erro ao criar transação de adiantamento:", transacaoError);
            toast.error("Ordem criada, mas houve erro ao registrar adiantamento no caixa");
          } else {
            console.log("[OrdensServico] Transação de adiantamento criada com sucesso");
          }
        } catch (error) {
          console.error("Erro ao criar transação de adiantamento:", error);
        }
      }

      // Upload photos if any
      let fotosUrls: string[] = [];
      if (fotosAparelho.length > 0 && newOrdem) {
        try {
          fotosUrls = await uploadFotos(newOrdem.id);
          
          // Update order with photo URLs
          const { error: updateError } = await supabase
            .from("ordens_servico")
            .update({ fotos_aparelho: fotosUrls })
            .eq("id", newOrdem.id);

          if (updateError) throw updateError;
        } catch (uploadError) {
          console.error("Erro ao fazer upload de fotos:", uploadError);
          toast.error("Ordem criada, mas houve erro ao fazer upload de fotos");
        }
      }

      toast.success("Ordem de serviço criada com sucesso!");
      setShowDialog(false);
      setFormData({
        cliente_id: "",
        marca_id: "",
        modelo_id: "",
        numero_serie: "",
        cor_aparelho: "",
        senha_aparelho: "",
        tipo_senha: "",
        acessorios_entregues: "",
        descricao_problema: "",
        estado_fisico: "",
        relato_cliente: "",
        servico_realizar: "",
        observacoes: "",
        peca_id: "",
        valor_estimado: "",
        valor_entrada: "",
        valor_adiantamento: "",
        valor_total: "",
        data_prevista_entrega: "",
        status: "aberta",
        eh_garantia: false,
        os_original_id: "",
        situacao_atual: "",
        termos_servico: [] as string[],
        metodo_pagamento_adiantamento: "",
      });
      setSenhaDesenhoFile(null);
      setFotosAparelho([]);
      setFotosPreview([]);
      fetchOrdens();
      
      // Open checklist prompt dialog
      setSelectedOrdem(newOrdem);
      setShowChecklistPrompt(true);
    } catch (error) {
      toast.error("Erro ao criar ordem de serviço");
    }
  };

  const handleEditOrdem = async () => {
    if (!selectedOrdem) return;

    try {
      // Validate form data
      const validationResult = ordemSchema.safeParse(formData);
      
      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast.error(firstError.message);
        return;
      }

      // Get current user for ensuring marca/modelo exist
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await ensureMarcaModeloExist(formData.marca_id, formData.modelo_id, user.id);
      }

      const { error } = await supabase
        .from("ordens_servico")
        .update({
          cliente_id: formData.cliente_id,
          marca_id: formData.marca_id || null,
          modelo_id: formData.modelo_id || null,
          numero_serie: formData.numero_serie || null,
          cor_aparelho: formData.cor_aparelho || null,
          senha_aparelho: formData.senha_aparelho || null,
          tipo_senha: formData.tipo_senha || null,
          acessorios_entregues: formData.acessorios_entregues || null,
          descricao_problema: formData.descricao_problema || null,
          estado_fisico: formData.estado_fisico || null,
          relato_cliente: formData.relato_cliente || null,
          servico_realizar: formData.servico_realizar || null,
          observacoes: formData.observacoes || null,
          valor_estimado: formData.valor_estimado ? parseFloat(formData.valor_estimado) : null,
          valor_entrada: formData.valor_entrada ? parseFloat(formData.valor_entrada) : null,
          valor_adiantamento: formData.valor_adiantamento ? parseFloat(formData.valor_adiantamento) : null,
          valor_total: formData.valor_total ? parseFloat(formData.valor_total) : null,
          data_prevista_entrega: formData.data_prevista_entrega || null,
          status: formData.status,
          situacao_atual: formData.situacao_atual || null,
          termos_servico: formData.termos_servico.length > 0 ? formData.termos_servico : null,
        })
        .eq("id", selectedOrdem.id);

      if (error) throw error;

      // Upload new photos if any
      if (fotosAparelho.length > 0) {
        try {
          const newFotosUrls = await uploadFotos(selectedOrdem.id);
          const existingFotos = selectedOrdem.fotos_aparelho || [];
          const allFotos = [...existingFotos, ...newFotosUrls];
          
          const { error: updateError } = await supabase
            .from("ordens_servico")
            .update({ fotos_aparelho: allFotos })
            .eq("id", selectedOrdem.id);

          if (updateError) throw updateError;
        } catch (uploadError) {
          console.error("Erro ao fazer upload de fotos:", uploadError);
          toast.error("Ordem atualizada, mas houve erro ao fazer upload de fotos");
        }
      }

      toast.success("Ordem atualizada com sucesso!");
      setEditDialog(false);
      setSelectedOrdem(null);
      setFotosAparelho([]);
      setFotosPreview([]);
      fetchOrdens();
    } catch (error) {
      toast.error("Erro ao atualizar ordem");
    }
  };

  const handlePrintBridge = async () => {
    if (!selectedOrdem || isPrinting) return;

    try {
      console.log('[OrdensServico] Iniciando impressão via Print Bridge para OS:', selectedOrdem.numero);
      
      // Buscar checklist da ordem
      const { data: checklist, error: checklistError } = await supabase
        .from("checklists")
        .select(`
          *,
          ordens_servico!inner(
            numero,
            clientes!inner(nome)
          )
        `)
        .eq("ordem_servico_id", selectedOrdem.id)
        .single();

      if (checklistError) {
        console.warn('[OrdensServico] Checklist não encontrado:', checklistError);
      }

      const ordemData = {
        id: selectedOrdem.id,
        numero: selectedOrdem.numero,
        created_at: selectedOrdem.created_at,
        cliente_nome: selectedOrdem.clientes?.nome || "N/A",
        cliente_telefone: selectedOrdem.clientes?.telefone,
        marca_nome: selectedOrdem.marca_id,
        modelo_nome: selectedOrdem.modelo_id,
        numero_serie: selectedOrdem.numero_serie,
        cor_aparelho: selectedOrdem.cor_aparelho,
        senha_aparelho: selectedOrdem.senha_aparelho,
        tipo_senha: (selectedOrdem as any).tipo_senha,
        descricao_problema: selectedOrdem.descricao_problema,
        estado_fisico: selectedOrdem.estado_fisico,
        servico_realizar: selectedOrdem.servico_realizar,
        observacoes: selectedOrdem.observacoes,
        status: selectedOrdem.status,
        valor_estimado: selectedOrdem.valor_estimado,
        valor_entrada: selectedOrdem.valor_entrada,
        valor_adiantamento: selectedOrdem.valor_adiantamento,
        valor_total: selectedOrdem.valor_total,
        data_prevista_entrega: selectedOrdem.data_prevista_entrega,
        atendente_nome: (selectedOrdem as any).atendente?.nome,
        situacao_atual: selectedOrdem.situacao_atual,
        termos_servico: selectedOrdem.termos_servico,
        acessorios_entregues: selectedOrdem.acessorios_entregues,
        relato_cliente: selectedOrdem.relato_cliente,
      };

      // Prepara dados do checklist se existir
      const checklistData = checklist ? {
        tipo: checklist.tipo,
        created_at: checklist.created_at,
        ordem_servico_numero: checklist.ordens_servico.numero,
        cliente_nome: checklist.ordens_servico.clientes.nome,
        ordem_servico_id: checklist.ordem_servico_id,
        atendente_nome: null,
        ...checklist,
      } : undefined;

      // Envia para Print Bridge
      await printServiceOrder(ordemData, checklistData);

    } catch (error) {
      console.error('[OrdensServico] Erro na impressão:', error);
      toast.error("Erro ao enviar para impressão");
    }
  };

  const handleDeleteOrdem = async () => {
    if (!selectedOrdem) return;

    try {
      const { error } = await supabase
        .from("ordens_servico")
        .delete()
        .eq("id", selectedOrdem.id);

      if (error) throw error;

      toast.success("Ordem excluída com sucesso!");
      setDeleteDialog(false);
      setSelectedOrdem(null);
      fetchOrdens();
    } catch (error) {
      toast.error("Erro ao excluir ordem");
    }
  };

  const openEditDialog = async (ordem: OrdemServico) => {
    setSelectedOrdem(ordem);
    setFotosAparelho([]);
    setFotosPreview([]);
    
    // Generate signed URLs for existing photos
    if (ordem.fotos_aparelho && ordem.fotos_aparelho.length > 0) {
      const signedUrls = await getSignedUrls(ordem.fotos_aparelho);
      setPhotoSignedUrls(signedUrls);
    } else {
      setPhotoSignedUrls([]);
    }
    
    setFormData({
      cliente_id: ordem.cliente_id,
      marca_id: ordem.marca_id || "",
      modelo_id: ordem.modelo_id || "",
      numero_serie: ordem.numero_serie || "",
      cor_aparelho: ordem.cor_aparelho || "",
      senha_aparelho: ordem.senha_aparelho || "",
      tipo_senha: (ordem as any).tipo_senha || "",
      acessorios_entregues: ordem.acessorios_entregues || "",
      descricao_problema: ordem.descricao_problema || "",
      estado_fisico: ordem.estado_fisico || "",
      relato_cliente: ordem.relato_cliente || "",
      servico_realizar: ordem.servico_realizar || "",
      observacoes: ordem.observacoes || "",
      peca_id: "",
      valor_estimado: ordem.valor_estimado?.toString() || "",
      valor_entrada: ordem.valor_entrada?.toString() || "",
      valor_adiantamento: ordem.valor_adiantamento?.toString() || "",
      valor_total: ordem.valor_total?.toString() || "",
      data_prevista_entrega: ordem.data_prevista_entrega 
        ? new Date(ordem.data_prevista_entrega).toISOString().slice(0, 16)
        : "",
      status: ordem.status,
      eh_garantia: ordem.eh_garantia || false,
      os_original_id: ordem.os_original_id || "",
      situacao_atual: ordem.situacao_atual || "",
      termos_servico: ordem.termos_servico || [],
      metodo_pagamento_adiantamento: "",
    });
    setEditDialog(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterStatus("todos");
    setFilterCliente("todos");
    setFilterGarantia("todos");
    setFilterDataInicio("");
    setFilterDataFim("");
  };

  const generatePDF = (ordem: OrdemServico) => {
    const doc = new jsPDF();
    
    // Configure table
    const tableData: any[][] = [
      // Header
      [{ content: 'TECNOBOOK INFORMATICA\nRUA 15 DE NOVEMBRO S/N', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold' as const, fontSize: 12 } }],
      
      // CNPJ and Contact
      [{ content: '209109420001-14', colSpan: 2, styles: { fontStyle: 'bold' as const, fontSize: 9 } }, 
       { content: 'NÚMERO DE CONTATO', colSpan: 2, styles: { fontStyle: 'bold' as const, fontSize: 9 } }],
      
      // Date and Order Number
      [{ content: `DATA E HORA DA EMISSÃO DA NOTA: ${format(new Date(ordem.created_at), "dd/MM/yyyy 'ÀS' HH:mm")}`, colSpan: 2, styles: { fontSize: 8 } }, 
       { content: '', colSpan: 2 }],
      
      [{ content: 'ORDEM DE SERVIÇO: VIA ESTABELECIMENTO', colSpan: 2, styles: { fontStyle: 'bold' as const, fontSize: 9 } }, 
       { content: `Nº ORDEM DE SERVIÇO: ${ordem.numero}`, colSpan: 2, styles: { fontStyle: 'bold' as const, fontSize: 9, textColor: [211, 47, 47] } }],
      
      // Customer info
      ['NOME COMPLETO:', { content: ordem.clientes?.nome || 'N/A', colSpan: 2, styles: { textColor: [211, 47, 47], fontStyle: 'bold' as const } }, 'APELIDO'],
      ['ENDEREÇO:', { content: ordem.clientes?.endereco || 'N/A', styles: { textColor: [211, 47, 47] } }, 'BAIRRO:', ''],
      ['CPF:', '', 'TEL:', { content: ordem.clientes?.telefone || 'N/A', styles: { textColor: [211, 47, 47] } }],
      
      // Device info
      ['APARELHO:', { content: 'CELULAR', styles: { textColor: [211, 47, 47] } }, 'COR:', { content: ordem.cor_aparelho || 'N/A', styles: { textColor: [211, 47, 47] } }],
      ['MARCA', { content: ordem.marca_id || 'N/A', styles: { textColor: [211, 47, 47] } }, 'MODELO', { content: ordem.modelo_id || 'N/A', styles: { textColor: [211, 47, 47] } }],
      [{ content: `NUM. SERIE/ IMEI: ${ordem.numero_serie || 'N/A'}`, colSpan: 4, styles: { textColor: [211, 47, 47] } }],
      ['SENHA:', { content: (ordem as any).tipo_senha === 'PADRAO' ? 'VER PADRÃO ABAIXO' : (ordem as any).tipo_senha === 'LIVRE' ? (ordem.senha_aparelho || 'N/A') : 'N/A', styles: { textColor: [211, 47, 47] } }, 'ACESSÓRIOS:', ''],
      
      // Estado Físico
      ['ESTADO FÍSICO DO APARELHO', { content: ordem.estado_fisico || 'N/A', colSpan: 3, styles: { textColor: [211, 47, 47], minCellHeight: 15 } }],
      
      // Relato
      ['RELATO DO CLIENTE', { content: ordem.descricao_problema || 'N/A', colSpan: 3, styles: { textColor: [211, 47, 47], minCellHeight: 15 } }],
      
      // Possível Reparo
      ['POSSÍVEL REPARO', { content: ordem.servico_realizar || 'N/A', colSpan: 3, styles: { textColor: [211, 47, 47], minCellHeight: 15 } }],
      
      // Obs
      ['OBS:', { content: ordem.observacoes || 'N/A', colSpan: 3, styles: { textColor: [211, 47, 47], minCellHeight: 15 } }],
      
      // Dates
      ['DATA DE ENTRADA', { content: format(new Date(ordem.created_at), "dd/MM/yyyy 'ÀS' HH:mm"), colSpan: 3, styles: { textColor: [211, 47, 47] } }],
      ['DATA PREVISTA PARA ENTREGA', { content: ordem.data_prevista_entrega ? format(new Date(ordem.data_prevista_entrega), "dd/MM/yyyy 'ÀS' HH:mm") : 'N/A', colSpan: 3, styles: { textColor: [211, 47, 47] } }],
      
      // Values
      [{ content: 'VALOR DO SERVIÇO:', colSpan: 2 }, { content: `R$ ${(ordem.valor_total || ordem.valor_estimado || 0).toFixed(2)}`, colSpan: 2, styles: { textColor: [211, 47, 47], fontStyle: 'bold' as const } }],
      [{ content: 'VALOR DO ADIANTAMENTO', colSpan: 2 }, { content: `R$ ${(ordem.valor_entrada || 0).toFixed(2)}`, colSpan: 2, styles: { textColor: [211, 47, 47], fontStyle: 'bold' as const } }],
      [{ content: 'VALOR A SER RECEBIDO', colSpan: 2 }, { content: `R$ ${((ordem.valor_total || ordem.valor_estimado || 0) - (ordem.valor_entrada || 0)).toFixed(2)}`, colSpan: 2, styles: { textColor: [211, 47, 47], fontStyle: 'bold' as const } }],
    ];
    
    autoTable(doc, {
      body: tableData,
      startY: 15,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold', fillColor: [245, 245, 245] },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 50, fontStyle: 'bold', fillColor: [245, 245, 245] },
        3: { cellWidth: 'auto' },
      },
      didParseCell: (data) => {
        if (data.row.index === 0) {
          data.cell.styles.fillColor = [245, 245, 245];
        }
      }
    });
    
    // Add pattern lock grid if tipo_senha is PADRAO
    if ((ordem as any).tipo_senha === 'PADRAO') {
      const finalY = (doc as any).lastAutoTable.finalY || 15;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('DESENHE O PADRÃO DE DESBLOQUEIO:', 15, finalY + 10);
      
      // Draw 3x3 grid of circles
      const startX = 75;
      const startY = finalY + 15;
      const spacing = 15;
      const radius = 4;
      
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const x = startX + (col * spacing);
          const y = startY + (row * spacing);
          doc.circle(x, y, radius, 'S');
        }
      }
    }
    
    doc.save(`OS_${ordem.numero}.pdf`);
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case "aberta": return "bg-blue-500";
      case "em_andamento": return "bg-yellow-500";
      case "concluida": return "bg-green-500";
      case "cancelada": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const handleChangeStatus = (ordem: OrdemServico) => {
    setOrdemToChangeStatus(ordem);
    setNewStatus(ordem.status);
    
    // Preencher com a data prevista da ordem de serviço
    if (ordem.data_prevista_entrega) {
      // Garantir formato correto para datetime-local (YYYY-MM-DDTHH:mm)
      const dataOS = new Date(ordem.data_prevista_entrega);
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
    if (!ordemToChangeStatus) return;

    // Se o status for "concluída", validar a data de entrega
    if (newStatus === "concluida" && !dataEntrega) {
      toast.error("Data de entrega obrigatória");
      return;
    }

    // Atualizar o status da ordem de serviço
    const { error: ordemError } = await supabase
      .from("ordens_servico")
      .update({ status: newStatus })
      .eq("id", ordemToChangeStatus.id);

    if (ordemError) {
      toast.error("Erro ao alterar status");
      return;
    }

    // Se o status for "concluída", criar entrada na tabela garantias
    if (newStatus === "concluida") {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: garantiaError } = await supabase
        .from("garantias")
        .insert({
          ordem_servico_id: ordemToChangeStatus.id,
          status: "aguardando",
          data_entrega: dataEntrega,
          created_by: user?.id || null
        });

      if (garantiaError) {
        // Se já existe uma garantia, apenas atualizar a data de entrega
        const { error: updateError } = await supabase
          .from("garantias")
          .update({ data_entrega: dataEntrega })
          .eq("ordem_servico_id", ordemToChangeStatus.id);

        if (updateError) {
          console.error("Erro ao atualizar garantia:", updateError);
        }
      }
    }

    const statusLabels = {
      aberta: "Aberta",
      em_andamento: "Em Andamento",
      concluida: "Concluída",
      cancelada: "Cancelada",
    };

    toast.success(`Status alterado para: ${statusLabels[newStatus as keyof typeof statusLabels]}`);
    setIsStatusDialogOpen(false);
    setOrdemToChangeStatus(null);
    setDataEntrega("");
    fetchOrdens();
  };


  const handleConfirmarBaixa = async () => {
    if (!ordemParaBaixa || !formaPagamentoBaixa) {
      toast.error("Selecione a forma de pagamento");
      return;
    }

    const adiantamentoAtual = (ordemParaBaixa.valor_adiantamento ?? ordemParaBaixa.valor_entrada ?? 0);

    if (!valorBaixa || parseFloat(valorBaixa) <= 0) {
      toast.error("Informe um valor válido para a baixa");
      return;
    }

    if (!adiantamentoAtual || adiantamentoAtual <= 0) {
      toast.error("Ordem sem valor de adiantamento");
      return;
    }

    const valorBaixaNum = parseFloat(valorBaixa);
    if (valorBaixaNum > adiantamentoAtual) {
      toast.error("Valor da baixa não pode ser maior que o adiantamento restante");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Verificar se existe caixa aberto (qualquer dia com status aberto)
      const { data: caixaAberto, error: caixaError } = await supabase
        .from("caixa_diario")
        .select("*")
        .eq("status", "aberto")
        .order("data", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (caixaError) {
        throw caixaError;
      }

      if (!caixaAberto) {
        toast.error("Não existe caixa aberto. Abra o caixa primeiro.");
        return;
      }

      // Buscar categoria de Serviços
      const { data: categoria, error: catError } = await supabase
        .from("categorias_financeiras")
        .select("id")
        .eq("nome", "Serviços")
        .eq("tipo", "receita")
        .maybeSingle();

      if (catError) {
        console.error("Categoria não encontrada:", catError);
      }

      // Criar transação no financeiro usando a data atual
      const novoSaldoAdiantamento = adiantamentoAtual - valorBaixaNum;
      const descricao = novoSaldoAdiantamento > 0 
        ? `Baixa parcial de adiantamento da Ordem #${ordemParaBaixa.numero} (Restante: R$ ${novoSaldoAdiantamento.toFixed(2)})`
        : `Baixa final de adiantamento da Ordem #${ordemParaBaixa.numero}`;

      const { error: transacaoError } = await supabase
        .from("transacoes")
        .insert({
          tipo: "receita",
          valor: valorBaixaNum,
          categoria_id: categoria?.id || null,
          descricao: descricao,
          data: format(new Date(), "yyyy-MM-dd"),
          ordem_servico_id: ordemParaBaixa.id,
          metodo_pagamento: formaPagamentoBaixa,
          created_by: user?.id || null
        });

      if (transacaoError) throw transacaoError;

      // Atualizar o valor de adiantamento da ordem (subtrair o valor pago)
      const { error: updateError } = await supabase
        .from("ordens_servico")
        .update({ valor_adiantamento: novoSaldoAdiantamento })
        .eq("id", ordemParaBaixa.id);

      if (updateError) throw updateError;

      const mensagem = novoSaldoAdiantamento > 0 
        ? `Baixa parcial realizada! Restante: R$ ${novoSaldoAdiantamento.toFixed(2)}`
        : "Baixa total realizada com sucesso!";

      toast.success(mensagem);
      setShowBaixaDialog(false);
      setOrdemParaBaixa(null);
      setFormaPagamentoBaixa("");
      setValorBaixa("");
      fetchOrdens();
    } catch (error) {
      console.error("Erro ao dar baixa:", error);
      toast.error("Erro ao realizar baixa");
    }
  };

  return (
    <div className="min-h-screen p-4 pt-6 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Ordens de Serviço</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gestão completa de ordens e checklists
              </p>
            </div>
          </div>
        </div>

        <Tabs value={searchParams.get("tab") || "ordens"} onValueChange={(value) => setSearchParams({ tab: value })} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="ordens" className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Ordens de Serviço
            </TabsTrigger>
            <TabsTrigger value="checklists" className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4" />
              Checklists
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ordens" className="space-y-6">
            {/* Botão Flutuante - Ordens */}
            <Button
              size="lg"
              onClick={() => setShowDialog(true)}
              className="fixed right-6 bottom-24 w-14 h-14 min-w-[56px] min-h-[56px] rounded-full shadow-glow bg-gradient-to-br from-primary to-orange-600 z-50 touch-manipulation"
            >
              <Plus className="w-6 h-6" />
            </Button>

        {/* Filtros e Busca - Retrátil */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-smooth">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filtros e Busca
                    {(searchTerm || filterStatus !== "todos" || filterCliente !== "todos" || filterGarantia !== "todos" || filterDataInicio || filterDataFim) && (
                      <Badge variant="secondary" className="ml-2">
                        Ativos
                      </Badge>
                    )}
                  </CardTitle>
                  {filtersOpen ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número, cliente ou problema..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <ComboboxSelect
                      value={filterStatus}
                      onValueChange={setFilterStatus}
                      options={[
                        { value: "todos", label: "Todos" },
                        { value: "aberta", label: "Aberta" },
                        { value: "em_andamento", label: "Em Andamento" },
                        { value: "concluida", label: "Concluída" },
                        { value: "cancelada", label: "Cancelada" },
                      ]}
                      allowCustom={false}
                    />
                  </div>

                  <div>
                    <Label>Cliente</Label>
                    <ComboboxSelect
                      value={filterCliente}
                      onValueChange={setFilterCliente}
                      options={[
                        { value: "todos", label: "Todos" },
                        ...clientes.map((cliente) => ({ value: cliente.id, label: cliente.nome })),
                      ]}
                      allowCustom={false}
                    />
                  </div>

                  <div>
                    <Label>Garantias</Label>
                    <ComboboxSelect
                      value={filterGarantia}
                      onValueChange={setFilterGarantia}
                      options={[
                        { value: "todos", label: "Todas" },
                        { value: "garantias", label: "Apenas Garantias" },
                        { value: "normais", label: "Sem Garantia" },
                      ]}
                      allowCustom={false}
                    />
                  </div>

                  <div>
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={filterDataInicio}
                      onChange={(e) => setFilterDataInicio(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label>Data Fim</Label>
                    <Input
                      type="date"
                      value={filterDataFim}
                      onChange={(e) => setFilterDataFim(e.target.value)}
                    />
                  </div>
                </div>

                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Limpar Filtros
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : filteredOrdens.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {ordens.length === 0
                  ? "Nenhuma ordem de serviço encontrada"
                  : "Nenhuma ordem corresponde aos filtros aplicados"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrdens.map((ordem) => {
              // Find marca and modelo names
              const marcaNome = ordem.marca_id ? 
                (marcas.find(m => m.id === ordem.marca_id || m.nome.toUpperCase() === ordem.marca_id.toUpperCase())?.nome || ordem.marca_id) 
                : null;
              const modeloNome = ordem.modelo_id ?
                (modelos.find(m => m.id === ordem.modelo_id || m.nome.toUpperCase() === ordem.modelo_id.toUpperCase())?.nome || ordem.modelo_id)
                : null;

              return (
              <Card key={ordem.id} className="hover:shadow-md transition-smooth">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">O.S. #{ordem.numero}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {ordem.clientes?.nome} - {new Date(ordem.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <Badge className={getStatusColor(ordem.status)}>
                        {ordem.status}
                      </Badge>
                      {ordem.eh_garantia && (
                        <Badge variant="outline" className="flex items-center gap-1 border-orange-500 text-orange-600">
                          <ShieldCheck className="w-3 h-3" />
                          Garantia
                        </Badge>
                      )}
                      {ordem.fotos_aparelho && ordem.fotos_aparelho.length > 0 && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Camera className="w-3 h-3" />
                          {ordem.fotos_aparelho.length}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {marcaNome && (
                      <p className="text-sm">
                        <span className="font-medium">Marca:</span> {marcaNome}
                      </p>
                    )}
                    {modeloNome && (
                      <p className="text-sm">
                        <span className="font-medium">Modelo:</span> {modeloNome}
                      </p>
                    )}
                    {ordem.descricao_problema && (
                      <p className="text-sm">
                        <span className="font-medium">Problema:</span> {ordem.descricao_problema.substring(0, 100)}...
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOrdemParaBaixa(ordem);
                        const adiantamentoAtual = ordem.valor_adiantamento ?? ordem.valor_entrada ?? 0;
                        setValorBaixa(adiantamentoAtual ? adiantamentoAtual.toString() : "");
                        setShowBaixaDialog(true);
                      }}
                      className="touch-manipulation"
                      disabled={!((ordem.valor_adiantamento ?? ordem.valor_entrada) && (ordem.valor_adiantamento ?? ordem.valor_entrada)! > 0)}
                      title={((ordem.valor_adiantamento ?? ordem.valor_entrada) && (ordem.valor_adiantamento ?? ordem.valor_entrada)! > 0)
                        ? `Dar baixa no adiantamento (R$ ${(ordem.valor_adiantamento ?? ordem.valor_entrada)!.toFixed(2)})`
                        : "Sem adiantamento"}
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Dar Baixa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChangeStatus(ordem)}
                      title="Alterar Status"
                      className="touch-manipulation"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Status
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(ordem)}
                      className="touch-manipulation"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generatePDF(ordem)}
                      className="touch-manipulation"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                    <PrintButton
                      onClick={() => {
                        setSelectedOrdem(ordem);
                        setTimeout(() => handlePrintBridge(), 100);
                      }}
                      status={printStatus}
                      disabled={isPrinting}
                      className="touch-manipulation"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrdem(ordem);
                        setDeleteDialog(true);
                      }}
                      className="hover:bg-destructive hover:text-destructive-foreground touch-manipulation"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        )}

      {/* Dialog Nova Ordem */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Serviço</DialogTitle>
            <DialogDescription>Preencha os campos para criar uma nova ordem de serviço</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CLIENTE *</Label>
                <div className="flex gap-2">
                  <ComboboxSelect
                    value={formData.cliente_id}
                    onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                    options={clientes.map((cliente) => ({ value: cliente.id, label: cliente.nome }))}
                    placeholder="Selecione o cliente"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowQuickCreateCliente(true)}
                    title="Cadastrar novo cliente"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>MARCA</Label>
                <div className="flex gap-2">
                  <ComboboxSelect
                    value={formData.marca_id}
                    onValueChange={(value) => setFormData({ ...formData, marca_id: value.toUpperCase(), modelo_id: "" })}
                    options={marcas.map((marca) => ({ value: marca.nome.toUpperCase(), label: marca.nome }))}
                    placeholder="Digite ou selecione a marca"
                    searchPlaceholder="Digite para buscar ou criar..."
                    className="flex-1"
                    allowCustom={true}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowQuickCreateMarca(true)}
                    title="Cadastrar nova marca"
                  >
                    <Building className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Novos campos: Situação Atual e Termos de Serviço */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
              <div className="space-y-2">
                <Label>SITUAÇÃO ATUAL</Label>
                <Select
                  value={formData.situacao_atual}
                  onValueChange={(value) => setFormData({ ...formData, situacao_atual: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a situação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando_peca">Aguardando peça</SelectItem>
                    <SelectItem value="orcamento">Orçamento</SelectItem>
                    <SelectItem value="em_execucao">Em execução</SelectItem>
                    <SelectItem value="em_atraso">Em atraso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>TERMOS DE SERVIÇO</Label>
                <MultiSelect
                  options={[
                    { value: "nao_da_pra_testar", label: "Não dá pra testar" },
                    { value: "bloqueado", label: "Bloqueado" },
                    { value: "aberto_por_outros", label: "Aberto por outros" },
                    { value: "molhou", label: "Molhou" },
                    { value: "troca_de_vidro", label: "Troca de vidro" },
                  ]}
                  selected={formData.termos_servico}
                  onChange={(selected) => setFormData({ ...formData, termos_servico: selected })}
                  placeholder="Selecione os termos aplicáveis..."
                  emptyText="Nenhum termo encontrado"
                />
              </div>
            </div>

            {/* Campo de Garantia */}
            <div className="p-4 bg-muted/30 rounded-lg border">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="eh_garantia"
                    checked={formData.eh_garantia}
                    onCheckedChange={(checked) => 
                      setFormData({ 
                        ...formData, 
                        eh_garantia: checked as boolean,
                        os_original_id: checked ? formData.os_original_id : ""
                      })
                    }
                  />
                  <Label htmlFor="eh_garantia" className="flex items-center gap-2 cursor-pointer">
                    <ShieldCheck className="w-4 h-4" />
                    Esta ordem é uma garantia
                  </Label>
                </div>

                {formData.eh_garantia && (
                  <div className="space-y-2">
                    <Label>ORDEM DE SERVIÇO ORIGINAL *</Label>
                    <ComboboxSelect
                      value={formData.os_original_id}
                      onValueChange={(value) => setFormData({ ...formData, os_original_id: value })}
                      options={ordens
                        .filter(os => os.id !== selectedOrdem?.id)
                        .map((os) => ({ 
                          value: os.id, 
                          label: `O.S. #${os.numero} - ${os.clientes?.nome} - ${new Date(os.created_at).toLocaleDateString('pt-BR')}` 
                        }))}
                      placeholder="Selecione a OS original"
                      className="flex-1"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>MODELO</Label>
                <Input
                  value={formData.modelo_id}
                  onChange={(e) => setFormData({ ...formData, modelo_id: e.target.value.toUpperCase() })}
                  placeholder="DIGITE O MODELO DO APARELHO"
                />
              </div>

              <div>
                <Label>COR DO APARELHO</Label>
                <Input
                  value={formData.cor_aparelho}
                  onChange={(e) => setFormData({ ...formData, cor_aparelho: e.target.value.toUpperCase() })}
                  placeholder="EX: AZUL, PRETO"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>NÚMERO DE SÉRIE/IMEI</Label>
                <Input
                  value={formData.numero_serie}
                  onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value.toUpperCase() })}
                  placeholder="DIGITE O NÚMERO DE SÉRIE OU IMEI"
                />
              </div>
            </div>

            <PasswordCredentialInput
              value={formData.senha_aparelho}
              onChange={(value) => setFormData({ ...formData, senha_aparelho: value })}
              tipoSenha={formData.tipo_senha}
              onTipoSenhaChange={(tipo) => setFormData({ ...formData, tipo_senha: tipo })}
              senhaDesenhoFile={senhaDesenhoFile}
              onSenhaDesenhoChange={setSenhaDesenhoFile}
            />

            <div>
              <Label>ACESSÓRIOS ENTREGUES</Label>
              <Input
                value={formData.acessorios_entregues}
                onChange={(e) => setFormData({ ...formData, acessorios_entregues: e.target.value.toUpperCase() })}
                placeholder="EX: CAPA, CASE, CHIP, CARTÃO SD"
              />
            </div>

            <div>
              <Label>RELATO DO CLIENTE</Label>
              <Textarea
                value={formData.relato_cliente}
                onChange={(e) => setFormData({ ...formData, relato_cliente: e.target.value.toUpperCase() })}
                placeholder="O QUE O CLIENTE RELATOU SOBRE O PROBLEMA..."
                rows={3}
              />
            </div>

            <div>
              <Label>DESCRIÇÃO DO PROBLEMA</Label>
              <Textarea
                value={formData.descricao_problema}
                onChange={(e) => setFormData({ ...formData, descricao_problema: e.target.value.toUpperCase() })}
                placeholder="DESCREVA O PROBLEMA DETECTADO..."
                rows={3}
              />
            </div>

            <div>
              <Label>ESTADO FÍSICO DO APARELHO</Label>
              <Textarea
                value={formData.estado_fisico}
                onChange={(e) => setFormData({ ...formData, estado_fisico: e.target.value.toUpperCase() })}
                placeholder="DESCREVA O ESTADO FÍSICO DO APARELHO (ARRANHÕES, TRINCAS, ETC)..."
                rows={3}
              />
            </div>

            <div>
              <Label>FOTOS DO APARELHO (MÁX: 6)</Label>
              <CameraPhotoCapture
                onPhotosChange={handleFotosChange}
                currentPhotos={fotosAparelho}
                currentPreviews={fotosPreview}
                onRemovePhoto={removeFoto}
                maxPhotos={6}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Máx 5MB por foto • Total permitido: 6 fotos
              </p>
            </div>

            <div>
              <Label>POSSÍVEL SERVIÇO A SER REALIZADO</Label>
              <Textarea
                value={formData.servico_realizar}
                onChange={(e) => setFormData({ ...formData, servico_realizar: e.target.value.toUpperCase() })}
                placeholder="DESCREVA O SERVIÇO QUE SERÁ REALIZADO..."
                rows={3}
              />
            </div>

            <div>
              <Label>PEÇA DO ESTOQUE</Label>
              <ComboboxSelect
                value={formData.peca_id}
                onValueChange={(value) => setFormData({ ...formData, peca_id: value })}
                options={pecas.map((peca) => ({
                  value: peca.id,
                  label: `${peca.nome} - Qtd: ${peca.quantidade}${peca.preco_unitario ? ` - R$ ${peca.preco_unitario.toFixed(2)}` : ''}`
                }))}
                placeholder="Selecione a peça (opcional)"
                allowCustom={false}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>VALOR DO SERVIÇO</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_estimado}
                  onChange={(e) => setFormData({ ...formData, valor_estimado: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>VALOR ADIANTADO</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_adiantamento}
                  onChange={(e) => setFormData({ ...formData, valor_adiantamento: e.target.value, metodo_pagamento_adiantamento: e.target.value ? formData.metodo_pagamento_adiantamento : "" })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>VALOR A RECEBER</Label>
                <Input
                  type="text"
                  value={`R$ ${calculateValorRestante()}`}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            {/* Campo de método de pagamento do adiantamento - aparece quando tem valor */}
            {parseFloat(formData.valor_adiantamento || "0") > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <Label className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <DollarSign className="w-4 h-4" />
                  FORMA DE PAGAMENTO DO ADIANTAMENTO *
                </Label>
                <ComboboxSelect
                  value={formData.metodo_pagamento_adiantamento}
                  onValueChange={(value) => setFormData({ ...formData, metodo_pagamento_adiantamento: value })}
                  options={[
                    { value: "dinheiro", label: "Dinheiro" },
                    { value: "pix", label: "PIX" },
                    { value: "debito", label: "Cartão de Débito" },
                    { value: "credito", label: "Cartão de Crédito" },
                  ]}
                  placeholder="Selecione a forma de pagamento"
                  allowCustom={false}
                />
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  O valor será registrado automaticamente no caixa
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>DATA DE ENTRADA</Label>
                <Input
                  type="text"
                  value={new Date().toLocaleDateString("pt-BR")}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  DATA PREVISTA DE ENTREGA
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.data_prevista_entrega}
                  onChange={(e) => setFormData({ ...formData, data_prevista_entrega: e.target.value })}
                  className="touch-manipulation cursor-pointer"
                  placeholder="Selecione data e hora"
                />
              </div>
            </div>

            <div>
              <Label>OBSERVAÇÕES</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value.toUpperCase() })}
                placeholder="OBSERVAÇÕES ADICIONAIS..."
                rows={2}
              />
            </div>

            <Button className="w-full" onClick={handleCreateOrdem} disabled={!formData.cliente_id}>
              Criar Ordem
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Ordem #{selectedOrdem?.numero}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <ComboboxSelect
                  value={formData.cliente_id}
                  onValueChange={(value) => setFormData({ ...formData, cliente_id: value })}
                  options={clientes.map((cliente) => ({
                    value: cliente.id,
                    label: cliente.nome
                  }))}
                  placeholder="Selecione o cliente"
                  allowCustom={false}
                />
              </div>

              <div>
                <Label>Marca</Label>
                <ComboboxSelect
                  value={formData.marca_id}
                  onValueChange={(value) => setFormData({ ...formData, marca_id: value.toUpperCase(), modelo_id: "" })}
                  options={marcas.map((marca) => ({
                    value: marca.nome.toUpperCase(),
                    label: marca.nome
                  }))}
                  placeholder="Digite ou selecione a marca"
                  searchPlaceholder="Digite para buscar ou criar..."
                  allowCustom={true}
                />
              </div>
            </div>

            {/* Campos: Situação Atual e Termos de Serviço */}
            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
              <div className="space-y-2">
                <Label>Situação Atual</Label>
                <Select
                  value={formData.situacao_atual}
                  onValueChange={(value) => setFormData({ ...formData, situacao_atual: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a situação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando_peca">Aguardando peça</SelectItem>
                    <SelectItem value="orcamento">Orçamento</SelectItem>
                    <SelectItem value="em_execucao">Em execução</SelectItem>
                    <SelectItem value="em_atraso">Em atraso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Termos de Serviço</Label>
                <MultiSelect
                  options={[
                    { value: "nao_da_pra_testar", label: "Não dá pra testar" },
                    { value: "bloqueado", label: "Bloqueado" },
                    { value: "aberto_por_outros", label: "Aberto por outros" },
                    { value: "molhou", label: "Molhou" },
                    { value: "troca_de_vidro", label: "Troca de vidro" },
                  ]}
                  selected={formData.termos_servico}
                  onChange={(selected) => setFormData({ ...formData, termos_servico: selected })}
                  placeholder="Selecione os termos aplicáveis..."
                  emptyText="Nenhum termo encontrado"
                />
              </div>
            </div>

            {/* Campo de Garantia */}
            <div className="p-4 bg-muted/30 rounded-lg border">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit_eh_garantia"
                    checked={formData.eh_garantia}
                    onCheckedChange={(checked) => 
                      setFormData({ 
                        ...formData, 
                        eh_garantia: checked as boolean,
                        os_original_id: checked ? formData.os_original_id : ""
                      })
                    }
                  />
                  <Label htmlFor="edit_eh_garantia" className="flex items-center gap-2 cursor-pointer">
                    <ShieldCheck className="w-4 h-4" />
                    Esta ordem é uma garantia
                  </Label>
                </div>

                {formData.eh_garantia && (
                  <div className="space-y-2">
                    <Label>ORDEM DE SERVIÇO ORIGINAL *</Label>
                    <ComboboxSelect
                      value={formData.os_original_id}
                      onValueChange={(value) => setFormData({ ...formData, os_original_id: value })}
                      options={ordens
                        .filter(os => os.id !== selectedOrdem?.id)
                        .map((os) => ({ 
                          value: os.id, 
                          label: `O.S. #${os.numero} - ${os.clientes?.nome} - ${new Date(os.created_at).toLocaleDateString('pt-BR')}` 
                        }))}
                      placeholder="Selecione a OS original"
                      className="flex-1"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>MODELO</Label>
                <Input
                  value={formData.modelo_id}
                  onChange={(e) => setFormData({ ...formData, modelo_id: e.target.value.toUpperCase() })}
                  placeholder="DIGITE O MODELO DO APARELHO"
                />
              </div>

              <div>
                <Label>NÚMERO DE SÉRIE/IMEI</Label>
                <Input
                  value={formData.numero_serie}
                  onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value.toUpperCase() })}
                  placeholder="DIGITE O NÚMERO DE SÉRIE OU IMEI"
                />
              </div>
            </div>

            <PasswordCredentialInput
              value={formData.senha_aparelho}
              onChange={(value) => setFormData({ ...formData, senha_aparelho: value })}
              tipoSenha={formData.tipo_senha}
              onTipoSenhaChange={(tipo) => setFormData({ ...formData, tipo_senha: tipo })}
              senhaDesenhoFile={senhaDesenhoFile}
              onSenhaDesenhoChange={setSenhaDesenhoFile}
            />

            <div>
              <Label>STATUS *</Label>
              <ComboboxSelect
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
                options={[
                  { value: "aberta", label: "Aberta" },
                  { value: "em_andamento", label: "Em Andamento" },
                  { value: "concluida", label: "Concluída" },
                  { value: "cancelada", label: "Cancelada" }
                ]}
                placeholder="Selecione o status"
                allowCustom={false}
              />
            </div>

            <div>
              <Label>DESCRIÇÃO DO PROBLEMA</Label>
              <Textarea
                value={formData.descricao_problema}
                onChange={(e) => setFormData({ ...formData, descricao_problema: e.target.value.toUpperCase() })}
                placeholder="DESCREVA O PROBLEMA..."
                rows={3}
              />
            </div>

            <div>
              <Label>ESTADO FÍSICO DO APARELHO</Label>
              <Textarea
                value={formData.estado_fisico}
                onChange={(e) => setFormData({ ...formData, estado_fisico: e.target.value.toUpperCase() })}
                placeholder="DESCREVA O ESTADO FÍSICO..."
                rows={3}
              />
            </div>

            <div>
              <Label>FOTOS DO APARELHO (MÁX: 6)</Label>
              <div className="space-y-3">
                {photoSignedUrls.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Fotos Existentes:</p>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {photoSignedUrls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-24 object-cover rounded border"
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                <CameraPhotoCapture
                  onPhotosChange={handleFotosChange}
                  currentPhotos={fotosAparelho}
                  currentPreviews={fotosPreview}
                  onRemovePhoto={removeFoto}
                  maxPhotos={6}
                />
                <p className="text-xs text-muted-foreground">
                  Máx 5MB por foto • Total permitido: 6 fotos
                </p>
              </div>
            </div>

            <div>
              <Label>POSSÍVEL SERVIÇO A SER REALIZADO</Label>
              <Textarea
                value={formData.servico_realizar}
                onChange={(e) => setFormData({ ...formData, servico_realizar: e.target.value.toUpperCase() })}
                placeholder="DESCREVA O SERVIÇO..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>VALOR ESTIMADO</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_estimado}
                  onChange={(e) => setFormData({ ...formData, valor_estimado: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>VALOR ADIANTADO</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_adiantamento}
                  onChange={(e) => setFormData({ ...formData, valor_adiantamento: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label>VALOR RESTANTE</Label>
                <Input
                  type="text"
                  value={`R$ ${calculateValorRestante()}`}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>DATA DE ENTRADA</Label>
                <Input
                  type="text"
                  value={selectedOrdem ? new Date(selectedOrdem.created_at).toLocaleDateString("pt-BR") : ""}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  DATA PREVISTA DE ENTREGA
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.data_prevista_entrega}
                  onChange={(e) => setFormData({ ...formData, data_prevista_entrega: e.target.value })}
                  className="touch-manipulation cursor-pointer"
                  placeholder="Selecione data e hora"
                />
              </div>
            </div>

            <div>
              <Label>OBSERVAÇÕES</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value.toUpperCase() })}
                placeholder="OBSERVAÇÕES ADICIONAIS..."
                rows={2}
              />
            </div>

            <Button className="w-full" onClick={handleEditOrdem} disabled={!formData.cliente_id}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Checklist Prompt */}
      <Dialog open={showChecklistPrompt} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              Checklist Obrigatório
            </DialogTitle>
            <DialogDescription>
              Para documentar o estado do aparelho, é necessário preencher o checklist desta ordem de serviço antes de continuar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-900 dark:text-orange-100">
                <span className="font-semibold">Ordem de Serviço:</span> #{selectedOrdem?.numero}
              </p>
              <p className="text-sm text-orange-900 dark:text-orange-100 mt-1">
                <span className="font-semibold">Cliente:</span> {selectedOrdem?.clientes?.nome}
              </p>
            </div>
            
            <Button
              onClick={() => {
                setShowChecklistPrompt(false);
                // Navegar para aba de checklists com a ordem selecionada
                setSearchParams({ tab: "checklists", ordem: selectedOrdem?.id || "" });
              }}
              className="w-full bg-primary hover:bg-primary/90"
              size="lg"
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Preencher Checklist Agora
            </Button>
            
            <div className="text-xs text-muted-foreground text-center p-3 bg-muted/50 rounded">
              ⚠️ O checklist é obrigatório para garantir a documentação adequada do estado do aparelho.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Visualizar */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ordem de Serviço #{selectedOrdem?.numero}</DialogTitle>
          </DialogHeader>
          {selectedOrdem && (
            <>
              {/* Banner de Checklist Pendente */}
              <ChecklistPendingBanner ordemServicoId={selectedOrdem.id} />
              
              <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground">Data</Label>
                <p className="font-medium">{new Date(selectedOrdem.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Cliente</Label>
                <p className="font-medium">{selectedOrdem.clientes?.nome}</p>
                {selectedOrdem.clientes?.telefone && (
                  <p className="text-sm text-muted-foreground">{selectedOrdem.clientes.telefone}</p>
                )}
              </div>
              {selectedOrdem.marca_id && (
                <div>
                  <Label className="text-muted-foreground">Marca</Label>
                  <p className="font-medium">{selectedOrdem.marca_id}</p>
                </div>
              )}
              {selectedOrdem.modelo_id && (
                <div>
                  <Label className="text-muted-foreground">Modelo</Label>
                  <p className="font-medium">{selectedOrdem.modelo_id}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Badge className={getStatusColor(selectedOrdem.status)}>{selectedOrdem.status}</Badge>
              </div>
              {selectedOrdem.descricao_problema && (
                <div>
                  <Label className="text-muted-foreground">Descrição do Problema</Label>
                  <p className="text-sm">{selectedOrdem.descricao_problema}</p>
                </div>
              )}
              {selectedOrdem.observacoes && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="text-sm">{selectedOrdem.observacoes}</p>
                </div>
              )}
              {photoSignedUrls.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Fotos do Aparelho</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {photoSignedUrls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={url}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-32 object-cover rounded border hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {selectedOrdem.valor_total && (
                <div>
                  <Label className="text-muted-foreground">Valor Total</Label>
                  <p className="font-medium text-lg">R$ {selectedOrdem.valor_total.toFixed(2)}</p>
                </div>
              )}
            </div>
            </>
          )}
          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <PrintButton
              onClick={handlePrintBridge}
              status={printStatus}
              disabled={isPrinting}
            />
          </DialogFooter>
          
          {/* Hidden print content */}
          <div id="print-content" style={{ display: 'none' }}>
            {selectedOrdem && (
              <OrdemServicoDocument ordem={selectedOrdem as any} forPrint={true} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a Ordem de Serviço #{selectedOrdem?.numero}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrdem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Quick Create Dialogs */}
      <QuickCreateCliente 
        open={showQuickCreateCliente} 
        onOpenChange={setShowQuickCreateCliente}
        onSuccess={(id) => {
          setFormData({ ...formData, cliente_id: id });
          fetchClientes();
        }}
      />
      
      <QuickCreateMarca 
        open={showQuickCreateMarca} 
        onOpenChange={setShowQuickCreateMarca}
        onSuccess={(id) => {
          setFormData({ ...formData, marca_id: id, modelo_id: "" });
          fetchMarcas();
        }}
      />
      
      <QuickCreateModelo 
        open={showQuickCreateModelo} 
        onOpenChange={setShowQuickCreateModelo}
        marcaId={formData.marca_id}
        onSuccess={(id) => {
          setFormData({ ...formData, modelo_id: id });
          fetchModelos();
        }}
      />

      {/* Dialog Alterar Status */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status - O.S. #{ordemToChangeStatus?.numero}</DialogTitle>
            <DialogDescription>
              Altere o status da ordem de serviço
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label>Novo Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newStatus === "concluida" && (
              <div>
                <Label>Data e Hora de Entrega *</Label>
                <Input
                  type="datetime-local"
                  value={dataEntrega}
                  onChange={(e) => setDataEntrega(e.target.value)}
                  className="touch-manipulation cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Ao marcar como concluída, a ordem aparecerá no módulo de entregas
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmStatusChange}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Dialog de Baixa de Adiantamento */}
      <Dialog open={showBaixaDialog} onOpenChange={setShowBaixaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ textTransform: 'uppercase' }}>Dar Baixa no Adiantamento</DialogTitle>
            <DialogDescription>
              Você pode dar baixa parcial ou total no adiantamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Ordem de Serviço</p>
                <p className="text-lg font-semibold">#{ordemParaBaixa?.numero}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Adiantamento Restante</p>
                <p className="text-2xl font-bold text-primary">
                  R$ {((ordemParaBaixa?.valor_adiantamento ?? ordemParaBaixa?.valor_entrada) ?? 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label style={{ textTransform: 'uppercase' }}>Valor da Baixa *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={(ordemParaBaixa?.valor_adiantamento ?? ordemParaBaixa?.valor_entrada) ?? 0}
                value={valorBaixa}
                onChange={(e) => setValorBaixa(e.target.value)}
                placeholder="Digite o valor"
                className="text-lg font-semibold"
              />
              {valorBaixa && parseFloat(valorBaixa) > 0 && (ordemParaBaixa?.valor_adiantamento ?? ordemParaBaixa?.valor_entrada) && (
                <p className="text-sm text-muted-foreground">
                  {parseFloat(valorBaixa) >= ((ordemParaBaixa?.valor_adiantamento ?? ordemParaBaixa?.valor_entrada) ?? 0) ? (
                    <span className="text-green-600 font-medium">✓ Baixa total - quitará o adiantamento</span>
                  ) : (
                    <span className="text-orange-600 font-medium">
                      Restará: R$ {(((ordemParaBaixa?.valor_adiantamento ?? ordemParaBaixa?.valor_entrada) ?? 0) - parseFloat(valorBaixa)).toFixed(2)}
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label style={{ textTransform: 'uppercase' }}>Forma de Pagamento *</Label>
              <Select value={formaPagamentoBaixa} onValueChange={setFormaPagamentoBaixa}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                  <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowBaixaDialog(false);
                setOrdemParaBaixa(null);
                setFormaPagamentoBaixa("");
                setValorBaixa("");
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarBaixa}
              disabled={!formaPagamentoBaixa || !valorBaixa || parseFloat(valorBaixa) <= 0}
            >
              Confirmar Baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </TabsContent>

          <TabsContent value="checklists" className="mt-6">
            <ChecklistsContent highlightOrdemId={searchParams.get("ordem") || undefined} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default OrdensServico;
