import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelect } from "@/components/ui/multi-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Wallet, FileText, Tags } from "lucide-react";
import GestaCaixaDiario from "@/components/GestaCaixaDiario";
import CategoriasFinanceiras from "@/components/CategoriasFinanceiras";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Category {
  id: string;
  nome: string;
  tipo: "receita" | "despesa";
  cor: string | null;
}

interface Transaction {
  id: string;
  tipo: "receita" | "despesa";
  valor: number;
  categoria_id: string | null;
  descricao: string | null;
  data: string;
  ordem_servico_id: string | null;
  created_at: string;
  transacoes_categorias?: Array<{
    categoria_id: string;
    categorias_financeiras: Category;
  }>;
}

const Financeiro = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [caixaDiarioOpen, setCaixaDiarioOpen] = useState(false);
  const [categoriasOpen, setCategoriasOpen] = useState(false);

  const [formData, setFormData] = useState<{
    tipo: "receita" | "despesa";
    valor: string;
    categorias_ids: string[];
    descricao: string;
    data: string;
    metodo_pagamento: string;
    valor_nota_recebida: string;
  }>({
    tipo: "receita",
    valor: "",
    categorias_ids: [],
    descricao: "",
    data: format(new Date(), "yyyy-MM-dd"),
    metodo_pagamento: "",
    valor_nota_recebida: "",
  });

  const troco = formData.metodo_pagamento === "dinheiro" && formData.valor && formData.valor_nota_recebida
    ? parseFloat(formData.valor_nota_recebida) - parseFloat(formData.valor)
    : 0;

  useEffect(() => {
    fetchData();
  }, []);

  // Refetch categories when dialog opens
  useEffect(() => {
    if (dialogOpen) {
      fetchData();
    }
  }, [dialogOpen]);

  const fetchData = async () => {
    try {
      const hoje = format(new Date(), "yyyy-MM-dd");
      const [transactionsRes, categoriesRes] = await Promise.all([
        supabase
          .from("transacoes")
          .select(`
            *,
            transacoes_categorias (
              categoria_id,
              categorias_financeiras (*)
            )
          `)
          .eq("data", hoje)
          .order("created_at", { ascending: false }),
        supabase.from("categorias_financeiras").select("*").order("nome"),
      ]);

      if (transactionsRes.error) throw transactionsRes.error;
      if (categoriesRes.error) throw categoriesRes.error;

      setTransactions(transactionsRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      toast.error("Valor inválido");
      return;
    }

    if (formData.categorias_ids.length === 0) {
      toast.error("Selecione pelo menos uma categoria");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      // Inserir a transação
      const { data: transacao, error: transacaoError } = await supabase
        .from("transacoes")
        .insert({
          tipo: formData.tipo,
          valor: parseFloat(formData.valor),
          descricao: formData.descricao || null,
          data: formData.data,
          metodo_pagamento: formData.metodo_pagamento || null,
          created_by: userData.user.id,
        })
        .select()
        .maybeSingle();

      if (transacaoError) throw transacaoError;
      if (!transacao) throw new Error("Erro ao criar transação");

      // Inserir as relações com categorias
      const categoriasRelacoes = formData.categorias_ids.map((categoria_id) => ({
        transacao_id: transacao.id,
        categoria_id,
      }));

      const { error: categoriasError } = await supabase
        .from("transacoes_categorias")
        .insert(categoriasRelacoes);

      if (categoriasError) throw categoriasError;

      toast.success("Transação adicionada com sucesso!");
      setDialogOpen(false);
      setFormData({
        tipo: "receita",
        valor: "",
        categorias_ids: [],
        descricao: "",
        data: format(new Date(), "yyyy-MM-dd"),
        metodo_pagamento: "",
        valor_nota_recebida: "",
      });
      fetchData();
    } catch (error: any) {
      toast.error("Erro ao adicionar transação: " + error.message);
    }
  };

  const totalReceitas = transactions
    .filter((t) => t.tipo === "receita")
    .reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0);

  const totalDespesas = transactions
    .filter((t) => t.tipo === "despesa")
    .reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0);

  const saldo = totalReceitas - totalDespesas;

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Financeiro</h1>
        </div>
        <div className="text-center py-12">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Financeiro</h1>
          <p className="text-muted-foreground">Controle do caixa diário</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Cards de Resumo */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Entradas</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">R$ {totalReceitas.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saídas</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">R$ {totalDespesas.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Saldo</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${saldo >= 0 ? "text-primary" : "text-destructive"}`}>
                  R$ {saldo.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-3">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full" size="lg">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Lançamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Transação</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label>Tipo</Label>
                    <MultiSelect
                      selected={formData.tipo === "receita" ? ["receita"] : ["despesa"]}
                      onChange={(values) => {
                        const newTipo = values.includes("receita") ? "receita" : "despesa";
                        setFormData({ ...formData, tipo: newTipo, categorias_ids: [] });
                      }}
                      options={[
                        { value: "receita", label: "Receita" },
                        { value: "despesa", label: "Despesa" },
                      ]}
                      placeholder="Selecione o tipo"
                    />
                  </div>

                  <div>
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label>Método de Pagamento</Label>
                    <MultiSelect
                      selected={formData.metodo_pagamento ? [formData.metodo_pagamento] : []}
                      onChange={(values) =>
                        setFormData({ ...formData, metodo_pagamento: values[0] || "", valor_nota_recebida: "" })
                      }
                      options={[
                        { value: "dinheiro", label: "Dinheiro" },
                        { value: "pix", label: "PIX" },
                        { value: "debito", label: "Cartão de Débito" },
                        { value: "credito", label: "Cartão de Crédito" },
                        { value: "outros", label: "Outros" },
                      ]}
                      placeholder="Selecione o método"
                    />
                  </div>

                  {formData.metodo_pagamento === "dinheiro" && (
                    <div>
                      <Label>Valor da Nota Recebida (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor_nota_recebida}
                        onChange={(e) => setFormData({ ...formData, valor_nota_recebida: e.target.value })}
                        placeholder="Ex: 50.00"
                      />
                      {troco > 0 && (
                        <div className="mt-2 text-sm font-medium text-primary">
                          Troco: R$ {troco.toFixed(2)}
                        </div>
                      )}
                      {troco < 0 && (
                        <div className="mt-2 text-sm font-medium text-destructive">
                          Valor insuficiente
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <Label>Categorias *</Label>
                    <MultiSelect
                      selected={formData.categorias_ids}
                      onChange={(values) => setFormData({ ...formData, categorias_ids: values })}
                      options={categories
                        .filter((c) => c.tipo === formData.tipo)
                        .map((cat) => ({
                          value: cat.id,
                          label: cat.nome,
                          color: cat.cor || undefined,
                        }))}
                      placeholder="Selecione categorias"
                      emptyText="Nenhuma categoria encontrada"
                    />
                  </div>

                  <div>
                    <Label>Data</Label>
                    <Input
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descrição opcional"
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    Adicionar Transação
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={caixaDiarioOpen} onOpenChange={setCaixaDiarioOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" size="lg">
                  <FileText className="mr-2 h-4 w-4" />
                  Caixa Diário
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Gestão de Caixa Diário</DialogTitle>
                </DialogHeader>
                <GestaCaixaDiario />
              </DialogContent>
            </Dialog>

            <Dialog open={categoriasOpen} onOpenChange={setCategoriasOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" size="lg">
                  <Tags className="mr-2 h-4 w-4" />
                  Gerenciar Categorias
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <CategoriasFinanceiras />
              </DialogContent>
            </Dialog>
          </div>

          {/* Movimentações de Hoje */}
          <Card>
            <CardHeader>
              <CardTitle>Movimentações de Hoje</CardTitle>
              <CardDescription>
                {transactions.length > 0 
                  ? `${transactions.length} movimentação(ões) registrada(s) hoje`
                  : "Nenhuma movimentação registrada hoje"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação registrada hoje
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {format(new Date(transaction.created_at), "HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={transaction.tipo === "receita" ? "default" : "destructive"}>
                              {transaction.tipo === "receita" ? "Entrada" : "Saída"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {transaction.transacoes_categorias && transaction.transacoes_categorias.length > 0 ? (
                                transaction.transacoes_categorias.map((tc) => (
                                  <Badge
                                    key={tc.categoria_id}
                                    variant="outline"
                                    className="text-xs"
                                    style={
                                      tc.categorias_financeiras.cor
                                        ? {
                                            borderColor: tc.categorias_financeiras.cor,
                                            color: tc.categorias_financeiras.cor,
                                          }
                                        : undefined
                                    }
                                  >
                                    {tc.categorias_financeiras.nome}
                                  </Badge>
                                ))
                              ) : (
                                "-"
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {transaction.descricao || "-"}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              transaction.tipo === "receita" ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {transaction.tipo === "receita" ? "+" : "-"} R${" "}
                            {parseFloat(transaction.valor.toString()).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
};

export default Financeiro;
