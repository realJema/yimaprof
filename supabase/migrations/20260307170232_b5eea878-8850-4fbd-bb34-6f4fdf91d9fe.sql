CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  user_ip text,
  tokens_estimate integer,
  status text DEFAULT 'success',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view ai_usage_logs" ON public.ai_usage_logs FOR SELECT USING (is_admin(auth.uid()));
CREATE POLICY "Edge functions can insert" ON public.ai_usage_logs FOR INSERT WITH CHECK (true);
CREATE INDEX idx_ai_usage_created ON public.ai_usage_logs(created_at);