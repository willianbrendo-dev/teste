import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, Package2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface Peca {
  id: string;
  nome: string;
  descricao?: string;
  quantidade: number;
  preco_unitario?: number;
}

const pecaSchema = z.object({
  nome: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome muito longo (máximo 100 caracteres)'),
  
  descricao: z.string()
    .trim()
    .max(500, 'Descrição muito longa (máximo 500 caracteres)')
    .optional()
    .or(z.literal('')),
  
  quantidade: z.number()
    .int('Quantidade deve ser um número inteiro')
    .min(0, 'Quantidade não pode ser negativa')
    .max(999999, 'Quantidade muito alta'),
  
  preco_unitario: z.number()
    .min(0, 'Preço não pode ser negativo')
    .max(999999.99, 'Preço muito alto')
    .refine((val) => {
      const decimal = val.toString().split('.')[1];
      return !decimal || decimal.length <= 2;
    }, 'Preço deve ter no máximo 2 casas decimais')
    .optional()
});

const Estoque = () => {
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPeca, setEditingPeca] = useState<Peca | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    quantidade: 0,
    preco_unitario: 0,
  });

  useEffect(() => {
    loadPecas();
  }, []);

  const loadPecas = async () => {
    try {
      const { data, error } = await supabase
        .from("pecas_estoque")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      setPecas(data || []);
    } catch (error) {
      toast.error("Erro ao carregar peças");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (peca?: Peca) => {
    if (peca) {
      setEditingPeca(peca);
      setFormData({
        nome: peca.nome,
        descricao: peca.descricao || "",
        quantidade: peca.quantidade,
        preco_unitario: peca.preco_unitario || 0,
      });
    } else {
      setEditingPeca(null);
      setFormData({
        nome: "",
        descricao: "",
        quantidade: 0,
        preco_unitario: 0,
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      pecaSchema.parse(formData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const dataToSave = {
        nome: formData.nome,
        descricao: formData.descricao || null,
        quantidade: formData.quantidade,
        preco_unitario: formData.preco_unitario || null,
        created_by: user.id,
      };

      if (editingPeca) {
        const { error } = await supabase
          .from("pecas_estoque")
          .update(dataToSave)
          .eq("id", editingPeca.id);

        if (error) throw error;
        toast.success("Peça atualizada com sucesso");
      } else {
        const { error } = await supabase
          .from("pecas_estoque")
          .insert([dataToSave]);

        if (error) throw error;
        toast.success("Peça cadastrada com sucesso");
      }

      setDialogOpen(false);
      loadPecas();
    } catch (error) {
      console.error("Erro ao salvar peça:", error);
      toast.error("Erro ao salvar peça");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta peça?")) return;

    try {
      const { error } = await supabase
        .from("pecas_estoque")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Peça excluída com sucesso");
      loadPecas();
    } catch (error) {
      console.error("Erro ao excluir peça:", error);
      toast.error("Erro ao excluir peça");
    }
  };

  const filteredPecas = pecas.filter((peca) =>
    peca.nome.toLowerCase().includes(search.toLowerCase()) ||
    peca.descricao?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 pt-6">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Estoque de Peças</h1>
          <Button
            size="sm"
            className="gradient-primary text-primary-foreground shadow-glow"
            onClick={() => handleOpenDialog()}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar peça..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-input border-border"
          />
        </div>

        {/* Pecas List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredPecas.length === 0 ? (
            <div className="text-center py-12">
              <Package2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">
                {search ? "Nenhuma peça encontrada" : "Nenhuma peça cadastrada"}
              </p>
            </div>
          ) : (
            filteredPecas.map((peca) => (
              <Card
                key={peca.id}
                className="bg-card border-border/50 hover:border-primary/50 transition-smooth"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold text-foreground">{peca.nome}</h3>
                      {peca.descricao && (
                        <p className="text-sm text-muted-foreground">{peca.descricao}</p>
                      )}
                      <div className="flex gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Qtd: <span className="text-foreground font-medium">{peca.quantidade}</span>
                        </span>
                        {peca.preco_unitario && (
                          <span className="text-muted-foreground">
                            Preço: <span className="text-foreground font-medium">
                              R$ {peca.preco_unitario.toFixed(2)}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenDialog(peca)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(peca.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPeca ? "Editar Peça" : "Nova Peça"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome da peça"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição detalhada"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="0"
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preco">Preço Unitário</Label>
                <Input
                  id="preco"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.preco_unitario}
                  onChange={(e) => setFormData({ ...formData, preco_unitario: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingPeca ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Estoque;
