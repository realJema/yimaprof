import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PaymentOperation } from 'https://esm.sh/@hachther/mesomb@2.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Check payment status function called with method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    
    const { transactionId } = requestBody;
    
    if (!transactionId) {
      console.error('Missing transactionId');
      return new Response(JSON.stringify({ error: 'Missing transactionId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header exists:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ error: 'Missing Supabase configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Invalid user:', userError);
      return new Response(JSON.stringify({ error: 'Invalid user', details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single();

    if (transactionError || !transaction) {
      console.error('Transaction not found:', transactionError);
      return new Response(JSON.stringify({ error: 'Transaction not found', details: transactionError?.message }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Transaction found:', transaction.id, 'Status:', transaction.status);

    // If transaction is already completed or failed, return status
    if (transaction.status === 'completed') {
      console.log('Transaction already completed');
      return new Response(JSON.stringify({
        status: 'completed',
        transaction: transaction
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (transaction.status === 'failed') {
      console.log('Transaction already failed');
      return new Response(JSON.stringify({
        status: 'failed',
        transaction: transaction
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For processing transactions, check MeSomb API for actual status
    if (transaction.status === 'processing' || transaction.status === 'pending') {
      const applicationKey = Deno.env.get('MESOMB_APP_KEY');
      const accessKey = Deno.env.get('MESOMB_ACCESS_KEY');
      const secretKey = Deno.env.get('MESOMB_SECRET_KEY');
      
      if (applicationKey && accessKey && secretKey && transaction.provider_reference) {
        console.log('Checking MeSomb API for transaction status...');
        
        try {
          const paymentOperation = new PaymentOperation({
            applicationKey: applicationKey,
            accessKey: accessKey,
            secretKey: secretKey,
          });
          
          // Check transaction status using the provider reference
          const mesombTransactions = await paymentOperation.getTransactions([transaction.provider_reference]);
          console.log('MeSomb getTransactions response:', mesombTransactions);
          
          if (mesombTransactions && mesombTransactions.length > 0) {
            const mesombTx = mesombTransactions[0];
            console.log('MeSomb transaction status:', mesombTx.status);
            
            // Check if payment was successful
            if (mesombTx.status === 'SUCCESS') {
              console.log('Payment confirmed by MeSomb! Activating subscription...');
              
              // Get metadata for plan_id and referred_by
              const metadata = transaction.metadata as { plan_id?: string; referred_by?: string } || {};
              const planId = metadata.plan_id;
              const referredBy = metadata.referred_by;
              
              if (planId) {
                // Activate subscription
                const { data: rpcResult, error: rpcError } = await supabase.rpc('transition_subscription_plan', {
                  p_user_id: user.id,
                  p_new_plan_id: planId,
                  p_referred_by: referredBy || null
                });
                
                if (rpcError) {
                  console.error('Failed to activate subscription:', rpcError);
                } else {
                  console.log('Subscription activated:', rpcResult);
                  
                  // Update transaction to completed with subscription_id
                  const subscriptionId = rpcResult?.new_subscription_id || null;
                  await supabase.from('transactions').update({
                    status: 'completed',
                    subscription_id: subscriptionId,
                    metadata: {
                      ...metadata,
                      mesomb_confirmed: true,
                      confirmed_at: new Date().toISOString()
                    }
                  }).eq('id', transactionId);
                  
                  return new Response(JSON.stringify({
                    status: 'completed',
                    message: 'Payment confirmed and subscription activated!',
                    transaction: { ...transaction, status: 'completed', subscription_id: subscriptionId }
                  }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                  });
                }
              }
            } else if (mesombTx.status === 'FAILED' || mesombTx.status === 'CANCELLED') {
              console.log('Payment failed/cancelled in MeSomb');
              
              // Update transaction to failed
              await supabase.from('transactions').update({
                status: 'failed',
                metadata: {
                  ...(transaction.metadata || {}),
                  mesomb_final_status: mesombTx.status,
                  failed_at: new Date().toISOString()
                }
              }).eq('id', transactionId);
              
              return new Response(JSON.stringify({
                status: 'failed',
                message: 'Payment was cancelled or failed',
                transaction: { ...transaction, status: 'failed' }
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
            // If status is PENDING or other, continue waiting
          }
        } catch (mesombError) {
          console.error('Error checking MeSomb API:', mesombError);
          // Continue with current status if MeSomb check fails
        }
      }
    }

    // Return current processing status
    console.log('Returning current transaction status:', transaction.status);
    
    return new Response(JSON.stringify({
      status: transaction.status,
      message: 'Waiting for payment confirmation...',
      transaction: transaction
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in check-payment-status function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});