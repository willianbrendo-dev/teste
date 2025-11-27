import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Lock, Unlock, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CaixaDiario {
  id: string;
  data: string;
  valor_abertura: number;
  valor_fechamento: number | null;
  status: "aberto" | "fechado";
  observacoes_abertura: string | null;
  observacoes_fechamento: string | null;
  aberto_em: string;
  fechado_em: string | null;
}

const GestaCaixaDiario = () => {
  const [caixaAtual, setCaixaAtual] = useState<CaixaDiario | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAbrirDialog, setShowAbrirDialog] = useState(false);
  const [showFecharDialog, setShowFecharDialog] = useState(false);
  const [valorAbertura, setValorAbertura] = useState("");
  const [observacoesAbertura, setObservacoesAbertura] = useState("");
  const [valorFechamento, setValorFechamento] = useState("");
  const [observacoesFechamento, setObservacoesFechamento] = useState("");
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);

  useEffect(() => {
    verificarCaixaHoje();
  }, []);

  const verificarCaixaHoje = async () => {
    setLoading(true);
    try {
      const hoje = format(new Date(), "yyyy-MM-dd");
      
      const { data: caixa, error } = await supabase
        .from("caixa_diario")
        .select("*")
        .eq("data", hoje)
        .maybeSingle();

      if (error) throw error;
      
      setCaixaAtual(caixa as CaixaDiario | null);
      
      if (caixa) {
        await carregarMovimentacoes(hoje);
      }
    } catch (error: any) {
      toast.error("Erro ao verificar caixa: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const carregarMovimentacoes = async (data: string) => {
    try {
      const { data: transacoes, error } = await supabase
        .from("transacoes")
        .select("*")
        .eq("data", data)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMovimentacoes(transacoes || []);
    } catch (error: any) {
      console.error("Erro ao carregar movimentações:", error);
    }
  };

  const abrirCaixa = async () => {
    if (!valorAbertura || parseFloat(valorAbertura) < 0) {
      toast.error("Valor de abertura inválido");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const hoje = format(new Date(), "yyyy-MM-dd");

      const { error } = await supabase.from("caixa_diario").insert({
        data: hoje,
        valor_abertura: parseFloat(valorAbertura),
        observacoes_abertura: observacoesAbertura || null,
        aberto_por: userData.user.id,
        status: "aberto",
      });

      if (error) throw error;

      toast.success("Caixa aberto com sucesso!");
      setShowAbrirDialog(false);
      setValorAbertura("");
      setObservacoesAbertura("");
      verificarCaixaHoje();
    } catch (error: any) {
      toast.error("Erro ao abrir caixa: " + error.message);
    }
  };

  const fecharCaixa = async () => {
    if (!valorFechamento || parseFloat(valorFechamento) < 0) {
      toast.error("Valor de fechamento inválido");
      return;
    }

    if (!caixaAtual) return;

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("caixa_diario")
        .update({
          valor_fechamento: parseFloat(valorFechamento),
          observacoes_fechamento: observacoesFechamento || null,
          fechado_por: userData.user.id,
          fechado_em: new Date().toISOString(),
          status: "fechado",
        })
        .eq("id", caixaAtual.id);

      if (error) throw error;

      toast.success("Caixa fechado com sucesso!");
      setShowFecharDialog(false);
      setValorFechamento("");
      setObservacoesFechamento("");
      verificarCaixaHoje();
    } catch (error: any) {
      toast.error("Erro ao fechar caixa: " + error.message);
    }
  };

  const totalEntradas = movimentacoes
    .filter((m) => m.tipo === "receita")
    .reduce((sum, m) => sum + parseFloat(m.valor.toString()), 0);

  const totalSaidas = movimentacoes
    .filter((m) => m.tipo === "despesa")
    .reduce((sum, m) => sum + parseFloat(m.valor.toString()), 0);

  const saldoEsperado = caixaAtual ? parseFloat(caixaAtual.valor_abertura.toString()) + totalEntradas - totalSaidas : 0;
  const diferencaCaixa = caixaAtual && caixaAtual.valor_fechamento ? parseFloat(caixaAtual.valor_fechamento.toString()) - saldoEsperado : 0;

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {!caixaAtual ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Caixa Fechado
            </CardTitle>
            <CardDescription>O caixa de hoje ainda não foi aberto</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowAbrirDialog(true)} className="w-full" size="lg">
              <Unlock className="mr-2 h-4 w-4" />
              Abrir Caixa do Dia
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={caixaAtual.status === "aberto" ? "default" : "secondary"} className="text-sm">
                  {caixaAtual.status === "aberto" ? "Aberto" : "Fechado"}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Valor Abertura</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">
                  R$ {parseFloat(caixaAtual.valor_abertura.toString()).toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Entradas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-green-600">R$ {totalEntradas.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  Saídas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-red-600">R$ {totalSaidas.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Saldo do Caixa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Valor de Abertura:</span>
                  <span className="font-medium">
                    R$ {parseFloat(caixaAtual.valor_abertura.toString()).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">+ Entradas:</span>
                  <span className="font-medium text-green-600">R$ {totalEntradas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">- Saídas:</span>
                  <span className="font-medium text-red-600">R$ {totalSaidas.toFixed(2)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">Saldo Esperado:</span>
                  <span className={`font-bold ${saldoEsperado >= 0 ? "text-primary" : "text-destructive"}`}>
                    R$ {saldoEsperado.toFixed(2)}
                  </span>
                </div>

                {caixaAtual.status === "fechado" && (
                  <>
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-semibold">Valor Fechamento:</span>
                      <span className="font-bold">
                        R$ {parseFloat(caixaAtual.valor_fechamento?.toString() || "0").toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-semibold">Diferença:</span>
                      <span className={`font-bold ${Math.abs(diferencaCaixa) < 0.01 ? "text-green-600" : "text-destructive"}`}>
                        {diferencaCaixa >= 0 ? "+" : ""}R$ {diferencaCaixa.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {caixaAtual.status === "aberto" && (
                <Button onClick={() => setShowFecharDialog(true)} className="w-full" size="lg">
                  <Lock className="mr-2 h-4 w-4" />
                  Fechar Caixa do Dia
                </Button>
              )}
            </CardContent>
          </Card>

          {caixaAtual.observacoes_abertura && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Observações de Abertura</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{caixaAtual.observacoes_abertura}</p>
              </CardContent>
            </Card>
          )}

          {caixaAtual.observacoes_fechamento && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Observações de Fechamento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{caixaAtual.observacoes_fechamento}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Dialog Abrir Caixa */}
      <AlertDialog open={showAbrirDialog} onOpenChange={setShowAbrirDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abrir Caixa do Dia</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o valor inicial do caixa para troco e movimentação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Valor de Abertura (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valorAbertura}
                onChange={(e) => setValorAbertura(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea
                value={observacoesAbertura}
                onChange={(e) => setObservacoesAbertura(e.target.value)}
                placeholder="Ex: Troco inicial, observações sobre o caixa..."
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={abrirCaixa}>Abrir Caixa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Fechar Caixa */}
      <AlertDialog open={showFecharDialog} onOpenChange={setShowFecharDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar Caixa do Dia</AlertDialogTitle>
            <AlertDialogDescription>
              Conte o valor físico do caixa e informe abaixo.
              <br />
              <strong>Saldo Esperado: R$ {saldoEsperado.toFixed(2)}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Valor no Caixa Físico (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valorFechamento}
                onChange={(e) => setValorFechamento(e.target.value)}
                placeholder="0.00"
              />
              {valorFechamento && (
                <p className={`text-sm mt-1 ${Math.abs(parseFloat(valorFechamento) - saldoEsperado) < 0.01 ? "text-green-600" : "text-destructive"}`}>
                  Diferença: {parseFloat(valorFechamento) - saldoEsperado >= 0 ? "+" : ""}
                  R$ {(parseFloat(valorFechamento) - saldoEsperado).toFixed(2)}
                </p>
              )}
            </div>
            <div>
              <Label>Observações (opcional)</Label>
              <Textarea
                value={observacoesFechamento}
                onChange={(e) => setObservacoesFechamento(e.target.value)}
                placeholder="Ex: Diferenças encontradas, observações..."
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={fecharCaixa}>Fechar Caixa</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GestaCaixaDiario;
