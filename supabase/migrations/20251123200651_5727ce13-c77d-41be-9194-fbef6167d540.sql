-- Adicionar novos campos na tabela ordens_servico
ALTER TABLE public.ordens_servico 
ADD COLUMN IF NOT EXISTS situacao_atual TEXT CHECK (situacao_atual IN ('aguardando_peca', 'orcamento', 'em_execucao', 'em_atraso')),
ADD COLUMN IF NOT EXISTS termos_servico TEXT[] DEFAULT '{}';

-- Comentários descritivos
COMMENT ON COLUMN public.ordens_servico.situacao_atual IS 'Situação atual da ordem: aguardando_peca, orcamento, em_execucao, em_atraso';
COMMENT ON COLUMN public.ordens_servico.termos_servico IS 'Termos de serviço selecionáveis: nao_da_pra_testar, bloqueado, aberto_por_outros, molhou, troca_de_vidro';