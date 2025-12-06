-- Allow print_bridge role to view print jobs for diagnostics
ALTER POLICY "Admins can view all print jobs" ON public.print_jobs
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'print_bridge'::app_role)
);
