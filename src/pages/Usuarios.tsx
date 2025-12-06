import { useState, useEffect } from "react";
import { Plus, Search, Shield, User as UserIcon, Settings, Pencil, Trash2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { ComboboxSelect } from "@/components/ui/combobox-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import PermissionsSelector from "@/components/PermissionsSelector";

interface UserProfile {
  id: string;
  email: string;
  nome?: string;
  role?: string;
  is_super_admin?: boolean;
}

interface Permission {
  module: string;
  action: string;
}

const novoUsuarioSchema = z.object({
  nome: z.string().trim().min(3, "Nome deve ter no mínimo 3 caracteres").max(100, "Nome muito longo"),
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
  senha: z.string()
    .min(8, "Senha deve ter no mínimo 8 caracteres")
    .max(100, "Senha muito longa")
    .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Senha deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "Senha deve conter pelo menos um caractere especial"),
  role: z.enum(["admin", "atendente", "print_bridge"], { required_error: "Selecione uma role" }),
});

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    role: "" as "admin" | "atendente" | "print_bridge" | "",
  });
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    refreshAndCheck();
  }, []);

  const refreshAndCheck = async () => {
    try {
      await supabase.auth.refreshSession();
    } catch {}
    await checkAdminAndLoadUsers();
  };

  const checkAdminAndLoadUsers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // 1) Check if user is admin
      const { data: hasAdmin, error: adminErr } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (adminErr) {
        console.error('Admin check error:', adminErr);
        toast.error('Erro ao verificar permissões: ' + adminErr.message);
        setLoading(false);
        return;
      }

      const isUserAdmin = !!hasAdmin;
      setIsAdmin(isUserAdmin);

      if (!isUserAdmin) {
        toast.error("Acesso negado: apenas administradores podem gerenciar usuários");
        setLoading(false);
        return;
      }

      // 2) Load all profiles (admin can see all)
      const { data: profiles, error: profilesErr } = await supabase
        .from("profiles")
        .select("id, email, nome, is_super_admin, created_at, updated_at")
        .order("email", { ascending: true });

      if (profilesErr) {
        console.error('Profiles load error:', profilesErr);
        toast.error('Erro ao carregar usuários: ' + profilesErr.message);
        setLoading(false);
        return;
      }

      if (profiles) {
        const usersWithRoles = await Promise.all(
          profiles.map(async (profile) => {
            // Check all possible roles
            const { data: isAdminRole } = await supabase.rpc('has_role', {
              _user_id: profile.id,
              _role: 'admin',
            });
            
            const { data: isPrintBridgeRole } = await supabase.rpc('has_role', {
              _user_id: profile.id,
              _role: 'print_bridge',
            });

            let role = 'atendente';
            if (isAdminRole) role = 'admin';
            else if (isPrintBridgeRole) role = 'print_bridge';

            return {
              ...profile,
              role,
            } as UserProfile;
          })
        );
        setUsuarios(usersWithRoles);
      }
    } catch (error) {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({ nome: "", email: "", senha: "", role: "" });
    setSelectedPermissions([]);
    setEditingUserId(null);
    setErrors({});
    setDialogOpen(true);
  };

  const handleEditUser = async (user: UserProfile) => {
    setEditingUserId(user.id);
    setFormData({
      nome: user.nome || "",
      email: user.email,
      senha: "",
      role: user.role as "admin" | "atendente" | "print_bridge" | "",
    });
    
    // Super admin pode ter senha editada
    if (user.is_super_admin) {
      // Allow password editing for super admin
    }

    // Load existing permissions if atendente
    if (user.role === "atendente") {
      const { data: permissions } = await supabase
        .from("user_permissions")
        .select("module, action")
        .eq("user_id", user.id);

      if (permissions) {
        setSelectedPermissions(permissions);
      } else {
        setSelectedPermissions([]);
      }
    } else {
      setSelectedPermissions([]);
    }

    setErrors({});
    setDialogOpen(true);
  };

  const handleOpenDeleteDialog = (user: UserProfile) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setDeleting(true);

      // Call edge function to delete user completely from auth.users
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id }
      });

      if (error) {
        console.error("Error calling delete-user function:", error);
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || "Falha ao excluir usuário");
      }

      toast.success("Usuário excluído completamente do sistema!");
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      
      // Refresh the user list
      await checkAdminAndLoadUsers();
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error);
      toast.error(error.message || "Erro ao excluir usuário");
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenPermissionsDialog = async (userId: string) => {
    setEditingUserId(userId);
    setLoading(true);
    
    // Load existing permissions
    const { data: permissions } = await supabase
      .from("user_permissions")
      .select("module, action")
      .eq("user_id", userId);

    if (permissions) {
      setSelectedPermissions(permissions);
    } else {
      setSelectedPermissions([]);
    }
    
    setLoading(false);
    setPermissionsDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!editingUserId) return;

    try {
      setSaving(true);

      // Delete all existing permissions for this user
      await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", editingUserId);

      // Insert new permissions
      if (selectedPermissions.length > 0) {
        const permissionsToInsert = selectedPermissions.map((p) => ({
          user_id: editingUserId,
          module: p.module,
          action: p.action,
        }));

        const { error } = await supabase
          .from("user_permissions")
          .insert(permissionsToInsert);

        if (error) throw error;
      }

      toast.success("Permissões atualizadas com sucesso!");
      setPermissionsDialogOpen(false);
      checkAdminAndLoadUsers();
    } catch (error: any) {
      console.error("Erro ao salvar permissões:", error);
      toast.error(error.message || "Erro ao salvar permissões");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});

      if (editingUserId) {
        // Get user info to check if super admin
        const userToEdit = usuarios.find(u => u.id === editingUserId);
        
        // Editando usuário existente - apenas nome e senha
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            nome: formData.nome,
          })
          .eq("id", editingUserId);

        if (profileError) throw profileError;

        // Update password if provided (only for super admin)
        if (formData.senha && userToEdit?.is_super_admin) {
          // Validate password strength
          const passwordSchema = z.string()
            .min(8, "Senha deve ter no mínimo 8 caracteres")
            .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
            .regex(/[a-z]/, "Senha deve conter pelo menos uma letra minúscula")
            .regex(/[0-9]/, "Senha deve conter pelo menos um número")
            .regex(/[^A-Za-z0-9]/, "Senha deve conter pelo menos um caractere especial");
          
          try {
            passwordSchema.parse(formData.senha);
          } catch (err) {
            if (err instanceof z.ZodError) {
              toast.error(err.errors[0].message);
              setSaving(false);
              return;
            }
          }
          // Check if we're editing our own profile
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          
          if (currentUser && currentUser.id === editingUserId) {
            const { error: passwordError } = await supabase.auth.updateUser({
              password: formData.senha
            });
            
            if (passwordError) {
              toast.error("Erro ao atualizar senha: " + passwordError.message);
            }
          }
        }

        toast.success("Usuário atualizado com sucesso!");
        setDialogOpen(false);
        setEditingUserId(null);
        checkAdminAndLoadUsers();
        return;
      }

      // Criar novo usuário
      const validated = novoUsuarioSchema.parse(formData);

      console.log('[Usuarios] Chamando create-user edge function...');
      
      // Get current session for proper auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      // Criar usuário via edge function (não faz logout do admin)
      const { data, error: functionError } = await supabase.functions.invoke('create-user', {
        body: {
          email: validated.email,
          password: validated.senha,
          nome: validated.nome,
          role: validated.role,
        }
      });

      console.log('[Usuarios] Resposta da função:', { data, error: functionError });

      if (functionError) {
        console.error('[Usuarios] Function error:', functionError);
        toast.error("Erro ao criar usuário: " + functionError.message);
        return;
      }

      if (!data?.success) {
        const errorMsg = data?.error || "Falha ao criar usuário";
        console.error('[Usuarios] Erro retornado:', errorMsg);
        
        // Tratar erro de usuário já registrado
        if (errorMsg.includes("já está cadastrado") || errorMsg.includes("already registered") || errorMsg.includes("User already registered")) {
          setErrors({ email: "Este email já está cadastrado no sistema" });
          toast.error("Email já cadastrado. Use outro email.");
          return;
        }
        
        toast.error(errorMsg);
        return;
      }

      const newUserId = data.user.id;
      console.log('[Usuarios] Usuário criado com sucesso:', newUserId);

      // If atendente, save permissions
      if (validated.role === "atendente" && selectedPermissions.length > 0) {
        const permissionsToInsert = selectedPermissions.map((p) => ({
          user_id: newUserId,
          module: p.module,
          action: p.action,
        }));

        const { error: permError } = await supabase
          .from("user_permissions")
          .insert(permissionsToInsert);

        if (permError) throw permError;
      }

      toast.success(`Usuário criado com sucesso como ${validated.role}!`);
      setDialogOpen(false);
      checkAdminAndLoadUsers();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error("Erro ao salvar usuário:", error);
        toast.error(error.message || "Erro ao salvar usuário");
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredUsuarios = usuarios.filter((usuario) =>
    usuario.email.toLowerCase().includes(search.toLowerCase()) ||
    usuario.nome?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAdmin && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="bg-card border-border/50 p-8 text-center max-w-md">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground mb-4">
            Apenas administradores podem acessar esta página.
          </p>
          <Button
            onClick={() => {
              setLoading(true);
              refreshAndCheck();
            }}
            variant="outline"
          >
            Verificar Permissões Novamente
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pt-6">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <Button
            size="sm"
            className="gradient-primary text-primary-foreground shadow-glow"
            onClick={handleOpenDialog}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-input border-border"
          />
        </div>

        {/* Usuarios List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredUsuarios.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {search ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
              </p>
            </div>
          ) : (
            filteredUsuarios.map((usuario) => (
              <Card
                key={usuario.id}
                className="bg-card border-border/50 hover:border-primary/50 transition-smooth"
              >
                <div className="p-4 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <UserIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {usuario.nome || "Sem nome"}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">{usuario.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {usuario.is_super_admin && (
                        <Badge
                          variant="default"
                          className="gradient-primary border-0 text-primary-foreground shadow-glow whitespace-nowrap"
                        >
                          <Shield className="w-3 h-3 mr-1 fill-current" />
                          SUPER ADMIN
                        </Badge>
                      )}
                      <Badge
                        variant={usuario.role === "admin" ? "default" : usuario.role === "print_bridge" ? "outline" : "secondary"}
                        className={
                          usuario.role === "admin" && !usuario.is_super_admin 
                            ? "gradient-primary border-0 text-primary-foreground whitespace-nowrap" 
                            : usuario.role === "print_bridge"
                            ? "border-purple-500 text-purple-600 dark:text-purple-400 whitespace-nowrap"
                            : "whitespace-nowrap"
                        }
                      >
                        {usuario.role === "admin" ? (
                          <>
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </>
                        ) : usuario.role === "print_bridge" ? (
                          <>
                            <Printer className="w-3 h-3 mr-1" />
                            Print Bridge
                          </>
                        ) : (
                          usuario.role || "sem role"
                        )}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {usuario.role === "atendente" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => handleOpenPermissionsDialog(usuario.id)}
                        title="Gerenciar permissões"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEditUser(usuario)}
                      title="Editar usuário"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {!usuario.is_super_admin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleOpenDeleteDialog(usuario)}
                        title="Excluir usuário"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Dialog Novo/Editar Usuário */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {editingUserId ? "Editar Usuário" : "Novo Usuário"}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
              <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-foreground">Nome *</Label>
                <Input
                  id="nome"
                  placeholder="Nome completo"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="bg-input border-border"
                />
                {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-input border-border"
                  disabled={!!editingUserId}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                {editingUserId && (
                  <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
                )}
              </div>

              {(!editingUserId || (editingUserId && usuarios.find(u => u.id === editingUserId)?.is_super_admin)) && (
                <div className="space-y-2">
                  <Label htmlFor="senha" className="text-foreground">
                    {editingUserId ? "Nova Senha (opcional)" : "Senha *"}
                  </Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder={editingUserId ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    className="bg-input border-border"
                  />
                  {errors.senha && <p className="text-sm text-destructive">{errors.senha}</p>}
                  {editingUserId && (
                    <p className="text-xs text-muted-foreground">Deixe em branco para manter a senha atual</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="role" className="text-foreground">Tipo de Usuário *</Label>
                <ComboboxSelect
                  value={formData.role}
                  onValueChange={(value: "admin" | "atendente" | "print_bridge") => setFormData({ ...formData, role: value })}
                  options={[
                    { value: "admin", label: "Administrador - Acesso total ao sistema" },
                    { value: "atendente", label: "Atendente - Permissões personalizadas" },
                    { value: "print_bridge", label: "Print Bridge - Apenas impressão OTG" }
                  ]}
                  placeholder="Selecione o tipo"
                  disabled={!!editingUserId}
                  allowCustom={false}
                  className="bg-input border-border"
                />
                {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
                {editingUserId && (
                  <p className="text-xs text-muted-foreground">O tipo de usuário não pode ser alterado durante a edição</p>
                )}
              </div>

              {formData.role === "atendente" && !editingUserId && (
                <div className="space-y-2">
                  <Label className="text-foreground">Permissões do Atendente</Label>
                  <PermissionsSelector
                    selectedPermissions={selectedPermissions}
                    onChange={setSelectedPermissions}
                    disabled={saving}
                  />
                </div>
              )}

              {formData.role === "admin" && !editingUserId && (
                <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                  <p className="font-semibold text-foreground">Permissões do Administrador:</p>
                  <p className="text-muted-foreground">
                    Administradores têm acesso total a todos os módulos e ações do sistema, incluindo gerenciamento de usuários.
                  </p>
                </div>
              )}
            </div>
            </ScrollArea>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gradient-primary text-primary-foreground"
              >
                {saving ? (editingUserId ? "Salvando..." : "Criando...") : (editingUserId ? "Salvar Alterações" : "Criar Usuário")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Gerenciar Permissões */}
        <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-foreground">Gerenciar Permissões</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
              <div className="py-4">
                <PermissionsSelector
                  selectedPermissions={selectedPermissions}
                  onChange={setSelectedPermissions}
                  disabled={saving}
                />
              </div>
            </ScrollArea>
            <div className="flex gap-2 justify-end pt-4 border-t border-border/50">
              <Button
                variant="outline"
                onClick={() => setPermissionsDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSavePermissions}
                disabled={saving}
                className="gradient-primary text-primary-foreground"
              >
                {saving ? "Salvando..." : "Salvar Permissões"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Alert Dialog Excluir Usuário */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Tem certeza que deseja excluir o usuário <strong>{userToDelete?.nome || userToDelete?.email}</strong>?
                <br />
                <br />
                Esta ação não pode ser desfeita e todos os dados do usuário serão permanentemente removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Usuarios;
