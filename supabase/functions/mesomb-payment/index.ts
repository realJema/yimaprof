import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PaymentOperation, RandomGenerator } from 'https://esm.sh/@hachther/mesomb@2.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Timeout for MeSomb SDK collect call (3 minutes)
const COLLECT_TIMEOUT_MS = 180000;

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
      console.log('Test number detected, auto-activating subscription');
      
      // Get plan duration
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('duration_days')
        .eq('id', planId)
        .single();
      
      const durationDays = plan?.duration_days || 30;
      
      // Create transaction
      const { data: testTransaction, error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: amount,
          currency: 'XAF',
          provider: 'mesomb',
          status: 'completed',
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
      
      // Cancel existing subscription
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      // Create new subscription
      const { data: newSub } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_id: planId,
          status: 'active',
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
          auto_renew: true,
          referred_by: referredBy || null
        })
        .select()
        .single();
      
      // Update transaction with subscription_id
      if (newSub) {
        await supabase
          .from('transactions')
          .update({ subscription_id: newSub.id })
          .eq('id', testTransaction.id);
      }

      return new Response(JSON.stringify({
        success: true,
        transactionId: testTransaction.id,
        message: 'Test payment completed',
        testPayment: true,
        status: 'completed'
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

    // Create pending transaction with all metadata needed for webhook completion
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

      // Always use asynchronous mode - webhook will handle completion
      const collectRequest = {
        amount: amount,
        service: service,
        payer: cleanedPhone,
        nonce: RandomGenerator.nonce(),
        trxID: pendingTransaction.id, // Our transaction ID for webhook reconciliation
        currency: 'XAF',
        country: 'CM',
        fees: true,
        mode: 'asynchronous', // Always async - webhook handles completion
        message: 'Subscription payment',
        reference: `sub_${pendingTransaction.id.substring(0, 8)}`
      };

      console.log('MeSomb collect request:', collectRequest);
      console.log('Making MeSomb API call via SDK with', COLLECT_TIMEOUT_MS, 'ms timeout...');
      
      // Create timeout promise
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
          console.log('MeSomb SDK call timed out after', COLLECT_TIMEOUT_MS, 'ms - payment prompt should have been sent');
        } else {
          throw timeoutError;
        }
      }
      
      // Handle timeout case - set to processing and let webhook handle it
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
          status: 'processing'
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
      
      // In async mode, a "timeout" message is NOT a real failure
      // It just means the user hasn't confirmed yet - the webhook will still fire
      const isUserTimeout = mesombMessage.toLowerCase().includes('too much time') || 
                            mesombMessage.toLowerCase().includes('timeout');
      
      // Only treat as a real failure if MeSomb explicitly rejected AND it's not a user timeout
      if (!isSuccess && mesombStatus === 'FAIL' && !isUserTimeout) {
        console.log('MeSomb rejected payment, marking as failed');
        
        await supabase.from('transactions').update({
          status: 'failed',
          metadata: { 
            ...transactionMetadata, 
            mesomb_status: mesombStatus,
            mesomb_message: mesombMessage,
            failed_at: new Date().toISOString()
          }
        }).eq('id', pendingTransaction.id);
        
        return new Response(JSON.stringify({ 
          success: false, 
          error: mesombMessage || 'Payment was rejected. Please try again.',
          transactionId: pendingTransaction.id,
          status: 'failed'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // User timeout is normal in async mode - webhook will handle final status
      if (isUserTimeout) {
        console.log('User timeout in async mode - continuing with processing status');
      }
      
      // Update to processing - webhook will handle completion
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
      
      // Return success - webhook will update the transaction when payment completes
      return new Response(JSON.stringify({
        success: true,
        transactionId: pendingTransaction.id,
        providerReference: providerRef,
        phoneNumber: cleanedPhone,
        service: service,
        message: 'Confirmez le paiement sur votre téléphone. La page se mettra à jour automatiquement.',
        status: 'processing'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('MeSomb SDK error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment request failed';
      
      // On SDK error, still set to processing - user may receive payment prompt
      // Webhook will handle the final status
      await supabase.from('transactions').update({
        status: 'processing',
        metadata: { 
          ...transactionMetadata, 
          sdk_error: errorMessage,
          sdk_error_at: new Date().toISOString()
        }
      }).eq('id', pendingTransaction.id);
      
      // Return success so user can wait for confirmation
      return new Response(JSON.stringify({ 
        success: true,
        transactionId: pendingTransaction.id,
        phoneNumber: cleanedPhone,
        service: service,
        message: 'Vérifiez votre téléphone pour le prompt de paiement.',
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
