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

    // For non-test numbers, just return success for now
    console.log('Non-test number, simulating payment');
    
    return new Response(JSON.stringify({
      success: true,
      transactionId: 'SIMULATED_' + Date.now(),
      message: 'Payment simulation (not implemented yet)',
      testPayment: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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