import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PaymentOperation, RandomGenerator } from 'https://esm.sh/@hachther/mesomb@2.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Timeout for MeSomb SDK collect call (15 seconds)
// Orange Money USSD can block for ~90s, so we timeout early and assume prompt was sent
const COLLECT_TIMEOUT_MS = 15000;

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

    // Test case - auto-activate for test number using atomic function
    if (cleanedPhone === '670000000') {
      console.log('Test number detected, using atomic function for auto-activation');
      
      // Create transaction first
      const { data: testTransaction, error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: amount,
          currency: 'XAF',
          provider: 'mesomb',
          status: 'processing',
          provider_reference: 'TEST_' + Date.now(),
          metadata: { phone_number: cleanedPhone, plan_id: planId, referred_by: referredBy, test_payment: true }
        })
        .select()
        .single();

      if (insertError || !testTransaction) {
        return new Response(JSON.stringify({ error: 'Failed to create test transaction' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Use atomic function to complete
      const { data: result, error: rpcError } = await supabase.rpc('complete_payment_transaction', {
        p_transaction_id: testTransaction.id,
        p_plan_id: planId,
        p_user_id: user.id,
        p_referred_by: referredBy || null
      });
      
      if (rpcError || !result?.success) {
        console.error('Test payment atomic completion failed:', rpcError || result?.error);
        return new Response(JSON.stringify({ error: 'Failed to activate subscription', details: rpcError?.message || result?.error }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        transactionId: testTransaction.id,
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

    // Create pending transaction with all metadata needed for atomic completion
    const transactionMetadata = { 
      phone_number: cleanedPhone, 
      plan_id: planId, 
      referred_by: referredBy, 
      service,
      initiated_at: new Date().toISOString()
    };
    
    const { data: pendingTransaction, error: pendingError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: amount,
        currency: 'XAF',
        provider: 'mesomb',
        status: 'pending',
        metadata: transactionMetadata
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
      // Initialize PaymentOperation with credentials
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
        trxID: pendingTransaction.id, // Our transaction ID for EXTERNAL lookup
        currency: 'XAF',
        country: 'CM',
        fees: true,
        mode: service === 'ORANGE' ? 'asynchronous' : 'synchronous', // Async for Orange to prevent USSD blocking
        message: 'Subscription payment',
        reference: `sub_${pendingTransaction.id.substring(0, 8)}`
      };

      console.log('MeSomb collect request:', collectRequest);
      console.log('Making MeSomb API call via SDK with', COLLECT_TIMEOUT_MS, 'ms timeout...');
      
      // Create timeout promise for Orange Money optimization
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('COLLECT_TIMEOUT')), COLLECT_TIMEOUT_MS);
      });
      
      let response = null;
      let timedOut = false;
      
      try {
        response = await Promise.race([
          paymentOperation.makeCollect(collectRequest),
          timeoutPromise
        ]);
      } catch (timeoutError) {
        if (timeoutError instanceof Error && timeoutError.message === 'COLLECT_TIMEOUT') {
          timedOut = true;
          console.log('MeSomb SDK call timed out after', COLLECT_TIMEOUT_MS, 'ms - assuming payment prompt sent to phone');
        } else {
          throw timeoutError;
        }
      }
      
      // Handle timeout case - assume payment prompt was sent
      if (timedOut) {
        await supabase.from('transactions').update({
          status: 'processing',
          metadata: { 
            ...transactionMetadata, 
            sdk_timeout: true,
            timeout_at: new Date().toISOString()
          }
        }).eq('id', pendingTransaction.id);
        
        console.log('Transaction set to processing after timeout');
        
        return new Response(JSON.stringify({
          success: true,
          transactionId: pendingTransaction.id,
          phoneNumber: cleanedPhone,
          service: service,
          message: 'Veuillez confirmer le paiement sur votre téléphone.',
          status: 'processing',
          timedOut: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('MeSomb SDK response:', {
        success: response.isOperationSuccess(),
        transactionSuccess: response.isTransactionSuccess(),
        status: response.status,
        message: response.message,
        reference: response.reference
      });

      const providerRef = response.reference || response.transaction?.pk || null;
      const isSuccess = response.isOperationSuccess();
      const mesombStatus = response.status;
      const mesombMessage = response.message || '';
      
      // Check if MeSomb clearly rejected the payment
      if (!isSuccess && mesombStatus === 'FAIL') {
        console.log('MeSomb rejected payment, failing transaction atomically');
        
        // Use atomic function to fail the transaction
        await supabase.rpc('fail_payment_transaction', {
          p_transaction_id: pendingTransaction.id,
          p_reason: mesombMessage || 'MeSomb rejected payment request'
        });
        
        return new Response(JSON.stringify({ 
          success: false, 
          error: mesombMessage || 'Payment was rejected. Please try again.',
          transactionId: pendingTransaction.id
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Only set to "processing" if we got a valid response (successful or pending)
      // and preferably have a provider reference
      await supabase.from('transactions').update({
        status: 'processing',
        provider_reference: providerRef,
        metadata: { 
          ...transactionMetadata, 
          mesomb_status: mesombStatus,
          mesomb_message: mesombMessage,
          mesomb_success: isSuccess,
          provider_ref_obtained: !!providerRef
        }
      }).eq('id', pendingTransaction.id);
      
      console.log('Transaction updated to processing, provider_ref:', providerRef);
      
      // Return success with transactionId so user goes to processing page
      return new Response(JSON.stringify({
        success: true,
        transactionId: pendingTransaction.id,
        providerReference: providerRef,
        phoneNumber: cleanedPhone,
        service: service,
        message: isSuccess 
          ? 'Payment initiated. Please confirm on your phone.'
          : mesombMessage || 'Please confirm the payment on your phone.',
        status: 'processing'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('MeSomb SDK error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment request failed';
      
      // On SDK error, still set to processing - user may receive payment prompt
      // The background job will clean up truly failed transactions later
      await supabase.from('transactions').update({
        status: 'processing',
        metadata: { 
          ...transactionMetadata, 
          sdk_error: errorMessage,
          sdk_error_at: new Date().toISOString()
        }
      }).eq('id', pendingTransaction.id);
      
      // Return success with transactionId so user can still wait for confirmation
      return new Response(JSON.stringify({ 
        success: true,
        transactionId: pendingTransaction.id,
        phoneNumber: cleanedPhone,
        service: service,
        message: 'Please check your phone for a payment prompt.',
        status: 'processing'
      }), {
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
