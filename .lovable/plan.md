

## Subscription Engagement and Notification System Enhancement

This plan implements a comprehensive subscription notification system with expiration reminders, re-subscription incentives, and improved access messaging to encourage subscriptions.

---

### Overview of Changes

| Feature | Description |
|---------|-------------|
| **Expiration Notifications** | Send notifications at 10, 5, 3 days before and on expiration day |
| **Re-subscription Messages** | Incentivizing messages in notifications encouraging renewal |
| **Free Exam CTA** | Add visible subscription link on free exam cards and viewer |
| **Access Denied Enhancement** | Update access denied messages with encouraging subscription CTAs |

---

### Part 1: Database Changes

#### 1.1 Update `check_subscription_expiry` Function

Replace the current function that only notifies within 7 days with a new version that sends targeted notifications at specific milestones:

- **10 days before**: Early reminder with friendly tone
- **5 days before**: Stronger reminder emphasizing benefits
- **3 days before**: Urgent reminder with countdown
- **Day of expiration**: Final notice that access ends today

The function will track which milestone was already notified using the `metadata` field in notifications to avoid duplicate notifications.

```text
Current: Sends 1 notification within 7 days, prevents duplicates within 6 days
New: Sends 4 separate notifications at 10, 5, 3, 0 days, tracks each milestone separately
```

#### 1.2 Enable pg_cron Extension

Enable the `pg_cron` extension to schedule daily execution of the subscription expiry check function.

#### 1.3 Create Scheduled Job

Create a cron job that runs `check_subscription_expiry()` daily at 8:00 AM UTC.

---

### Part 2: Notification Message Content

#### 2.1 Incentivizing Messages (French/English)

| Days | Title (FR) | Title (EN) |
|------|-----------|------------|
| 10 | "Votre abonnement expire bientot" | "Your subscription expires soon" |
| 5 | "Plus que 5 jours d'acces premium" | "Only 5 days of premium access left" |
| 3 | "Dernier rappel: 3 jours restants" | "Final reminder: 3 days remaining" |
| 0 | "Votre abonnement expire aujourd'hui" | "Your subscription expires today" |

Messages will include:
- Current plan name
- Expiration date
- Benefits they will lose
- Clear CTA to renew

---

### Part 3: Frontend Changes

#### 3.1 Free Exam Cards - Add Subscription CTA

**File**: `src/pages/Exams2.tsx`

On exam cards with `visibility === 'free'`, add a subtle link encouraging users to subscribe for more content.

Update the exam card component (around lines 819-870):
- Add a "Unlock all exams" link below the Free badge for non-subscribers
- Style it as a small, non-intrusive link with an arrow icon

#### 3.2 Exam Viewer - Subscription Banner for Free Exams

**File**: `src/pages/ExamViewer.tsx`

For users viewing free exams without a subscription:
- Add a banner below the exam details encouraging subscription
- Include message like "Enjoying this free exam? Subscribe to access 500+ premium exams"
- Include a clear Subscribe button

Add a new component section around line 762-850 (before main content).

#### 3.3 Access Denied Component Enhancement

**File**: `src/pages/ExamViewer.tsx`

Currently, when `hasAccess === false`, the exam still loads but treats the user as a free user. We need to add a proper paywall for premium exams when accessed by non-subscribers.

Create a new access denied view that shows:
- Friendly icon (Lock or Crown)
- Title: "Premium Content" / "Contenu Premium"
- Message explaining the value proposition
- List of benefits (unlimited exams, corrections, evaluations)
- Price indication with "From X XAF/month"
- Prominent Subscribe button
- Link to view free exams instead

#### 3.4 Dashboard - Subscription Expiry Warning

**File**: `src/pages/Dashboard.tsx`

In the subscription card section (lines 613-671), add visual warning indicators:
- Show days remaining with color coding (green > 7 days, yellow 3-7 days, red < 3 days)
- Add urgency badge for expiring subscriptions
- Show "Renew Now" button when expiring soon

---

### Part 4: Email Template Enhancement

**File**: `supabase/functions/send-notification-email/_templates/subscription-expiry.tsx`

Update the email template to:
- Accept a `daysRemaining` prop to customize urgency level
- Show different messaging based on days remaining
- Include countdown emphasis for urgent notifications
- Add value proposition reminders
- Include the subscription link with tracking

---

### Technical Implementation Details

#### Database Function - `check_subscription_expiry_v2`

```sql
-- Check for subscriptions expiring at specific milestones
-- and send targeted notifications for each milestone
CREATE OR REPLACE FUNCTION check_subscription_expiry_v2()
RETURNS integer AS $$
DECLARE
  count INTEGER := 0;
  subscription RECORD;
  days_remaining INTEGER;
  notification_milestone TEXT;
  title_fr TEXT;
  title_en TEXT;
  message_fr TEXT;
  message_en TEXT;
BEGIN
  -- Check each milestone: 10, 5, 3, 0 days
  FOR subscription IN
    SELECT s.user_id, s.expires_at, sp.name as plan_name, p.preferred_language
    FROM subscriptions s
    JOIN subscription_plans sp ON s.plan_id = sp.id
    JOIN profiles p ON s.user_id = p.id
    WHERE s.status = 'active'
      AND (
        -- 10 days: between 10 and 11 days
        (s.expires_at BETWEEN now() + INTERVAL '10 days' AND now() + INTERVAL '11 days')
        -- 5 days: between 5 and 6 days
        OR (s.expires_at BETWEEN now() + INTERVAL '5 days' AND now() + INTERVAL '6 days')
        -- 3 days: between 3 and 4 days
        OR (s.expires_at BETWEEN now() + INTERVAL '3 days' AND now() + INTERVAL '4 days')
        -- Day of: between 0 and 1 day
        OR (s.expires_at BETWEEN now() AND now() + INTERVAL '1 day')
      )
  LOOP
    days_remaining := GREATEST(0, EXTRACT(days FROM (subscription.expires_at - now()))::INTEGER);
    
    -- Determine milestone and check if already notified
    notification_milestone := 'expiry_' || days_remaining::TEXT || '_days';
    
    -- Skip if already notified for this milestone
    IF EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = subscription.user_id
        AND n.type = 'subscription_expiry'
        AND n.metadata->>'milestone' = notification_milestone
        AND n.created_at > now() - INTERVAL '1 day'
    ) THEN
      CONTINUE;
    END IF;
    
    -- Set messages based on days remaining
    -- [Message content per milestone]
    
    PERFORM send_notification(...);
    count := count + 1;
  END LOOP;
  
  RETURN count;
END;
$$ LANGUAGE plpgsql;
```

#### Cron Job Setup

```sql
SELECT cron.schedule(
  'check-subscription-expiry-daily',
  '0 8 * * *',  -- 8:00 AM UTC daily
  $$SELECT check_subscription_expiry_v2()$$
);
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[new].sql` | New expiry check function + cron job |
| `src/pages/Exams2.tsx` | Add subscription CTA on free exam cards |
| `src/pages/ExamViewer.tsx` | Add paywall for premium exams + banner for free exams |
| `src/pages/Dashboard.tsx` | Add expiry warning indicators |
| `supabase/functions/send-notification-email/_templates/subscription-expiry.tsx` | Enhanced messaging |

---

### UI Mockups

**Free Exam Card Enhancement:**
```text
+----------------------------------+
| [Free] [Mathematics]             |
| Exam Title Goes Here             |
| Terminale D                      |
|                                  |
| [2024-2025] [2h]                |
| School Name                      |
| - - - - - - - - - - - - - - - - |
| Unlock 500+ exams -> Subscribe   |
+----------------------------------+
```

**Access Denied for Premium Exam:**
```text
+----------------------------------------+
|              [Crown Icon]              |
|          Premium Content               |
|                                        |
|  This exam requires a subscription.    |
|                                        |
|  With Premium you get:                 |
|  - Unlimited exam access               |
|  - Full corrections and solutions      |
|  - Evaluation mode with scoring        |
|  - Progress tracking                   |
|                                        |
|  Starting from 2,500 XAF/month         |
|                                        |
|     [  Subscribe Now  ]                |
|                                        |
|  Or browse our free exams ->           |
+----------------------------------------+
```

**Dashboard Subscription Warning:**
```text
+----------------------------------+
| Subscription         [! 3 days] |
| --------------------------------|
| Current Plan: Premium           |
| Status: Active                  |
| Expires: Jan 29, 2026           |
|                                 |
| Your subscription expires soon! |
| Renew now to keep access.       |
|                                 |
| [  Renew Now  ]                 |
+----------------------------------+
```

---

### Summary

This implementation ensures users are:
1. **Proactively notified** at multiple points before expiration (10, 5, 3, 0 days)
2. **Encouraged to subscribe** when viewing free content with visible CTAs
3. **Clearly informed** when accessing premium content without a subscription
4. **Motivated to renew** with value-focused messaging and urgency indicators

