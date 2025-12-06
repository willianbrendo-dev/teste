-- Add missing fields to clientes table
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS apelido TEXT,
ADD COLUMN IF NOT EXISTS bairro TEXT;

-- Add missing fields to ordens_servico table
ALTER TABLE public.ordens_servico
ADD COLUMN IF NOT EXISTS cor_aparelho TEXT,
ADD COLUMN IF NOT EXISTS acessorios_entregues TEXT,
ADD COLUMN IF NOT EXISTS relato_cliente TEXT,
ADD COLUMN IF NOT EXISTS possivel_reparo TEXT,
ADD COLUMN IF NOT EXISTS valor_adiantamento NUMERIC DEFAULT 0;

-- Add comment to explain valor_entrada vs valor_adiantamento
COMMENT ON COLUMN public.ordens_servico.valor_entrada IS 'Valor pago na entrada (sinal)';
COMMENT ON COLUMN public.ordens_servico.valor_adiantamento IS 'Valor do adiantamento acordado';