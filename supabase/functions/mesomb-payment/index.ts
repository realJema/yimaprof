import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MESOMB_HOST = 'https://mesomb.hachther.com';
const MESOMB_API_VERSION = 'v1.1';

// Generate a random nonce
function generateNonce(length = 32): string {
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

// Generate MeSomb signature according to their docs
async function signRequest(
  service: string,
  method: string,
  url: string,
  date: Date,
  nonce: string,
  credentials: { accessKey: string; secretKey: string },
  headers: Record<string, string> = {},
  body?: Record<string, any>
): Promise<string> {
  const algorithm = 'HMAC-SHA1';
  
  const urlObj = new URL(url);
  const canonicalQuery = urlObj.search ? urlObj.search.substring(1) : '';
  
  const timestamp = date.getTime();
  
  // Set required headers
  headers['host'] = `${urlObj.protocol}//${urlObj.host}`;
  headers['x-mesomb-date'] = String(timestamp);
  headers['x-mesomb-nonce'] = nonce;
  
  const headersKeys = Object.keys(headers).sort();
  const canonicalHeaders = headersKeys.map(key => `${key}:${headers[key]}`).join('\n');
  
  const payloadHash = await sha1(body ? JSON.stringify(body) : '{}');
  const signedHeaders = headersKeys.join(';');
  const path = encodeURI(urlObj.pathname);
  
  const canonicalRequest = `${method}\n${path}\n${canonicalQuery}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  
  // Fix: Use proper date format with padded month (0-indexed needs +1) and day
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const scope = `${year}${month}${day}/${service}/mesomb_request`;
  
  const canonicalRequestHash = await sha1(canonicalRequest);
  const stringToSign = `${algorithm}\n${timestamp}\n${scope}\n${canonicalRequestHash}`;
  
  const signature = await hmacSha1(credentials.secretKey, stringToSign);
  
  return `${algorithm} Credential=${credentials.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

// Determine service type from phone number
function detectService(phoneNumber: string): 'MTN' | 'ORANGE' | 'AIRTEL' {
  const prefix = phoneNumber.substring(0, 2);
  // MTN Cameroon prefixes: 67, 68, 65, 66
  if (['67', '68', '65', '66'].includes(prefix)) {
    return 'MTN';
  }
  // Orange Cameroon prefixes: 69, 65, 66, 69
  if (['69', '55', '56', '59'].includes(prefix)) {
    return 'ORANGE';
  }
  // Default to MTN if cannot determine
  return 'MTN';
}

serve(async (req) => {
  console.log('MeSomb Payment function called with method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log environment variables status
    console.log('Environment check:');
    console.log('SUPABASE_URL exists:', !!Deno.env.get('SUPABASE_URL'));
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    console.log('MESOMB_APP_KEY exists:', !!Deno.env.get('MESOMB_APP_KEY'));
    console.log('MESOMB_ACCESS_KEY exists:', !!Deno.env.get('MESOMB_ACCESS_KEY'));
    console.log('MESOMB_SECRET_KEY exists:', !!Deno.env.get('MESOMB_SECRET_KEY'));

    const requestBody = await req.json();
    console.log('Request body:', requestBody);
    
    const { planId, phoneNumber, amount, referredBy } = requestBody;
    
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
      return new Response(JSON.stringify({ error: 'Missing Supabase configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
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
        // Activate subscription directly with referral info
        const { data: rpcResult, error: rpcError } = await supabase.rpc('transition_subscription_plan', {
          p_user_id: user.id,
          p_new_plan_id: planId,
          p_referred_by: referredBy || null
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
        const subscriptionId = rpcResult && typeof rpcResult === 'object' && 'new_subscription_id' in rpcResult 
          ? rpcResult.new_subscription_id 
          : null;
          
        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            subscription_id: subscriptionId,
            amount: amount,
            currency: 'XAF',
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

    // Real MeSomb payment processing
    const applicationKey = Deno.env.get('MESOMB_APP_KEY');
    const accessKey = Deno.env.get('MESOMB_ACCESS_KEY');
    const secretKey = Deno.env.get('MESOMB_SECRET_KEY');
    
    if (!applicationKey || !accessKey || !secretKey) {
      console.error('Missing MeSomb API keys');
      return new Response(JSON.stringify({ error: 'Missing MeSomb configuration' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a pending transaction first
    const { data: pendingTransaction, error: pendingError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        amount: amount,
        currency: 'XAF',
        provider: 'mesomb',
        status: 'pending',
        metadata: {
          phone_number: phoneNumber,
          plan_id: planId,
          referred_by: referredBy
        }
      })
      .select()
      .single();

    if (pendingError) {
      console.error('Failed to create pending transaction:', pendingError);
      return new Response(JSON.stringify({ error: 'Failed to create transaction', details: pendingError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Pending transaction created:', pendingTransaction.id);

    // Prepare MeSomb API call
    const date = new Date();
    const nonce = generateNonce();
    const service = detectService(phoneNumber);
    const endpoint = 'payment/collect/';
    const url = `${MESOMB_HOST}/api/${MESOMB_API_VERSION}/${endpoint}`;
    
    const mesombBody = {
      nonce: nonce,  // Required field according to API docs
      amount: amount,
      service: service,
      payer: phoneNumber,
      country: 'CM',
      currency: 'XAF',
      fees: true,
      conversion: false,
      trxID: pendingTransaction.id,  // Our transaction ID for reconciliation
    };
    
    console.log('MeSomb request body:', mesombBody);
    console.log('Service detected:', service);
    
    // Build headers
    const mesombHeaders: Record<string, string> = {
      'x-mesomb-date': String(date.getTime()),
      'x-mesomb-nonce': nonce,
      'Content-Type': 'application/json',
      'X-MeSomb-OperationMode': 'synchronous',
      'X-MeSomb-Application': applicationKey,
      'X-MeSomb-TrxID': pendingTransaction.id,
      'Accept-Language': 'en',
    };
    
    // Generate authorization signature
    const authorization = await signRequest(
      'payment',
      'POST',
      url,
      date,
      nonce,
      { accessKey, secretKey },
      { 'content-type': 'application/json' },
      mesombBody
    );
    
    mesombHeaders['Authorization'] = authorization;
    
    console.log('Making MeSomb API call to:', url);
    
    // Make the actual MeSomb API call
    const mesombResponse = await fetch(url, {
      method: 'POST',
      headers: mesombHeaders,
      body: JSON.stringify(mesombBody),
    });
    
    const mesombResult = await mesombResponse.json();
    console.log('MeSomb response status:', mesombResponse.status);
    console.log('MeSomb response:', JSON.stringify(mesombResult));
    
    if (!mesombResponse.ok || !mesombResult.success) {
      // Update transaction to failed
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          metadata: {
            ...pendingTransaction.metadata,
            mesomb_response: mesombResult,
            error: mesombResult.message || mesombResult.detail || 'Payment failed'
          }
        })
        .eq('id', pendingTransaction.id);
      
      console.error('MeSomb payment failed:', mesombResult);
      return new Response(JSON.stringify({ 
        error: 'Payment failed', 
        details: mesombResult.message || mesombResult.detail || 'Unknown error',
        transactionId: pendingTransaction.id
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Payment successful - activate subscription
    const { data: rpcResult, error: rpcError } = await supabase.rpc('transition_subscription_plan', {
      p_user_id: user.id,
      p_new_plan_id: planId,
      p_referred_by: referredBy || null
    });
    
    if (rpcError) {
      console.error('Failed to activate subscription after payment:', rpcError);
      // Still update transaction as completed since payment went through
      await supabase
        .from('transactions')
        .update({
          status: 'completed',
          provider_reference: mesombResult.transaction?.pk || mesombResult.transaction?.fin_trx_id,
          metadata: {
            ...pendingTransaction.metadata,
            mesomb_response: mesombResult,
            subscription_activation_error: rpcError.message
          }
        })
        .eq('id', pendingTransaction.id);
      
      return new Response(JSON.stringify({ 
        error: 'Payment succeeded but subscription activation failed',
        details: rpcError.message,
        transactionId: pendingTransaction.id
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get subscription ID from RPC result
    const subscriptionId = rpcResult && typeof rpcResult === 'object' && 'new_subscription_id' in rpcResult 
      ? rpcResult.new_subscription_id 
      : null;
    
    // Update transaction with success
    await supabase
      .from('transactions')
      .update({
        status: 'completed',
        subscription_id: subscriptionId,
        provider_reference: mesombResult.transaction?.pk || mesombResult.transaction?.fin_trx_id,
        metadata: {
          ...pendingTransaction.metadata,
          mesomb_response: mesombResult
        }
      })
      .eq('id', pendingTransaction.id);
    
    console.log('Payment completed successfully, subscription activated');
    
    return new Response(JSON.stringify({
      success: true,
      transactionId: pendingTransaction.id,
      message: 'Payment completed successfully',
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
