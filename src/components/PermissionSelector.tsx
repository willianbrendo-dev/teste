import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Shield, Users, Package, ClipboardList, Tag, DollarSign } from "lucide-react";

interface Module {
  id: string;
  name: string;
  icon: any;
  actions: {
    id: string;
    label: string;
  }[];
}

const MODULES: Module[] = [
  {
    id: "clientes",
    name: "Clientes",
    icon: Users,
    actions: [
      { id: "create", label: "Criar" },
      { id: "read", label: "Visualizar" },
      { id: "update", label: "Editar" },
      { id: "delete", label: "Deletar" },
    ],
  },
  {
    id: "marcas",
    name: "Marcas",
    icon: Tag,
    actions: [
      { id: "create", label: "Criar" },
      { id: "read", label: "Visualizar" },
      { id: "update", label: "Editar" },
      { id: "delete", label: "Deletar" },
    ],
  },
  {
    id: "ordens_servico",
    name: "Ordens de Serviço",
    icon: ClipboardList,
    actions: [
      { id: "create", label: "Criar" },
      { id: "read", label: "Visualizar" },
      { id: "update", label: "Editar" },
      { id: "delete", label: "Deletar" },
    ],
  },
  {
    id: "estoque",
    name: "Estoque",
    icon: Package,
    actions: [
      { id: "create", label: "Criar" },
      { id: "read", label: "Visualizar" },
      { id: "update", label: "Editar" },
      { id: "delete", label: "Deletar" },
    ],
  },
  {
    id: "garantias",
    name: "Garantias",
    icon: Shield,
    actions: [
      { id: "create", label: "Criar" },
      { id: "read", label: "Visualizar" },
      { id: "update", label: "Editar" },
      { id: "delete", label: "Deletar" },
    ],
  },
  {
    id: "checklists",
    name: "Checklists",
    icon: ClipboardList,
    actions: [
      { id: "create", label: "Criar" },
      { id: "read", label: "Visualizar" },
      { id: "update", label: "Editar" },
      { id: "delete", label: "Deletar" },
    ],
  },
  {
    id: "financeiro",
    name: "Financeiro",
    icon: Package,
    actions: [
      { id: "create", label: "Criar Movimentação" },
      { id: "read", label: "Ver Todas Movimentações" },
      { id: "read_own", label: "Ver Próprias Movimentações" },
      { id: "update", label: "Editar" },
      { id: "delete", label: "Deletar" },
    ],
  },
  {
    id: "caixa_diario",
    name: "Caixa Diário",
    icon: Package,
    actions: [
      { id: "open", label: "Abrir Caixa" },
      { id: "close", label: "Fechar Caixa" },
      { id: "read_own", label: "Ver Próprio Caixa" },
    ],
  },
];

interface PermissionSelectorProps {
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
}

const PermissionSelector = ({ selectedPermissions, onChange, disabled }: PermissionSelectorProps) => {
  const [permissions, setPermissions] = useState<Set<string>>(new Set(selectedPermissions));

  useEffect(() => {
    setPermissions(new Set(selectedPermissions));
  }, [selectedPermissions]);

  const togglePermission = (module: string, action: string) => {
    const key = `${module}:${action}`;
    const newPermissions = new Set(permissions);
    
    if (newPermissions.has(key)) {
      newPermissions.delete(key);
    } else {
      newPermissions.add(key);
    }
    
    setPermissions(newPermissions);
    onChange(Array.from(newPermissions));
  };

  const toggleModule = (moduleId: string) => {
    const module = MODULES.find(m => m.id === moduleId);
    if (!module) return;

    const allModulePermissions = module.actions.map(a => `${moduleId}:${a.id}`);
    const allSelected = allModulePermissions.every(p => permissions.has(p));
    
    const newPermissions = new Set(permissions);
    
    if (allSelected) {
      // Desmarcar todos
      allModulePermissions.forEach(p => newPermissions.delete(p));
    } else {
      // Marcar todos
      allModulePermissions.forEach(p => newPermissions.add(p));
    }
    
    setPermissions(newPermissions);
    onChange(Array.from(newPermissions));
  };

  const isModuleFullySelected = (moduleId: string) => {
    const module = MODULES.find(m => m.id === moduleId);
    if (!module) return false;
    return module.actions.every(a => permissions.has(`${moduleId}:${a.id}`));
  };

  const isModulePartiallySelected = (moduleId: string) => {
    const module = MODULES.find(m => m.id === moduleId);
    if (!module) return false;
    const hasAny = module.actions.some(a => permissions.has(`${moduleId}:${a.id}`));
    const hasAll = module.actions.every(a => permissions.has(`${moduleId}:${a.id}`));
    return hasAny && !hasAll;
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
          const fullySelected = isModuleFullySelected(module.id);
          const partiallySelected = isModulePartiallySelected(module.id);

          return (
            <Card key={module.id} className="bg-card border-border/50 p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`module-${module.id}`}
                    checked={fullySelected}
                    onCheckedChange={() => toggleModule(module.id)}
                    disabled={disabled}
                    className={partiallySelected ? "data-[state=checked]:bg-primary/50" : ""}
                  />
                  <Label
                    htmlFor={`module-${module.id}`}
                    className="flex items-center gap-2 font-semibold text-foreground cursor-pointer"
                  >
                    <Icon className="w-4 h-4" />
                    {module.name}
                  </Label>
                </div>

                <div className="pl-9 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {module.actions.map((action) => {
                    const permKey = `${module.id}:${action.id}`;
                    return (
                      <div key={action.id} className="flex items-center gap-2">
                        <Checkbox
                          id={permKey}
                          checked={permissions.has(permKey)}
                          onCheckedChange={() => togglePermission(module.id, action.id)}
                          disabled={disabled}
                        />
                        <Label
                          htmlFor={permKey}
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          {action.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PermissionSelector;
