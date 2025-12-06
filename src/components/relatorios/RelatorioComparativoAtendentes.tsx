import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Calendar, ChevronDown, TrendingUp, TrendingDown, Award, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface AtendenteMetrics {
  user_id: string;
  nome: string;
  email: string;
  os_emitidas: number;
  os_finalizadas: number;
  os_em_atraso: number;
  garantias_geradas: number;
  checklists_atrasados: number;
  acoes_delete: number;
  acoes_update_multiplas: number;
  valor_total: number;
  taxa_conclusao: number;
  score_qualidade: number;
}

const RelatorioComparativoAtendentes = () => {
  const [dados, setDados] = useState<AtendenteMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const calcularScoreQualidade = (metrics: Partial<AtendenteMetrics>): number => {
    // Score baseado em: taxa de conclusão (40%), poucos atrasos (30%), poucas garantias (20%), poucas exclusões (10%)
    let score = 0;
    
    if (metrics.os_emitidas && metrics.os_emitidas > 0) {
      const taxaConclusao = (metrics.os_finalizadas || 0) / metrics.os_emitidas;
      score += taxaConclusao * 40;
    }

    if (metrics.os_emitidas && metrics.os_emitidas > 0) {
      const taxaAtraso = 1 - ((metrics.os_em_atraso || 0) / metrics.os_emitidas);
      score += Math.max(0, taxaAtraso) * 30;
    }

    if (metrics.os_finalizadas && metrics.os_finalizadas > 0) {
      const taxaGarantia = 1 - ((metrics.garantias_geradas || 0) / metrics.os_finalizadas);
      score += Math.max(0, taxaGarantia) * 20;
    }

    if (metrics.os_emitidas && metrics.os_emitidas > 0) {
      const taxaDelete = 1 - ((metrics.acoes_delete || 0) / (metrics.os_emitidas * 2));
      score += Math.max(0, taxaDelete) * 10;
    }

    return Math.round(Math.max(0, Math.min(100, score)));
  };

  const gerarRelatorio = async () => {
    if (!dataInicio || !dataFim) {
      toast.error("Selecione o período");
      return;
    }

    setLoading(true);
    try {
      // 1. Buscar perfis de atendentes
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "atendente");

      const atendenteIds = roles?.map(r => r.user_id) || [];

      if (atendenteIds.length === 0) {
        toast.error("Nenhum atendente encontrado");
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .in("id", atendenteIds);

      // 2. Buscar ordens de serviço do período
      const { data: ordens } = await supabase
        .from("ordens_servico")
        .select("*")
        .in("created_by", atendenteIds)
        .gte("created_at", dataInicio + "T00:00:00")
        .lte("created_at", dataFim + "T23:59:59");

      // 3. Buscar garantias do período
      const { data: garantias } = await supabase
        .from("garantias")
        .select("created_by, ordem_servico_id")
        .in("created_by", atendenteIds)
        .gte("created_at", dataInicio + "T00:00:00")
        .lte("created_at", dataFim + "T23:59:59");

      // 4. Buscar checklists atrasados
      const { data: checklists } = await supabase
        .from("checklists")
        .select("created_by, status")
        .in("created_by", atendenteIds)
        .eq("status", "em_atraso")
        .gte("created_at", dataInicio + "T00:00:00")
        .lte("created_at", dataFim + "T23:59:59");

      // 5. Buscar ações de auditoria (deletes e updates múltiplos)
      const { data: auditLogs } = await supabase
        .from("audit_logs")
        .select("user_id, action, table_name")
        .in("user_id", atendenteIds)
        .gte("created_at", dataInicio + "T00:00:00")
        .lte("created_at", dataFim + "T23:59:59");

      // Processar dados
      const metricsMap = new Map<string, AtendenteMetrics>();

      profiles?.forEach(profile => {
        const userOrdens = ordens?.filter(o => o.created_by === profile.id) || [];
        const userGarantias = garantias?.filter(g => g.created_by === profile.id) || [];
        const userChecklists = checklists?.filter(c => c.created_by === profile.id) || [];
        const userAudit = auditLogs?.filter(a => a.user_id === profile.id) || [];

        const osEmitidas = userOrdens.length;
        const osFinalizadas = userOrdens.filter(o => o.status === "finalizada").length;
        const osEmAtraso = userOrdens.filter(o => 
          o.data_prevista_entrega && 
          new Date(o.data_prevista_entrega) < new Date() && 
          o.status !== "finalizada"
        ).length;
        const valorTotal = userOrdens
          .filter(o => o.status === "finalizada")
          .reduce((sum, o) => sum + parseFloat(o.valor_total?.toString() || "0"), 0);
        const acoesDelete = userAudit.filter(a => a.action === "DELETE").length;
        const acoesUpdate = userAudit.filter(a => a.action === "UPDATE").length;

        const metrics: AtendenteMetrics = {
          user_id: profile.id,
          nome: profile.nome || "Sem nome",
          email: profile.email,
          os_emitidas: osEmitidas,
          os_finalizadas: osFinalizadas,
          os_em_atraso: osEmAtraso,
          garantias_geradas: userGarantias.length,
          checklists_atrasados: userChecklists.length,
          acoes_delete: acoesDelete,
          acoes_update_multiplas: acoesUpdate,
          valor_total: valorTotal,
          taxa_conclusao: osEmitidas > 0 ? (osFinalizadas / osEmitidas) * 100 : 0,
          score_qualidade: 0,
        };

        metrics.score_qualidade = calcularScoreQualidade(metrics);
        metricsMap.set(profile.id, metrics);
      });

      const sortedData = Array.from(metricsMap.values()).sort((a, b) => b.score_qualidade - a.score_qualidade);
      setDados(sortedData);
      toast.success("Relatório comparativo gerado!");
    } catch (error: any) {
      toast.error("Erro ao gerar relatório: " + error.message);
      console.error(error);
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
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246);
    doc.text("Relatório Comparativo de Atendentes", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Período: ${format(new Date(dataInicio), "dd/MM/yyyy")} até ${format(new Date(dataFim), "dd/MM/yyyy")}`,
      14,
      30
    );
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 36);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 40, 196, 40);

    // Ranking
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text("Ranking por Score de Qualidade", 14, 48);

    const tableData = dados.map((d, index) => [
      `${index + 1}º`,
      d.nome,
      d.os_emitidas.toString(),
      d.os_finalizadas.toString(),
      d.taxa_conclusao.toFixed(1) + "%",
      d.garantias_geradas.toString(),
      d.os_em_atraso.toString(),
      d.acoes_delete.toString(),
      d.score_qualidade.toString(),
    ]);

    autoTable(doc, {
      startY: 52,
      head: [["#", "Atendente", "Emitidas", "Finalizadas", "Taxa", "Garantias", "Atrasos", "Exclusões", "Score"]],
      body: tableData,
      styles: { 
        fontSize: 7,
        cellPadding: 2,
      },
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 10 },
        8: { fontStyle: 'bold', textColor: [34, 197, 94] },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`comparativo-atendentes-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`);
    toast.success("PDF exportado com sucesso!");
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-600">Excelente</Badge>;
    if (score >= 75) return <Badge className="bg-blue-600">Bom</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-600">Regular</Badge>;
    return <Badge variant="destructive">Atenção</Badge>;
  };

  const melhorAtendente = dados.length > 0 ? dados[0] : null;
  const totalOS = dados.reduce((sum, d) => sum + d.os_emitidas, 0);
  const totalFinalizadas = dados.reduce((sum, d) => sum + d.os_finalizadas, 0);
  const totalGarantias = dados.reduce((sum, d) => sum + d.garantias_geradas, 0);

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
            <CardDescription>Selecione o período para análise comparativa</CardDescription>
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
                  {loading ? "Gerando..." : "Gerar Análise Comparativa"}
                </Button>
                {dados.length > 0 && (
                  <Button onClick={exportarPDF} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar PDF
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {dados.length > 0 && (
        <>
          {/* Cards de Resumo */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total O.S</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOS}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalFinalizadas} finalizadas ({totalOS > 0 ? ((totalFinalizadas / totalOS) * 100).toFixed(1) : 0}%)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Garantias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{totalGarantias}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalFinalizadas > 0 ? ((totalGarantias / totalFinalizadas) * 100).toFixed(1) : 0}% das finalizadas
                </p>
              </CardContent>
            </Card>

            {melhorAtendente && (
              <>
                <Card className="md:col-span-2 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Award className="h-4 w-4 text-yellow-600" />
                      Melhor Desempenho
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">{melhorAtendente.nome}</div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="text-3xl font-bold text-green-600">
                        {melhorAtendente.score_qualidade}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <div>{melhorAtendente.os_finalizadas} O.S finalizadas</div>
                        <div>{melhorAtendente.taxa_conclusao.toFixed(1)}% de conclusão</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Tabela Comparativa */}
          <Card>
            <CardHeader>
              <CardTitle>Análise Comparativa Detalhada</CardTitle>
              <CardDescription>
                Score de qualidade calculado com base em: taxa de conclusão, atrasos, garantias e ações no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Atendente</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">O.S Emitidas</TableHead>
                      <TableHead className="text-center">Finalizadas</TableHead>
                      <TableHead className="text-center">Taxa</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Garantias
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Atrasos
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Exclusões</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dados.map((atendente, index) => (
                      <TableRow key={atendente.user_id} className={index === 0 ? "bg-green-50 dark:bg-green-950" : ""}>
                        <TableCell className="font-bold">
                          {index === 0 && <Award className="h-4 w-4 text-yellow-600 inline mr-1" />}
                          {index + 1}º
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{atendente.nome}</div>
                            <div className="text-xs text-muted-foreground">{atendente.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-2xl font-bold text-green-600">{atendente.score_qualidade}</span>
                            {getScoreBadge(atendente.score_qualidade)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{atendente.os_emitidas}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-medium text-green-600">{atendente.os_finalizadas}</span>
                            {atendente.os_finalizadas > 0 && index === 0 && (
                              <TrendingUp className="h-3 w-3 text-green-600 mt-1" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={atendente.taxa_conclusao >= 80 ? "default" : "secondary"}>
                            {atendente.taxa_conclusao.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={atendente.garantias_geradas > 5 ? "destructive" : "secondary"}>
                            {atendente.garantias_geradas}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={atendente.os_em_atraso > 3 ? "destructive" : "secondary"}>
                            {atendente.os_em_atraso}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={atendente.acoes_delete > 10 ? "destructive" : "secondary"}>
                            {atendente.acoes_delete}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {atendente.valor_total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Card de Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Insights e Recomendações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dados.filter(d => d.score_qualidade < 60).length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Atendentes Necessitando Atenção</p>
                    <p className="text-sm text-muted-foreground">
                      {dados.filter(d => d.score_qualidade < 60).length} atendente(s) com score abaixo de 60. 
                      Considere treinamento ou revisão de processos.
                    </p>
                  </div>
                </div>
              )}
              {totalGarantias > totalFinalizadas * 0.15 && (
                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Taxa de Garantias Elevada</p>
                    <p className="text-sm text-muted-foreground">
                      {((totalGarantias / totalFinalizadas) * 100).toFixed(1)}% das O.S finalizadas geraram garantias. 
                      Considere revisar processos de qualidade.
                    </p>
                  </div>
                </div>
              )}
              {melhorAtendente && melhorAtendente.score_qualidade >= 90 && (
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <Award className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Destaque de Excelência</p>
                    <p className="text-sm text-muted-foreground">
                      {melhorAtendente.nome} mantém excelente desempenho com score de {melhorAtendente.score_qualidade}. 
                      Considere como referência para treinamento da equipe.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default RelatorioComparativoAtendentes;
