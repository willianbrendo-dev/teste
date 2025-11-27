import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Calendar, ChevronDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface OrdemServico {
  id: string;
  numero: number;
  status: string;
  valor_total: number;
  servico_realizar: string | null;
  data_prevista_entrega: string | null;
  created_at: string;
  clientes: { nome: string } | null;
}

const RelatorioServicos = () => {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const gerarRelatorio = async () => {
    if (!dataInicio || !dataFim) {
      toast.error("Selecione o período");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ordens_servico")
        .select("*, clientes(nome)")
        .gte("created_at", dataInicio + "T00:00:00")
        .lte("created_at", dataFim + "T23:59:59")
        .eq("status", "finalizada")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrdens(data || []);
      toast.success("Relatório gerado!");
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = () => {
    if (ordens.length === 0) {
      toast.error("Nenhum serviço para exportar");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Serviços", 14, 20);
    doc.setFontSize(11);
    doc.text(
      `Período: ${format(new Date(dataInicio + "T00:00:00"), "dd/MM/yyyy")} até ${format(new Date(dataFim + "T00:00:00"), "dd/MM/yyyy")}`,
      14,
      28
    );

    doc.setFontSize(10);
    doc.text(`Total de Serviços: ${ordens.length}`, 14, 36);
    doc.text(`Valor Total: R$ ${valorTotal.toFixed(2)}`, 14, 42);
    doc.text(`Ticket Médio: R$ ${ticketMedio.toFixed(2)}`, 14, 48);

    const tableData = ordens.map((o) => [
      `#${o.numero}`,
      o.clientes?.nome || "-",
      o.servico_realizar || "-",
      `R$ ${parseFloat(o.valor_total?.toString() || "0").toFixed(2)}`,
      format(new Date(o.created_at), "dd/MM/yyyy"),
    ]);

    autoTable(doc, {
      startY: 55,
      head: [["O.S", "Cliente", "Serviço", "Valor", "Data"]],
      body: tableData,
      theme: "striped",
    });

    doc.save(`relatorio_servicos_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exportado!");
  };

  const valorTotal = ordens.reduce((sum, o) => sum + parseFloat(o.valor_total?.toString() || "0"), 0);
  const ticketMedio = ordens.length > 0 ? valorTotal / ordens.length : 0;

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
            <CardDescription>Selecione o período</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Data Início</Label>
                  <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                </div>
                <div>
                  <Label>Data Fim</Label>
                  <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={gerarRelatorio} disabled={loading} className="flex-1">
                  <Calendar className="mr-2 h-4 w-4" />
                  {loading ? "Gerando..." : "Gerar Relatório"}
                </Button>
                {ordens.length > 0 && (
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

      {ordens.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total de Serviços</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ordens.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">R$ {valorTotal.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Ticket Médio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">R$ {ticketMedio.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Serviços Realizados</CardTitle>
              <CardDescription>{ordens.length} serviço(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>O.S</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordens.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Badge>#{o.numero}</Badge>
                      </TableCell>
                      <TableCell>{o.clientes?.nome || "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{o.servico_realizar || "-"}</TableCell>
                      <TableCell>{format(new Date(o.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {parseFloat(o.valor_total?.toString() || "0").toFixed(2)}
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

export default RelatorioServicos;
