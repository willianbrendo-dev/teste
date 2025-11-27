-- Create enum for transaction types
CREATE TYPE transaction_type AS ENUM ('receita', 'despesa');

-- Create categories table
CREATE TABLE public.categorias_financeiras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo transaction_type NOT NULL,
  cor TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo transaction_type NOT NULL,
  valor NUMERIC NOT NULL CHECK (valor > 0),
  categoria_id UUID REFERENCES public.categorias_financeiras(id) ON DELETE SET NULL,
  descricao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  ordem_servico_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

-- Policies for categorias_financeiras
CREATE POLICY "Authenticated users can view categories"
ON public.categorias_financeiras FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert categories"
ON public.categorias_financeiras FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update categories"
ON public.categorias_financeiras FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete categories"
ON public.categorias_financeiras FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for transacoes
CREATE POLICY "Users can view their transactions or admins can view all"
ON public.transacoes FOR SELECT
TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own transactions"
ON public.transacoes FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own transactions or admins can update all"
ON public.transacoes FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete transactions"
ON public.transacoes FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_transacoes_updated_at
BEFORE UPDATE ON public.transacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categorias_financeiras (nome, tipo, cor) VALUES
('Serviços', 'receita', '#10b981'),
('Venda de Peças', 'receita', '#3b82f6'),
('Outras Receitas', 'receita', '#8b5cf6'),
('Compra de Peças', 'despesa', '#ef4444'),
('Salários', 'despesa', '#f59e0b'),
('Aluguel', 'despesa', '#ec4899'),
('Contas (Água, Luz, Internet)', 'despesa', '#14b8a6'),
('Outras Despesas', 'despesa', '#6366f1');