import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter, DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard, Smartphone, ArrowDownCircle, Coins } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ComboboxSelect } from "@/components/ui/combobox-select";

interface Transaction {
  id: string;
  tipo: "receita" | "despesa";
  valor: number;
  descricao: string | null;
  data: string;
  created_at: string;
  metodo_pagamento: string | null;
  transacoes_categorias?: Array<{
    categorias_financeiras: {
      nome: string;
      cor: string | null;
    };
  }>;
}

interface Category {
  id: string;
  nome: string;
  tipo: "receita" | "despesa";
  cor: string | null;
}

const MovimentacaoCaixa = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [trocoDia, setTrocoDia] = useState(0);

  const [dataInicial, setDataInicial] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dataFinal, setDataFinal] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tipoFiltro, setTipoFiltro] = useState<string>("");
  const [metodoPagamentoFiltro, setMetodoPagamentoFiltro] = useState<string>("");

  const [formData, setFormData] = useState({
    data: format(new Date(), "yyyy-MM-dd"),
    descricao: "",
    entrada: "",
    saida: "",
    metodo_pagamento: "",
    categoria_id: "",
  });

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (isAdmin !== null) {
      fetchData();
    }
  }, [dataInicial, dataFinal, tipoFiltro, metodoPagamentoFiltro, isAdmin]);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isUserAdmin = roles?.some(r => r.role === 'admin') || false;
    setIsAdmin(isUserAdmin);

    // Para atendentes, forçar filtro apenas do dia atual
    if (!isUserAdmin) {
      const hoje = format(new Date(), 'yyyy-MM-dd');
      setDataInicial(hoje);
      setDataFinal(hoje);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTransactions([]);
        setCategories([]);
        setLoading(false);
        return;
      }

      // Buscar troco do dia no caixa_diario
      const hoje = format(new Date(), 'yyyy-MM-dd');
      const { data: caixaData } = await supabase
        .from('caixa_diario')
        .select('valor_abertura')
        .eq('data', hoje)
        .eq('status', 'aberto')
        .maybeSingle();
      
      if (caixaData) {
        setTrocoDia(caixaData.valor_abertura || 0);
      }

      let query = supabase
        .from("transacoes")
        .select(`
          *,
          transacoes_categorias (
            categorias_financeiras (nome, cor)
          )
        `)
        .gte("data", dataInicial)
        .lte("data", dataFinal)
        .order("created_at", { ascending: false });

      if (tipoFiltro && (tipoFiltro === "receita" || tipoFiltro === "despesa")) {
        query = query.eq("tipo", tipoFiltro);
      }

      if (metodoPagamentoFiltro) {
        query = query.eq("metodo_pagamento", metodoPagamentoFiltro);
      }

      const [transactionsRes, categoriesRes] = await Promise.all([
        query,
        supabase.from("categorias_financeiras").select("*").order("nome"),
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setTransactions(transactionsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
      setTransactions([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const entrada = parseFloat(formData.entrada || "0");
    const saida = parseFloat(formData.saida || "0");

    if (entrada <= 0 && saida <= 0) {
      toast.error("Informe um valor de entrada ou saída");
      return;
    }

    if (entrada > 0 && saida > 0) {
      toast.error("Informe apenas entrada OU saída");
      return;
    }

    if (!formData.metodo_pagamento) {
      toast.error("Selecione a forma de pagamento");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const tipo = entrada > 0 ? "receita" : "despesa";
      const valor = entrada > 0 ? entrada : saida;

      const { data: transacao, error: transacaoError } = await supabase
        .from("transacoes")
        .insert({
          tipo,
          valor,
          descricao: formData.descricao || null,
          data: formData.data,
          metodo_pagamento: formData.metodo_pagamento,
          created_by: userData.user.id,
        })
        .select()
        .maybeSingle();

      if (transacaoError) throw transacaoError;
      if (!transacao) throw new Error("Erro ao criar transação");

      if (formData.categoria_id) {
        const { error: categoriaError } = await supabase
          .from("transacoes_categorias")
          .insert({
            transacao_id: transacao.id,
            categoria_id: formData.categoria_id,
          });

        if (categoriaError) throw categoriaError;
      }

      toast.success("Lançamento adicionado com sucesso!");
      setDialogOpen(false);
      setFormData({
        data: format(new Date(), "yyyy-MM-dd"),
        descricao: "",
        entrada: "",
        saida: "",
        metodo_pagamento: "",
        categoria_id: "",
      });
      fetchData();
    } catch (error: any) {
      toast.error("Erro ao adicionar lançamento: " + error.message);
    }
  };

  const calcularMetricas = () => {
    let totalEntradas = 0;
    let totalSaidas = 0;
    let totalDinheiro = 0;
    let totalCartoes = 0;
    let totalPix = 0;

    transactions.forEach((t) => {
      const valor = parseFloat(t.valor.toString());
      
      if (t.tipo === 'receita') {
        totalEntradas += valor;
        
        const metodo = t.metodo_pagamento?.toLowerCase() || '';
        if (metodo === 'dinheiro') {
          totalDinheiro += valor;
        } else if (metodo.includes('cartão') || metodo === 'debito' || metodo === 'credito') {
          totalCartoes += valor;
        } else if (metodo === 'pix') {
          totalPix += valor;
        }
      } else {
        totalSaidas += valor;
      }
    });

    const saldoTotal = totalEntradas - totalSaidas;
    const saldoFinal = trocoDia + saldoTotal;

    return {
      trocoDia,
      totalEntradas,
      totalSaidas,
      totalDinheiro,
      totalCartoes,
      totalPix,
      saldoTotal,
      saldoFinal
    };
  };

  const metricas = calcularMetricas();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando movimentações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Métricas do Caixa */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Coins className="h-4 w-4 text-blue-600" />
              Troco do Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              R$ {metricas.trocoDia.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Saldo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              R$ {metricas.saldoTotal.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Dinheiro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">
              R$ {metricas.totalDinheiro.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-600" />
              Cartões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              R$ {metricas.totalCartoes.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-cyan-600" />
              PIX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-cyan-600">
              R$ {metricas.totalPix.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
              Total Saídas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              R$ {metricas.totalSaidas.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4 text-amber-600" />
              Saldo Final
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              R$ {metricas.saldoFinal.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Aviso para atendentes */}
      {!isAdmin && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                Visualização do Dia
              </Badge>
              <p className="text-sm text-muted-foreground">
                Você está visualizando apenas as movimentações de hoje ({format(new Date(), 'dd/MM/yyyy')})
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cabeçalho com filtros - Apenas Admin */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg sm:text-xl">Fechamento/Caixa</CardTitle>
            <div className="flex flex-wrap gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex-1 sm:flex-none"
                >
                  <Filter className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Filtros</span>
                </Button>
              )}
              <Button 
                size="sm" 
                onClick={() => setDialogOpen(true)}
                className="flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Novo</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {showFilters && isAdmin && (
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs sm:text-sm">Data Inicial</Label>
                <Input
                  type="date"
                  value={dataInicial}
                  onChange={(e) => setDataInicial(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Data Final</Label>
                <Input
                  type="date"
                  value={dataFinal}
                  onChange={(e) => setDataFinal(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Tipo de Operação</Label>
                <ComboboxSelect
                  value={tipoFiltro}
                  onValueChange={setTipoFiltro}
                  options={[
                    { value: "", label: "Todos" },
                    { value: "receita", label: "Entrada" },
                    { value: "despesa", label: "Saída" },
                  ]}
                  allowCustom={false}
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Forma de Pagamento</Label>
                <ComboboxSelect
                  value={metodoPagamentoFiltro}
                  onValueChange={setMetodoPagamentoFiltro}
                  options={[
                    { value: "", label: "Todos" },
                    { value: "dinheiro", label: "Dinheiro" },
                    { value: "pix", label: "PIX" },
                    { value: "debito", label: "Débito" },
                    { value: "credito", label: "Crédito" },
                  ]}
                  allowCustom={false}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tabela de Movimentações */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[80px] text-xs sm:text-sm">Código</TableHead>
                  <TableHead className="min-w-[90px] text-xs sm:text-sm">Data</TableHead>
                  <TableHead className="min-w-[150px] text-xs sm:text-sm">Descrição</TableHead>
                  <TableHead className="min-w-[90px] text-right text-xs sm:text-sm">Entrada</TableHead>
                  <TableHead className="min-w-[90px] text-right text-xs sm:text-sm">Saída</TableHead>
                  <TableHead className="min-w-[100px] text-xs sm:text-sm">Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                      Nenhuma movimentação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => {
                    const isEntrada = transaction.tipo === "receita";
                    const isSaida = transaction.tipo === "despesa";
                    
                    return (
                      <TableRow
                        key={transaction.id}
                        className={isSaida ? "" : ""}
                      >
                        <TableCell className="font-mono text-xs font-medium">
                          {transaction.id.slice(0, 6).toUpperCase()}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm whitespace-nowrap font-medium">
                          {format(parseISO(transaction.data), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-xs sm:text-sm text-foreground">{transaction.descricao || "-"}</div>
                            {transaction.transacoes_categorias &&
                              transaction.transacoes_categorias.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {transaction.transacoes_categorias.map((tc, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className="text-[10px]"
                                    >
                                      {tc.categorias_financeiras.nome}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600 dark:text-green-500 text-xs sm:text-sm whitespace-nowrap">
                          {isEntrada ? `R$ ${parseFloat(transaction.valor.toString()).toFixed(2)}` : "R$ 0,00"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600 dark:text-red-500 text-xs sm:text-sm whitespace-nowrap">
                          {isSaida ? `R$ ${parseFloat(transaction.valor.toString()).toFixed(2)}` : "R$ 0,00"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px] sm:text-xs font-medium">
                            {transaction.metodo_pagamento || "N/A"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Novo Lançamento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Novo Lançamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label className="text-xs sm:text-sm">Data</Label>
              <Input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs sm:text-sm">Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da transação"
                className="text-sm min-h-[60px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs sm:text-sm">Entrada (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.entrada}
                  onChange={(e) => setFormData({ ...formData, entrada: e.target.value })}
                  placeholder="0,00"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Saída (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.saida}
                  onChange={(e) => setFormData({ ...formData, saida: e.target.value })}
                  placeholder="0,00"
                  className="text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs sm:text-sm">Forma de Pagamento</Label>
              <ComboboxSelect
                value={formData.metodo_pagamento}
                onValueChange={(value) => setFormData({ ...formData, metodo_pagamento: value })}
                options={[
                  { value: "dinheiro", label: "Dinheiro" },
                  { value: "pix", label: "PIX" },
                  { value: "debito", label: "Débito" },
                  { value: "credito", label: "Crédito" },
                ]}
                allowCustom={false}
              />
            </div>
            <div>
              <Label className="text-xs sm:text-sm">Categoria (opcional)</Label>
              <ComboboxSelect
                value={formData.categoria_id}
                onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}
                options={categories
                  .filter((cat) => {
                    const entrada = parseFloat(formData.entrada || "0");
                    const saida = parseFloat(formData.saida || "0");
                    if (entrada > 0) return cat.tipo === "receita";
                    if (saida > 0) return cat.tipo === "despesa";
                    return true; // Mostra todas se nenhum valor preenchido
                  })
                  .map((cat) => ({
                    value: cat.id,
                    label: cat.nome,
                  }))}
                placeholder="Selecione uma categoria"
                allowCustom={false}
              />
            </div>
          </div>
          <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="w-full sm:w-auto"
              size="sm"
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="w-full sm:w-auto" size="sm">
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MovimentacaoCaixa;
