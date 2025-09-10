import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    console.log('Transaction found:', transaction);

    // If transaction is already completed or failed, return status
    if (transaction.status === 'completed' || transaction.status === 'failed') {
      console.log('Transaction already in final state:', transaction.status);
      return new Response(JSON.stringify({
        status: transaction.status,
        transaction: transaction
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If transaction is processing, check with MeSomb API
    if (transaction.status === 'processing' && transaction.provider_reference) {
      console.log('Checking MeSomb status for reference:', transaction.provider_reference);
      
      try {
        const mesombAccessKey = Deno.env.get('MESOMB_ACCESS_KEY');
        const mesombAppKey = Deno.env.get('MESOMB_APP_KEY');
        
        if (mesombAccessKey && mesombAppKey) {
          // MeSomb API endpoint for checking transaction status
          const statusUrl = `https://mesomb.hachther.com/api/v1.1/payment/status/${transaction.provider_reference}/`;
          
          const response = await fetch(statusUrl, {
            method: 'GET',
            headers: {
              'X-MeSomb-Application': mesombAppKey,
              'X-MeSomb-AccessKey': mesombAccessKey,
              'Authorization': `Bearer ${mesombAccessKey}`
            }
          });

          if (response.ok) {
            const statusResult = await response.json();
            console.log('MeSomb status result:', statusResult);
            
            // Update transaction based on MeSomb response
            let newStatus = transaction.status;
            if (statusResult.success && statusResult.transaction) {
              if (statusResult.transaction.status === 'SUCCESS') {
                newStatus = 'completed';
                
                // Activate subscription
                const { data: rpcResult, error: rpcError } = await supabase.rpc('transition_subscription_plan', {
                  p_user_id: user.id,
                  p_new_plan_id: transaction.metadata.plan_id
                });
                
                if (rpcError) {
                  console.error('Failed to activate subscription:', rpcError);
                }
              } else if (statusResult.transaction.status === 'FAILED') {
                newStatus = 'failed';
              }
              
              // Update transaction in database
              await supabase
                .from('transactions')
                .update({
                  status: newStatus,
                  metadata: {
                    ...transaction.metadata,
                    mesomb_status_check: statusResult
                  }
                })
                .eq('id', transactionId);
                
              return new Response(JSON.stringify({
                status: newStatus,
                transaction: { ...transaction, status: newStatus }
              }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          } else {
            console.error('MeSomb status check failed:', response.status);
          }
        }
      } catch (error) {
        console.error('Error checking MeSomb status:', error);
      }
    }
    
    // Return current status if no update needed
    console.log('Returning current transaction status:', transaction.status);
    
    return new Response(JSON.stringify({
      status: transaction.status,
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