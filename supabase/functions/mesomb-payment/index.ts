import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planId, phoneNumber, amount } = await req.json();
    
    console.log('MeSomb Payment request:', { planId, phoneNumber, amount });
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Invalid user:', userError);
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
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
        const result = await supabase.rpc('transition_subscription_plan', {
          p_user_id: user.id,
          p_new_plan_id: planId
        });
        
        console.log('Subscription transition result:', result);

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
          return new Response(JSON.stringify({ error: 'Failed to create transaction record' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

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
        return new Response(JSON.stringify({ error: 'Failed to process test payment' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Format phone number to include country code
    const formattedPhone = `237${phoneNumber}`;
    console.log('Formatted phone:', formattedPhone);

    // Create transaction record first
    const { data: transactionData, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: amount,
        currency: 'XOF',
        provider: 'mesomb',
        status: 'pending',
        metadata: {
          phone_number: formattedPhone,
          plan_id: planId
        }
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Transaction creation error:', transactionError);
      return new Response(JSON.stringify({ error: 'Failed to create transaction' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Transaction created:', transactionData.id);

    // MeSomb API credentials
    const appKey = Deno.env.get('MESOMB_APP_KEY');
    const accessKey = Deno.env.get('MESOMB_ACCESS_KEY');
    const secretKey = Deno.env.get('MESOMB_SECRET_KEY');

    if (!appKey || !accessKey || !secretKey) {
      console.error('MeSomb credentials not configured');
      return new Response(JSON.stringify({ error: 'MeSomb credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For now, simulate successful payment initiation
    // In a real implementation, you would integrate with MeSomb API here
    console.log('Simulating MeSomb payment initiation');

    // Update transaction status to processing
    await supabase
      .from('transactions')
      .update({
        provider_reference: 'MESOMB_' + Date.now(),
        status: 'processing'
      })
      .eq('id', transactionData.id);

    return new Response(JSON.stringify({
      success: true,
      transactionId: transactionData.id,
      message: 'Payment initiated successfully (simulated)'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in mesomb-payment function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});