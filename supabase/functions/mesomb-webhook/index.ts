import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('MeSomb Webhook received');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase configuration');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse webhook payload from MeSomb
    const payload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload, null, 2));
    
    // MeSomb webhook payload structure:
    // - pk: MeSomb transaction ID
    // - status: SUCCESS | FAILED | PENDING | REFUNDED
    // - reference: Our reference field (sub_xxx)
    // - trxID: Our transaction UUID (this is what we use)
    // - amount, fees, service, currency, etc.
    
    // Try to get our transaction ID from trxID first (preferred), then try to extract from reference
    let ourTransactionId = payload.trxID;
    
    if (!ourTransactionId && payload.reference) {
      // If reference is in format "sub_xxxxxxxx", try to find transaction
      // But for now, we expect trxID to be set correctly
      console.log('No trxID in payload, checking reference:', payload.reference);
    }
    
    if (!ourTransactionId) {
      console.error('No transaction ID found in webhook payload');
      return new Response(JSON.stringify({ error: 'Missing transaction ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const mesombStatus = payload.status;
    console.log(`Processing transaction ${ourTransactionId} with status ${mesombStatus}`);
    
    // Get transaction from database
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', ourTransactionId)
      .single();
    
    if (txError || !tx) {
      console.error('Transaction not found:', ourTransactionId, txError);
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Found transaction:', tx.id, 'Current status:', tx.status);
    
    // Idempotency: prevent duplicate processing
    if (tx.status === 'completed') {
      console.log('Transaction already completed, ignoring webhook');
      return new Response(JSON.stringify({ message: 'Already completed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (tx.status === 'failed') {
      console.log('Transaction already failed, ignoring webhook');
      return new Response(JSON.stringify({ message: 'Already failed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const metadata = (tx.metadata || {}) as { plan_id?: string; referred_by?: string };
    
    if (mesombStatus === 'SUCCESS') {
      console.log('Payment successful, activating subscription...');
      
      if (!metadata.plan_id) {
        console.error('No plan_id in transaction metadata');
        return new Response(JSON.stringify({ error: 'Missing plan_id in metadata' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Get plan duration
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('duration_days')
        .eq('id', metadata.plan_id)
        .single();
      
      const durationDays = plan?.duration_days || 30;
      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
      
      // Cancel any existing active subscription for this user
      const { error: cancelError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'canceled', 
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', tx.user_id)
        .eq('status', 'active');
      
      if (cancelError) {
        console.log('Error canceling existing subscription (may not exist):', cancelError);
      }
      
      // Create new subscription
      const { data: newSub, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: tx.user_id,
          plan_id: metadata.plan_id,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: expiresAt,
          auto_renew: true,
          referred_by: metadata.referred_by || null
        })
        .select()
        .single();
      
      if (subError) {
        console.error('Failed to create subscription:', subError);
        return new Response(JSON.stringify({ error: 'Failed to create subscription' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('Subscription created:', newSub.id);
      
      // Update transaction to completed
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          subscription_id: newSub.id,
          provider_reference: payload.pk || tx.provider_reference,
          metadata: {
            ...metadata,
            mesomb_webhook: payload,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', ourTransactionId);
      
      if (updateError) {
        console.error('Failed to update transaction:', updateError);
        // Subscription was created, so we return success anyway
      }
      
      console.log('Transaction completed successfully');
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Payment completed',
        subscription_id: newSub.id
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } else if (mesombStatus === 'FAILED' || mesombStatus === 'REFUNDED' || mesombStatus === 'CANCELLED') {
      console.log(`Payment ${mesombStatus}, marking transaction as failed`);
      
      // Update transaction to failed
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'failed',
          metadata: {
            ...metadata,
            mesomb_webhook: payload,
            failure_reason: `MeSomb status: ${mesombStatus}`,
            failed_at: new Date().toISOString()
          }
        })
        .eq('id', ourTransactionId);
      
      if (updateError) {
        console.error('Failed to update transaction:', updateError);
      }
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Payment marked as failed'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } else if (mesombStatus === 'PENDING') {
      console.log('Payment still pending, no action taken');
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Payment still pending'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Unknown status
    console.log('Unknown MeSomb status:', mesombStatus);
    return new Response(JSON.stringify({ 
      message: `Unknown status: ${mesombStatus}`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
