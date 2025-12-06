-- Função para sincronizar status do checklist com a O.S.
CREATE OR REPLACE FUNCTION public.sync_checklist_status_on_os_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quando O.S. muda para finalizada ou concluido, marcar checklist como concluido
  IF NEW.status IN ('finalizada', 'concluido') THEN
    UPDATE public.checklists
    SET status = 'concluido', updated_at = now()
    WHERE ordem_servico_id = NEW.id;
  
  -- Quando O.S. está em outros status e data prevista passou, marcar como em_atraso
  ELSIF NEW.data_prevista_entrega IS NOT NULL AND NEW.data_prevista_entrega < CURRENT_DATE THEN
    UPDATE public.checklists
    SET status = 'em_atraso', updated_at = now()
    WHERE ordem_servico_id = NEW.id AND status = 'pendente';
  
  -- Quando O.S. volta para status aberto/em andamento e data não passou, marcar como pendente
  ELSIF NEW.status IN ('aberta', 'em_andamento', 'aguardando_peca', 'aguardando_aprovacao') THEN
    UPDATE public.checklists
    SET status = 'pendente', updated_at = now()
    WHERE ordem_servico_id = NEW.id AND status != 'pendente';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger na tabela ordens_servico
DROP TRIGGER IF EXISTS sync_checklist_status_trigger ON public.ordens_servico;
CREATE TRIGGER sync_checklist_status_trigger
AFTER UPDATE OF status ON public.ordens_servico
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.sync_checklist_status_on_os_update();

-- Atualizar checklists existentes baseado no status atual das O.S.
UPDATE public.checklists c
SET status = 'concluido', updated_at = now()
FROM public.ordens_servico os
WHERE c.ordem_servico_id = os.id
  AND os.status IN ('finalizada', 'concluido')
  AND c.status != 'concluido';

-- Marcar como em_atraso os que estão pendentes e data passou
UPDATE public.checklists c
SET status = 'em_atraso', updated_at = now()
FROM public.ordens_servico os
WHERE c.ordem_servico_id = os.id
  AND os.status NOT IN ('finalizada', 'concluido')
  AND os.data_prevista_entrega < CURRENT_DATE
  AND c.status = 'pendente';