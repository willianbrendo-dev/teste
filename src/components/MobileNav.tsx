import { Home, Users, Package, User, Settings, Box, ShieldCheck, FileBarChart } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OfflineIndicator } from "./OfflineIndicator";

interface MobileNavProps {
  userRole?: string | null;
}

const MobileNav = ({ userRole }: MobileNavProps) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Don't render navigation for print_bridge users
  if (userRole === 'print_bridge') {
    return null;
  }

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });
        if (!error && data) {
          setIsAdmin(true);
        }
      }
      setLoading(false);
    };
    checkAdmin();
  }, []);

  const navItems = [
    { icon: Home, label: "Início", path: "/", show: true },
    { icon: Users, label: "Usuários", path: "/usuarios", show: isAdmin },
    { icon: ShieldCheck, label: "Garantias", path: "/garantias", show: true },
    { icon: FileBarChart, label: "Relatórios", path: "/relatorios", show: isAdmin },
    { icon: User, label: "Perfil", path: "/perfil", show: true },
  ].filter(item => item.show);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around items-center min-h-[64px] px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-smooth flex-1 max-w-[80px] min-h-[56px] min-w-[56px]"
            activeClassName="text-primary"
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn(
                  "w-6 h-6 transition-smooth",
                  isActive && "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]"
                )} />
                <span className={cn(
                  "text-[11px] font-medium transition-smooth",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
        <div className="flex flex-col items-center justify-center px-2">
          <OfflineIndicator />
        </div>
      </div>
    </nav>
  );
};

export default MobileNav;