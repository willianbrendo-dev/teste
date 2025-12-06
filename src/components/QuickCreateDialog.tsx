import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

interface QuickCreateClienteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (id: string) => void;
}

export function QuickCreateCliente({ open, onOpenChange, onSuccess }: QuickCreateClienteProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    apelido: "",
    telefone: "",
    cpf: "",
    endereco: "",
    bairro: "",
    email: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("clientes")
        .insert([{
          nome: formData.nome.trim(),
          apelido: formData.apelido.trim() || null,
          telefone: formData.telefone.trim() || null,
          cpf: formData.cpf.trim() || null,
          endereco: formData.endereco.trim() || null,
          bairro: formData.bairro.trim() || null,
          email: formData.email.trim() || null,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Cliente cadastrado com sucesso!");
      onSuccess(data.id);
      setFormData({ nome: "", apelido: "", telefone: "", cpf: "", endereco: "", bairro: "", email: "" });
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao cadastrar cliente");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ textTransform: 'uppercase' }}>Cadastro Rápido de Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label style={{ textTransform: 'uppercase' }}>Nome Completo *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
              placeholder="Nome do cliente"
              style={{ textTransform: 'uppercase' }}
              required
            />
          </div>
          
          <div>
            <Label style={{ textTransform: 'uppercase' }}>Apelido</Label>
            <Input
              value={formData.apelido}
              onChange={(e) => setFormData({ ...formData, apelido: e.target.value.toUpperCase() })}
              placeholder="Como prefere ser chamado"
              style={{ textTransform: 'uppercase' }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label style={{ textTransform: 'uppercase' }}>CPF</Label>
              <Input
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <Label style={{ textTransform: 'uppercase' }}>Telefone</Label>
              <Input
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div>
            <Label style={{ textTransform: 'uppercase' }}>Endereço</Label>
            <Input
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              placeholder="Rua, número"
            />
          </div>

          <div>
            <Label style={{ textTransform: 'uppercase' }}>Bairro</Label>
            <Input
              value={formData.bairro}
              onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
              placeholder="Bairro"
            />
          </div>

          <div>
            <Label style={{ textTransform: 'uppercase' }}>E-mail</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@exemplo.com"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface QuickCreateMarcaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (id: string) => void;
}

export function QuickCreateMarca({ open, onOpenChange, onSuccess }: QuickCreateMarcaProps) {
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast.error("Nome da marca é obrigatório");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("marcas")
        .insert([{
          nome: nome.trim(),
          created_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Marca cadastrada com sucesso!");
      onSuccess(data.id);
      setNome("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao cadastrar marca");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ textTransform: 'uppercase' }}>Cadastro Rápido de Marca</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label style={{ textTransform: 'uppercase' }}>Nome da Marca *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value.toUpperCase())}
              placeholder="Ex: Samsung, Apple, Motorola"
              style={{ textTransform: 'uppercase' }}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface QuickCreateModeloProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  marcaId: string;
  onSuccess: (id: string) => void;
}

export function QuickCreateModelo({ open, onOpenChange, marcaId, onSuccess }: QuickCreateModeloProps) {
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) {
      toast.error("Nome do modelo é obrigatório");
      return;
    }

    if (!marcaId) {
      toast.error("Selecione uma marca primeiro");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("modelos")
        .insert([{
          nome: nome.trim(),
          marca_id: marcaId,
          created_by: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Modelo cadastrado com sucesso!");
      onSuccess(data.id);
      setNome("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao cadastrar modelo");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle style={{ textTransform: 'uppercase' }}>Cadastro Rápido de Modelo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label style={{ textTransform: 'uppercase' }}>Nome do Modelo *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value.toUpperCase())}
              placeholder="Ex: Galaxy S21, iPhone 12"
              style={{ textTransform: 'uppercase' }}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !marcaId}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
