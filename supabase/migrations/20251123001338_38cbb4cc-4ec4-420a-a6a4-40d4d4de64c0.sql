-- Add warranty tracking fields to ordens_servico
ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS eh_garantia BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS os_original_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tipo_ordem TEXT DEFAULT 'com_reparo' CHECK (tipo_ordem IN ('com_reparo', 'sem_reparo'));

-- Add index for faster warranty searches
CREATE INDEX IF NOT EXISTS idx_ordens_servico_eh_garantia ON public.ordens_servico(eh_garantia) WHERE eh_garantia = true;
CREATE INDEX IF NOT EXISTS idx_ordens_servico_os_original ON public.ordens_servico(os_original_id) WHERE os_original_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.ordens_servico.eh_garantia IS 'Indica se esta OS é uma garantia de outra OS';
COMMENT ON COLUMN public.ordens_servico.os_original_id IS 'ID da OS original quando esta é uma garantia';
COMMENT ON COLUMN public.ordens_servico.tipo_ordem IS 'Tipo de ordem: com_reparo ou sem_reparo';