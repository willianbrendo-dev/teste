import RelatoriosFinanceiros from "@/components/RelatoriosFinanceiros";
import RelatorioGarantias from "@/components/relatorios/RelatorioGarantias";
import RelatorioAuditoria from "@/components/relatorios/RelatorioAuditoria";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, BarChart3, ShieldCheck, Shield, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Relatorios = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Acesso negado. Faça login para continuar.");
          navigate("/login");
          return;
        }

        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (error) {
          console.error("Erro ao verificar permissões:", error);
          toast.error("Erro ao verificar permissões");
          navigate("/");
          return;
        }

        if (!data) {
          toast.error("Você não tem permissão para acessar esta página");
          navigate("/");
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error("Erro ao verificar admin:", error);
        toast.error("Erro ao verificar permissões");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

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
