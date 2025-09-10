import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('MeSomb Payment function called with method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log all environment variables (safely)
    console.log('Environment check:');
    console.log('SUPABASE_URL exists:', !!Deno.env.get('SUPABASE_URL'));
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    console.log('MESOMB_APP_KEY exists:', !!Deno.env.get('MESOMB_APP_KEY'));
    console.log('MESOMB_ACCESS_KEY exists:', !!Deno.env.get('MESOMB_ACCESS_KEY'));
    console.log('MESOMB_SECRET_KEY exists:', !!Deno.env.get('MESOMB_SECRET_KEY'));

    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    
    const { planId, phoneNumber, amount } = requestBody;
    
    if (!planId || !phoneNumber || !amount) {
      console.error('Missing required fields:', { planId, phoneNumber, amount });
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
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
      console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'NOT SET');
      console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'SET' : 'NOT SET');
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

    // Special test case - auto-activate plan for test number
    if (phoneNumber === '670000000') {
      console.log('Test number detected, auto-activating plan');
      
      try {
        // Activate subscription directly
        const { data: rpcResult, error: rpcError } = await supabase.rpc('transition_subscription_plan', {
          p_user_id: user.id,
          p_new_plan_id: planId
        });
        
        console.log('Subscription transition result:', rpcResult);
        
        if (rpcError) {
          console.error('RPC error:', rpcError);
          return new Response(JSON.stringify({ error: 'Failed to activate subscription', details: rpcError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Create a completed transaction record
        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            amount: amount,
            currency: 'XOF',
            provider: 'mesomb',
            status: 'completed',
            provider_reference: 'TEST_' + Date.now(),
            metadata: {
              phone_number: phoneNumber,
              plan_id: planId,
              test_payment: true
            }
          })
          .select()
          .single();

        if (transactionError) {
          console.error('Transaction creation error:', transactionError);
          return new Response(JSON.stringify({ error: 'Failed to create transaction record', details: transactionError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Test payment completed successfully');
        return new Response(JSON.stringify({
          success: true,
          transactionId: transactionData.id,
          message: 'Test payment completed successfully',
          testPayment: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error in test payment:', error);
        return new Response(JSON.stringify({ error: 'Failed to process test payment', details: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // For real MeSomb payments
    console.log('Processing real MeSomb payment for phone:', phoneNumber);
    
    // MeSomb API configuration
    const mesombAccessKey = Deno.env.get('MESOMB_ACCESS_KEY');
    const mesombSecretKey = Deno.env.get('MESOMB_SECRET_KEY');
    const mesombAppKey = Deno.env.get('MESOMB_APP_KEY');

    if (!mesombAccessKey || !mesombSecretKey || !mesombAppKey) {
      console.error('Missing MeSomb configuration');
      return new Response(JSON.stringify({ error: 'Payment service configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a transaction record first
    const transactionId = crypto.randomUUID();
    console.log('Creating transaction record with ID:', transactionId);

    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        id: transactionId,
        user_id: user.id,
        amount: amount,
        currency: 'XOF',
        provider: 'mesomb',
        status: 'pending',
        metadata: {
          phone_number: phoneNumber,
          plan_id: planId
        }
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      return new Response(JSON.stringify({ error: 'Failed to create transaction record', details: transactionError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For real MeSomb integration, make API call
    try {
      console.log('Initiating MeSomb payment...');
      
      // Generate a unique reference for this transaction
      const reference = `PAY_${transactionId.replace(/-/g, '').slice(0, 16)}`;
      
      // MeSomb API endpoint for payment collection
      const mesombUrl = 'https://mesomb.hachther.com/api/v1.1/payment/collect/';
      
      // Prepare the payment request
      const paymentData = {
        service: 'MTN', // Default to MTN, could be dynamic based on phone number
        payer: phoneNumber,
        amount: amount,
        currency: 'XOF',
        reference: reference,
        message: `Payment for subscription plan`,
        application_key: mesombAppKey
      };

      console.log('Calling MeSomb API with data:', { ...paymentData, application_key: '***' });

      // Create timestamp for the request
      const timestamp = Math.floor(Date.now() / 1000);
      
      const response = await fetch(mesombUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MeSomb-Application': mesombAppKey,
          'X-MeSomb-AccessKey': mesombAccessKey,
          'X-MeSomb-Timestamp': timestamp.toString(),
          // Note: In production, you'd need to implement proper HMAC signature
          'Authorization': `Bearer ${mesombAccessKey}`
        },
        body: JSON.stringify(paymentData)
      });

      const mesombResult = await response.json();
      console.log('MeSomb API response status:', response.status);
      console.log('MeSomb API response:', mesombResult);

      if (response.ok && mesombResult.success) {
        // Update transaction with MeSomb reference
        await supabase
          .from('transactions')
          .update({
            provider_reference: mesombResult.transaction?.reference || reference,
            status: 'processing',
            metadata: {
              ...transactionData.metadata,
              mesomb_response: mesombResult
            }
          })
          .eq('id', transactionId);

        return new Response(JSON.stringify({ 
          success: true,
          transactionId: transactionId,
          message: 'Payment initiated successfully',
          mesombReference: mesombResult.transaction?.reference
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // MeSomb API error
        console.error('MeSomb API error:', mesombResult);
        
        // Update transaction status to failed
        await supabase
          .from('transactions')
          .update({
            status: 'failed',
            metadata: {
              ...transactionData.metadata,
              error: mesombResult
            }
          })
          .eq('id', transactionId);

        return new Response(JSON.stringify({ 
          error: 'Payment initiation failed',
          details: mesombResult.message || 'Unknown error from payment service'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      console.error('MeSomb API call failed:', error);
      
      // Update transaction status to failed
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          metadata: {
            ...transactionData.metadata,
            error: error.message
          }
        })
        .eq('id', transactionId);

      return new Response(JSON.stringify({ 
        error: 'Payment service unavailable',
        details: error.message,
        transactionId: transactionId
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in mesomb-payment function:', error);
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