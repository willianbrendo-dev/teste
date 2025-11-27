-- Remover a policy antiga que está conflitando
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- A nova policy "Admins can view all profiles" já inclui a lógica de ver o próprio perfil
-- então não precisamos da antiga