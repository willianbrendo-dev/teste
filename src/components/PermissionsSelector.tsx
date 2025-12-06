import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Shield, Users, Package, Wrench, Tag, ClipboardCheck, FileText, DollarSign, Wallet, TrendingUp, Truck, BarChart3 } from "lucide-react";

interface Permission {
  module: string;
  action: string;
}

interface PermissionsSelectorProps {
  selectedPermissions: Permission[];
  onChange: (permissions: Permission[]) => void;
  disabled?: boolean;
}

const MODULES = [
  {
    id: "clientes",
    name: "Clientes",
    icon: Users,
    actions: [
      { id: "create", name: "Criar" },
      { id: "read", name: "Visualizar" },
      { id: "update", name: "Editar" },
      { id: "delete", name: "Deletar" },
    ],
  },
  {
    id: "marcas",
    name: "Marcas e Modelos",
    icon: Tag,
    actions: [
      { id: "create", name: "Criar" },
      { id: "read", name: "Visualizar" },
      { id: "update", name: "Editar" },
      { id: "delete", name: "Deletar" },
    ],
  },
  {
    id: "ordens_servico",
    name: "Ordens de Serviço",
    icon: Wrench,
    actions: [
      { id: "create", name: "Criar" },
      { id: "read", name: "Visualizar" },
      { id: "update", name: "Editar" },
      { id: "delete", name: "Deletar" },
    ],
  },
  {
    id: "estoque",
    name: "Estoque",
    icon: Package,
    actions: [
      { id: "create", name: "Criar" },
      { id: "read", name: "Visualizar" },
      { id: "update", name: "Editar" },
      { id: "delete", name: "Deletar" },
    ],
  },
  {
    id: "garantias",
    name: "Garantias",
    icon: Shield,
    actions: [
      { id: "create", name: "Criar" },
      { id: "read", name: "Visualizar" },
      { id: "update", name: "Editar" },
      { id: "delete", name: "Deletar" },
    ],
  },
  {
    id: "checklists",
    name: "Checklists",
    icon: ClipboardCheck,
    actions: [
      { id: "create", name: "Criar" },
      { id: "read", name: "Visualizar" },
      { id: "update", name: "Editar" },
      { id: "delete", name: "Deletar" },
    ],
  },
  {
    id: "financeiro",
    name: "Financeiro - Movimentações",
    icon: DollarSign,
    actions: [
      { id: "create", name: "Criar Movimentação" },
      { id: "read", name: "Ver Todas Movimentações" },
      { id: "read_own", name: "Ver Apenas Próprias" },
      { id: "update", name: "Editar" },
      { id: "delete", name: "Deletar" },
    ],
  },
  {
    id: "caixa_diario",
    name: "Caixa Diário",
    icon: Wallet,
    actions: [
      { id: "open", name: "Abrir Caixa" },
      { id: "close", name: "Fechar Caixa" },
      { id: "read_own", name: "Ver Próprio Caixa" },
    ],
  },
  {
    id: "relatorios",
    name: "Relatórios",
    icon: BarChart3,
    actions: [
      { id: "read", name: "Visualizar Relatórios" },
      { id: "export", name: "Exportar PDF" },
    ],
  },
  {
    id: "entregas",
    name: "Entregas",
    icon: Truck,
    actions: [
      { id: "create", name: "Registrar Entrega" },
      { id: "read", name: "Visualizar Entregas" },
      { id: "update", name: "Editar Entrega" },
      { id: "print", name: "Imprimir Garantia" },
    ],
  },
];

const PermissionsSelector = ({
  selectedPermissions,
  onChange,
  disabled = false,
}: PermissionsSelectorProps) => {
  const isChecked = (module: string, action: string) => {
    return selectedPermissions.some(
      (p) => p.module === module && p.action === action
    );
  };

  const togglePermission = (module: string, action: string) => {
    const exists = isChecked(module, action);
    if (exists) {
      onChange(
        selectedPermissions.filter(
          (p) => !(p.module === module && p.action === action)
        )
      );
    } else {
      onChange([...selectedPermissions, { module, action }]);
    }
  };

  const toggleAllModule = (module: string, checked: boolean) => {
    const moduleData = MODULES.find((m) => m.id === module);
    if (!moduleData) return;

    if (checked) {
      const newPermissions = moduleData.actions.map((action) => ({
        module,
        action: action.id,
      }));
      const filtered = selectedPermissions.filter((p) => p.module !== module);
      onChange([...filtered, ...newPermissions]);
    } else {
      onChange(selectedPermissions.filter((p) => p.module !== module));
    }
  };

  const isModuleFullyChecked = (module: string) => {
    const moduleData = MODULES.find((m) => m.id === module);
    if (!moduleData) return false;
    return moduleData.actions.every((action) => isChecked(module, action.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="w-4 h-4" />
        <span>Selecione as permissões para este usuário</span>
      </div>

      <div className="space-y-3">
        {MODULES.map((module) => {
          const Icon = module.icon;
          const fullyChecked = isModuleFullyChecked(module.id);

          return (
            <Card key={module.id} className="bg-card border-border/50 p-4">
              <div className="space-y-3">
                {/* Module Header with "Select All" */}
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-foreground">
                      {module.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`module-${module.id}`}
                      checked={fullyChecked}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        toggleAllModule(module.id, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`module-${module.id}`}
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      Selecionar tudo
                    </Label>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {module.actions.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`${module.id}-${action.id}`}
                        checked={isChecked(module.id, action.id)}
                        disabled={disabled}
                        onCheckedChange={() =>
                          togglePermission(module.id, action.id)
                        }
                      />
                      <Label
                        htmlFor={`${module.id}-${action.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {action.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Importante:</p>
        <p>
          Administradores têm acesso total automaticamente. Estas permissões
          aplicam-se apenas a usuários do tipo Atendente.
        </p>
      </div>
    </div>
  );
};

export default PermissionsSelector;
