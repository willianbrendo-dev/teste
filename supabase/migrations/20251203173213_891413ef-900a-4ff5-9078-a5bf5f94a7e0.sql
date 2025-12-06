-- Atualizar função para incluir "concluida" (com acento diferente)
CREATE OR REPLACE FUNCTION public.sync_checklist_status_on_os_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Quando O.S. muda para finalizada, concluido ou concluida, marcar checklist como concluido
  IF NEW.status IN ('finalizada', 'concluido', 'concluida') THEN
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

-- Atualizar checklists existentes para O.S. com status concluida/concluido/finalizada
UPDATE public.checklists c
SET status = 'concluido', updated_at = now()
FROM public.ordens_servico os
WHERE c.ordem_servico_id = os.id
  AND os.status IN ('finalizada', 'concluido', 'concluida')
  AND c.status != 'concluido';