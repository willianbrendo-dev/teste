-- Trigger para reduzir estoque automaticamente ao concluir ordem de serviço
CREATE OR REPLACE FUNCTION public.reduzir_estoque_ao_concluir()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se o status mudou para concluído ou finalizada
  IF (NEW.status IN ('concluido', 'finalizada')) AND 
     (OLD.status IS NULL OR OLD.status NOT IN ('concluido', 'finalizada')) THEN
    
    -- Reduz a quantidade de cada peça associada à ordem de serviço
    UPDATE public.pecas_estoque pe
    SET quantidade = quantidade - op.quantidade
    FROM public.ordens_pecas op
    WHERE op.ordem_id = NEW.id
      AND pe.id = op.peca_id
      AND pe.quantidade >= op.quantidade;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Cria o trigger na tabela ordens_servico
CREATE TRIGGER trigger_reduzir_estoque_ao_concluir
  AFTER UPDATE ON public.ordens_servico
  FOR EACH ROW
  EXECUTE FUNCTION public.reduzir_estoque_ao_concluir();