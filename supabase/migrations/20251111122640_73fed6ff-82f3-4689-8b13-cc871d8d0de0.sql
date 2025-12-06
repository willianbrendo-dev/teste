-- Function to auto-create financial transaction when order is completed
CREATE OR REPLACE FUNCTION public.auto_create_receita_ordem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  categoria_servicos_id UUID;
BEGIN
  -- Only create transaction when status changes to 'finalizada' and valor_total exists
  IF NEW.status = 'finalizada' AND OLD.status != 'finalizada' AND NEW.valor_total IS NOT NULL AND NEW.valor_total > 0 THEN
    
    -- Get the "Serviços" category ID
    SELECT id INTO categoria_servicos_id
    FROM public.categorias_financeiras
    WHERE nome = 'Serviços' AND tipo = 'receita'
    LIMIT 1;
    
    -- Create the receita transaction
    INSERT INTO public.transacoes (
      tipo,
      valor,
      categoria_id,
      descricao,
      data,
      ordem_servico_id,
      created_by
    ) VALUES (
      'receita',
      NEW.valor_total,
      categoria_servicos_id,
      'Receita automática da Ordem #' || NEW.numero,
      CURRENT_DATE,
      NEW.id,
      NEW.created_by
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create receita when order is finalized
DROP TRIGGER IF EXISTS trigger_auto_create_receita_ordem ON public.ordens_servico;

CREATE TRIGGER trigger_auto_create_receita_ordem
AFTER UPDATE ON public.ordens_servico
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_receita_ordem();