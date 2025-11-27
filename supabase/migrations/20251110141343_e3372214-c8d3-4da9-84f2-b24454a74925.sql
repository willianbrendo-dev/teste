-- Create audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_old_data,
    p_new_data
  );
END;
$$;

-- Trigger function for user_roles auditing
CREATE OR REPLACE FUNCTION public.audit_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM create_audit_log(
      'INSERT',
      'user_roles',
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM create_audit_log(
      'UPDATE',
      'user_roles',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM create_audit_log(
      'DELETE',
      'user_roles',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger function for clientes auditing (only DELETE)
CREATE OR REPLACE FUNCTION public.audit_clientes_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_audit_log(
    'DELETE',
    'clientes',
    OLD.id,
    to_jsonb(OLD),
    NULL
  );
  RETURN OLD;
END;
$$;

-- Trigger function for marcas auditing (only DELETE)
CREATE OR REPLACE FUNCTION public.audit_marcas_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_audit_log(
    'DELETE',
    'marcas',
    OLD.id,
    to_jsonb(OLD),
    NULL
  );
  RETURN OLD;
END;
$$;

-- Trigger function for modelos auditing (only DELETE)
CREATE OR REPLACE FUNCTION public.audit_modelos_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_audit_log(
    'DELETE',
    'modelos',
    OLD.id,
    to_jsonb(OLD),
    NULL
  );
  RETURN OLD;
END;
$$;

-- Trigger function for ordens_servico auditing (only DELETE)
CREATE OR REPLACE FUNCTION public.audit_ordens_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_audit_log(
    'DELETE',
    'ordens_servico',
    OLD.id,
    to_jsonb(OLD),
    NULL
  );
  RETURN OLD;
END;
$$;

-- Create triggers for user_roles (all operations)
DROP TRIGGER IF EXISTS audit_user_roles_trigger ON public.user_roles;
CREATE TRIGGER audit_user_roles_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles();

-- Create triggers for DELETE operations on other tables
DROP TRIGGER IF EXISTS audit_clientes_delete_trigger ON public.clientes;
CREATE TRIGGER audit_clientes_delete_trigger
  AFTER DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.audit_clientes_delete();

DROP TRIGGER IF EXISTS audit_marcas_delete_trigger ON public.marcas;
CREATE TRIGGER audit_marcas_delete_trigger
  AFTER DELETE ON public.marcas
  FOR EACH ROW EXECUTE FUNCTION public.audit_marcas_delete();

DROP TRIGGER IF EXISTS audit_modelos_delete_trigger ON public.modelos;
CREATE TRIGGER audit_modelos_delete_trigger
  AFTER DELETE ON public.modelos
  FOR EACH ROW EXECUTE FUNCTION public.audit_modelos_delete();

DROP TRIGGER IF EXISTS audit_ordens_delete_trigger ON public.ordens_servico;
CREATE TRIGGER audit_ordens_delete_trigger
  AFTER DELETE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.audit_ordens_delete();