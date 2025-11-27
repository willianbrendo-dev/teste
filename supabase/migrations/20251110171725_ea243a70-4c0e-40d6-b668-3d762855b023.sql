-- Add new columns to ordens_servico table
ALTER TABLE public.ordens_servico
ADD COLUMN numero_serie TEXT,
ADD COLUMN senha_aparelho TEXT,
ADD COLUMN senha_desenho_url TEXT,
ADD COLUMN estado_fisico TEXT,
ADD COLUMN servico_realizar TEXT,
ADD COLUMN valor_estimado NUMERIC(10,2),
ADD COLUMN valor_entrada NUMERIC(10,2) DEFAULT 0,
ADD COLUMN data_prevista_entrega DATE;

-- Create pecas_estoque table
CREATE TABLE public.pecas_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  quantidade INTEGER NOT NULL DEFAULT 0,
  preco_unitario NUMERIC(10,2),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for pecas_estoque
ALTER TABLE public.pecas_estoque ENABLE ROW LEVEL SECURITY;

-- RLS policies for pecas_estoque
CREATE POLICY "Authenticated users can view pecas"
ON public.pecas_estoque FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert pecas"
ON public.pecas_estoque FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update pecas"
ON public.pecas_estoque FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete pecas"
ON public.pecas_estoque FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create junction table for ordens and pecas
CREATE TABLE public.ordens_pecas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  peca_id UUID NOT NULL REFERENCES public.pecas_estoque(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ordem_id, peca_id)
);

-- Enable RLS for ordens_pecas
ALTER TABLE public.ordens_pecas ENABLE ROW LEVEL SECURITY;

-- RLS policies for ordens_pecas
CREATE POLICY "Users can view their ordens pecas or admins can view all"
ON public.ordens_pecas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ordens_servico
    WHERE ordens_servico.id = ordens_pecas.ordem_id
    AND (ordens_servico.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can insert pecas to their ordens"
ON public.ordens_pecas FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ordens_servico
    WHERE ordens_servico.id = ordens_pecas.ordem_id
    AND ordens_servico.created_by = auth.uid()
  )
);

CREATE POLICY "Users can update their ordens pecas or admins can update all"
ON public.ordens_pecas FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.ordens_servico
    WHERE ordens_servico.id = ordens_pecas.ordem_id
    AND (ordens_servico.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can delete their ordens pecas or admins can delete all"
ON public.ordens_pecas FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.ordens_servico
    WHERE ordens_servico.id = ordens_pecas.ordem_id
    AND (ordens_servico.created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
  )
);

-- Create audit function for pecas FIRST
CREATE OR REPLACE FUNCTION public.audit_pecas_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_audit_log(
    'DELETE',
    'pecas_estoque',
    OLD.id,
    to_jsonb(OLD),
    NULL
  );
  RETURN OLD;
END;
$$;

-- Add trigger for pecas_estoque updated_at
CREATE TRIGGER update_pecas_estoque_updated_at
BEFORE UPDATE ON public.pecas_estoque
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add audit trigger for pecas_estoque delete
CREATE TRIGGER audit_pecas_delete
AFTER DELETE ON public.pecas_estoque
FOR EACH ROW
EXECUTE FUNCTION audit_pecas_delete();