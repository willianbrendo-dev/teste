import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ComboboxSelect } from "@/components/ui/combobox-select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Edit, Eye, Printer, Download, FileText, Upload } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Garantia {
  id: string;
  ordem_servico_id: string;
  status: 'aguardando' | 'em_atraso' | 'entregue';
  termo_garantia_url: string | null;
  observacoes: string | null;
  data_entrega: string | null;
  valor_servico: number | null;
  metodo_pagamento: string | null;
  created_at: string;
  ordens_servico: {
    numero: number;
    cliente_id: string;
    marca_id: string | null;
    modelo_id: string | null;
    data_prevista_entrega: string | null;
    valor_total: number | null;
    clientes: {
      nome: string;
      telefone: string | null;
    };
  };
}

const Garantias = () => {
  const [garantias, setGarantias] = useState<Garantia[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGarantia, setSelectedGarantia] = useState<Garantia | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [valorServico, setValorServico] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchGarantias();
  }, []);

  const fetchGarantias = async () => {
    try {
      const { data, error } = await supabase
        .from('garantias')
        .select(`
          *,
          ordens_servico (
            numero,
            cliente_id,
            marca_id,
            modelo_id,
            valor_total,
            data_prevista_entrega,
            clientes (nome, telefone)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Atualizar status automático baseado na data
      const garantiasAtualizadas = await Promise.all(
        (data || []).map(async (garantia) => {
          const novoStatus = calcularStatus(garantia);
          if (novoStatus !== garantia.status) {
            await supabase
              .from('garantias')
              .update({ status: novoStatus })
              .eq('id', garantia.id);
            return { ...garantia, status: novoStatus };
          }
          return garantia;
        })
      );

      setGarantias(garantiasAtualizadas as Garantia[]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar garantias",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularStatus = (garantia: any): 'aguardando' | 'em_atraso' | 'entregue' => {
    if (garantia.status === 'entregue') return 'entregue';
    
    const dataPrevisao = garantia.ordens_servico?.data_prevista_entrega;
    if (!dataPrevisao) return 'aguardando';

    const hoje = new Date();
    const dataEntrega = new Date(dataPrevisao);
    
    if (hoje > dataEntrega) {
      return 'em_atraso';
    }
    
    return 'aguardando';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      aguardando: { label: "Aguardando", variant: "default" },
      em_atraso: { label: "Em Atraso", variant: "destructive" },
      entregue: { label: "Entregue", variant: "secondary" },
    };
    const config = variants[status] || variants.aguardando;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleUpdateStatus = async () => {
    if (!selectedGarantia) return;

    // Validar campos obrigatórios ao entregar
    if (statusToUpdate === 'entregue') {
      if (!valorServico || parseFloat(valorServico) <= 0) {
        toast({
          variant: "destructive",
          title: "Valor obrigatório",
          description: "Informe o valor do serviço para dar baixa.",
        });
        return;
      }
      if (!metodoPagamento) {
        toast({
          variant: "destructive",
          title: "Método de pagamento obrigatório",
          description: "Selecione o método de pagamento utilizado.",
        });
        return;
      }
    }

    try {
      const updates: any = { status: statusToUpdate, observacoes };
      if (statusToUpdate === 'entregue') {
        updates.data_entrega = new Date().toISOString();
        updates.valor_servico = parseFloat(valorServico);
        updates.metodo_pagamento = metodoPagamento;
      }

      const { error } = await supabase
        .from('garantias')
        .update(updates)
        .eq('id', selectedGarantia.id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: statusToUpdate === 'entregue' 
          ? "Baixa realizada com sucesso! Receita registrada no financeiro."
          : "O status da garantia foi atualizado com sucesso.",
      });

      setEditDialogOpen(false);
      setValorServico("");
      setMetodoPagamento("");
      fetchGarantias();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: error.message,
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, garantiaId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${garantiaId}-${Date.now()}.${fileExt}`;
      const filePath = `termos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('device-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('device-photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('garantias')
        .update({ termo_garantia_url: publicUrl })
        .eq('id', garantiaId);

      if (updateError) throw updateError;

      toast({
        title: "Termo anexado",
        description: "O termo de garantia foi anexado com sucesso.",
      });

      fetchGarantias();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer upload",
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePrint = (garantia: Garantia) => {
    window.print();
  };

  const handleDownload = async (url: string) => {
    if (!url) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Nenhum termo de garantia anexado.",
      });
      return;
    }
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-dark flex items-center justify-center">
        <div className="w-16 h-16 rounded-full gradient-primary animate-pulse shadow-glow" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-dark p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Garantias</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os termos de garantia dos dispositivos
            </p>
          </div>
        </div>

        {garantias.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma garantia encontrada</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {garantias.map((garantia) => (
              <Card key={garantia.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        OS #{garantia.ordens_servico.numero}
                      </CardTitle>
                      <CardDescription>
                        {garantia.ordens_servico.clientes.nome}
                      </CardDescription>
                    </div>
                    {getStatusBadge(garantia.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Dispositivo:</span>{' '}
                      {garantia.ordens_servico.marca_id || 'N/A'}{' '}
                      {garantia.ordens_servico.modelo_id || ''}
                    </div>
                    <div>
                      <span className="font-medium">Telefone:</span>{' '}
                      {garantia.ordens_servico.clientes.telefone || 'N/A'}
                    </div>
                    {garantia.ordens_servico.valor_total && (
                      <div>
                        <span className="font-medium">Valor do Serviço:</span>{' '}
                        <span className="font-semibold text-primary">
                          R$ {parseFloat(garantia.ordens_servico.valor_total.toString()).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {garantia.valor_servico && garantia.status === 'entregue' && (
                      <div>
                        <span className="font-medium">Valor Pago:</span>{' '}
                        <span className="font-semibold text-green-600">
                          R$ {parseFloat(garantia.valor_servico.toString()).toFixed(2)}
                        </span>
                        {garantia.metodo_pagamento && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({garantia.metodo_pagamento})
                          </span>
                        )}
                      </div>
                    )}
                    {garantia.ordens_servico.data_prevista_entrega && (
                      <div>
                        <span className="font-medium">Previsão:</span>{' '}
                        {format(new Date(garantia.ordens_servico.data_prevista_entrega), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    )}
                    {garantia.data_entrega && (
                      <div>
                        <span className="font-medium">Entregue em:</span>{' '}
                        {format(new Date(garantia.data_entrega), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Dialog open={editDialogOpen && selectedGarantia?.id === garantia.id} onOpenChange={(open) => {
                      setEditDialogOpen(open);
                      if (open) {
                        setSelectedGarantia(garantia);
                        setStatusToUpdate(garantia.status);
                        setObservacoes(garantia.observacoes || "");
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Garantia</DialogTitle>
                          <DialogDescription>
                            Atualize o status e observações da garantia
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <ComboboxSelect
                              value={statusToUpdate}
                              onValueChange={setStatusToUpdate}
                              options={[
                                { value: "aguardando", label: "Aguardando" },
                                { value: "em_atraso", label: "Em Atraso" },
                                { value: "entregue", label: "Entregue" },
                              ]}
                              placeholder="Selecione o status"
                              allowCustom={false}
                            />
                          </div>

                          {statusToUpdate === 'entregue' && (
                            <>
                              <div className="space-y-2">
                                <Label>Valor do Serviço (R$)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={valorServico}
                                  onChange={(e) => setValorServico(e.target.value)}
                                  placeholder="0.00"
                                  required
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Método de Pagamento</Label>
                                <ComboboxSelect
                                  value={metodoPagamento}
                                  onValueChange={setMetodoPagamento}
                                  options={[
                                    { value: "dinheiro", label: "Dinheiro" },
                                    { value: "pix", label: "PIX" },
                                    { value: "debito", label: "Cartão de Débito" },
                                    { value: "credito", label: "Cartão de Crédito" },
                                    { value: "outros", label: "Outros" },
                                  ]}
                                  placeholder="Selecione o método"
                                />
                              </div>
                            </>
                          )}

                          <div className="space-y-2">
                            <Label>Observações</Label>
                            <Textarea
                              value={observacoes}
                              onChange={(e) => setObservacoes(e.target.value)}
                              placeholder="Observações sobre a garantia..."
                            />
                          </div>
                          <Button onClick={handleUpdateStatus} className="w-full">
                            Salvar Alterações
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button size="sm" variant="outline" onClick={() => handlePrint(garantia)}>
                      <Printer className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(garantia.termo_garantia_url || "")}
                      disabled={!garantia.termo_garantia_url}
                    >
                      <Download className="w-4 h-4" />
                    </Button>

                    <div className="relative">
                      <Input
                        type="file"
                        id={`upload-${garantia.id}`}
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => handleFileUpload(e, garantia.id)}
                        disabled={uploading}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => document.getElementById(`upload-${garantia.id}`)?.click()}
                        disabled={uploading}
                      >
                        <Upload className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {garantia.termo_garantia_url && (
                    <Badge variant="secondary" className="w-full justify-center">
                      Termo Anexado
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Garantias;
