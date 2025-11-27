import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Calendar, ChevronDown, Wallet } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Transaction {
  id: string;
  tipo: "receita" | "despesa";
  valor: number;
  descricao: string | null;
  data: string;
  created_at: string;
  categorias_financeiras: { nome: string } | null;
}

const RelatorioCaixaDia = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [dataSelecionada, setDataSelecionada] = useState(format(new Date(), "yyyy-MM-dd"));

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transacoes")
        .select("*, categorias_financeiras(nome)")
        .eq("data", dataSelecionada)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
      toast.success("Relatório gerado!");
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = () => {
    if (transactions.length === 0) {
      toast.error("Nenhuma movimentação para exportar");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Caixa do Dia", 14, 20);
    doc.setFontSize(11);
    doc.text(`Data: ${format(new Date(dataSelecionada + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}`, 14, 28);

    const entradas = transactions.filter((t) => t.tipo === "receita").reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0);
    const saidas = transactions.filter((t) => t.tipo === "despesa").reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0);
    const saldo = entradas - saidas;

    doc.setFontSize(10);
    doc.text(`Entradas: R$ ${entradas.toFixed(2)}`, 14, 36);
    doc.text(`Saídas: R$ ${saidas.toFixed(2)}`, 14, 42);
    doc.text(`Saldo: R$ ${saldo.toFixed(2)}`, 14, 48);

    const tableData = transactions.map((t) => [
      format(new Date(t.created_at), "HH:mm", { locale: ptBR }),
      t.tipo === "receita" ? "Entrada" : "Saída",
      t.categorias_financeiras?.nome || "-",
      t.descricao || "-",
      `${t.tipo === "receita" ? "+" : "-"} R$ ${parseFloat(t.valor.toString()).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 55,
      head: [["Hora", "Tipo", "Categoria", "Descrição", "Valor"]],
      body: tableData,
      theme: "striped",
    });

    doc.save(`caixa_${dataSelecionada}.pdf`);
    toast.success("PDF exportado!");
  };

  const entradas = transactions.filter((t) => t.tipo === "receita").reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0);
  const saidas = transactions.filter((t) => t.tipo === "despesa").reduce((sum, t) => sum + parseFloat(t.valor.toString()), 0);
  const saldo = entradas - saidas;

  return (
    <div className="space-y-6">
      <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                <CardTitle className="flex items-center gap-2">
                  Filtros
                  <ChevronDown className={`h-4 w-4 transition-transform ${filtrosAbertos ? "rotate-180" : ""}`} />
                </CardTitle>
              </Button>
            </CollapsibleTrigger>
            <CardDescription>Selecione o dia</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div>
                <Label>Data</Label>
                <Input type="date" value={dataSelecionada} onChange={(e) => setDataSelecionada(e.target.value)} />
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
                <CardTitle className="text-sm font-medium">Entradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">R$ {entradas.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Saídas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">R$ {saidas.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Saldo do Dia
                </CardTitle>
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
              <CardTitle>Movimentações do Dia</CardTitle>
              <CardDescription>{transactions.length} movimentação(ões)</CardDescription>
            </CardHeader>
            <CardContent>
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
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{format(new Date(t.created_at), "HH:mm", { locale: ptBR })}</TableCell>
                      <TableCell>
                        <Badge variant={t.tipo === "receita" ? "default" : "destructive"}>
                          {t.tipo === "receita" ? "Entrada" : "Saída"}
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RelatorioCaixaDia;
