-- Create a super admin flag in profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;

-- Mark tecnobookdev@gmail.com as super admin
UPDATE public.profiles 
SET is_super_admin = TRUE 
WHERE email = 'tecnobookdev@gmail.com';

-- Create a function to prevent super admin deletion
CREATE OR REPLACE FUNCTION public.prevent_super_admin_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_super_admin = TRUE THEN
    RAISE EXCEPTION 'Cannot delete super admin user';
  END IF;
  RETURN OLD;
END;
$$;

-- Create trigger to prevent super admin deletion
DROP TRIGGER IF EXISTS check_super_admin_deletion ON public.profiles;
CREATE TRIGGER check_super_admin_deletion
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_super_admin_deletion();