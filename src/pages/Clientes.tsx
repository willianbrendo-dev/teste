import { useState, useEffect } from "react";
import { Plus, Search, Phone, Mail, Edit2, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  endereco?: string;
}

const clienteSchema = z.object({
  nome: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome muito longo (máximo 100 caracteres)')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Nome contém caracteres inválidos'),
  
  email: z.string()
    .trim()
    .email('Email inválido')
    .max(255, 'Email muito longo')
    .optional()
    .or(z.literal('')),
  
  telefone: z.string()
    .trim()
    .regex(/^[\d\s()+-]+$/, 'Telefone contém caracteres inválidos')
    .min(8, 'Telefone muito curto')
    .max(20, 'Telefone muito longo')
    .optional()
    .or(z.literal('')),
  
  endereco: z.string()
    .trim()
    .max(500, 'Endereço muito longo (máximo 500 caracteres)')
    .optional()
    .or(z.literal(''))
});

const Clientes = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    email: "",
    endereco: "",
  });

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setFormData({
        nome: cliente.nome,
        telefone: cliente.telefone || "",
        email: cliente.email || "",
        endereco: cliente.endereco || "",
      });
    } else {
      setEditingCliente(null);
      setFormData({
        nome: "",
        telefone: "",
        email: "",
        endereco: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      clienteSchema.parse(formData);
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
        telefone: formData.telefone || null,
        email: formData.email || null,
        endereco: formData.endereco || null,
        created_by: user.id,
      };

      if (editingCliente) {
        const { error } = await supabase
          .from("clientes")
          .update(dataToSave)
          .eq("id", editingCliente.id);

        if (error) throw error;
        toast.success("Cliente atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from("clientes")
          .insert([dataToSave]);

        if (error) throw error;
        toast.success("Cliente cadastrado com sucesso");
      }

      setDialogOpen(false);
      loadClientes();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast.error("Erro ao salvar cliente");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cliente?")) return;

    try {
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Cliente excluído com sucesso");
      loadClientes();
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      toast.error("Erro ao excluir cliente");
    }
  };

  const filteredClientes = clientes.filter((cliente) =>
    cliente.nome.toLowerCase().includes(search.toLowerCase()) ||
    cliente.email?.toLowerCase().includes(search.toLowerCase()) ||
    cliente.telefone?.includes(search)
  );

  return (
    <div className="min-h-screen p-4 pt-6">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <Button
            size="sm"
            className="gradient-primary text-primary-foreground shadow-glow"
            onClick={() => handleOpenDialog()}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-input border-border"
          />
        </div>

        {/* Clientes List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredClientes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </p>
            </div>
          ) : (
            filteredClientes.map((cliente) => (
              <Card
                key={cliente.id}
                className="bg-card border-border/50 hover:border-primary/50 transition-smooth"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-foreground">{cliente.nome}</h3>
                      {cliente.telefone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{cliente.telefone}</span>
                        </div>
                      )}
                      {cliente.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          <span>{cliente.email}</span>
                        </div>
                      )}
                      {cliente.endereco && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{cliente.endereco}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenDialog(cliente)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(cliente.id)}
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
            <DialogTitle style={{ textTransform: 'uppercase' }}>
              {editingCliente ? "Editar Cliente" : "Novo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome" style={{ textTransform: 'uppercase' }}>Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
                placeholder="Nome completo"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone" style={{ textTransform: 'uppercase' }}>Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" style={{ textTransform: 'uppercase' }}>E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endereco" style={{ textTransform: 'uppercase' }}>Endereço</Label>
              <Textarea
                id="endereco"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Endereço completo"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingCliente ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clientes;