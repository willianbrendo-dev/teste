-- Ensure super admin passes admin checks and backfill role if missing
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- A user has the requested role if:
  -- 1) There is a matching row in user_roles, OR
  -- 2) The requested role is 'admin' and the user is marked as super admin in profiles
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role
  )
  OR (
    _role = 'admin'::app_role AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _user_id AND p.is_super_admin = true
    )
  );
$$;

-- One-time backfill: ensure super admin(s) have an 'admin' role row
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur
  ON ur.user_id = p.id AND ur.role = 'admin'
WHERE p.is_super_admin = true
  AND ur.id IS NULL;
