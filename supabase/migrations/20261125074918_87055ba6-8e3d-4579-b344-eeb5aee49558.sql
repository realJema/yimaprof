REVOKE ALL ON public.mesomb_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.mesomb_webhook_events TO service_role;