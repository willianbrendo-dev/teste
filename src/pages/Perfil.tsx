import { useState, useEffect } from "react";
import { User as UserIcon, Mail, Shield, LogOut, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

const profileSchema = z.object({
  nome: z.string()
    .trim()
    .min(1, "Nome não pode estar vazio")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, "Nome contém caracteres inválidos")
});

const Perfil = () => {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setNome(profile.nome || "");
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleData) {
        setRole(roleData.role);
      }
    } catch (error) {
      toast.error("Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate input with Zod
      const validationResult = profileSchema.safeParse({ nome });
      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        setSaving(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ nome: validationResult.data.nome })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 rounded-full gradient-primary animate-pulse shadow-glow" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full gradient-primary mx-auto mb-4 flex items-center justify-center shadow-glow">
            <UserIcon className="w-12 h-12 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          {role && (
            <Badge
              variant={role === "admin" ? "default" : "secondary"}
              className={`mt-2 ${role === "admin" ? "gradient-primary border-0 text-primary-foreground" : ""}`}
            >
              {role === "admin" ? (
                <>
                  <Shield className="w-3 h-3 mr-1" />
                  Administrador
                </>
              ) : (
                "Atendente"
              )}
            </Badge>
          )}
        </div>

        {/* Form */}
        <Card className="bg-card border-border/50 p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-foreground">Nome</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="pl-10 bg-muted/50 border-border cursor-not-allowed"
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full gradient-primary text-primary-foreground shadow-glow"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </Card>

        {/* Logout */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da Conta
        </Button>
      </div>
    </div>
  );
};

export default Perfil;