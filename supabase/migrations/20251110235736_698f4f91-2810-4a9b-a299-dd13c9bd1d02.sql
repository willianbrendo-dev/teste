-- Add face_id column to checklists table
ALTER TABLE public.checklists 
ADD COLUMN face_id component_status;