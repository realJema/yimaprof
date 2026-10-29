CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 100),
  last_name text NOT NULL CHECK (char_length(last_name) BETWEEN 1 AND 100),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  message text NOT NULL CHECK (char_length(message) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can send a contact message" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read contact messages" ON public.contact_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.notify_admins_contact_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, priority)
  SELECT ur.user_id,
         'Nouveau message de contact : ' || left(NEW.subject, 150),
         NEW.first_name || ' ' || NEW.last_name || ' (' || NEW.email || ') : ' || left(NEW.message, 2000),
         'admin_message', 'normal'
  FROM public.user_roles ur WHERE ur.role = 'admin'::app_role;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_admins_contact_message() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER contact_messages_notify_admins AFTER INSERT ON public.contact_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_contact_message();