-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'atendente');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create clientes table
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Create marcas table
CREATE TABLE public.marcas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;

-- Create modelos table
CREATE TABLE public.modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  marca_id UUID REFERENCES public.marcas(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(nome, marca_id)
);

ALTER TABLE public.modelos ENABLE ROW LEVEL SECURITY;

-- Create ordens_servico table
CREATE TABLE public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero SERIAL UNIQUE,
  cliente_id UUID REFERENCES public.clientes(id) NOT NULL,
  marca_id UUID REFERENCES public.marcas(id),
  modelo_id UUID REFERENCES public.modelos(id),
  descricao_problema TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'aberta',
  valor_total DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

-- Function to handle new user creation
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

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ordens_servico_updated_at
  BEFORE UPDATE ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for clientes
CREATE POLICY "Authenticated users can view clientes"
  ON public.clientes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert clientes"
  ON public.clientes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update clientes"
  ON public.clientes FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete clientes"
  ON public.clientes FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for marcas
CREATE POLICY "Authenticated users can view marcas"
  ON public.marcas FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert marcas"
  ON public.marcas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update marcas"
  ON public.marcas FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete marcas"
  ON public.marcas FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for modelos
CREATE POLICY "Authenticated users can view modelos"
  ON public.modelos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert modelos"
  ON public.modelos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update modelos"
  ON public.modelos FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete modelos"
  ON public.modelos FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for ordens_servico
CREATE POLICY "Authenticated users can view ordens"
  ON public.ordens_servico FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert ordens"
  ON public.ordens_servico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update ordens"
  ON public.ordens_servico FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete ordens"
  ON public.ordens_servico FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));