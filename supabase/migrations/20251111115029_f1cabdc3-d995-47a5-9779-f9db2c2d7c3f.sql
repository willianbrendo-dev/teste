-- Create audit function for garantias first
CREATE OR REPLACE FUNCTION public.audit_garantias_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_audit_log(
    'DELETE',
    'garantias',
    OLD.id,
    to_jsonb(OLD),
    NULL
  );
  RETURN OLD;
END;
$$;

-- Create garantias table
CREATE TABLE IF NOT EXISTS public.garantias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_servico_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'em_atraso', 'entregue')),
  termo_garantia_url TEXT,
  observacoes TEXT,
  data_entrega TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ordem_servico_id)
);

-- Enable RLS
ALTER TABLE public.garantias ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own garantias or admins can view all"
ON public.garantias FOR SELECT
USING (
  created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can insert their own garantias"
ON public.garantias FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own garantias or admins can update all"
ON public.garantias FOR UPDATE
USING (
  created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete garantias"
ON public.garantias FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_garantias_updated_at
BEFORE UPDATE ON public.garantias
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add audit trigger
CREATE TRIGGER audit_garantias_delete
BEFORE DELETE ON public.garantias
FOR EACH ROW
EXECUTE FUNCTION public.audit_garantias_delete();