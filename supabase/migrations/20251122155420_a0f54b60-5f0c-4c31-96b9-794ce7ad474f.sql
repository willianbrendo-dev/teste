-- Create print jobs table
CREATE TABLE IF NOT EXISTS public.print_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id TEXT NOT NULL UNIQUE,
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  escpos_data_base64 TEXT NOT NULL,
  device_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

-- Admins can view all print jobs
CREATE POLICY "Admins can view all print jobs"
  ON public.print_jobs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Admins can insert print jobs
CREATE POLICY "Admins can insert print jobs"
  ON public.print_jobs
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins and print_bridge users can update job status
CREATE POLICY "Admins and print_bridge can update jobs"
  ON public.print_jobs
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'print_bridge')
  );

-- Create index for faster queries
CREATE INDEX idx_print_jobs_status ON public.print_jobs(status);
CREATE INDEX idx_print_jobs_device_id ON public.print_jobs(device_id);
CREATE INDEX idx_print_jobs_created_at ON public.print_jobs(created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_print_jobs_updated_at
  BEFORE UPDATE ON public.print_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();