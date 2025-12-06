-- Add print_bridge role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'print_bridge';

-- Add comment explaining the print_bridge role
COMMENT ON TYPE public.app_role IS 'Application roles: admin (full access), print_bridge (print module only access)';
