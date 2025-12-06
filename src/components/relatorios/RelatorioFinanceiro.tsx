import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComboboxSelect } from "@/components/ui/combobox-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Calendar, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Category {
  id: string;
  nome: string;
  tipo: "receita" | "despesa";
}

interface Transaction {
  id: string;
  tipo: "receita" | "despesa";
  valor: number;
  categoria_id: string | null;
  descricao: string | null;
  data: string;
  categorias_financeiras: Category | null;
}

const RelatorioFinanceiro = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [periodoTipo, setPeriodoTipo] = useState<"custom" | "mes_atual" | "mes_anterior" | "ano_atual">("mes_atual");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");

  useEffect(() => {
    fetchCategories();
    aplicarFiltroPeriodo(periodoTipo);
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categorias_financeiras").select("*").order("nome");
    setCategories(data || []);
  };

  const aplicarFiltroPeriodo = (tipo: string) => {
    const hoje = new Date();
    let inicio: Date, fim: Date;

    switch (tipo) {
      case "mes_atual":
        inicio = startOfMonth(hoje);
        fim = endOfMonth(hoje);
        break;
      case "mes_anterior":
        inicio = startOfMonth(subMonths(hoje, 1));
        fim = endOfMonth(subMonths(hoje, 1));
        break;
      case "ano_atual":
        inicio = startOfYear(hoje);
        fim = endOfYear(hoje);
        break;
      default:
        return;
    }

    setDataInicio(format(inicio, "yyyy-MM-dd"));
    setDataFim(format(fim, "yyyy-MM-dd"));
  };

  const gerarRelatorio = async () => {
    if (!dataInicio || !dataFim) {
      toast.error("Selecione o período do relatório");
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("transacoes")
        .select("*, categorias_financeiras (*)")
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .order("data", { ascending: false });

      if (categoriaFiltro !== "todas") {
        query = query.eq("categoria_id", categoriaFiltro);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTransactions(data || []);
      toast.success("Relatório gerado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao gerar relatório: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = () => {
    if (transactions.length === 0) {
      toast.error("Nenhuma transação para exportar");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório Financeiro", 14, 20);
    
    doc.setFontSize(11);
    doc.text(
      `Período: ${format(new Date(dataInicio + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })} até ${format(new Date(dataFim + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}`,
      14,
      28
    );
    
    const totalReceitas = transactions.filter((t) => t.tipo === "receita").reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0);
    const totalDespesas = transactions.filter((t) => t.tipo === "despesa").reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0);
    const saldo = totalReceitas - totalDespesas;

    doc.setFontSize(10);
    doc.text(`Total Receitas: R$ ${totalReceitas.toFixed(2)}`, 14, 36);
    doc.text(`Total Despesas: R$ ${totalDespesas.toFixed(2)}`, 14, 42);
    doc.text(`Saldo: R$ ${saldo.toFixed(2)}`, 14, 48);

    const tableData = transactions.map((t) => [
      format(new Date(t.data + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR }),
      t.tipo === "receita" ? "Receita" : "Despesa",
      t.categorias_financeiras?.nome || "-",
      t.descricao || "-",
      `${t.tipo === "receita" ? "+" : "-"} R$ ${parseFloat(t.valor.toString()).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 55,
      head: [["Data", "Tipo", "Categoria", "Descrição", "Valor"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`relatorio_financeiro_${format(new Date(), "yyyy-MM-dd_HHmmss")}.pdf`);
    toast.success("PDF exportado com sucesso!");
  };

  const totalReceitas = transactions.filter((t) => t.tipo === "receita").reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0);
  const totalDespesas = transactions.filter((t) => t.tipo === "despesa").reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0);
  const saldo = totalReceitas - totalDespesas;

  return (
    <div className="space-y-6">
      <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                <CardTitle className="flex items-center gap-2">
                  Filtros do Relatório
                  <ChevronDown className={`h-4 w-4 transition-transform ${filtrosAbertos ? "rotate-180" : ""}`} />
                </CardTitle>
              </Button>
            </CollapsibleTrigger>
            <CardDescription>Selecione o período e categoria</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Período</Label>
                  <ComboboxSelect
                    value={periodoTipo}
                    onValueChange={(value: any) => {
                      setPeriodoTipo(value);
                      if (value !== "custom") aplicarFiltroPeriodo(value);
                    }}
                    options={[
                      { value: "mes_atual", label: "Mês Atual" },
                      { value: "mes_anterior", label: "Mês Anterior" },
                      { value: "ano_atual", label: "Ano Atual" },
                      { value: "custom", label: "Personalizado" },
                    ]}
                    allowCustom={false}
                  />
                </div>

                <div>
                  <Label>Categoria</Label>
                  <ComboboxSelect
                    value={categoriaFiltro}
                    onValueChange={setCategoriaFiltro}
                    options={[
                      { value: "todas", label: "Todas" },
                      ...categories.map((cat) => ({ value: cat.id, label: cat.nome })),
                    ]}
                    allowCustom={false}
                  />
                </div>

                <div>
                  <Label>Data Início</Label>
                  <Input type="date" value={dataInicio} onChange={(e) => {
                    setDataInicio(e.target.value);
                    setPeriodoTipo("custom");
                  }} />
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Input type="date" value={dataFim} onChange={(e) => {
                    setDataFim(e.target.value);
                    setPeriodoTipo("custom");
                  }} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={gerarRelatorio} disabled={loading} className="flex-1">
                  <Calendar className="mr-2 h-4 w-4" />
                  {loading ? "Gerando..." : "Gerar Relatório"}
                </Button>
                {transactions.length > 0 && (
                  <Button onClick={exportarPDF} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {transactions.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Total Receitas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">R$ {totalReceitas.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Total Despesas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">R$ {totalDespesas.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Saldo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${saldo >= 0 ? "text-primary" : "text-destructive"}`}>
                  R$ {saldo.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Transações do Período</CardTitle>
              <CardDescription>{transactions.length} transação(ões)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          {format(new Date(t.data + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={t.tipo === "receita" ? "default" : "destructive"}>
                            {t.tipo === "receita" ? "Receita" : "Despesa"}
                          </Badge>
                        </TableCell>
                        <TableCell>{t.categorias_financeiras?.nome || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">{t.descricao || "-"}</TableCell>
                        <TableCell className={`text-right font-medium ${t.tipo === "receita" ? "text-green-600" : "text-red-600"}`}>
                          {t.tipo === "receita" ? "+" : "-"} R$ {parseFloat(t.valor.toString()).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RelatorioFinanceiro;
