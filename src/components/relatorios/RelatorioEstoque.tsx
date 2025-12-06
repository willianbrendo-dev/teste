import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, ChevronDown, Package, AlertTriangle, DollarSign } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface Peca {
  id: string;
  nome: string;
  descricao: string | null;
  quantidade: number;
  preco_unitario: number | null;
}

const RelatorioEstoque = () => {
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);

  useEffect(() => {
    gerarRelatorio();
  }, []);

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pecas_estoque")
        .select("*")
        .order("nome");

      if (error) throw error;
      setPecas(data || []);
      toast.success("Relatório gerado!");
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = () => {
    if (pecas.length === 0) {
      toast.error("Nenhuma peça no estoque");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Estoque", 14, 20);
    doc.setFontSize(11);
    doc.text(`Data: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);

    doc.setFontSize(10);
    doc.text(`Total de Itens: ${pecas.length}`, 14, 36);
    doc.text(`Itens em Falta: ${pecasEmFalta}`, 14, 42);
    doc.text(`Valor Total em Estoque: R$ ${valorTotal.toFixed(2)}`, 14, 48);

    const tableData = pecas.map((p) => [
      p.nome,
      p.descricao || "-",
      p.quantidade.toString(),
      p.preco_unitario ? `R$ ${parseFloat(p.preco_unitario.toString()).toFixed(2)}` : "-",
      p.preco_unitario ? `R$ ${(p.quantidade * parseFloat(p.preco_unitario.toString())).toFixed(2)}` : "-",
    ]);

    autoTable(doc, {
      startY: 55,
      head: [["Peça", "Descrição", "Qtd", "Preço Unit.", "Total"]],
      body: tableData,
      theme: "striped",
    });

    doc.save(`relatorio_estoque_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exportado!");
  };

  const pecasEmFalta = pecas.filter((p) => p.quantidade === 0).length;
  const valorTotal = pecas.reduce((sum, p) => {
    const preco = parseFloat(p.preco_unitario?.toString() || "0");
    return sum + (p.quantidade * preco);
  }, 0);

  return (
    <div className="space-y-6">
      <Collapsible open={filtrosAbertos} onOpenChange={setFiltrosAbertos}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 hover:bg-transparent">
                <CardTitle className="flex items-center gap-2">
                  Opções
                  <ChevronDown className={`h-4 w-4 transition-transform ${filtrosAbertos ? "rotate-180" : ""}`} />
                </CardTitle>
              </Button>
            </CollapsibleTrigger>
            <CardDescription>Relatório do estoque atual</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              <div className="flex gap-2">
                <Button onClick={gerarRelatorio} disabled={loading} className="flex-1">
                  <Package className="mr-2 h-4 w-4" />
                  {loading ? "Atualizando..." : "Atualizar Relatório"}
                </Button>
                {pecas.length > 0 && (
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

      {pecas.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Total de Itens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pecas.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Itens em Falta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{pecasEmFalta}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Valor Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">R$ {valorTotal.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Peças em Estoque</CardTitle>
              <CardDescription>{pecas.length} item(ns)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Peça</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-center">Quantidade</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pecas.map((p) => {
                    const preco = parseFloat(p.preco_unitario?.toString() || "0");
                    const total = p.quantidade * preco;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell className="max-w-xs truncate">{p.descricao || "-"}</TableCell>
                        <TableCell className="text-center">
                          {p.quantidade === 0 ? (
                            <Badge variant="destructive">0</Badge>
                          ) : p.quantidade < 5 ? (
                            <Badge variant="secondary">{p.quantidade}</Badge>
                          ) : (
                            <span>{p.quantidade}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.preco_unitario ? `R$ ${preco.toFixed(2)}` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {p.preco_unitario ? `R$ ${total.toFixed(2)}` : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RelatorioEstoque;
