-- Function to auto-create garantia when checklist is created
CREATE OR REPLACE FUNCTION public.auto_create_garantia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert garantia only if it doesn't exist yet
  INSERT INTO public.garantias (ordem_servico_id, created_by, status)
  VALUES (NEW.ordem_servico_id, NEW.created_by, 'aguardando')
  ON CONFLICT (ordem_servico_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create garantia when checklist is inserted
CREATE TRIGGER trigger_auto_create_garantia
AFTER INSERT ON public.checklists
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_garantia();