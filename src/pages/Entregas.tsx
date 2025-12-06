import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Package, CheckCircle, Calendar, User, Smartphone, ShieldCheck, Printer, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePrintBridge } from "@/hooks/use-print-bridge";
import { WarrantyData } from "@/lib/printer/escpos-warranty-generator";

const checkUserPermission = async (module: string, action: string): Promise<boolean> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return false;

  const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userData.user.id });
  if (isAdmin) return true;

  const { data: hasPermission } = await supabase.rpc("has_permission", {
    _user_id: userData.user.id,
    _module: module,
    _action: action,
  });

  return !!hasPermission;
};

interface Entrega {
  id: string;
  ordem_servico_id: string;
  ordem_numero: number;
  cliente_nome: string;
  cliente_telefone: string | null;
  marca_nome: string | null;
  modelo_nome: string | null;
  status: string;
  valor_servico: number | null;
  valor_restante: number | null;
  observacoes: string | null;
  created_at: string;
}

const Entregas = () => {
  const navigate = useNavigate();
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [filteredEntregas, setFilteredEntregas] = useState<Entrega[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [warrantyTypes, setWarrantyTypes] = useState<string[]>([]);
  const [metodoPagamento, setMetodoPagamento] = useState("");
  const [valorServico, setValorServico] = useState("");
  const [canPrint, setCanPrint] = useState(false);
  const { printWarrantyTerms, isPrinting } = usePrintBridge();

  useEffect(() => {
    checkUserPermission("entregas", "print").then(setCanPrint);
  }, []);

  useEffect(() => {
    fetchEntregas();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, entregas]);

  const applyFilters = () => {
    let filtered = [...entregas];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.ordem_numero.toString().includes(term) ||
          e.cliente_nome.toLowerCase().includes(term) ||
          e.marca_nome?.toLowerCase().includes(term) ||
          e.modelo_nome?.toLowerCase().includes(term)
      );
    }

    setFilteredEntregas(filtered);
  };

  const fetchEntregas = async () => {
    try {
      setLoading(true);
      
      const { data: garantiasData, error: garantiasError } = await supabase
        .from("garantias")
        .select(`
          id,
          ordem_servico_id,
          status,
          valor_servico,
          observacoes,
          created_at,
          ordens_servico:ordem_servico_id (
            numero,
            cliente_id,
            marca_id,
            modelo_id,
            valor_total,
            valor_entrada,
            valor_adiantamento,
            valor_estimado,
            clientes:cliente_id (
              nome,
              telefone
            )
          )
        `)
        .in("status", ["aguardando", "entregue"])
        .order("created_at", { ascending: false });

      if (garantiasError) throw garantiasError;

      // Transform data - calculate remaining value
      const transformedData: Entrega[] = (garantiasData || []).map((g: any) => {
        const os = g.ordens_servico;
        // Valor restante: prioriza valor_adiantamento se > 0, senão calcula valor_total - valor_entrada, senão usa valor_estimado
        let valorRestante: number | null = null;
        if (os?.valor_adiantamento && os.valor_adiantamento > 0) {
          valorRestante = os.valor_adiantamento;
        } else if (os?.valor_total && os.valor_total > 0) {
          valorRestante = (os.valor_total || 0) - (os.valor_entrada || 0);
        } else if (os?.valor_estimado && os.valor_estimado > 0) {
          // Fallback to valor_estimado if valor_total is not set
          valorRestante = os.valor_estimado - (os.valor_entrada || 0);
        }
        
        return {
          id: g.id,
          ordem_servico_id: g.ordem_servico_id,
          ordem_numero: os?.numero || 0,
          cliente_nome: os?.clientes?.nome || "N/A",
          cliente_telefone: os?.clientes?.telefone || null,
          marca_nome: os?.marca_id || null,
          modelo_nome: os?.modelo_id || null,
          status: g.status,
          valor_servico: g.valor_servico,
          valor_restante: valorRestante && valorRestante > 0 ? valorRestante : null,
          observacoes: g.observacoes,
          created_at: g.created_at,
        };
      });

      setEntregas(transformedData);
      setFilteredEntregas(transformedData);
    } catch (error) {
      console.error("Erro ao carregar entregas:", error);
      toast.error("Erro ao carregar entregas");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (entrega: Entrega) => {
    setSelectedEntrega(entrega);
    setWarrantyTypes([]);
    setMetodoPagamento("");
    // Usa valor_servico se já foi definido, senão usa valor_restante
    setValorServico(entrega.valor_servico?.toString() || entrega.valor_restante?.toString() || "");
    setDialogOpen(true);
  };

  const handleWarrantyToggle = (type: string) => {
    setWarrantyTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handlePrintWarranty = async (entrega: Entrega, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    // Só permite imprimir se já tiver garantias selecionadas (entrega concluída)
    if (!entrega.observacoes) {
      toast.error("Conclua a entrega primeiro para imprimir o termo de garantia");
      return;
    }

    // Extrair tipos de garantia das observações salvas
    const warrantyTypes = entrega.observacoes
      .replace("Garantias selecionadas: ", "")
      .split(", ")
      .filter(Boolean);

    const warrantyData: WarrantyData = {
      osNumero: entrega.ordem_numero,
      osId: entrega.ordem_servico_id,
      clienteNome: entrega.cliente_nome,
      clienteTelefone: entrega.cliente_telefone,
      marcaNome: entrega.marca_nome,
      modeloNome: entrega.modelo_nome,
      valorServico: entrega.valor_servico,
      warrantyTypes,
      dataEntrega: new Date(),
    };

    await printWarrantyTerms(warrantyData);
  };

  const handleConcluirEntrega = async () => {
    if (!selectedEntrega) return;

    if (warrantyTypes.length === 0) {
      toast.error("Selecione pelo menos um tipo de garantia ou 'Sem Garantia'");
      return;
    }

    if (!valorServico || parseFloat(valorServico) <= 0) {
      toast.error("Informe o valor do serviço");
      return;
    }

    if (!metodoPagamento) {
      toast.error("Selecione o método de pagamento");
      return;
    }

    try {
      const warrantyText = `Garantias selecionadas: ${warrantyTypes.join(", ")}`;
      const valor = parseFloat(valorServico);

      // Atualizar garantia
      const { error: garantiaError } = await supabase
        .from("garantias")
        .update({
          status: "entregue",
          valor_servico: valor,
          observacoes: warrantyText,
          data_entrega: new Date().toISOString(),
          metodo_pagamento: metodoPagamento,
        })
        .eq("id", selectedEntrega.id);

      if (garantiaError) throw garantiaError;

      // Criar transação financeira (receita)
      const { data: userData } = await supabase.auth.getUser();
      
      const { error: transacaoError } = await supabase
        .from("transacoes")
        .insert({
          tipo: "receita",
          valor: valor,
          descricao: `Entrega de O.S #${selectedEntrega.ordem_numero} - ${selectedEntrega.cliente_nome}`,
          metodo_pagamento: metodoPagamento,
          ordem_servico_id: selectedEntrega.ordem_servico_id,
          data: new Date().toISOString().split('T')[0],
          created_by: userData.user?.id,
        });

      if (transacaoError) throw transacaoError;

      toast.success("Entrega concluída e valor lançado no caixa!");
      setDialogOpen(false);
      
      // Verifica se tem garantia real (não é "Sem Garantia")
      const hasRealWarranty = warrantyTypes.some(
        (type) => type !== "Sem Garantia"
      );
      
      if (hasRealWarranty) {
        // Se tem garantia de peça ou serviço, vai para o módulo de garantias
        navigate("/garantias");
      } else {
        // Se é "Sem Garantia", permanece no módulo de entregas
        fetchEntregas();
      }
    } catch (error) {
      console.error("Erro ao concluir entrega:", error);
      toast.error("Erro ao concluir entrega");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aguardando":
        return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400";
      case "entregue":
        return "bg-green-500/20 text-green-700 dark:text-green-400";
      default:
        return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
    }
  };

  return (
    <div className="min-h-screen p-4 pt-6 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Entregas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerenciar entregas de ordens de serviço
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por O.S, cliente ou dispositivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Entregas List */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            Carregando entregas...
          </div>
        ) : filteredEntregas.length === 0 ? (
          <Card className="bg-card/50 border-border/30">
            <CardContent className="py-16 text-center">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma entrega pendente
              </h3>
              <p className="text-sm text-muted-foreground">
                Complete os checklists das ordens de serviço para que apareçam aqui
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEntregas.map((entrega) => (
              <Card
                key={entrega.id}
                className="bg-card/50 border-border/30 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => handleOpenDialog(entrega)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">O.S #{entrega.ordem_numero}</CardTitle>
                      <Badge className={`mt-2 ${getStatusColor(entrega.status)}`}>
                        {entrega.status === "aguardando" ? "Aguardando Entrega" : "Entregue"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {canPrint && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handlePrintWarranty(entrega, e)}
                          disabled={isPrinting}
                          className="h-8 w-8 p-0"
                          title="Imprimir termo de garantia"
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      )}
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>{entrega.cliente_nome}</span>
                  </div>
                  {entrega.cliente_telefone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>📞 {entrega.cliente_telefone}</span>
                    </div>
                  )}
                  {(entrega.marca_nome || entrega.modelo_nome) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Smartphone className="w-4 h-4" />
                      <span>
                        {entrega.marca_nome} {entrega.modelo_nome}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(entrega.created_at), "dd/MM/yyyy")}</span>
                  </div>
                  {(entrega.valor_restante || entrega.valor_servico) && (
                    <div className="flex items-center gap-2 font-medium text-green-600 dark:text-green-400">
                      <DollarSign className="w-4 h-4" />
                      <span>
                        {entrega.status === "entregue" 
                          ? `Pago: R$ ${entrega.valor_servico?.toFixed(2)}`
                          : `Restante: R$ ${entrega.valor_restante?.toFixed(2)}`
                        }
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de Entrega */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Concluir Entrega - O.S #{selectedEntrega?.ordem_numero}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-medium mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Termos de Garantia
                </Label>
                <div className="space-y-3 mt-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="garantia-servico"
                      checked={warrantyTypes.includes("Garantia de Serviço")}
                      onCheckedChange={() => handleWarrantyToggle("Garantia de Serviço")}
                    />
                    <label
                      htmlFor="garantia-servico"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Garantia de Serviço
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="garantia-pecas"
                      checked={warrantyTypes.includes("Garantia de Peças")}
                      onCheckedChange={() => handleWarrantyToggle("Garantia de Peças")}
                    />
                    <label
                      htmlFor="garantia-pecas"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Garantia de Peças
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="garantia-total"
                      checked={warrantyTypes.includes("Garantia Total")}
                      onCheckedChange={() => handleWarrantyToggle("Garantia Total")}
                    />
                    <label
                      htmlFor="garantia-total"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Garantia Total (Serviço + Peças)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <Checkbox
                      id="sem-garantia"
                      checked={warrantyTypes.includes("Sem Garantia")}
                      onCheckedChange={() => handleWarrantyToggle("Sem Garantia")}
                    />
                    <label
                      htmlFor="sem-garantia"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-orange-600 dark:text-orange-400"
                    >
                      Sem Garantia
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="valor-servico">Valor do Serviço (R$)</Label>
                <Input
                  id="valor-servico"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={valorServico}
                  onChange={(e) => setValorServico(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="metodo-pagamento">Método de Pagamento</Label>
                <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecione o método de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                    <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConcluirEntrega} className="bg-gradient-to-br from-primary to-orange-600">
                <CheckCircle className="w-4 h-4 mr-2" />
                Concluir Entrega
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Entregas;
