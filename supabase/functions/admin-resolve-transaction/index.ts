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
    const { action, transactionId } = requestBody;
    
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
      const metadata = transaction.metadata as { plan_id?: string; referred_by?: string } || {};
      
      if (!metadata.plan_id) {
        return new Response(JSON.stringify({ error: 'Transaction has no plan_id in metadata' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const { data: result, error: rpcError } = await supabase.rpc('complete_payment_transaction', {
        p_transaction_id: transactionId,
        p_plan_id: metadata.plan_id,
        p_user_id: transaction.user_id,
        p_referred_by: metadata.referred_by || null
      });
      
      if (rpcError) {
        return new Response(JSON.stringify({ 
          error: 'Failed to complete transaction',
          details: rpcError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Log the admin action
      await supabase.rpc('log_audit', {
        p_action: 'admin_force_complete_transaction',
        p_target_type: 'transaction',
        p_target_id: transactionId,
        p_metadata: { 
          admin_id: user.id,
          result: result 
        }
      });
      
      return new Response(JSON.stringify({
        success: true,
        result,
        message: 'Transaction force-completed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Action: force-fail - Force fail the transaction
    if (action === 'force-fail') {
      const { reason } = requestBody;
      
      const { data: result, error: rpcError } = await supabase.rpc('fail_payment_transaction', {
        p_transaction_id: transactionId,
        p_reason: reason || 'Admin force-failed'
      });
      
      if (rpcError) {
        return new Response(JSON.stringify({ 
          error: 'Failed to fail transaction',
          details: rpcError.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Log the admin action
      await supabase.rpc('log_audit', {
        p_action: 'admin_force_fail_transaction',
        p_target_type: 'transaction',
        p_target_id: transactionId,
        p_metadata: { 
          admin_id: user.id,
          reason: reason || 'Admin force-failed',
          result: result 
        }
      });
      
      return new Response(JSON.stringify({
        success: true,
        result,
        message: 'Transaction force-failed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Action: verify-and-resolve - Check MeSomb and auto-resolve
    if (action === 'verify-and-resolve') {
      if (!transaction.provider_reference) {
        // No reference means it never got to MeSomb - fail it
        const { data: result } = await supabase.rpc('fail_payment_transaction', {
          p_transaction_id: transactionId,
          p_reason: 'Admin verify: No provider reference - payment never initiated'
        });
        
        await supabase.rpc('log_audit', {
          p_action: 'admin_verify_resolve_transaction',
          p_target_type: 'transaction',
          p_target_id: transactionId,
          p_metadata: { 
            admin_id: user.id,
            resolution: 'failed',
            reason: 'no_provider_reference'
          }
        });
        
        return new Response(JSON.stringify({
          success: true,
          resolution: 'failed',
          reason: 'No provider reference',
          result
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
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
        const mesombTxs = await paymentOp.getTransactions([transaction.provider_reference]);
        const mesombTx = mesombTxs?.[0];
        
        if (!mesombTx) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Transaction not found in MeSomb',
            transaction
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        const metadata = transaction.metadata as { plan_id?: string; referred_by?: string } || {};
        
        if (mesombTx.status === 'SUCCESS') {
          const { data: result } = await supabase.rpc('complete_payment_transaction', {
            p_transaction_id: transactionId,
            p_plan_id: metadata.plan_id,
            p_user_id: transaction.user_id,
            p_referred_by: metadata.referred_by || null
          });
          
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
            result
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else if (mesombTx.status === 'FAILED' || mesombTx.status === 'CANCELLED') {
          const { data: result } = await supabase.rpc('fail_payment_transaction', {
            p_transaction_id: transactionId,
            p_reason: `Admin verify: MeSomb status ${mesombTx.status}`
          });
          
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
            mesomb_status: mesombTx.status,
            result
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
