-- Fix profiles SELECT policies to avoid recursion and allow admins to see all
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Admins can view all
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));