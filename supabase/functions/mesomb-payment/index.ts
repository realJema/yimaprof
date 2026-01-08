import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MESOMB_HOST = 'https://mesomb.hachther.com';

// Generate a random nonce
function generateNonce(length = 40): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}

// SHA1 hash function
async function sha1(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// HMAC-SHA1 function
async function hmacSha1(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate MeSomb authorization header
async function generateAuthorization(
  method: string,
  url: string,
  date: Date,
  nonce: string,
  credentials: { accessKey: string; secretKey: string },
  body?: Record<string, unknown>
): Promise<{ authorization: string; headers: Record<string, string> }> {
  const algorithm = 'HMAC-SHA1';
  const service = 'payment';
  
  const urlObj = new URL(url);
  const timestamp = date.getTime();
  
  const signHeaders: Record<string, string> = {
    'host': urlObj.host,
    'x-mesomb-date': String(timestamp),
    'x-mesomb-nonce': nonce,
  };
  
  const headersKeys = Object.keys(signHeaders).sort();
  const canonicalHeaders = headersKeys.map(key => `${key}:${signHeaders[key]}`).join('\n');
  const signedHeaders = headersKeys.join(';');
  
  const payloadHash = await sha1(body ? JSON.stringify(body) : '{}');
  const canonicalQuery = urlObj.search ? urlObj.search.substring(1) : '';
  const path = urlObj.pathname;
  
  const canonicalRequest = `${method}\n${path}\n${canonicalQuery}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const dateStamp = `${year}${month}${day}`;
  
  const scope = `${dateStamp}/${service}/mesomb_request`;
  
  const canonicalRequestHash = await sha1(canonicalRequest);
  const stringToSign = `${algorithm}\n${timestamp}\n${scope}\n${canonicalRequestHash}`;
  
  const signature = await hmacSha1(credentials.secretKey, stringToSign);
  
  const authorization = `${algorithm} Credential=${credentials.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return {
    authorization,
    headers: {
      'x-mesomb-date': String(timestamp),
      'x-mesomb-nonce': nonce,
    }
  };
}

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
      const nonce = generateNonce();
      const date = new Date();
      const url = `${MESOMB_HOST}/en/api/v1.1/payment/collect/`;
      
      const mesombBody = {
        amount: amount,
        service: service,
        payer: cleanedPhone,
        nonce: nonce,
        currency: 'XAF',
        country: 'CM',
        fees: true,
        mode: 'asynchronous', // Use async mode to avoid timeout
        message: 'Subscription payment',
        reference: `sub_${pendingTransaction.id.substring(0, 8)}`,
        trxID: pendingTransaction.id,
      };
      
      console.log('MeSomb request:', mesombBody);
      
      const { authorization, headers: signHeaders } = await generateAuthorization(
        'POST', url, date, nonce, { accessKey, secretKey }, mesombBody
      );
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000); // 55 second timeout
      
      console.log('Making MeSomb API call...');
      
      const mesombResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authorization,
          'X-MeSomb-Application': applicationKey,
          ...signHeaders,
        },
        body: JSON.stringify(mesombBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const responseText = await mesombResponse.text();
      console.log('MeSomb response:', mesombResponse.status, responseText);
      
      let mesombResult;
      try {
        mesombResult = JSON.parse(responseText);
      } catch {
        throw new Error(`Invalid MeSomb response: ${responseText.substring(0, 200)}`);
      }

      if (mesombResponse.ok && (mesombResult.success || mesombResult.status === 'PENDING')) {
        // In async mode, payment is pending - user needs to confirm on phone
        const providerRef = mesombResult.transaction?.pk || mesombResult.transaction?.fin_trx_id || null;
        
        await supabase.from('transactions').update({
          status: 'processing',
          provider_reference: providerRef,
          metadata: { ...pendingTransaction.metadata, mesomb_response: mesombResult }
        }).eq('id', pendingTransaction.id);
        
        console.log('Payment initiated, waiting for user confirmation');
        
        return new Response(JSON.stringify({
          success: true,
          transactionId: pendingTransaction.id,
          providerReference: providerRef,
          message: 'Payment initiated. Please confirm on your phone.',
          status: 'processing'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        const errorMessage = mesombResult.message || mesombResult.detail || 'Payment failed';
        
        await supabase.from('transactions').update({
          status: 'failed',
          metadata: { ...pendingTransaction.metadata, mesomb_response: mesombResult, error: errorMessage }
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
      console.error('MeSomb API error:', error);
      
      const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout');
      
      if (isTimeout) {
        // Mark as processing - payment might still go through
        await supabase.from('transactions').update({
          status: 'processing',
          metadata: { ...pendingTransaction.metadata, timeout: true }
        }).eq('id', pendingTransaction.id);
        
        return new Response(JSON.stringify({
          success: true,
          transactionId: pendingTransaction.id,
          message: 'Payment request sent. Please confirm on your phone and check your subscription status.',
          status: 'processing'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      await supabase.from('transactions').update({
        status: 'failed',
        metadata: { ...pendingTransaction.metadata, error: error.message }
      }).eq('id', pendingTransaction.id);
      
      return new Response(JSON.stringify({ 
        error: 'Payment request failed. Please try again.',
        details: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
