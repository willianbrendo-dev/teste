-- Create storage bucket for device photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'device-photos',
  'device-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Add photos column to ordens_servico table
ALTER TABLE public.ordens_servico
ADD COLUMN fotos_aparelho text[] DEFAULT '{}';

-- Create RLS policies for device-photos bucket
CREATE POLICY "Authenticated users can upload device photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'device-photos' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view device photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'device-photos');

CREATE POLICY "Users can update their device photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'device-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete device photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'device-photos' AND auth.uid() IS NOT NULL);