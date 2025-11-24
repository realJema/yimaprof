-- Create trigger function to send email notifications automatically
CREATE OR REPLACE FUNCTION public.trigger_email_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  notification_metadata jsonb;
BEGIN
  -- Build metadata from notification
  notification_metadata := COALESCE(NEW.metadata, '{}'::jsonb);
  
  -- Call the edge function asynchronously using pg_net
  PERFORM
    net.http_post(
      url := 'https://nrcdtxgmlhxbtfppxqop.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'userId', NEW.user_id,
        'title', NEW.title,
        'message', NEW.message,
        'type', NEW.type,
        'priority', COALESCE(NEW.priority, 'normal'),
        'metadata', notification_metadata,
        'actionUrl', NEW.action_url
      )
    );
  
  RETURN NEW;
END;
$$;

-- Create trigger on notifications table
DROP TRIGGER IF EXISTS send_email_on_notification ON public.notifications;
CREATE TRIGGER send_email_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_email_notification();