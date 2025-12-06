-- Add tipo_senha column to ordens_servico table
ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS tipo_senha TEXT;