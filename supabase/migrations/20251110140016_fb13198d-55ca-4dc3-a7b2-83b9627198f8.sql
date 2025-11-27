-- Fix RLS policies for clientes table to restrict access to admins or data owners
DROP POLICY IF EXISTS "Authenticated users can view clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can update clientes" ON public.clientes;

-- Create more restrictive policies for clientes
CREATE POLICY "Users can view their own clientes or admins can view all"
ON public.clientes FOR SELECT
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own clientes"
ON public.clientes FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own clientes or admins can update all"
ON public.clientes FOR UPDATE
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Fix RLS policies for ordens_servico table to restrict access to admins or data owners
DROP POLICY IF EXISTS "Authenticated users can view ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Authenticated users can insert ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Authenticated users can update ordens" ON public.ordens_servico;

-- Create more restrictive policies for ordens_servico
CREATE POLICY "Users can view their own ordens or admins can view all"
ON public.ordens_servico FOR SELECT
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert their own ordens"
ON public.ordens_servico FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own ordens or admins can update all"
ON public.ordens_servico FOR UPDATE
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Add database-level constraints for data validation
ALTER TABLE public.ordens_servico 
ADD CONSTRAINT check_valor_total_positive CHECK (valor_total IS NULL OR valor_total >= 0);

ALTER TABLE public.ordens_servico 
ADD CONSTRAINT check_descricao_problema_length CHECK (LENGTH(descricao_problema) <= 1000);

ALTER TABLE public.ordens_servico 
ADD CONSTRAINT check_observacoes_length CHECK (LENGTH(observacoes) <= 2000);

ALTER TABLE public.profiles 
ADD CONSTRAINT check_nome_length CHECK (LENGTH(nome) <= 100);