-- Add status column to checklists table
CREATE TYPE checklist_status AS ENUM ('pendente', 'concluido', 'cancelado', 'em_atraso');

ALTER TABLE public.checklists 
ADD COLUMN status checklist_status NOT NULL DEFAULT 'pendente';

-- Add index for better performance
CREATE INDEX idx_checklists_status ON public.checklists(status);

-- Update trigger to check delivery date and set status to em_atraso
CREATE OR REPLACE FUNCTION check_checklist_atraso()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.checklists c
  SET status = 'em_atraso'
  FROM public.ordens_servico os
  WHERE c.ordem_servico_id = os.id
    AND c.status = 'pendente'
    AND os.data_prevista_entrega < CURRENT_DATE;
END;
$$;

-- Modify auto_create_garantia trigger to only create when status is 'concluido'
DROP TRIGGER IF EXISTS trigger_auto_create_garantia ON public.checklists;

CREATE OR REPLACE FUNCTION auto_create_garantia_on_concluido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create garantia when status changes to 'concluido'
  IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status != 'concluido') THEN
    INSERT INTO public.garantias (ordem_servico_id, created_by, status)
    VALUES (NEW.ordem_servico_id, NEW.created_by, 'aguardando')
    ON CONFLICT (ordem_servico_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_create_garantia_on_concluido
AFTER INSERT OR UPDATE ON public.checklists
FOR EACH ROW
EXECUTE FUNCTION auto_create_garantia_on_concluido();