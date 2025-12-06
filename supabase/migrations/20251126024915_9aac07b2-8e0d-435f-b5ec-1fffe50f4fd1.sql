-- Drop existing policies for checklists
DROP POLICY IF EXISTS "Users with permission can view checklists" ON public.checklists;
DROP POLICY IF EXISTS "Users with permission can insert checklists" ON public.checklists;
DROP POLICY IF EXISTS "Users with permission can update checklists" ON public.checklists;
DROP POLICY IF EXISTS "Users with permission can delete checklists" ON public.checklists;

-- Create new policies for checklists with proper access control
-- Admins can view all checklists, atendentes can only view their own
CREATE POLICY "Admins view all checklists, atendentes view own"
ON public.checklists
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  (has_permission(auth.uid(), 'checklists', 'read') AND created_by = auth.uid())
);

-- Users with permission can insert checklists (will be their own)
CREATE POLICY "Users with permission can insert checklists"
ON public.checklists
FOR INSERT
TO authenticated
WITH CHECK (
  has_permission(auth.uid(), 'checklists', 'create')
);

-- Admins can update all, atendentes can only update their own
CREATE POLICY "Admins update all checklists, atendentes update own"
ON public.checklists
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  (has_permission(auth.uid(), 'checklists', 'update') AND created_by = auth.uid())
);

-- Admins can delete all, atendentes can only delete their own
CREATE POLICY "Admins delete all checklists, atendentes delete own"
ON public.checklists
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  (has_permission(auth.uid(), 'checklists', 'delete') AND created_by = auth.uid())
);

-- Create function to reduce stock when O.S. is completed
CREATE OR REPLACE FUNCTION public.reduzir_estoque_ao_concluir()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only reduce stock when status changes to 'concluido' or 'finalizada'
  IF (NEW.status IN ('concluido', 'finalizada')) AND (OLD.status IS NULL OR OLD.status NOT IN ('concluido', 'finalizada')) THEN
    -- Reduce stock for all parts associated with this ordem
    UPDATE public.pecas_estoque pe
    SET quantidade = quantidade - op.quantidade
    FROM public.ordens_pecas op
    WHERE op.ordem_id = NEW.id
      AND pe.id = op.peca_id
      AND pe.quantidade >= op.quantidade; -- Only reduce if there's enough stock
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on ordens_servico to reduce stock
DROP TRIGGER IF EXISTS trigger_reduzir_estoque ON public.ordens_servico;
CREATE TRIGGER trigger_reduzir_estoque
  AFTER UPDATE ON public.ordens_servico
  FOR EACH ROW
  EXECUTE FUNCTION public.reduzir_estoque_ao_concluir();