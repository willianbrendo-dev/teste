import RelatoriosFinanceiros from "@/components/RelatoriosFinanceiros";
import RelatorioGarantias from "@/components/relatorios/RelatorioGarantias";
import RelatorioAuditoria from "@/components/relatorios/RelatorioAuditoria";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, BarChart3, ShieldCheck, Shield } from "lucide-react";

const Relatorios = () => {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Relatórios e Auditorias
          </h1>
          <p className="text-muted-foreground">Análises e relatórios financeiros do sistema</p>
        </div>
      </div>

      <Tabs defaultValue="financeiro" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="financeiro" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="garantias" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Garantias
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financeiro">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatórios Financeiros
              </CardTitle>
              <CardDescription>
                Visualize relatórios detalhados sobre movimentações financeiras, caixa, colaboradores e serviços
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RelatoriosFinanceiros />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="garantias">
          <RelatorioGarantias />
        </TabsContent>

        <TabsContent value="auditoria">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Auditoria do Sistema
              </CardTitle>
              <CardDescription>
                Visualize todos os logs de ações realizadas no sistema, com filtros e exportação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RelatorioAuditoria />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;
