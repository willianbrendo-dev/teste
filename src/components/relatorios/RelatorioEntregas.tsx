import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface Entrega {
  id: string;
  data_entrega: string;
  valor_servico: number;
  metodo_pagamento: string;
  ordem_servico_id: string;
  ordens_servico: {
    numero: number;
    clientes: {
      nome: string;
    };
  };
}

const RelatorioEntregas = () => {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  const gerarRelatorio = async () => {
    if (!dataInicio || !dataFim) {
      toast.error("Selecione o período do relatório");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("garantias")
        .select(`
          id,
          data_entrega,
          valor_servico,
          metodo_pagamento,
          ordem_servico_id,
          ordens_servico (
            numero,
            clientes (
              nome
            )
          )
        `)
        .eq("status", "entregue")
        .gte("data_entrega", dataInicio)
        .lte("data_entrega", dataFim)
        .order("data_entrega", { ascending: false });

      if (error) throw error;

      setEntregas(data || []);
      toast.success("Relatório gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Relatório de Entregas", 14, 20);
    
    doc.setFontSize(11);
    doc.text(`Período: ${format(new Date(dataInicio), "dd/MM/yyyy")} a ${format(new Date(dataFim), "dd/MM/yyyy")}`, 14, 28);
    
    // Totais por método de pagamento
    const totaisPorMetodo = entregas.reduce((acc, entrega) => {
      const metodo = entrega.metodo_pagamento || "Não informado";
      acc[metodo] = (acc[metodo] || 0) + (entrega.valor_servico || 0);
      return acc;
    }, {} as Record<string, number>);

    const valorTotal = entregas.reduce((sum, e) => sum + (e.valor_servico || 0), 0);
    
    doc.setFontSize(12);
    doc.text("Resumo por Método de Pagamento:", 14, 38);
    
    let yPos = 45;
    Object.entries(totaisPorMetodo).forEach(([metodo, valor]) => {
      const metodoFormatado = metodo.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      doc.text(`${metodoFormatado}: R$ ${valor.toFixed(2)}`, 14, yPos);
      yPos += 7;
    });
    
    doc.text(`Total Geral: R$ ${valorTotal.toFixed(2)}`, 14, yPos);
    doc.text(`Total de Entregas: ${entregas.length}`, 14, yPos + 7);
    
    // Tabela de entregas
    const tableData = entregas.map(e => [
      format(new Date(e.data_entrega), "dd/MM/yyyy"),
      `#${e.ordens_servico.numero}`,
      e.ordens_servico.clientes.nome,
      (e.metodo_pagamento || "Não informado").replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
      `R$ ${(e.valor_servico || 0).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: yPos + 15,
      head: [["Data", "O.S", "Cliente", "Método", "Valor"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`relatorio-entregas-${dataInicio}-${dataFim}.pdf`);
    toast.success("PDF exportado com sucesso!");
  };

  const totaisPorMetodo = entregas.reduce((acc, entrega) => {
    const metodo = entrega.metodo_pagamento || "Não informado";
    acc[metodo] = (acc[metodo] || 0) + (entrega.valor_servico || 0);
    return acc;
  }, {} as Record<string, number>);

  const valorTotal = entregas.reduce((sum, e) => sum + (e.valor_servico || 0), 0);

  return (
    <div className="space-y-6">
      <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Filtros do Relatório</CardTitle>
                  <CardDescription>Selecione o período para gerar o relatório</CardDescription>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${isFilterOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="data-inicio">Data Início</Label>
                  <Input
                    id="data-inicio"
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="data-fim">Data Fim</Label>
                  <Input
                    id="data-fim"
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="mt-2"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={gerarRelatorio} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Gerar Relatório
                </Button>
                {entregas.length > 0 && (
                  <Button onClick={exportarPDF} variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Exportar PDF
                  </Button>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {entregas.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total de Entregas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{entregas.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {valorTotal.toFixed(2)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {(valorTotal / entregas.length).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Totais por Método de Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(totaisPorMetodo).map(([metodo, valor]) => {
                  const metodoFormatado = metodo.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                  return (
                    <Card key={metodo}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">{metodoFormatado}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold text-green-600">
                          R$ {valor.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {entregas.filter(e => e.metodo_pagamento === metodo).length} entregas
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento de Entregas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>O.S</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Método Pagamento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entregas.map((entrega) => (
                    <TableRow key={entrega.id}>
                      <TableCell>{format(new Date(entrega.data_entrega), "dd/MM/yyyy")}</TableCell>
                      <TableCell>#{entrega.ordens_servico.numero}</TableCell>
                      <TableCell>{entrega.ordens_servico.clientes.nome}</TableCell>
                      <TableCell>
                        {(entrega.metodo_pagamento || "Não informado")
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, l => l.toUpperCase())}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {(entrega.valor_servico || 0).toFixed(2)}
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

export default RelatorioEntregas;
