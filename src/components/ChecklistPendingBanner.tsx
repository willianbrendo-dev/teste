import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChecklistPendingBannerProps {
  ordemServicoId: string;
}

export function ChecklistPendingBanner({ ordemServicoId }: ChecklistPendingBannerProps) {
  const [hasChecklist, setHasChecklist] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!ordemServicoId) {
      setHasChecklist(null);
      return;
    }

    checkForChecklist();

    // Subscribe to realtime changes for this ordem_servico
    const channel = supabase
      .channel(`checklist-${ordemServicoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checklists',
          filter: `ordem_servico_id=eq.${ordemServicoId}`
        },
        () => {
          checkForChecklist();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ordemServicoId]);

  const checkForChecklist = async () => {
    if (!ordemServicoId) return;

    const { data, error } = await supabase
      .from("checklists")
      .select("id")
      .eq("ordem_servico_id", ordemServicoId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao verificar checklist:", error);
      return;
    }

    setHasChecklist(!!data);
  };

  const handleCreateChecklist = () => {
    // Close current dialog and navigate to checklists tab
    navigate(`/ordens-servico?tab=checklists&ordem=${ordemServicoId}`);
  };

  if (hasChecklist === null || hasChecklist === true) {
    return null;
  }

  return (
    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
      <AlertCircle className="h-5 w-5 text-orange-600" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-orange-900 dark:text-orange-100">
            Checklist Pendente
          </p>
          <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
            Esta ordem de serviço ainda não possui um checklist. Complete o checklist para documentar o estado do aparelho.
          </p>
        </div>
        <Button
          onClick={handleCreateChecklist}
          className="bg-orange-600 hover:bg-orange-700 text-white shrink-0"
        >
          <ClipboardCheck className="w-4 h-4 mr-2" />
          Criar Checklist
        </Button>
      </AlertDescription>
    </Alert>
  );
}
