import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import tecnobookLogo from "@/assets/tecnobook-logo.png";

const emailSchema = z.object({
  email: z.string().email("Email inválido"),
});

const passwordSchema = z.string()
  .min(8, "A senha deve ter no mínimo 8 caracteres")
  .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "A senha deve conter pelo menos um número")
  .regex(/[^A-Za-z0-9]/, "A senha deve conter pelo menos um caractere especial");

const signupSchema = z.object({
  email: z.string().email("Email inválido"),
  password: passwordSchema,
});

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const getUserTargetRoute = async (session: Session | null): Promise<string> => {
    try {
      const userId = session?.user?.id;
      const userEmail = session?.user?.email;
      
      if (!userId) {
        console.log("[Login] Sem userId, redirecionando para /");
        return "/";
      }

      console.log(`[Login] Verificando roles para usuário: ${userEmail} (${userId})`);

      // Verificar print_bridge primeiro
      const { data: isPrintBridge, error: printBridgeError } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "print_bridge",
      });

      if (printBridgeError) {
        console.error("[Login] Erro ao verificar role print_bridge:", printBridgeError);
        toast.error("Erro ao verificar permissões. Contate o administrador.");
        return "/";
      }

      if (isPrintBridge) {
        console.log(`[Login] ✅ PRINT BRIDGE DETECTADO - ${userEmail} → /print-bridge`);
        toast.success("Acesso Print Bridge autorizado", {
          duration: 3000,
          description: `Usuário: ${userEmail}`
        });
        return "/print-bridge";
      }

      // Verificar admin
      const { data: isAdmin, error: adminError } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (adminError) {
        console.error("[Login] Erro ao verificar role admin:", adminError);
      }

      if (isAdmin) {
        console.log(`[Login] ✅ ADMIN DETECTADO - ${userEmail} → /`);
        toast.success("Login realizado como Administrador", {
          duration: 2000,
          description: `Bem-vindo, ${userEmail}`
        });
        return "/";
      }

      // Atendente ou usuário padrão
      console.log(`[Login] ℹ️ ATENDENTE - ${userEmail} → /`);
      toast.success("Login realizado com sucesso", {
        duration: 2000,
        description: `Bem-vindo, ${userEmail}`
      });
      return "/";
    } catch (error) {
      console.error("[Login] Erro inesperado ao obter rota alvo:", error);
      toast.error("Erro inesperado ao fazer login");
      return "/";
    }
  };

  useEffect(() => {
    const navigateWithSession = async (session: Session | null) => {
      const target = await getUserTargetRoute(session);
      navigate(target);
    };

    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigateWithSession(session);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
        return;
      }
      if (session) {
        // Evita chamadas Supabase diretas dentro do callback usando setTimeout
        setTimeout(() => {
          navigateWithSession(session);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email for both login and signup
    try {
      emailSchema.parse({ email });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    // Validate password strength only for signup
    if (isSignUp) {
      try {
        signupSchema.parse({ email, password });
      } catch (err) {
        if (err instanceof z.ZodError) {
          toast.error(err.errors[0].message);
          return;
        }
      }
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Este email já está cadastrado");
          } else {
            toast.error("Erro ao criar conta");
          }
          return;
        }

        toast.success("Conta criada com sucesso! Você já pode fazer login.");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("[Login] Erro no login:", error.message);
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email ou senha incorretos. Verifique suas credenciais.", {
              duration: 4000,
              description: "Se ainda não tem conta, clique em 'Criar nova conta'"
            });
          } else {
            toast.error("Erro ao fazer login: " + error.message);
          }
          return;
        }

        console.log(`[Login] ✅ Login bem-sucedido para: ${email}`);
      }
    } catch (error) {
      toast.error("Erro inesperado");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      z.string().email("Email inválido").parse(email);
    } catch {
      toast.error("Informe um email válido");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (error) {
      if (error.message.includes("429") || error.message.includes("rate limit")) {
        toast.error("Aguarde alguns segundos antes de solicitar novamente");
      } else {
        toast.error("Erro ao enviar email de redefinição");
      }
      return;
    }
    toast.success("Enviamos um link de redefinição para seu email");
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password strength
    try {
      passwordSchema.parse(newPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível atualizar a senha");
      return;
    }
    toast.success("Senha atualizada! Entrando...");

    const { data: { session } } = await supabase.auth.getSession();
    const target = await getUserTargetRoute(session ?? null);
    navigate(target);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-dark">
      <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto">
            <img 
              src={tecnobookLogo} 
              alt="Tecnobook" 
              className="h-24 w-auto mx-auto"
            />
          </div>
          <CardDescription className="text-muted-foreground">
            {isPasswordRecovery ? "Definir nova senha" : isSignUp ? "Criar nova conta" : "Sistema de Gestão de Ordens de Serviço"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isPasswordRecovery ? handleUpdatePassword : handleSubmit} className="space-y-4">
            {!isPasswordRecovery ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-input border-border text-foreground placeholder:text-muted-foreground"
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground pr-10"
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-foreground">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground pr-10"
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      disabled={loading}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-foreground">Confirmar senha</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-input border-border text-foreground placeholder:text-muted-foreground pr-10"
                      disabled={loading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
            <Button
              type="submit"
              className="w-full gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-smooth shadow-glow"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isPasswordRecovery ? "Atualizando..." : isSignUp ? "Criando conta..." : "Entrando..."}
                </>
              ) : (
                isPasswordRecovery ? "Definir nova senha" : isSignUp ? "Criar Conta" : "Entrar"
              )}
            </Button>
            
            {!isPasswordRecovery ? (
              <div className="text-center space-x-2">
                <Button
                  type="button"
                  variant="link"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setIsSignUp(!isSignUp)}
                  disabled={loading}
                >
                  {isSignUp ? "Já tem uma conta? Entrar" : "Criar nova conta"}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={handleReset}
                  disabled={loading}
                >
                  Esqueci minha senha
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setIsPasswordRecovery(false)}
                  disabled={loading}
                >
                  Voltar ao login
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;