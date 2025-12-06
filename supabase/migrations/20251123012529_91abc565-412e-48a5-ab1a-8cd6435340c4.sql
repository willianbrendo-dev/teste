-- Criar tabela de relacionamento para múltiplas categorias por transação
CREATE TABLE IF NOT EXISTS public.transacoes_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transacao_id UUID NOT NULL REFERENCES public.transacoes(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES public.categorias_financeiras(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(transacao_id, categoria_id)
);

-- Habilitar RLS
ALTER TABLE public.transacoes_categorias ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: mesmas permissões que transacoes
CREATE POLICY "Users with permission can view transacoes_categorias"
  ON public.transacoes_categorias
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.transacoes t
      WHERE t.id = transacoes_categorias.transacao_id
      AND (
        has_permission(auth.uid(), 'financeiro', 'read')
        OR (has_permission(auth.uid(), 'financeiro', 'read_own') AND t.created_by = auth.uid())
      )
    )
  );

CREATE POLICY "Users with permission can insert transacoes_categorias"
  ON public.transacoes_categorias
  FOR INSERT
  WITH CHECK (
    has_permission(auth.uid(), 'financeiro', 'create')
  );

CREATE POLICY "Users with permission can delete transacoes_categorias"
  ON public.transacoes_categorias
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.transacoes t
      WHERE t.id = transacoes_categorias.transacao_id
      AND has_permission(auth.uid(), 'financeiro', 'delete')
    )
  );

-- Índices para performance
CREATE INDEX idx_transacoes_categorias_transacao ON public.transacoes_categorias(transacao_id);
CREATE INDEX idx_transacoes_categorias_categoria ON public.transacoes_categorias(categoria_id);