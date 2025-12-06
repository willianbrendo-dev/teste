-- Create enum for checklist types
CREATE TYPE checklist_type AS ENUM ('android', 'ios');

-- Create enum for component status
CREATE TYPE component_status AS ENUM ('funcionando', 'com_defeito', 'nao_testado', 'nao_possui');

-- Create checklists table
CREATE TABLE public.checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ordem_servico_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  tipo checklist_type NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Componentes comuns
  alto_falante component_status,
  auricular component_status,
  situacao_touch component_status,
  carregador component_status,
  conector_carga component_status,
  microfone component_status,
  flash component_status,
  fone_ouvido component_status,
  botao_home component_status,
  botao_power component_status,
  botao_volume component_status,
  bluetooth component_status,
  camera_traseira component_status,
  camera_frontal component_status,
  biometria component_status,
  parafuso component_status,
  sensor_proximidade component_status,
  vibra_call component_status,
  wifi component_status,
  slot_sim component_status,
  sim_chip component_status,
  situacao_carcaca component_status,
  
  -- Observações
  observacoes TEXT
);

-- Enable RLS
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own checklists or admins can view all"
ON public.checklists
FOR SELECT
USING (
  created_by = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can insert their own checklists"
ON public.checklists
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own checklists or admins can update all"
ON public.checklists
FOR UPDATE
USING (
  created_by = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete checklists"
ON public.checklists
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_checklists_updated_at
  BEFORE UPDATE ON public.checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit trigger
CREATE OR REPLACE FUNCTION public.audit_checklists_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_audit_log(
    'DELETE',
    'checklists',
    OLD.id,
    to_jsonb(OLD),
    NULL
  );
  RETURN OLD;
END;
$$;

CREATE TRIGGER audit_checklists_delete_trigger
  AFTER DELETE ON public.checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_checklists_delete();