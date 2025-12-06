-- =============================================
-- RECREATION - Create all database structures
-- =============================================

-- =============================================
-- ENUMS
-- =============================================

CREATE TYPE public.app_role AS ENUM ('admin', 'atendente', 'print_bridge');
CREATE TYPE public.transaction_type AS ENUM ('receita', 'despesa');
CREATE TYPE public.checklist_status AS ENUM ('pendente', 'concluido', 'em_atraso');
CREATE TYPE public.checklist_type AS ENUM ('entrada', 'saida');
CREATE TYPE public.component_status AS ENUM ('ok', 'com_defeito', 'nao_testado', 'nao_possui');

-- =============================================
-- TABLES
-- =============================================

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT,
  is_super_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- User permissions table
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module, action)
);

-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Marcas table
CREATE TABLE public.marcas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Modelos table
CREATE TABLE public.modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  marca_id UUID NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Clientes table
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  cpf TEXT,
  endereco TEXT,
  bairro TEXT,
  apelido TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ordens de serviço table
CREATE TABLE public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero SERIAL NOT NULL UNIQUE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  marca_id TEXT,
  modelo_id TEXT,
  numero_serie TEXT,
  senha_aparelho TEXT,
  tipo_senha TEXT,
  senha_desenho_url TEXT,
  cor_aparelho TEXT,
  estado_fisico TEXT,
  acessorios_entregues TEXT,
  fotos_aparelho TEXT[] DEFAULT '{}',
  descricao_problema TEXT,
  relato_cliente TEXT,
  possivel_reparo TEXT,
  servico_realizar TEXT,
  situacao_atual TEXT,
  observacoes TEXT,
  valor_estimado NUMERIC,
  valor_total NUMERIC,
  valor_entrada NUMERIC DEFAULT 0,
  valor_adiantamento NUMERIC DEFAULT 0,
  data_prevista_entrega DATE,
  status TEXT NOT NULL DEFAULT 'aberta',
  tipo_ordem TEXT DEFAULT 'com_reparo',
  eh_garantia BOOLEAN DEFAULT FALSE,
  os_original_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  termos_servico TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Checklists table
CREATE TABLE public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id UUID NOT NULL UNIQUE REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  tipo public.checklist_type NOT NULL,
  status public.checklist_status NOT NULL DEFAULT 'pendente',
  situacao_carcaca public.component_status,
  situacao_touch public.component_status,
  alto_falante public.component_status,
  auricular public.component_status,
  microfone public.component_status,
  camera_frontal public.component_status,
  camera_traseira public.component_status,
  flash public.component_status,
  biometria public.component_status,
  face_id public.component_status,
  botao_power public.component_status,
  botao_volume public.component_status,
  botao_home public.component_status,
  conector_carga public.component_status,
  carregador public.component_status,
  fone_ouvido public.component_status,
  wifi public.component_status,
  bluetooth public.component_status,
  sim_chip public.component_status,
  slot_sim public.component_status,
  vibra_call public.component_status,
  sensor_proximidade public.component_status,
  parafuso public.component_status,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Garantias table
CREATE TABLE public.garantias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id UUID NOT NULL UNIQUE REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'aguardando',
  data_entrega TIMESTAMP WITH TIME ZONE,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  valor_servico NUMERIC,
  metodo_pagamento TEXT,
  observacoes TEXT,
  termo_garantia_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Peças estoque table
CREATE TABLE public.pecas_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  quantidade INTEGER NOT NULL DEFAULT 0,
  preco_unitario NUMERIC,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ordens peças table
CREATE TABLE public.ordens_pecas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  peca_id UUID NOT NULL REFERENCES public.pecas_estoque(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Categorias financeiras table
CREATE TABLE public.categorias_financeiras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo public.transaction_type NOT NULL,
  cor TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Transações table
CREATE TABLE public.transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo public.transaction_type NOT NULL,
  valor NUMERIC NOT NULL,
  descricao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  metodo_pagamento TEXT,
  categoria_id UUID REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL,
  ordem_servico_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Transações categorias (junction table)
CREATE TABLE public.transacoes_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transacao_id UUID NOT NULL REFERENCES public.transacoes(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES public.categorias_financeiras(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Caixa diário table
CREATE TABLE public.caixa_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  valor_abertura NUMERIC NOT NULL,
  valor_fechamento NUMERIC,
  status TEXT NOT NULL DEFAULT 'aberto',
  observacoes_abertura TEXT,
  observacoes_fechamento TEXT,
  aberto_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fechado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  aberto_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fechado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Print jobs table
CREATE TABLE public.print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL UNIQUE,
  device_id TEXT,
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  escpos_data_base64 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  processing_started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  processing_duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- STORAGE
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('device-photos', 'device-photos', false)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
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

-- Security definer function to check permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _action text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.user_permissions 
    WHERE user_id = _user_id AND module = _module AND action = _action
  )
$$;

-- Convenience function for checking admin status
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role);
$$;

-- Function to create audit logs
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_action text,
  p_table_name text,
  p_record_id uuid,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id, action, table_name, record_id, old_data, new_data
  ) VALUES (
    auth.uid(), p_action, p_table_name, p_record_id, p_old_data, p_new_data
  );
END;
$$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', ''));
  RETURN NEW;
END;
$$;

-- Function to assign admin role automatically
CREATE OR REPLACE FUNCTION public.assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'ordersistem@tecnobook.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to prevent super admin deletion
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

-- Function to protect super admin role
CREATE OR REPLACE FUNCTION public.protect_super_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_super_admin boolean;
BEGIN
  SELECT p.is_super_admin INTO is_super_admin
  FROM public.profiles p
  WHERE p.id = COALESCE(OLD.user_id, NEW.user_id);

  IF (TG_OP = 'DELETE') THEN
    IF is_super_admin AND OLD.role = 'admin' THEN
      RAISE EXCEPTION 'Cannot delete admin role from super admin user';
    END IF;
    RETURN OLD;
  END IF;

  IF (TG_OP = 'UPDATE') THEN
    IF is_super_admin AND OLD.role = 'admin' AND NEW.role != 'admin' THEN
      RAISE EXCEPTION 'Cannot change super admin role';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to prevent last admin deletion
CREATE OR REPLACE FUNCTION public.prevent_last_admin_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  IF OLD.role = 'admin' THEN
    SELECT COUNT(*) INTO admin_count
    FROM public.user_roles
    WHERE role = 'admin' AND user_id != OLD.user_id;

    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last admin user. At least one admin must exist in the system.';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

-- Function to prevent super admin user_id change
CREATE OR REPLACE FUNCTION public.prevent_super_admin_user_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_super_admin boolean;
BEGIN
  SELECT p.is_super_admin INTO is_super_admin
  FROM public.profiles p
  WHERE p.id = OLD.user_id;

  IF is_super_admin AND OLD.user_id != NEW.user_id THEN
    RAISE EXCEPTION 'Cannot change user_id for super admin role assignment';
  END IF;

  RETURN NEW;
END;
$$;

-- Function to check checklist atraso
CREATE OR REPLACE FUNCTION public.check_checklist_atraso()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.checklists c
  SET status = 'em_atraso'
  FROM public.ordens_servico os
  WHERE c.ordem_servico_id = os.id
    AND c.status = 'pendente'
    AND os.data_prevista_entrega < CURRENT_DATE;
END;
$$;

-- Function to get next pending print job
CREATE OR REPLACE FUNCTION public.get_next_pending_job(p_device_id text)
RETURNS TABLE(
  id uuid,
  job_id text,
  os_id uuid,
  escpos_data_base64 text,
  device_id text,
  attempts integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pj.id, pj.job_id, pj.os_id, pj.escpos_data_base64, pj.device_id, pj.attempts
  FROM public.print_jobs pj
  WHERE pj.device_id = p_device_id 
    AND pj.status = 'pending'
    AND pj.attempts < pj.max_attempts
  ORDER BY pj.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$;

-- Function to update print job status
CREATE OR REPLACE FUNCTION public.update_job_status(
  p_job_id text,
  p_status text,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at timestamp with time zone;
BEGIN
  SELECT processing_started_at INTO v_started_at
  FROM public.print_jobs
  WHERE job_id = p_job_id;

  IF p_status = 'processing' THEN
    UPDATE public.print_jobs
    SET 
      status = p_status,
      processing_started_at = now(),
      attempts = attempts + 1,
      updated_at = now()
    WHERE job_id = p_job_id;
    
  ELSIF p_status IN ('completed', 'failed') THEN
    UPDATE public.print_jobs
    SET 
      status = p_status,
      finished_at = now(),
      processing_duration_ms = CASE 
        WHEN v_started_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (now() - v_started_at)) * 1000
        ELSE NULL
      END,
      error_message = p_error_message,
      updated_at = now()
    WHERE job_id = p_job_id;
    
  ELSE
    UPDATE public.print_jobs
    SET 
      status = p_status,
      error_message = p_error_message,
      updated_at = now()
    WHERE job_id = p_job_id;
  END IF;
END;
$$;

-- Function to reduce stock when ordem is completed
CREATE OR REPLACE FUNCTION public.reduzir_estoque_ao_concluir()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.status IN ('concluido', 'finalizada')) AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('concluido', 'finalizada')) THEN
    UPDATE public.pecas_estoque pe
    SET quantidade = quantidade - op.quantidade
    FROM public.ordens_pecas op
    WHERE op.ordem_id = NEW.id
      AND pe.id = op.peca_id
      AND pe.quantidade >= op.quantidade;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to auto create garantia
CREATE OR REPLACE FUNCTION public.auto_create_garantia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.garantias (ordem_servico_id, created_by, status)
  VALUES (NEW.ordem_servico_id, NEW.created_by, 'aguardando')
  ON CONFLICT (ordem_servico_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Function to auto create garantia when ordem is concluded
CREATE OR REPLACE FUNCTION public.auto_create_garantia_on_concluido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS NULL OR OLD.status != 'concluido') THEN
    INSERT INTO public.garantias (ordem_servico_id, created_by, status)
    VALUES (NEW.ordem_servico_id, NEW.created_by, 'aguardando')
    ON CONFLICT (ordem_servico_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to auto create receita from ordem
CREATE OR REPLACE FUNCTION public.auto_create_receita_ordem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  categoria_servicos_id UUID;
BEGIN
  IF NEW.status = 'finalizada' AND OLD.status != 'finalizada' AND 
     NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
    
    SELECT id INTO categoria_servicos_id
    FROM public.categorias_financeiras
    WHERE nome = 'Serviços' AND tipo = 'receita'
    LIMIT 1;
    
    INSERT INTO public.transacoes (
      tipo, valor, categoria_id, descricao, data, ordem_servico_id, created_by
    ) VALUES (
      'receita', NEW.valor_total, categoria_servicos_id,
      'Receita automática da Ordem #' || NEW.numero,
      CURRENT_DATE, NEW.id, NEW.created_by
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to auto create receita from garantia
CREATE OR REPLACE FUNCTION public.auto_create_receita_garantia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  categoria_servicos_id UUID;
  ordem_numero INTEGER;
BEGIN
  IF NEW.status = 'entregue' AND OLD.status != 'entregue' AND 
     NEW.metodo_pagamento IS NOT NULL AND NEW.valor_servico IS NOT NULL AND NEW.valor_servico > 0 THEN
    
    SELECT id INTO categoria_servicos_id
    FROM public.categorias_financeiras
    WHERE nome = 'Serviços' AND tipo = 'receita'
    LIMIT 1;
    
    SELECT numero INTO ordem_numero
    FROM public.ordens_servico
    WHERE id = NEW.ordem_servico_id;
    
    INSERT INTO public.transacoes (
      tipo, valor, categoria_id, descricao, data, ordem_servico_id, 
      metodo_pagamento, created_by
    ) VALUES (
      'receita', NEW.valor_servico, categoria_servicos_id,
      'Recebimento da Garantia - O.S #' || COALESCE(ordem_numero::TEXT, 'N/A'),
      CURRENT_DATE, NEW.ordem_servico_id, NEW.metodo_pagamento, NEW.created_by
    );
    
    NEW.data_pagamento = now();
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Audit functions for delete operations
CREATE OR REPLACE FUNCTION public.audit_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM create_audit_log('INSERT', 'user_roles', NEW.id, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM create_audit_log('UPDATE', 'user_roles', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM create_audit_log('DELETE', 'user_roles', OLD.id, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_clientes_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_audit_log('DELETE', 'clientes', OLD.id, to_jsonb(OLD), NULL);
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_marcas_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_audit_log('DELETE', 'marcas', OLD.id, to_jsonb(OLD), NULL);
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_modelos_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_audit_log('DELETE', 'modelos', OLD.id, to_jsonb(OLD), NULL);
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_ordens_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_audit_log('DELETE', 'ordens_servico', OLD.id, to_jsonb(OLD), NULL);
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_pecas_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_audit_log('DELETE', 'pecas_estoque', OLD.id, to_jsonb(OLD), NULL);
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_checklists_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_audit_log('DELETE', 'checklists', OLD.id, to_jsonb(OLD), NULL);
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_garantias_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_audit_log('DELETE', 'garantias', OLD.id, to_jsonb(OLD), NULL);
  RETURN OLD;
END;
$$;