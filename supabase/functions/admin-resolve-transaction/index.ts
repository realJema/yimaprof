import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PaymentOperation } from 'https://esm.sh/@hachther/mesomb@2.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Admin resolve transaction function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Verify admin user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('is_admin', { user_id: user.id });
    
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const requestBody = await req.json();
    const { action, transactionId, reason } = requestBody;
    
    if (!transactionId) {
      return new Response(JSON.stringify({ error: 'Missing transactionId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();
    
    if (txError || !transaction) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('Transaction found:', transaction.id, 'Status:', transaction.status);
    const metadata = (transaction.metadata || {}) as { plan_id?: string; referred_by?: string };
    
    // Action: check - Just check MeSomb status
    if (action === 'check') {
      if (!transaction.provider_reference) {
        return new Response(JSON.stringify({
          transaction,
          mesomb_status: null,
          message: 'No provider reference - cannot check MeSomb'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const applicationKey = Deno.env.get('MESOMB_APP_KEY');
      const accessKey = Deno.env.get('MESOMB_ACCESS_KEY');
      const secretKey = Deno.env.get('MESOMB_SECRET_KEY');
      
      if (!applicationKey || !accessKey || !secretKey) {
        return new Response(JSON.stringify({ 
          transaction,
          error: 'MeSomb not configured' 
        }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const paymentOp = new PaymentOperation({
        applicationKey,
        accessKey,
        secretKey,
      });
      
      try {
        const mesombTxs = await paymentOp.getTransactions([transaction.provider_reference]);
        
        return new Response(JSON.stringify({
          transaction,
          mesomb_status: mesombTxs?.[0] || null,
          message: 'MeSomb status retrieved'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({
          transaction,
          mesomb_error: e instanceof Error ? e.message : 'Unknown error',
          message: 'Failed to check MeSomb status'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Action: force-complete - Force complete the transaction
    if (action === 'force-complete') {
      if (!metadata.plan_id) {
        return new Response(JSON.stringify({ error: 'Transaction has no plan_id in metadata' }), {
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
      
      // Cancel existing active subscription
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('user_id', transaction.user_id)
        .eq('status', 'active');
      
      // Create new subscription
      const { data: newSub, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: transaction.user_id,
          plan_id: metadata.plan_id,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
          auto_renew: true,
          referred_by: metadata.referred_by || null
        })
        .select()
        .single();
      
      if (subError) {
        return new Response(JSON.stringify({ 
          error: 'Failed to create subscription',
          details: subError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Update transaction to completed
      await supabase
        .from('transactions')
        .update({
          status: 'completed',
          subscription_id: newSub.id,
          metadata: {
            ...metadata,
            admin_force_completed: true,
            admin_id: user.id,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', transactionId);
      
      // Log the admin action
      await supabase.rpc('log_audit', {
        p_action: 'admin_force_complete_transaction',
        p_target_type: 'transaction',
        p_target_id: transactionId,
        p_metadata: { 
          admin_id: user.id,
          subscription_id: newSub.id
        }
      });
      
      return new Response(JSON.stringify({
        success: true,
        subscription_id: newSub.id,
        message: 'Transaction force-completed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Action: force-fail - Force fail the transaction
    if (action === 'force-fail') {
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          metadata: {
            ...metadata,
            admin_force_failed: true,
            admin_id: user.id,
            failure_reason: reason || 'Admin force-failed',
            failed_at: new Date().toISOString()
          }
        })
        .eq('id', transactionId);
      
      // Log the admin action
      await supabase.rpc('log_audit', {
        p_action: 'admin_force_fail_transaction',
        p_target_type: 'transaction',
        p_target_id: transactionId,
        p_metadata: { 
          admin_id: user.id,
          reason: reason || 'Admin force-failed'
        }
      });
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Transaction force-failed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Action: verify-and-resolve - Check MeSomb and auto-resolve
    if (action === 'verify-and-resolve') {
      const applicationKey = Deno.env.get('MESOMB_APP_KEY');
      const accessKey = Deno.env.get('MESOMB_ACCESS_KEY');
      const secretKey = Deno.env.get('MESOMB_SECRET_KEY');
      
      if (!applicationKey || !accessKey || !secretKey) {
        return new Response(JSON.stringify({ error: 'MeSomb not configured' }), {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const paymentOp = new PaymentOperation({
        applicationKey,
        accessKey,
        secretKey,
      });
      
      try {
        // Try EXTERNAL lookup first (using our transaction ID)
        let mesombTxs = null;
        try {
          mesombTxs = await paymentOp.checkTransactions([transactionId], 'EXTERNAL');
        } catch (e) {
          console.log('EXTERNAL lookup failed:', e);
        }
        
        // Fallback to provider_reference
        if ((!mesombTxs || mesombTxs.length === 0) && transaction.provider_reference) {
          try {
            mesombTxs = await paymentOp.checkTransactions([transaction.provider_reference], 'MESOMB');
          } catch (e) {
            console.log('MESOMB lookup failed:', e);
          }
        }
        
        if (!mesombTxs || mesombTxs.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Transaction not found in MeSomb',
            transaction
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const mesombTx = mesombTxs[0];
        
        if (mesombTx.status === 'SUCCESS') {
          // Get plan duration
          const { data: plan } = await supabase
            .from('subscription_plans')
            .select('duration_days')
            .eq('id', metadata.plan_id)
            .single();
          
          const durationDays = plan?.duration_days || 30;
          
          // Cancel existing subscription
          await supabase
            .from('subscriptions')
            .update({ status: 'canceled', updated_at: new Date().toISOString() })
            .eq('user_id', transaction.user_id)
            .eq('status', 'active');
          
          // Create new subscription
          const { data: newSub } = await supabase
            .from('subscriptions')
            .insert({
              user_id: transaction.user_id,
              plan_id: metadata.plan_id,
              status: 'active',
              started_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
              auto_renew: true,
              referred_by: metadata.referred_by || null
            })
            .select()
            .single();
          
          // Update transaction
          await supabase
            .from('transactions')
            .update({
              status: 'completed',
              subscription_id: newSub?.id,
              metadata: {
                ...metadata,
                admin_verified: true,
                admin_id: user.id,
                mesomb_status: mesombTx.status,
                completed_at: new Date().toISOString()
              }
            })
            .eq('id', transactionId);
          
          await supabase.rpc('log_audit', {
            p_action: 'admin_verify_resolve_transaction',
            p_target_type: 'transaction',
            p_target_id: transactionId,
            p_metadata: { 
              admin_id: user.id,
              resolution: 'completed',
              mesomb_status: mesombTx.status
            }
          });
          
          return new Response(JSON.stringify({
            success: true,
            resolution: 'completed',
            mesomb_status: mesombTx.status,
            subscription_id: newSub?.id
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
          
        } else if (mesombTx.status === 'FAILED' || mesombTx.status === 'CANCELLED') {
          await supabase
            .from('transactions')
            .update({
              status: 'failed',
              metadata: {
                ...metadata,
                admin_verified: true,
                admin_id: user.id,
                mesomb_status: mesombTx.status,
                failed_at: new Date().toISOString()
              }
            })
            .eq('id', transactionId);
          
          await supabase.rpc('log_audit', {
            p_action: 'admin_verify_resolve_transaction',
            p_target_type: 'transaction',
            p_target_id: transactionId,
            p_metadata: { 
              admin_id: user.id,
              resolution: 'failed',
              mesomb_status: mesombTx.status
            }
          });
          
          return new Response(JSON.stringify({
            success: true,
            resolution: 'failed',
            mesomb_status: mesombTx.status
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
          
        } else {
          // Still pending in MeSomb
          return new Response(JSON.stringify({
            success: false,
            resolution: 'pending',
            mesomb_status: mesombTx.status,
            message: 'Payment still pending in MeSomb'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } catch (e) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to check MeSomb',
          details: e instanceof Error ? e.message : 'Unknown error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      error: 'Invalid action. Use: check, force-complete, force-fail, or verify-and-resolve' 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in admin-resolve-transaction function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
