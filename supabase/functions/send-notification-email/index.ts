import { Resend } from 'npm:resend@4.0.0'
import React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { SubscriptionExpiryEmail } from './_templates/subscription-expiry.tsx'
import { PaymentConfirmedEmail } from './_templates/payment-confirmed.tsx'
import { AdminMessageEmail } from './_templates/admin-message.tsx'
import { AccountActivityEmail } from './_templates/account-activity.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailNotificationRequest {
  userId: string
  title: string
  message: string
  type: string
  priority?: string
  metadata?: any
  actionUrl?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const {
      userId,
      title,
      message,
      type,
      priority = 'normal',
      metadata = {},
      actionUrl,
    }: EmailNotificationRequest = await req.json()

    console.log('Processing email notification request:', { userId, type, title })

    // Get user's email and preferences
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, preferred_language')
      .eq('id', userId)
      .single()

    if (profileError || !profile?.email) {
      console.error('Failed to get user profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'User email not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check email preferences
    const { data: preferences, error: prefError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (prefError) {
      console.error('Failed to get notification preferences:', prefError)
    }

    // Check if email is enabled and if this notification type is allowed
    if (preferences && !preferences.email_enabled) {
      console.log('Email notifications disabled for user:', userId)
      return new Response(
        JSON.stringify({ success: true, message: 'Email notifications disabled for user' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check specific notification type preferences
    const typePreferenceMap: { [key: string]: string } = {
      'subscription_expiry': 'email_subscription_expiry',
      'payment_confirmed': 'email_payment_confirmed',
      'admin_message': 'email_admin_messages',
      'account_activity': 'email_account_activity',
    }

    const preferenceKey = typePreferenceMap[type]
    if (preferenceKey && preferences && !preferences[preferenceKey]) {
      console.log(`Email disabled for type ${type} for user:`, userId)
      return new Response(
        JSON.stringify({ success: true, message: `Email notifications disabled for ${type}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Select and render appropriate template
    let htmlContent: string
    const baseUrl = supabaseUrl.replace('.supabase.co', '.lovable.app')
    const fullActionUrl = actionUrl ? `${baseUrl}${actionUrl}` : `${baseUrl}/dashboard`

    switch (type) {
      case 'subscription_expiry':
        htmlContent = await renderAsync(
          React.createElement(SubscriptionExpiryEmail, {
            planName: metadata.plan_name,
            daysRemaining: metadata.days_remaining,
            expiresAt: metadata.expires_at,
            actionUrl: fullActionUrl,
          })
        )
        break

      case 'payment_confirmed':
        htmlContent = await renderAsync(
          React.createElement(PaymentConfirmedEmail, {
            amount: metadata.amount,
            currency: metadata.currency,
            transactionId: metadata.transaction_id,
            planName: metadata.plan_name,
            actionUrl: fullActionUrl,
          })
        )
        break

      case 'admin_message':
        htmlContent = await renderAsync(
          React.createElement(AdminMessageEmail, {
            title,
            message,
            actionUrl: fullActionUrl,
            priority,
          })
        )
        break

      case 'account_activity':
        htmlContent = await renderAsync(
          React.createElement(AccountActivityEmail, {
            title,
            message,
            actionUrl: fullActionUrl,
            activityType: metadata.activity_type || 'general',
          })
        )
        break

      default:
        // Generic email for unknown types
        htmlContent = await renderAsync(
          React.createElement(AdminMessageEmail, {
            title,
            message,
            actionUrl: fullActionUrl,
            priority,
          })
        )
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'ExamHub <notifications@resend.dev>', // Replace with your verified domain
      to: [profile.email],
      subject: title,
      html: htmlContent,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Email sent successfully:', data)

    return new Response(
      JSON.stringify({ success: true, emailId: data.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in send-notification-email function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
