import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComboboxSelect } from "@/components/ui/combobox-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, Tags } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  nome: string;
  tipo: "receita" | "despesa";
  cor: string | null;
}

const colorsPreset = [
  { value: "#10b981", label: "Verde" },
  { value: "#3b82f6", label: "Azul" },
  { value: "#ef4444", label: "Vermelho" },
  { value: "#f59e0b", label: "Laranja" },
  { value: "#8b5cf6", label: "Roxo" },
  { value: "#ec4899", label: "Rosa" },
  { value: "#14b8a6", label: "Turquesa" },
  { value: "#6366f1", label: "Índigo" },
];

export default function CategoriasFinanceiras() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    tipo: "receita" as "receita" | "despesa",
    cor: "#10b981",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categorias_financeiras")
        .select("*")
        .order("tipo")
        .order("nome");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar categorias: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Usuário não autenticado");

      if (editingCategory) {
        const { error } = await supabase
          .from("categorias_financeiras")
          .update({
            nome: formData.nome.trim(),
            tipo: formData.tipo,
            cor: formData.cor,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Categoria atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("categorias_financeiras").insert({
          nome: formData.nome.trim(),
          tipo: formData.tipo,
          cor: formData.cor,
          created_by: userData.user.id,
        });

        if (error) throw error;
        toast.success("Categoria criada com sucesso!");
      }

      setDialogOpen(false);
      setEditingCategory(null);
      setFormData({ nome: "", tipo: "receita", cor: "#10b981" });
      fetchCategories();
    } catch (error: any) {
      toast.error(
        `Erro ao ${editingCategory ? "atualizar" : "criar"} categoria: ` +
          error.message
      );
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      nome: category.nome,
      tipo: category.tipo,
      cor: category.cor || "#10b981",
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteCategory) return;

    try {
      const { error } = await supabase
        .from("categorias_financeiras")
        .delete()
        .eq("id", deleteCategory.id);

      if (error) throw error;

      toast.success("Categoria excluída com sucesso!");
      setDeleteCategory(null);
      fetchCategories();
    } catch (error: any) {
      toast.error("Erro ao excluir categoria: " + error.message);
    }
  };

  const receitas = categories.filter((c) => c.tipo === "receita");
  const despesas = categories.filter((c) => c.tipo === "despesa");

  if (loading) {
    return <div className="text-center py-4">Carregando categorias...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Categorias Financeiras</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie as categorias de receitas e despesas
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingCategory(null);
              setFormData({ nome: "", tipo: "receita", cor: "#10b981" });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome da Categoria</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  placeholder="Ex: Vendas, Aluguel, Salários..."
                  required
                />
              </div>

              <div>
                <Label>Tipo</Label>
                <ComboboxSelect
                  value={formData.tipo}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipo: value as "receita" | "despesa" })
                  }
                  options={[
                    { value: "receita", label: "Receita" },
                    { value: "despesa", label: "Despesa" },
                  ]}
                  placeholder="Selecione o tipo"
                  allowCustom={false}
                />
              </div>

              <div>
                <Label>Cor</Label>
                <ComboboxSelect
                  value={formData.cor}
                  onValueChange={(value) =>
                    setFormData({ ...formData, cor: value })
                  }
                  options={colorsPreset}
                  placeholder="Selecione uma cor"
                  allowCustom={false}
                />
                <div
                  className="mt-2 h-8 rounded-md border"
                  style={{ backgroundColor: formData.cor }}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingCategory ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Receitas */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h4 className="font-semibold">Receitas</h4>
              <Badge variant="secondary">{receitas.length}</Badge>
            </div>
            <div className="space-y-2">
              {receitas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma categoria de receita
                </p>
              ) : (
                receitas.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.cor || "#10b981" }}
                      />
                      <span className="text-sm font-medium">{category.nome}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteCategory(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Despesas */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <h4 className="font-semibold">Despesas</h4>
              <Badge variant="secondary">{despesas.length}</Badge>
            </div>
            <div className="space-y-2">
              {despesas.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma categoria de despesa
                </p>
              ) : (
                despesas.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.cor || "#ef4444" }}
                      />
                      <span className="text-sm font-medium">{category.nome}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteCategory(category)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteCategory}
        onOpenChange={(open) => !open && setDeleteCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{deleteCategory?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
