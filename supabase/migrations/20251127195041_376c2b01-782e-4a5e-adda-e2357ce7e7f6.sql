-- Ajusta política RLS para permitir atendentes verem checklists de suas próprias O.S.
DROP POLICY IF EXISTS "Admins view all checklists, atendentes view own" ON public.checklists;

-- Nova política: Admins veem todos, atendentes veem checklists de suas próprias O.S.
CREATE POLICY "Admins view all checklists, atendentes view from own OS"
  ON public.checklists
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR 
    (
      has_permission(auth.uid(), 'checklists'::text, 'read'::text)
      AND EXISTS (
        SELECT 1 FROM public.ordens_servico
        WHERE ordens_servico.id = checklists.ordem_servico_id
        AND ordens_servico.created_by = auth.uid()
      )
    )
  );