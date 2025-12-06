import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Calendar, ChevronDown, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CaixaData {
  atendente_id: string;
  atendente_nome: string;
  total_caixas: number;
  valor_abertura_total: number;
  valor_fechamento_total: number;
  diferenca_total: number;
  caixas_com_diferenca: number;
  maior_diferenca: number;
}

const RelatorioComparativoCaixas = () => {
  const [dados, setDados] = useState<CaixaData[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [dataInicio, setDataInicio] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(new Date(), "yyyy-MM-dd"));

  const gerarRelatorio = async () => {
    setLoading(true);
    try {
      // Buscar todos os caixas no período
      const { data: caixas, error: caixasError } = await supabase
        .from("caixa_diario")
        .select(`
          id,
          data,
          valor_abertura,
          valor_fechamento,
          status,
          aberto_por,
          profiles:aberto_por (nome)
        `)
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .order("data", { ascending: true });

      if (caixasError) throw caixasError;

      // Buscar transações para calcular saldo esperado
      const { data: transacoes, error: transacoesError } = await supabase
        .from("transacoes")
        .select("data, tipo, valor, created_by")
        .gte("data", dataInicio)
        .lte("data", dataFim);

      if (transacoesError) throw transacoesError;

      // Agrupar dados por atendente
      const atendenteMap = new Map<string, CaixaData>();

      caixas?.forEach((caixa: any) => {
        const atendenteId = caixa.aberto_por;
        const atendenteNome = caixa.profiles?.nome || "Usuário Desconhecido";
        
        if (!atendenteMap.has(atendenteId)) {
          atendenteMap.set(atendenteId, {
            atendente_id: atendenteId,
            atendente_nome: atendenteNome,
            total_caixas: 0,
            valor_abertura_total: 0,
            valor_fechamento_total: 0,
            diferenca_total: 0,
            caixas_com_diferenca: 0,
            maior_diferenca: 0,
          });
        }

        const atendenteData = atendenteMap.get(atendenteId)!;
        
        // Calcular saldo esperado baseado nas transações do dia
        const transacoesDoDia = transacoes?.filter(
          (t: any) => t.data === caixa.data && t.created_by === atendenteId
        ) || [];
        
        const entradas = transacoesDoDia
          .filter((t: any) => t.tipo === "receita")
          .reduce((sum, t: any) => sum + parseFloat(t.valor.toString()), 0);
        
        const saidas = transacoesDoDia
          .filter((t: any) => t.tipo === "despesa")
          .reduce((sum, t: any) => sum + parseFloat(t.valor.toString()), 0);

        const saldoEsperado = parseFloat(caixa.valor_abertura) + entradas - saidas;
        const valorFechamento = caixa.valor_fechamento ? parseFloat(caixa.valor_fechamento) : 0;
        const diferenca = caixa.status === "fechado" ? valorFechamento - saldoEsperado : 0;

        atendenteData.total_caixas++;
        atendenteData.valor_abertura_total += parseFloat(caixa.valor_abertura);
        if (caixa.status === "fechado") {
          atendenteData.valor_fechamento_total += valorFechamento;
          atendenteData.diferenca_total += diferenca;
          
          if (Math.abs(diferenca) > 0.01) {
            atendenteData.caixas_com_diferenca++;
          }
          
          if (Math.abs(diferenca) > Math.abs(atendenteData.maior_diferenca)) {
            atendenteData.maior_diferenca = diferenca;
          }
        }
      });

      const resultado = Array.from(atendenteMap.values());
      setDados(resultado);
      
      if (resultado.length === 0) {
        toast.info("Nenhum dado encontrado para o período");
      } else {
        toast.success("Relatório gerado!");
      }
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
    doc.text("Relatório Comparativo de Caixas", 14, 20);
    doc.setFontSize(11);
    doc.text(
      `Período: ${format(new Date(dataInicio + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })} a ${format(new Date(dataFim + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}`,
      14,
      28
    );

    const tableData = dados.map((d) => [
      d.atendente_nome,
      d.total_caixas.toString(),
      `R$ ${d.valor_abertura_total.toFixed(2)}`,
      `R$ ${d.valor_fechamento_total.toFixed(2)}`,
      `R$ ${d.diferenca_total.toFixed(2)}`,
      d.caixas_com_diferenca.toString(),
      `R$ ${d.maior_diferenca.toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 35,
      head: [["Atendente", "Total Caixas", "Abertura Total", "Fechamento Total", "Diferença Total", "Caixas c/ Diferença", "Maior Diferença"]],
      body: tableData,
      theme: "striped",
    });

    doc.save(`comparativo_caixas_${dataInicio}_${dataFim}.pdf`);
    toast.success("PDF exportado!");
  };

  const totalCaixas = dados.reduce((sum, d) => sum + d.total_caixas, 0);
  const totalDiferencas = dados.reduce((sum, d) => sum + d.diferenca_total, 0);
  const totalInconsistencias = dados.reduce((sum, d) => sum + d.caixas_com_diferenca, 0);

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
            <CardDescription>Selecione o período para comparação</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
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
                <CardTitle className="text-sm font-medium">Total de Caixas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{totalCaixas}</div>
                <p className="text-xs text-muted-foreground mt-1">No período selecionado</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Caixas com Inconsistências
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{totalInconsistencias}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalCaixas > 0 ? `${((totalInconsistencias / totalCaixas) * 100).toFixed(1)}%` : "0%"} do total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Diferença Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalDiferencas >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {totalDiferencas >= 0 ? <TrendingUp className="inline h-5 w-5 mr-1" /> : <TrendingDown className="inline h-5 w-5 mr-1" />}
                  R$ {Math.abs(totalDiferencas).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{totalDiferencas >= 0 ? "Sobrando" : "Faltando"}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Comparativo por Atendente</CardTitle>
              <CardDescription>{dados.length} atendente(s) no período</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atendente</TableHead>
                    <TableHead className="text-center">Total Caixas</TableHead>
                    <TableHead className="text-right">Abertura Total</TableHead>
                    <TableHead className="text-right">Fechamento Total</TableHead>
                    <TableHead className="text-right">Diferença Total</TableHead>
                    <TableHead className="text-center">Inconsistências</TableHead>
                    <TableHead className="text-right">Maior Diferença</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.map((d) => (
                    <TableRow key={d.atendente_id}>
                      <TableCell className="font-medium">{d.atendente_nome}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{d.total_caixas}</Badge>
                      </TableCell>
                      <TableCell className="text-right">R$ {d.valor_abertura_total.toFixed(2)}</TableCell>
                      <TableCell className="text-right">R$ {d.valor_fechamento_total.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-medium ${d.diferenca_total >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {d.diferenca_total >= 0 ? "+" : "-"} R$ {Math.abs(d.diferenca_total).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {d.caixas_com_diferenca > 0 ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {d.caixas_com_diferenca}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">0</Badge>
                        )}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${d.maior_diferenca >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {d.maior_diferenca >= 0 ? "+" : "-"} R$ {Math.abs(d.maior_diferenca).toFixed(2)}
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

export default RelatorioComparativoCaixas;
