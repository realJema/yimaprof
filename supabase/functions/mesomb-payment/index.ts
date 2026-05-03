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
    
    // Update transaction to processing immediately
    await supabase.from('transactions').update({
      status: 'processing',
      metadata: { 
        ...transactionMetadata, 
        sdk_call_started: new Date().toISOString()
      }
    }).eq('id', pendingTransaction.id);
    
    console.log('Transaction set to processing, starting SDK call (fire-and-forget)');
    
    // Fire-and-forget: Start the SDK call but don't await it
    // The webhook will be the authoritative source for payment completion
    paymentOperation.makeCollect(collectRequest)
      .then(async (response) => {
        console.log('MeSomb SDK response (background):', {
          success: response.isOperationSuccess(),
          status: response.status,
          message: response.message,
          reference: response.reference
        });
        
        // Update transaction with MeSomb response (for debugging/tracking)
        const providerRef = response.reference || response.transaction?.pk || null;
        await supabase.from('transactions').update({
          provider_reference: providerRef,
          metadata: { 
            ...transactionMetadata, 
            mesomb_status: response.status,
            mesomb_message: response.message,
            mesomb_success: response.isOperationSuccess(),
            sdk_returned_at: new Date().toISOString()
          }
        }).eq('id', pendingTransaction.id);
      })
      .catch((error) => {
        console.error('MeSomb SDK error (background):', error);
        // Don't update to failed - webhook is authoritative
        // Just log for debugging
      });
    
    // Return immediately - don't wait for SDK response
    // Frontend will show "Confirm on your phone" right away
    return new Response(JSON.stringify({
      success: true,
      transactionId: pendingTransaction.id,
      phoneNumber: cleanedPhone,
      service: service,
      message: 'Confirmez le paiement sur votre téléphone.',
      status: 'processing'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(JSON.stringify({ error: 'Payment processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
