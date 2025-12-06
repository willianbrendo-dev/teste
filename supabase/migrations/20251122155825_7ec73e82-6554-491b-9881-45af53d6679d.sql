-- Add queue management columns to print_jobs
ALTER TABLE public.print_jobs 
ADD COLUMN attempts integer DEFAULT 0,
ADD COLUMN max_attempts integer DEFAULT 3,
ADD COLUMN processing_started_at timestamp with time zone,
ADD COLUMN processing_duration_ms integer;

-- Update status check constraint to include new states
ALTER TABLE public.print_jobs 
DROP CONSTRAINT IF EXISTS print_jobs_status_check;

ALTER TABLE public.print_jobs 
ADD CONSTRAINT print_jobs_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'failed'));

-- Rename completed_at to be more clear
ALTER TABLE public.print_jobs 
RENAME COLUMN completed_at TO finished_at;

-- Add index for queue processing
CREATE INDEX idx_print_jobs_queue ON public.print_jobs(status, created_at) 
WHERE status IN ('pending', 'processing');

-- Function to get next pending job
CREATE OR REPLACE FUNCTION public.get_next_pending_job(p_device_id text)
RETURNS TABLE (
  id uuid,
  job_id text,
  os_id uuid,
  escpos_data_base64 text,
  device_id text,
  attempts integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Get the oldest pending job for this device
  RETURN QUERY
  SELECT 
    pj.id,
    pj.job_id,
    pj.os_id,
    pj.escpos_data_base64,
    pj.device_id,
    pj.attempts
  FROM public.print_jobs pj
  WHERE pj.device_id = p_device_id 
    AND pj.status = 'pending'
    AND pj.attempts < pj.max_attempts
  ORDER BY pj.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
END;
$$;

-- Function to update job status with timing
CREATE OR REPLACE FUNCTION public.update_job_status(
  p_job_id text,
  p_status text,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at timestamp with time zone;
BEGIN
  -- Get the started_at time
  SELECT processing_started_at INTO v_started_at
  FROM public.print_jobs
  WHERE job_id = p_job_id;

  -- Update based on status
  IF p_status = 'processing' THEN
    UPDATE public.print_jobs
    SET 
      status = p_status,
      processing_started_at = now(),
      attempts = attempts + 1,
      updated_at = now()
    WHERE job_id = p_job_id;
    
  ELSIF p_status IN ('completed', 'failed') THEN
    UPDATE public.print_jobs
    SET 
      status = p_status,
      finished_at = now(),
      processing_duration_ms = CASE 
        WHEN v_started_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (now() - v_started_at)) * 1000
        ELSE NULL
      END,
      error_message = p_error_message,
      updated_at = now()
    WHERE job_id = p_job_id;
    
  ELSE
    UPDATE public.print_jobs
    SET 
      status = p_status,
      error_message = p_error_message,
      updated_at = now()
    WHERE job_id = p_job_id;
  END IF;
END;
$$;