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

// Generate MeSomb authorization header (based on their SDK implementation)
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
  
  // Required headers for signature
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
  
  // Format: YYYYMMDD
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
  
  // MTN Cameroon prefixes: 67, 68, 650-654
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
  
  // Orange Cameroon prefixes: 69, 655-659
  if (prefix === '69') {
    return 'ORANGE';
  }
  
  return null;
}

// Validate phone number is a valid Cameroon mobile number
function validatePhoneNumber(phoneNumber: string): { valid: boolean; cleaned: string; error?: string } {
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Remove country code if present
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
    // Log environment variables status
    console.log('Environment check:');
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
    
    // Validate phone number
    const phoneValidation = validatePhoneNumber(phoneNumber);
    if (!phoneValidation.valid) {
      console.error('Invalid phone number:', phoneValidation.error);
      return new Response(JSON.stringify({ error: phoneValidation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const cleanedPhone = phoneValidation.cleaned;
    const service = detectService(cleanedPhone)!;
    console.log('Phone number validated:', cleanedPhone, 'Service:', service);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
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
    if (cleanedPhone === '670000000') {
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
              phone_number: cleanedPhone,
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
      return new Response(JSON.stringify({ error: 'MeSomb payment gateway is not configured. Please contact support.' }), {
        status: 503,
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
          phone_number: cleanedPhone,
          plan_id: planId,
          referred_by: referredBy,
          service: service
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

    try {
      const nonce = generateNonce();
      const date = new Date();
      const url = `${MESOMB_HOST}/en/api/v1.1/payment/collect/`;
      
      // Build request body according to MeSomb API docs
      const mesombBody = {
        amount: amount,
        service: service,
        payer: cleanedPhone,
        nonce: nonce,
        currency: 'XAF',
        country: 'CM',
        fees: true,
        message: 'Subscription payment',
        reference: `sub_${pendingTransaction.id.substring(0, 8)}`,
        trxID: pendingTransaction.id,
      };
      
      console.log('MeSomb request body:', mesombBody);
      
      // Generate authorization
      const { authorization, headers: signHeaders } = await generateAuthorization(
        'POST',
        url,
        date,
        nonce,
        { accessKey, secretKey },
        mesombBody
      );
      
      // Build request headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': authorization,
        'X-MeSomb-Application': applicationKey,
        ...signHeaders,
      };
      
      console.log('Making MeSomb API call to:', url);
      console.log('Authorization header generated');
      
      // Make the API call
      const mesombResponse = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(mesombBody),
      });
      
      const responseText = await mesombResponse.text();
      console.log('MeSomb response status:', mesombResponse.status);
      console.log('MeSomb response body:', responseText);
      
      let mesombResult;
      try {
        mesombResult = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse MeSomb response:', e);
        throw new Error(`Invalid response from MeSomb: ${responseText.substring(0, 200)}`);
      }

      if (mesombResponse.ok && mesombResult.success) {
        // Payment successful - activate subscription
        const { data: rpcResult, error: rpcError } = await supabase.rpc('transition_subscription_plan', {
          p_user_id: user.id,
          p_new_plan_id: planId,
          p_referred_by: referredBy || null
        });
        
        if (rpcError) {
          console.error('Failed to activate subscription after payment:', rpcError);
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
      } else {
        // Payment failed
        const errorMessage = mesombResult.message || mesombResult.detail || 'Payment failed';
        
        await supabase
          .from('transactions')
          .update({
            status: 'failed',
            metadata: {
              ...pendingTransaction.metadata,
              mesomb_response: mesombResult,
              error: errorMessage
            }
          })
          .eq('id', pendingTransaction.id);
        
        console.error('MeSomb payment failed:', errorMessage);
        return new Response(JSON.stringify({ 
          error: errorMessage,
          status: mesombResult.status,
          transactionId: pendingTransaction.id
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      console.error('MeSomb API error:', error);
      
      // Update transaction to failed
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          metadata: {
            ...pendingTransaction.metadata,
            error: error.message || 'Payment request failed'
          }
        })
        .eq('id', pendingTransaction.id);
      
      return new Response(JSON.stringify({ 
        error: error.message || 'Payment request failed',
        transactionId: pendingTransaction.id
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in mesomb-payment function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
