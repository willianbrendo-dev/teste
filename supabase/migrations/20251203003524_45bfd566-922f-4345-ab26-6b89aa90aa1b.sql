-- Drop existing INSERT policies for marcas and modelos
DROP POLICY IF EXISTS "Admins can insert marcas" ON public.marcas;
DROP POLICY IF EXISTS "Admins can insert modelos" ON public.modelos;

-- Create new INSERT policies allowing both admin and atendente
CREATE POLICY "Authenticated users can insert marcas" 
ON public.marcas 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert modelos" 
ON public.modelos 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');