CREATE POLICY "Block client access to MeSomb webhook events"
ON public.mesomb_webhook_events
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);