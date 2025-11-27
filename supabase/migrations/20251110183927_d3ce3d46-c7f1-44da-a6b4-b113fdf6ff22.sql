-- Fix device-photos storage security vulnerability
-- Make bucket private and implement owner-based RLS policies

-- Update bucket to be private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'device-photos';

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload device photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view device photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update device photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete device photos" ON storage.objects;

-- Create secure owner-based policies
-- Users can only upload photos to their own service orders
CREATE POLICY "Users can upload photos to their own service orders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'device-photos' 
  AND EXISTS (
    SELECT 1 FROM public.ordens_servico
    WHERE ordens_servico.id::text = (storage.foldername(name))[1]
    AND ordens_servico.created_by = auth.uid()
  )
);

-- Users can only view photos from their own service orders (or admins can view all)
CREATE POLICY "Users can view photos from their own service orders"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'device-photos'
  AND (
    EXISTS (
      SELECT 1 FROM public.ordens_servico
      WHERE ordens_servico.id::text = (storage.foldername(name))[1]
      AND ordens_servico.created_by = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Users can only update photos from their own service orders (or admins can update all)
CREATE POLICY "Users can update photos from their own service orders"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'device-photos'
  AND (
    EXISTS (
      SELECT 1 FROM public.ordens_servico
      WHERE ordens_servico.id::text = (storage.foldername(name))[1]
      AND ordens_servico.created_by = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Users can only delete photos from their own service orders (or admins can delete all)
CREATE POLICY "Users can delete photos from their own service orders"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'device-photos'
  AND (
    EXISTS (
      SELECT 1 FROM public.ordens_servico
      WHERE ordens_servico.id::text = (storage.foldername(name))[1]
      AND ordens_servico.created_by = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);