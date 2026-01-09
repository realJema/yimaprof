import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PaymentOperation, RandomGenerator } from 'https://esm.sh/@hachther/mesomb@2.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Determine service type from phone number (Cameroon)
function detectService(phoneNumber: string): 'MTN' | 'ORANGE' | null {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length !== 9) return null;
  
  const prefix = cleaned.substring(0, 2);
  
  if (['67', '68'].includes(prefix)) {
    return 'MTN';
  }
  if (prefix === '65') {
    const thirdDigit = cleaned.charAt(2);
    if (['0', '1', '2', '3', '4'].includes(thirdDigit)) {
      return 'MTN';
    }
    if (['5', '6', '7', '8', '9'].includes(thirdDigit)) {
      return 'ORANGE';
    }
  }
  
  if (prefix === '69') {
    return 'ORANGE';
  }
  
  return null;
}

// Validate phone number
function validatePhoneNumber(phoneNumber: string): { valid: boolean; cleaned: string; error?: string } {
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.startsWith('237')) {
    cleaned = cleaned.substring(3);
  }
  
  if (cleaned.length !== 9) {
    return { valid: false, cleaned, error: `Phone number must be 9 digits, got ${cleaned.length}` };
  }
  
  const service = detectService(cleaned);
  if (!service) {
    return { valid: false, cleaned, error: 'Only Cameroon MTN and Orange numbers are accepted' };
  }
  
  return { valid: true, cleaned };
}

serve(async (req) => {
  console.log('MeSomb Payment function called with method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const applicationKey = Deno.env.get('MESOMB_APP_KEY');
    const accessKey = Deno.env.get('MESOMB_ACCESS_KEY');
    const secretKey = Deno.env.get('MESOMB_SECRET_KEY');
    
    console.log('Environment check:', {
      hasAppKey: !!applicationKey,
      hasAccessKey: !!accessKey,
      hasSecretKey: !!secretKey
    });

    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    
    const { planId, phoneNumber, amount, referredBy } = requestBody;
    
    if (!planId || !phoneNumber || !amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const phoneValidation = validatePhoneNumber(phoneNumber);
    if (!phoneValidation.valid) {
      return new Response(JSON.stringify({ error: phoneValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const cleanedPhone = phoneValidation.cleaned;
    const service = detectService(cleanedPhone)!;
    console.log('Phone validated:', cleanedPhone, 'Service:', service);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Missing Supabase configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    // Test case - auto-activate for test number
    if (cleanedPhone === '670000000') {
      console.log('Test number detected, auto-activating');
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc('transition_subscription_plan', {
        p_user_id: user.id,
        p_new_plan_id: planId,
        p_referred_by: referredBy || null
      });
      
      if (rpcError) {
        return new Response(JSON.stringify({ error: 'Failed to activate subscription', details: rpcError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const subscriptionId = rpcResult?.new_subscription_id || null;
        
      await supabase.from('transactions').insert({
        user_id: user.id,
        subscription_id: subscriptionId,
        amount: amount,
        currency: 'XAF',
        provider: 'mesomb',
        status: 'completed',
        provider_reference: 'TEST_' + Date.now(),
        metadata: { phone_number: cleanedPhone, plan_id: planId, test_payment: true }
      });

      return new Response(JSON.stringify({
        success: true,
        transactionId: 'test_' + Date.now(),
        message: 'Test payment completed',
        testPayment: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Real payment
    if (!applicationKey || !accessKey || !secretKey) {
      return new Response(JSON.stringify({ error: 'MeSomb not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create pending transaction
    const { data: pendingTransaction, error: pendingError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: amount,
        currency: 'XAF',
        provider: 'mesomb',
        status: 'pending',
        metadata: { phone_number: cleanedPhone, plan_id: planId, referred_by: referredBy, service }
      })
      .select()
      .single();

    if (pendingError) {
      return new Response(JSON.stringify({ error: 'Failed to create transaction' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Pending transaction created:', pendingTransaction.id);

    try {
      // Initialize PaymentOperation with credentials - exactly like the working Next.js version
      const paymentOperation = new PaymentOperation({
        applicationKey: applicationKey,
        accessKey: accessKey,
        secretKey: secretKey,
      });

      const collectRequest = {
        amount: amount,
        service: service,
        payer: cleanedPhone,
        nonce: RandomGenerator.nonce(),
        currency: 'XAF',
        country: 'CM',
        fees: true,
        message: 'Subscription payment',
        reference: `sub_${pendingTransaction.id.substring(0, 8)}`
      };

      console.log('MeSomb collect request:', collectRequest);
      console.log('Making MeSomb API call via SDK...');
      
      const response = await paymentOperation.makeCollect(collectRequest);

      console.log('MeSomb SDK response:', {
        success: response.isOperationSuccess(),
        transactionSuccess: response.isTransactionSuccess(),
        status: response.status,
        message: response.message,
        reference: response.reference
      });

      if (response.isOperationSuccess()) {
        const providerRef = response.reference || response.transaction?.pk || null;
        
        // Update transaction to processing
        await supabase.from('transactions').update({
          status: 'processing',
          provider_reference: providerRef,
          metadata: { 
            ...pendingTransaction.metadata, 
            mesomb_status: response.status,
            mesomb_message: response.message 
          }
        }).eq('id', pendingTransaction.id);
        
        console.log('Payment initiated successfully');
        
        return new Response(JSON.stringify({
          success: true,
          transactionId: pendingTransaction.id,
          providerReference: providerRef,
          message: response.message || 'Payment initiated. Please confirm on your phone.',
          status: 'processing'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        const errorMessage = response.message || 'Payment failed';
        
        await supabase.from('transactions').update({
          status: 'failed',
          metadata: { 
            ...pendingTransaction.metadata, 
            mesomb_status: response.status,
            mesomb_message: response.message,
            error: errorMessage 
          }
        }).eq('id', pendingTransaction.id);
        
        return new Response(JSON.stringify({ 
          error: errorMessage,
          transactionId: pendingTransaction.id
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      console.error('MeSomb SDK error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment request failed';
      
      await supabase.from('transactions').update({
        status: 'failed',
        metadata: { ...pendingTransaction.metadata, error: errorMessage }
      }).eq('id', pendingTransaction.id);
      
      return new Response(JSON.stringify({ 
        error: errorMessage,
        transactionId: pendingTransaction.id
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: 'Internal server error', details: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
