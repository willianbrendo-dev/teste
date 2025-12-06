-- Create triggers only if they don't exist and backfill existing data
-- 1) Trigger to create profile on new auth user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- 2) Trigger to auto-assign admin role for the specific admin email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'assign_admin_role_on_user_created'
  ) THEN
    CREATE TRIGGER assign_admin_role_on_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.assign_admin_role();
  END IF;
END $$;

-- 3) Backfill: ensure every existing auth user has a profile row
INSERT INTO public.profiles (id, email, nome)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'nome', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- 4) Backfill: ensure the admin role is assigned for the admin email (if missing)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'admin'::app_role
WHERE u.email = 'ordersistem@tecnobook.com' AND r.user_id IS NULL;
