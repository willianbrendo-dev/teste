-- Function to prevent super admin role deletion/modification
CREATE OR REPLACE FUNCTION public.protect_super_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_super_admin boolean;
BEGIN
  -- Check if the user is a super admin
  SELECT p.is_super_admin INTO is_super_admin
  FROM public.profiles p
  WHERE p.id = COALESCE(OLD.user_id, NEW.user_id);

  -- Prevent deletion of super admin role
  IF (TG_OP = 'DELETE') THEN
    IF is_super_admin AND OLD.role = 'admin' THEN
      RAISE EXCEPTION 'Cannot delete admin role from super admin user';
    END IF;
    RETURN OLD;
  END IF;

  -- Prevent modification of super admin role
  IF (TG_OP = 'UPDATE') THEN
    IF is_super_admin AND OLD.role = 'admin' AND NEW.role != 'admin' THEN
      RAISE EXCEPTION 'Cannot change super admin role';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to prevent deletion of last admin
CREATE OR REPLACE FUNCTION public.prevent_last_admin_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  -- Only check if deleting an admin role
  IF OLD.role = 'admin' THEN
    -- Count remaining admins (excluding the one being deleted)
    SELECT COUNT(*) INTO admin_count
    FROM public.user_roles
    WHERE role = 'admin' AND user_id != OLD.user_id;

    -- If this is the last admin, prevent deletion
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last admin user. At least one admin must exist in the system.';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

-- Create trigger to protect super admin role from deletion/modification
DROP TRIGGER IF EXISTS protect_super_admin_role_trigger ON public.user_roles;
CREATE TRIGGER protect_super_admin_role_trigger
  BEFORE DELETE OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_super_admin_role();

-- Create trigger to prevent deletion of last admin
DROP TRIGGER IF EXISTS prevent_last_admin_deletion_trigger ON public.user_roles;
CREATE TRIGGER prevent_last_admin_deletion_trigger
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_last_admin_deletion();

-- Also protect super admin user_id in user_roles from being changed
CREATE OR REPLACE FUNCTION public.prevent_super_admin_user_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_super_admin boolean;
BEGIN
  -- Check if the old user_id belongs to a super admin
  SELECT p.is_super_admin INTO is_super_admin
  FROM public.profiles p
  WHERE p.id = OLD.user_id;

  IF is_super_admin AND OLD.user_id != NEW.user_id THEN
    RAISE EXCEPTION 'Cannot change user_id for super admin role assignment';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to prevent super admin user_id changes
DROP TRIGGER IF EXISTS prevent_super_admin_user_id_change_trigger ON public.user_roles;
CREATE TRIGGER prevent_super_admin_user_id_change_trigger
  BEFORE UPDATE OF user_id ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_super_admin_user_id_change();