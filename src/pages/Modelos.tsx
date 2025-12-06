import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ComboboxSelect } from "@/components/ui/combobox-select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface Marca {
  id: string;
  nome: string;
}

interface Modelo {
  id: string;
  nome: string;
  marca_id: string;
  marcas?: { nome: string };
}

const modeloSchema = z.object({
  nome: z.string()
    .trim()
    .min(1, 'Nome do modelo é obrigatório')
    .max(100, 'Nome muito longo (máximo 100 caracteres)')
    .regex(/^[a-zA-Z0-9À-ÿ\s.&'\/-]+$/, 'Nome contém caracteres inválidos'),
  marca_id: z.string().uuid('Marca inválida')
});

const Modelos = () => {
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [search, setSearch] = useState("");
  const [filterMarca, setFilterMarca] = useState("todas");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModelo, setEditingModelo] = useState<Modelo | null>(null);
  const [formData, setFormData] = useState({ nome: "", marca_id: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: marcasData, error: marcasError } = await supabase
        .from("marcas")
        .select("*")
        .order("nome", { ascending: true });

      const { data: modelosData, error: modelosError } = await supabase
        .from("modelos")
        .select("*, marcas(nome)")
        .order("nome", { ascending: true });

      if (marcasError) throw marcasError;
      if (modelosError) throw modelosError;

      setMarcas(marcasData || []);
      setModelos(modelosData || []);
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (modelo?: Modelo) => {
    if (modelo) {
      setEditingModelo(modelo);
      setFormData({ nome: modelo.nome, marca_id: modelo.marca_id });
    } else {
      setEditingModelo(null);
      setFormData({ nome: "", marca_id: "" });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      modeloSchema.parse(formData);
      
      // Check for duplicates within the same brand
      const { data: existing } = await supabase
        .from('modelos')
        .select('id')
        .eq('marca_id', formData.marca_id)
        .ilike('nome', formData.nome.trim())
        .maybeSingle();
      
      if (existing && (!editingModelo || existing.id !== editingModelo.id)) {
        toast.error('Já existe um modelo com este nome para esta marca');
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
        marca_id: formData.marca_id,
        created_by: user.id,
      };

      if (editingModelo) {
        const { error } = await supabase
          .from("modelos")
          .update(dataToSave)
          .eq("id", editingModelo.id);

        if (error) throw error;
        toast.success("Modelo atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from("modelos")
          .insert([dataToSave]);

        if (error) throw error;
        toast.success("Modelo cadastrado com sucesso");
      }

      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Erro ao salvar modelo:", error);
      toast.error("Erro ao salvar modelo");
    }
  };

  const handleDelete = async (id: string) => {
    // Check if there are service orders using this model
    const { data: ordens } = await supabase
      .from("ordens_servico")
      .select("id")
      .eq("modelo_id", id)
      .limit(1);

    if (ordens && ordens.length > 0) {
      toast.error("Não é possível excluir modelo vinculado a ordens de serviço");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este modelo?")) return;

    try {
      const { error } = await supabase
        .from("modelos")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Modelo excluído com sucesso");
      loadData();
    } catch (error) {
      console.error("Erro ao excluir modelo:", error);
      toast.error("Erro ao excluir modelo");
    }
  };

  const filteredModelos = modelos.filter((modelo) => {
    const matchesSearch = modelo.nome.toLowerCase().includes(search.toLowerCase()) ||
                         modelo.marcas?.nome.toLowerCase().includes(search.toLowerCase());
    const matchesMarca = filterMarca === "todas" || modelo.marca_id === filterMarca;
    return matchesSearch && matchesMarca;
  });

  return (
    <div className="min-h-screen p-4 pt-6">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header - Modelos de Aparelhos */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Modelos</h1>
          <Button
            size="sm"
            className="gradient-primary text-primary-foreground shadow-glow"
            onClick={() => handleOpenDialog()}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Modelo
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar modelo ou marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>

          <div>
            <Label style={{ textTransform: 'uppercase' }}>Filtrar por Marca</Label>
            <ComboboxSelect
              value={filterMarca}
              onValueChange={setFilterMarca}
              options={[
                { value: "todas", label: "Todas as marcas" },
                ...marcas.map((marca) => ({ value: marca.id, label: marca.nome })),
              ]}
              placeholder="Selecione uma marca"
              allowCustom={false}
            />
          </div>
        </div>

        {/* Modelos List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredModelos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {search || filterMarca !== "todas" 
                  ? "Nenhum modelo encontrado" 
                  : "Nenhum modelo cadastrado"}
              </p>
              {marcas.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Cadastre marcas primeiro antes de adicionar modelos
                </p>
              )}
            </div>
          ) : (
            filteredModelos.map((modelo) => (
              <Card
                key={modelo.id}
                className="bg-card border-border/50 hover:border-primary/50 transition-smooth"
              >
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-lg">{modelo.nome}</h3>
                    <Badge variant="secondary" className="mt-1">
                      {modelo.marcas?.nome}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenDialog(modelo)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(modelo.id)}
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
              {editingModelo ? "Editar Modelo" : "Novo Modelo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="marca" style={{ textTransform: 'uppercase' }}>Marca *</Label>
              <ComboboxSelect
                value={formData.marca_id}
                onValueChange={(value) => setFormData({ ...formData, marca_id: value })}
                options={marcas.map((marca) => ({ value: marca.id, label: marca.nome }))}
                placeholder="Selecione a marca"
                allowCustom={false}
              />
              {marcas.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhuma marca cadastrada. Cadastre uma marca primeiro.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome" style={{ textTransform: 'uppercase' }}>Nome do Modelo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
                placeholder="Ex: Galaxy S21, iPhone 13, Moto G..."
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.marca_id || !formData.nome}>
              {editingModelo ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Modelos;
