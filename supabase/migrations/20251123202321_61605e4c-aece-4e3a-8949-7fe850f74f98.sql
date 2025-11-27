-- Alterar campos marca_id e modelo_id para aceitar texto livre
-- Primeiro, remover as foreign keys existentes
ALTER TABLE public.ordens_servico 
DROP CONSTRAINT IF EXISTS ordens_servico_marca_id_fkey,
DROP CONSTRAINT IF EXISTS ordens_servico_modelo_id_fkey;

-- Alterar os tipos de dados para TEXT
ALTER TABLE public.ordens_servico 
ALTER COLUMN marca_id TYPE TEXT USING marca_id::TEXT,
ALTER COLUMN modelo_id TYPE TEXT USING modelo_id::TEXT;

-- Comentários descritivos
COMMENT ON COLUMN public.ordens_servico.marca_id IS 'Marca do aparelho (texto livre ou nome da marca cadastrada)';
COMMENT ON COLUMN public.ordens_servico.modelo_id IS 'Modelo do aparelho (texto livre ou nome do modelo cadastrado)';