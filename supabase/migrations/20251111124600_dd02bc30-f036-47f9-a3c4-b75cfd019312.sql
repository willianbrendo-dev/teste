-- Add payment method to transactions
ALTER TABLE public.transacoes 
ADD COLUMN metodo_pagamento TEXT CHECK (metodo_pagamento IN ('dinheiro', 'pix', 'debito', 'credito', 'outros'));

-- Create daily cash register table
CREATE TABLE public.caixa_diario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL UNIQUE,
  valor_abertura NUMERIC NOT NULL CHECK (valor_abertura >= 0),
  valor_fechamento NUMERIC,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
  observacoes_abertura TEXT,
  observacoes_fechamento TEXT,
  aberto_por UUID REFERENCES auth.users(id),
  fechado_por UUID REFERENCES auth.users(id),
  aberto_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fechado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.caixa_diario ENABLE ROW LEVEL SECURITY;

-- Policies for caixa_diario
CREATE POLICY "Authenticated users can view caixa"
ON public.caixa_diario FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can open caixa"
ON public.caixa_diario FOR INSERT
TO authenticated
WITH CHECK (aberto_por = auth.uid());

CREATE POLICY "Users can close their own caixa or admins can close all"
ON public.caixa_diario FOR UPDATE
TO authenticated
USING (aberto_por = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_caixa_diario_updated_at
BEFORE UPDATE ON public.caixa_diario
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add valor_servico to garantias if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'garantias' 
    AND column_name = 'valor_servico'
  ) THEN
    ALTER TABLE public.garantias ADD COLUMN valor_servico NUMERIC;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'garantias' 
    AND column_name = 'metodo_pagamento'
  ) THEN
    ALTER TABLE public.garantias ADD COLUMN metodo_pagamento TEXT CHECK (metodo_pagamento IN ('dinheiro', 'pix', 'debito', 'credito', 'outros'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'garantias' 
    AND column_name = 'data_pagamento'
  ) THEN
    ALTER TABLE public.garantias ADD COLUMN data_pagamento TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Function to auto-create receita when garantia is delivered
CREATE OR REPLACE FUNCTION public.auto_create_receita_garantia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  categoria_servicos_id UUID;
  ordem_numero INTEGER;
BEGIN
  -- Only create transaction when status changes to 'entregue' and payment method is set
  IF NEW.status = 'entregue' AND OLD.status != 'entregue' AND NEW.metodo_pagamento IS NOT NULL AND NEW.valor_servico IS NOT NULL AND NEW.valor_servico > 0 THEN
    
    -- Get the "Serviços" category ID
    SELECT id INTO categoria_servicos_id
    FROM public.categorias_financeiras
    WHERE nome = 'Serviços' AND tipo = 'receita'
    LIMIT 1;
    
    -- Get ordem numero
    SELECT numero INTO ordem_numero
    FROM public.ordens_servico
    WHERE id = NEW.ordem_servico_id;
    
    -- Create the receita transaction
    INSERT INTO public.transacoes (
      tipo,
      valor,
      categoria_id,
      descricao,
      data,
      ordem_servico_id,
      metodo_pagamento,
      created_by
    ) VALUES (
      'receita',
      NEW.valor_servico,
      categoria_servicos_id,
      'Recebimento da Garantia - O.S #' || COALESCE(ordem_numero::TEXT, 'N/A'),
      CURRENT_DATE,
      NEW.ordem_servico_id,
      NEW.metodo_pagamento,
      NEW.created_by
    );
    
    -- Set payment date
    NEW.data_pagamento = now();
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create receita when garantia is delivered
DROP TRIGGER IF EXISTS trigger_auto_create_receita_garantia ON public.garantias;

CREATE TRIGGER trigger_auto_create_receita_garantia
BEFORE UPDATE ON public.garantias
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_receita_garantia();