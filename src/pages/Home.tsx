import { FileText, ClipboardCheck, DollarSign, Printer, LogOut, Package, Box, Tag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Home = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/login");
  };

  const shortcuts = [
    {
      icon: FileText,
      label: "Ordens de Serviço",
      description: "Gerenciar ordens",
      color: "from-primary to-orange-600",
      onClick: () => navigate("/ordens-servico"),
    },
    {
      icon: Package,
      label: "Entregas",
      description: "Gerenciar entregas",
      color: "from-primary to-orange-600",
      onClick: () => navigate("/entregas"),
    },
    {
      icon: DollarSign,
      label: "Caixa",
      description: "Gerenciar caixa",
      color: "from-primary to-orange-600",
      onClick: () => navigate("/financeiro"),
    },
    {
      icon: Tag,
      label: "Modelos",
      description: "Cadastrar modelos",
      color: "from-primary to-orange-600",
      onClick: () => navigate("/modelos"),
    },
    {
      icon: Package,
      label: "Marcas",
      description: "Gerenciar marcas",
      color: "from-primary to-orange-600",
      onClick: () => navigate("/marcas"),
    },
    {
      icon: Box,
      label: "Estoque",
      description: "Gerenciar peças",
      color: "from-primary to-orange-600",
      onClick: () => navigate("/estoque"),
    },
    {
      icon: Users,
      label: "Clientes",
      description: "Gerenciar clientes",
      color: "from-primary to-orange-600",
      onClick: () => navigate("/clientes"),
    },
    {
      icon: Printer,
      label: "Impressora",
      description: "Conectar e testar",
      color: "from-primary to-orange-600",
      onClick: () => navigate("/impressora"),
    },
  ];

  return (
    <div className="min-h-screen p-4 pt-6">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">OrderSistem</h1>
            <p className="text-sm text-muted-foreground mt-1">Gestão de Ordens</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleLogout}
            className="border-border hover:bg-destructive hover:text-destructive-foreground transition-smooth touch-manipulation"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 gap-4">
          {shortcuts.map((shortcut) => (
            <Card
              key={shortcut.label}
              className="bg-card border-border/50 hover:border-primary/50 transition-smooth cursor-pointer group min-h-[120px] touch-manipulation"
              onClick={shortcut.onClick}
            >
              <div className="p-6 space-y-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${shortcut.color} flex items-center justify-center shadow-glow group-hover:scale-110 transition-smooth`}>
                  <shortcut.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{shortcut.label}</h3>
                  <p className="text-xs text-muted-foreground">{shortcut.description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;