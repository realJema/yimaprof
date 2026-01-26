-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop the old function and create an enhanced version
DROP FUNCTION IF EXISTS public.check_subscription_expiry();

-- Create the enhanced subscription expiry check function
-- Sends targeted notifications at 10, 5, 3, 0 days before expiration
CREATE OR REPLACE FUNCTION public.check_subscription_expiry()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  count INTEGER := 0;
  subscription_record RECORD;
  days_remaining INTEGER;
  notification_milestone TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Check each milestone: 10, 5, 3, 0 days
  FOR subscription_record IN
    SELECT 
      s.user_id, 
      s.expires_at, 
      sp.name as plan_name, 
      COALESCE(p.preferred_language, 'fr') as preferred_language
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    JOIN profiles p ON s.user_id = p.id
    WHERE s.status = 'active'
      AND (
        -- 10 days: between 9.5 and 10.5 days (give window for daily run)
        (s.expires_at BETWEEN now() + INTERVAL '9 days 12 hours' AND now() + INTERVAL '10 days 12 hours')
        -- 5 days: between 4.5 and 5.5 days
        OR (s.expires_at BETWEEN now() + INTERVAL '4 days 12 hours' AND now() + INTERVAL '5 days 12 hours')
        -- 3 days: between 2.5 and 3.5 days
        OR (s.expires_at BETWEEN now() + INTERVAL '2 days 12 hours' AND now() + INTERVAL '3 days 12 hours')
        -- Day of: between 0 and 1 day
        OR (s.expires_at BETWEEN now() AND now() + INTERVAL '1 day')
      )
  LOOP
    -- Calculate days remaining (rounded)
    days_remaining := GREATEST(0, EXTRACT(day FROM (subscription_record.expires_at - now()))::INTEGER);
    
    -- Normalize milestone (in case of edge cases)
    IF days_remaining >= 9 THEN
      notification_milestone := 'expiry_10_days';
      days_remaining := 10;
    ELSIF days_remaining >= 4 AND days_remaining <= 6 THEN
      notification_milestone := 'expiry_5_days';
      days_remaining := 5;
    ELSIF days_remaining >= 2 AND days_remaining <= 4 THEN
      notification_milestone := 'expiry_3_days';
      days_remaining := 3;
    ELSE
      notification_milestone := 'expiry_0_days';
      days_remaining := 0;
    END IF;
    
    -- Skip if already notified for this milestone
    IF EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = subscription_record.user_id
        AND n.type = 'subscription_expiry'
        AND n.metadata->>'milestone' = notification_milestone
        AND n.created_at > now() - INTERVAL '1 day'
    ) THEN
      CONTINUE;
    END IF;
    
    -- Set messages based on days remaining and language
    IF days_remaining = 10 THEN
      IF subscription_record.preferred_language = 'en' THEN
        notification_title := 'Your subscription expires soon';
        notification_message := 'Your ' || subscription_record.plan_name || ' subscription will expire in 10 days. Renew now to continue enjoying unlimited access to exams, corrections, and evaluations.';
      ELSE
        notification_title := 'Votre abonnement expire bientôt';
        notification_message := 'Votre abonnement ' || subscription_record.plan_name || ' expire dans 10 jours. Renouvelez maintenant pour continuer à profiter d''un accès illimité aux examens, corrections et évaluations.';
      END IF;
    ELSIF days_remaining = 5 THEN
      IF subscription_record.preferred_language = 'en' THEN
        notification_title := 'Only 5 days of premium access left';
        notification_message := 'Don''t lose access to your premium features! Your ' || subscription_record.plan_name || ' subscription expires in 5 days. Renew today and keep learning.';
      ELSE
        notification_title := 'Plus que 5 jours d''accès premium';
        notification_message := 'Ne perdez pas l''accès à vos fonctionnalités premium ! Votre abonnement ' || subscription_record.plan_name || ' expire dans 5 jours. Renouvelez aujourd''hui et continuez à apprendre.';
      END IF;
    ELSIF days_remaining = 3 THEN
      IF subscription_record.preferred_language = 'en' THEN
        notification_title := 'Final reminder: 3 days remaining';
        notification_message := 'Your ' || subscription_record.plan_name || ' subscription expires in only 3 days! Renew now to avoid losing access to 500+ exams and premium features.';
      ELSE
        notification_title := 'Dernier rappel : 3 jours restants';
        notification_message := 'Votre abonnement ' || subscription_record.plan_name || ' expire dans seulement 3 jours ! Renouvelez maintenant pour éviter de perdre l''accès à plus de 500 examens et fonctionnalités premium.';
      END IF;
    ELSE -- 0 days (expires today)
      IF subscription_record.preferred_language = 'en' THEN
        notification_title := 'Your subscription expires today';
        notification_message := 'Your ' || subscription_record.plan_name || ' subscription expires today. Renew immediately to maintain uninterrupted access to all premium content.';
      ELSE
        notification_title := 'Votre abonnement expire aujourd''hui';
        notification_message := 'Votre abonnement ' || subscription_record.plan_name || ' expire aujourd''hui. Renouvelez immédiatement pour maintenir un accès ininterrompu à tout le contenu premium.';
      END IF;
    END IF;
    
    -- Send notification with milestone metadata
    PERFORM public.send_notification(
      subscription_record.user_id,
      notification_title,
      notification_message,
      'subscription_expiry',
      CASE WHEN days_remaining <= 3 THEN 'high' ELSE 'normal' END,
      jsonb_build_object(
        'expires_at', subscription_record.expires_at,
        'days_remaining', days_remaining,
        'plan_name', subscription_record.plan_name,
        'milestone', notification_milestone
      ),
      '/subscriptions'
    );
    
    count := count + 1;
  END LOOP;
  
  RETURN count;
END;
$$;