-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'subscription_expiry', 'payment_confirmed', 'admin_message', 'account_activity'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high'
  
  -- Recipient info
  user_id UUID NOT NULL,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Optional metadata
  metadata JSONB DEFAULT '{}',
  action_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Admin tracking
  created_by UUID,
  is_broadcast BOOLEAN DEFAULT false
);

-- Add indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications"
  ON public.notifications FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- Email preferences
  email_enabled BOOLEAN DEFAULT true,
  email_subscription_expiry BOOLEAN DEFAULT true,
  email_payment_confirmed BOOLEAN DEFAULT true,
  email_admin_messages BOOLEAN DEFAULT true,
  
  -- In-app preferences
  inapp_subscription_expiry BOOLEAN DEFAULT true,
  inapp_payment_confirmed BOOLEAN DEFAULT true,
  inapp_admin_messages BOOLEAN DEFAULT true,
  inapp_account_activity BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to send notification to user
CREATE OR REPLACE FUNCTION public.send_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_priority TEXT DEFAULT 'normal',
  p_metadata JSONB DEFAULT '{}',
  p_action_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
  user_prefs RECORD;
BEGIN
  -- Check user preferences
  SELECT * INTO user_prefs
  FROM public.notification_preferences
  WHERE user_id = p_user_id;
  
  -- If preferences exist, check if this type is enabled
  IF user_prefs IS NOT NULL THEN
    IF p_type = 'subscription_expiry' AND NOT user_prefs.inapp_subscription_expiry THEN
      RETURN NULL;
    END IF;
    IF p_type = 'payment_confirmed' AND NOT user_prefs.inapp_payment_confirmed THEN
      RETURN NULL;
    END IF;
    IF p_type = 'admin_message' AND NOT user_prefs.inapp_admin_messages THEN
      RETURN NULL;
    END IF;
    IF p_type = 'account_activity' AND NOT user_prefs.inapp_account_activity THEN
      RETURN NULL;
    END IF;
  END IF;
  
  INSERT INTO public.notifications (
    user_id, title, message, type, priority, metadata, action_url, created_by
  ) VALUES (
    p_user_id, p_title, p_message, p_type, p_priority, p_metadata, p_action_url, auth.uid()
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to broadcast notification to multiple users
CREATE OR REPLACE FUNCTION public.broadcast_notification(
  p_user_ids UUID[],
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_priority TEXT DEFAULT 'normal',
  p_metadata JSONB DEFAULT '{}',
  p_action_url TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
  count INTEGER := 0;
BEGIN
  -- Only admins can broadcast
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  FOREACH user_id IN ARRAY p_user_ids
  LOOP
    PERFORM public.send_notification(
      user_id, p_title, p_message, p_type, p_priority, p_metadata, p_action_url
    );
    count := count + 1;
  END LOOP;
  
  RETURN count;
END;
$$;

-- Function to check subscription expiry and send notifications
CREATE OR REPLACE FUNCTION public.check_subscription_expiry()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count INTEGER := 0;
  subscription RECORD;
  days_remaining INTEGER;
BEGIN
  FOR subscription IN
    SELECT s.user_id, s.expires_at, sp.name as plan_name
    FROM public.subscriptions s
    JOIN public.subscription_plans sp ON s.plan_id = sp.id
    WHERE s.status = 'active'
      AND s.expires_at BETWEEN now() AND now() + INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = s.user_id
          AND n.type = 'subscription_expiry'
          AND n.created_at > now() - INTERVAL '6 days'
      )
  LOOP
    days_remaining := EXTRACT(days FROM (subscription.expires_at - now()))::INTEGER;
    
    PERFORM public.send_notification(
      subscription.user_id,
      'Subscription Expiring Soon',
      'Your ' || subscription.plan_name || ' subscription will expire in ' || days_remaining || ' days. Renew now to continue accessing premium content.',
      'subscription_expiry',
      'high',
      jsonb_build_object('expires_at', subscription.expires_at, 'days_remaining', days_remaining),
      '/subscriptions'
    );
    count := count + 1;
  END LOOP;
  
  RETURN count;
END;
$$;

-- Trigger for payment confirmation
CREATE OR REPLACE FUNCTION public.notify_payment_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM public.send_notification(
      NEW.user_id,
      'Payment Confirmed',
      'Your payment of ' || NEW.amount || ' ' || NEW.currency || ' has been successfully processed.',
      'payment_confirmed',
      'normal',
      jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount, 'currency', NEW.currency),
      '/dashboard'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_payment_notification
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payment_completed();

-- Trigger to create default notification preferences for new users
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();