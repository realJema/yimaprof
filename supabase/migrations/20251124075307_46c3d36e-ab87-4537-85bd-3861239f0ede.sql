-- Fix the trigger to use proper service role key
CREATE OR REPLACE FUNCTION public.trigger_email_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Call the edge function asynchronously using pg_net
  -- Note: Using anon key for edge function call since it's publicly accessible
  PERFORM
    net.http_post(
      url := 'https://nrcdtxgmlhxbtfppxqop.supabase.co/functions/v1/send-notification-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', current_setting('app.settings.anon_key', true)
      ),
      body := jsonb_build_object(
        'userId', NEW.user_id,
        'title', NEW.title,
        'message', NEW.message,
        'type', NEW.type,
        'priority', COALESCE(NEW.priority, 'normal'),
        'metadata', COALESCE(NEW.metadata, '{}'::jsonb),
        'actionUrl', NEW.action_url
      )
    );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the notification insert
  RAISE WARNING 'Failed to trigger email notification: %', SQLERRM;
  RETURN NEW;
END;
$$;