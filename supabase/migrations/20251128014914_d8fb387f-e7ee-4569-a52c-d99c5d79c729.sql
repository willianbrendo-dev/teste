-- Update data_prevista_entrega to store date and time
ALTER TABLE public.ordens_servico
  ALTER COLUMN data_prevista_entrega TYPE timestamp with time zone
  USING CASE
    WHEN data_prevista_entrega IS NULL THEN NULL
    ELSE data_prevista_entrega::timestamp with time zone
  END;