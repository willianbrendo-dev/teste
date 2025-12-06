-- Drop existing policies for ordens_servico
DROP POLICY IF EXISTS "Users with permission can view ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Users with permission can insert ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Users with permission can update ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Users with permission can delete ordens" ON public.ordens_servico;

-- Create new policies with proper access control
-- Admins can view all orders, atendentes can only view their own
CREATE POLICY "Admins view all ordens, atendentes view own"
ON public.ordens_servico
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  (has_permission(auth.uid(), 'ordens_servico', 'read') AND created_by = auth.uid())
);

-- Admins can insert, atendentes can insert (will be their own)
CREATE POLICY "Users with permission can insert ordens"
ON public.ordens_servico
FOR INSERT
TO authenticated
WITH CHECK (
  has_permission(auth.uid(), 'ordens_servico', 'create')
);

-- Admins can update all, atendentes can only update their own
CREATE POLICY "Admins update all ordens, atendentes update own"
ON public.ordens_servico
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  (has_permission(auth.uid(), 'ordens_servico', 'update') AND created_by = auth.uid())
);

-- Admins can delete all, atendentes can only delete their own
CREATE POLICY "Admins delete all ordens, atendentes delete own"
ON public.ordens_servico
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  (has_permission(auth.uid(), 'ordens_servico', 'delete') AND created_by = auth.uid())
);