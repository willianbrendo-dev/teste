-- Restrict brand and model management to admins for better data integrity
-- This prevents data pollution and ensures centralized control of reference data

-- Drop existing permissive policies for marcas
DROP POLICY IF EXISTS "Authenticated users can insert marcas" ON public.marcas;
DROP POLICY IF EXISTS "Authenticated users can update marcas" ON public.marcas;

-- Drop existing permissive policies for modelos
DROP POLICY IF EXISTS "Authenticated users can insert modelos" ON public.modelos;
DROP POLICY IF EXISTS "Authenticated users can update modelos" ON public.modelos;

-- Create admin-only policies for marcas
CREATE POLICY "Admins can insert marcas"
  ON public.marcas FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update marcas"
  ON public.marcas FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Create admin-only policies for modelos
CREATE POLICY "Admins can insert modelos"
  ON public.modelos FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update modelos"
  ON public.modelos FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));