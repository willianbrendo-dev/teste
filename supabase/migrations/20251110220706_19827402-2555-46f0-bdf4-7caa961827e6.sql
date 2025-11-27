-- Adicionar policy para admins visualizarem todos os perfis
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Permite que admins vejam todos os perfis
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  -- Permite que super admins vejam todos os perfis
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.is_super_admin = true
  )
  OR
  -- Usuários comuns só veem o próprio perfil
  auth.uid() = id
);