import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface Marca {
  id: string;
  nome: string;
  created_at: string;
}

const marcaSchema = z.object({
  nome: z.string()
    .trim()
    .min(1, 'Nome da marca é obrigatório')
    .max(100, 'Nome muito longo (máximo 100 caracteres)')
    .regex(/^[a-zA-Z0-9À-ÿ\s.&'-]+$/, 'Nome contém caracteres inválidos')
});

const Marcas = () => {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMarca, setEditingMarca] = useState<Marca | null>(null);
  const [formData, setFormData] = useState({ nome: "" });

  useEffect(() => {
    loadMarcas();
  }, []);

  const loadMarcas = async () => {
    try {
      const { data, error } = await supabase
        .from("marcas")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      setMarcas(data || []);
    } catch (error) {
      toast.error("Erro ao carregar marcas");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (marca?: Marca) => {
    if (marca) {
      setEditingMarca(marca);
      setFormData({ nome: marca.nome });
    } else {
      setEditingMarca(null);
      setFormData({ nome: "" });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      marcaSchema.parse({ nome: formData.nome });
      
      // Check for duplicates
      const { data: existing } = await supabase
        .from('marcas')
        .select('id')
        .ilike('nome', formData.nome.trim())
        .maybeSingle();
      
      if (existing && (!editingMarca || existing.id !== editingMarca.id)) {
        toast.error('Já existe uma marca com este nome');
        return;
      }
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
        nome: formData.nome.trim(),
        created_by: user.id,
      };

      if (editingMarca) {
        const { error } = await supabase
          .from("marcas")
          .update(dataToSave)
          .eq("id", editingMarca.id);

        if (error) throw error;
        toast.success("Marca atualizada com sucesso");
      } else {
        const { error } = await supabase
          .from("marcas")
          .insert([dataToSave]);

        if (error) throw error;
        toast.success("Marca cadastrada com sucesso");
      }

      setDialogOpen(false);
      loadMarcas();
    } catch (error) {
      console.error("Erro ao salvar marca:", error);
      toast.error("Erro ao salvar marca");
    }
  };

  const handleDelete = async (id: string) => {
    // Check if there are models using this brand
    const { data: modelos } = await supabase
      .from("modelos")
      .select("id")
      .eq("marca_id", id)
      .limit(1);

    if (modelos && modelos.length > 0) {
      toast.error("Não é possível excluir marca com modelos cadastrados");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir esta marca?")) return;

    try {
      const { error } = await supabase
        .from("marcas")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Marca excluída com sucesso");
      loadMarcas();
    } catch (error) {
      console.error("Erro ao excluir marca:", error);
      toast.error("Erro ao excluir marca");
    }
  };

  const filteredMarcas = marcas.filter((marca) =>
    marca.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen p-4 pt-6">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Marcas</h1>
          <Button
            size="sm"
            className="gradient-primary text-primary-foreground shadow-glow"
            onClick={() => handleOpenDialog()}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Marca
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-input border-border"
          />
        </div>

        {/* Marcas List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredMarcas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {search ? "Nenhuma marca encontrada" : "Nenhuma marca cadastrada"}
              </p>
            </div>
          ) : (
            filteredMarcas.map((marca) => (
              <Card
                key={marca.id}
                className="bg-card border-border/50 hover:border-primary/50 transition-smooth"
              >
                <div className="p-4 flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-lg">{marca.nome}</h3>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenDialog(marca)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(marca.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
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
            <DialogTitle style={{ textTransform: 'uppercase' }}>
              {editingMarca ? "Editar Marca" : "Nova Marca"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome" style={{ textTransform: 'uppercase' }}>Nome da Marca *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ nome: e.target.value.toUpperCase() })}
                placeholder="Ex: Samsung, Apple, Motorola..."
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingMarca ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Marcas;
