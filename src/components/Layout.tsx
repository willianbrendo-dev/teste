import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MobileNav from "./MobileNav";
import { OfflineBanner } from "./OfflineIndicator";
import { PWAInstallPrompt } from "./PWAInstallPrompt";
import { User, Session } from "@supabase/supabase-js";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkUserRole = async (userId: string) => {
      try {
        console.log('[Layout] Verificando roles para usuário:', userId);

        // Pequeno delay para garantir que a sessão esteja estável
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verificar print_bridge primeiro (mais específico)
        const { data: isPrintBridge, error: printBridgeError } = await supabase.rpc('has_role', {
          _user_id: userId,
          _role: 'print_bridge',
        });

        if (!isMounted) return;

        if (printBridgeError) {
          console.error('[Layout] Erro ao verificar role print_bridge:', printBridgeError);
          setUserRole('atendente');
          return;
        }

        console.log('[Layout] isPrintBridge:', isPrintBridge);

        if (isPrintBridge) {
          setUserRole('print_bridge');
          console.log(`[Layout] ✅ PRINT BRIDGE CONFIRMADO - pathname: ${location.pathname}`);

          // CRÍTICO: Garante que print_bridge NUNCA acesse páginas comuns
          if (location.pathname !== '/print-bridge' && location.pathname !== '/login') {
            console.log('[Layout] ⚠️ Print Bridge fora da rota correta! Redirecionando para /print-bridge');
            navigate('/print-bridge', { replace: true });
          }
          return;
        }

        // Verificar admin
        const { data: isAdmin, error: adminError } = await supabase.rpc('has_role', {
          _user_id: userId,
          _role: 'admin',
        });

        if (!isMounted) return;

        if (adminError) {
          console.error('[Layout] Erro ao verificar role admin:', adminError);
          setUserRole('atendente');
          return;
        }

        console.log('[Layout] isAdmin:', isAdmin);

        if (isAdmin) {
          setUserRole('admin');
          console.log(`[Layout] ✅ ADMIN CONFIRMADO - pathname: ${location.pathname}`);

          // CRÍTICO: Admin NUNCA pode acessar /print-bridge
          if (location.pathname === '/print-bridge') {
            console.error('[Layout] ⛔ ACESSO NEGADO - Admin tentou acessar /print-bridge');
            navigate('/', { replace: true });
          }
          return;
        }

        // Atendente (role padrão)
        setUserRole('atendente');
        console.log(`[Layout] ℹ️ ATENDENTE CONFIRMADO - pathname: ${location.pathname}`);

        // CRÍTICO: Atendente NUNCA pode acessar /print-bridge
        if (location.pathname === '/print-bridge') {
          console.error('[Layout] ⛔ ACESSO NEGADO - Atendente tentou acessar /print-bridge');
          navigate('/', { replace: true });
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('[Layout] Erro ao verificar role:', error);
        setUserRole('atendente');
      }
    };

    const handleSessionChange = async (newSession: Session | null) => {
      if (!isMounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await checkUserRole(newSession.user.id);
      } else {
        // Sem sessão, envia sempre para login (exceto se já estiver lá)
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Layout] Auth state changed:', event, 'user:', session?.user?.email);
      // Qualquer mudança de auth deve atualizar a UI e tirar do loading
      handleSessionChange(session);
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        console.log('[Layout] Session loaded:', session?.user?.email);
        handleSessionChange(session ?? null);
      })
      .catch((error) => {
        console.error('[Layout] Erro ao carregar sessão inicial:', error);
        if (isMounted) {
          setLoading(false);
          if (location.pathname !== '/login') {
            navigate('/login', { replace: true });
          }
        }
      });

    // Handle visibility change - refresh session when user returns
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isMounted) {
        console.log('[Layout] Usuário voltou, verificando sessão...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Layout] Erro ao refresh sessão:', error);
          if (location.pathname !== '/login') {
            navigate('/login', { replace: true });
          }
          return;
        }
        
        if (session) {
          await handleSessionChange(session);
        } else if (location.pathname !== '/login') {
          console.warn('[Layout] Sessão expirada, redirecionando...');
          navigate('/login', { replace: true });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic session check every 5 minutes
    const sessionCheckInterval = setInterval(async () => {
      if (!isMounted) return;
      
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        console.warn('[Layout] Verificação periódica: sessão inválida');
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
      }
    }, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(sessionCheckInterval);
    };
  }, [navigate, location.pathname]);

  // Fallback de segurança: nunca ficar preso indefinidamente no loading
  // Exceção: usuários print_bridge não sofrem timeout (precisam manter sessão ativa)
  useEffect(() => {
    if (!loading) return;
    if (userRole === 'print_bridge') return; // Print Bridge nunca sofre timeout

    const timeout = setTimeout(() => {
      console.warn('[Layout] Timeout ao carregar sessão, saindo do loading');
      setLoading(false);

      if (!session && location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    }, 10000); // Aumentado para 10s

    return () => clearTimeout(timeout);
  }, [loading, session, navigate, location.pathname, userRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-dark">
        <div className="w-16 h-16 rounded-full gradient-primary animate-pulse shadow-glow" />
      </div>
    );
  }

  if (!user && location.pathname !== "/login") {
    return null;
  }

  if (location.pathname === "/login") {
    return <>{children}</>;
  }

  // Print bridge users don't get the standard layout
  if (userRole === 'print_bridge') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen gradient-dark pb-20">
      <OfflineBanner />
      {children}
      <MobileNav userRole={userRole} />
      <PWAInstallPrompt />
    </div>
  );
};

export default Layout;