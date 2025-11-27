import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Calendar, ChevronDown, FileText, CheckCircle, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ColaboradorData {
  user_id: string;
  nome: string;
  os_emitidas: number;
  os_finalizadas: number;
  valor_total_servicos: number;
}

const RelatorioColaborador = () => {
  const [dados, setDados] = useState<ColaboradorData[]>([]);
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
      // Buscar todas as ordens do período
      const { data: ordens, error: ordensError } = await supabase
        .from("ordens_servico")
        .select("*")
        .gte("created_at", dataInicio + "T00:00:00")
        .lte("created_at", dataFim + "T23:59:59");

      if (ordensError) throw ordensError;

      // Buscar perfis dos usuários
      const userIds = [...new Set(ordens?.map(o => o.created_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p.nome]) || []);

      // Agrupar por colaborador
      const colaboradoresMap = new Map<string, ColaboradorData>();

      ordens?.forEach((ordem) => {
        const userId = ordem.created_by;
        const nome = profilesMap.get(userId) || "Usuário";
        
        if (!colaboradoresMap.has(userId)) {
          colaboradoresMap.set(userId, {
            user_id: userId,
            nome,
            os_emitidas: 0,
            os_finalizadas: 0,
            valor_total_servicos: 0,
          });
        }

        const colab = colaboradoresMap.get(userId)!;
        colab.os_emitidas++;
        
        if (ordem.status === "finalizada") {
          colab.os_finalizadas++;
          colab.valor_total_servicos += parseFloat(ordem.valor_total?.toString() || "0");
        }
      });

      setDados(Array.from(colaboradoresMap.values()));
      toast.success("Relatório gerado!");
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = () => {
    if (dados.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Colaboradores", 14, 20);
    doc.setFontSize(11);
    doc.text(
      `Período: ${format(new Date(dataInicio + "T00:00:00"), "dd/MM/yyyy")} até ${format(new Date(dataFim + "T00:00:00"), "dd/MM/yyyy")}`,
      14,
      28
    );

    const tableData = dados.map((d) => [
      d.nome,
      d.os_emitidas.toString(),
      d.os_finalizadas.toString(),
      `R$ ${d.valor_total_servicos.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Colaborador", "O.S Emitidas", "O.S Finalizadas", "Valor Total"]],
      body: tableData,
      theme: "striped",
    });

    doc.save(`relatorio_colaboradores_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exportado!");
  };

  const totalOS = dados.reduce((sum, d) => sum + d.os_emitidas, 0);
  const totalFinalizadas = dados.reduce((sum, d) => sum + d.os_finalizadas, 0);
  const totalValor = dados.reduce((sum, d) => sum + d.valor_total_servicos, 0);

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
                {dados.length > 0 && (
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

      {dados.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Total O.S Emitidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOS}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Total O.S Finalizadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{totalFinalizadas}</div>
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
                <div className="text-2xl font-bold text-primary">R$ {totalValor.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Desempenho por Colaborador</CardTitle>
              <CardDescription>{dados.length} colaborador(es)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead className="text-center">O.S Emitidas</TableHead>
                    <TableHead className="text-center">O.S Finalizadas</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.map((d) => (
                    <TableRow key={d.user_id}>
                      <TableCell className="font-medium">{d.nome}</TableCell>
                      <TableCell className="text-center">{d.os_emitidas}</TableCell>
                      <TableCell className="text-center text-green-600 font-medium">{d.os_finalizadas}</TableCell>
                      <TableCell className="text-right font-medium">R$ {d.valor_total_servicos.toFixed(2)}</TableCell>
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

export default RelatorioColaborador;
