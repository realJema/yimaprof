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
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
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
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // MeSomb API credentials
    const appKey = Deno.env.get('MESOMB_APP_KEY');
    const accessKey = Deno.env.get('MESOMB_ACCESS_KEY');
    const secretKey = Deno.env.get('MESOMB_SECRET_KEY');
    const apiUrl = Deno.env.get('MESOMB_API_URL') || 'https://mesomb.hachther.com/en/api/v1.1';

    if (!appKey || !accessKey || !secretKey) {
      return new Response(JSON.stringify({ error: 'MeSomb credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
          phone_number: phoneNumber,
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

    // Generate nonce for MeSomb API
    const nonce = Date.now().toString();

    // Prepare MeSomb payment request
    const paymentData = {
      amount: amount,
      service: 'MTN', // or 'ORANGE' based on phone number
      receiver: phoneNumber,
      trxID: transactionData.id,
      message: `Payment for subscription plan`,
      nonce: nonce
    };

    // Calculate signature for MeSomb API
    const signature = await generateMeSombSignature(paymentData, secretKey);

    // Make payment request to MeSomb
    const mesombResponse = await fetch(`${apiUrl}/payment/collect/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MeSomb-Application': appKey,
        'X-MeSomb-AccessKey': accessKey,
        'Authorization': `Bearer ${signature}`
      },
      body: JSON.stringify(paymentData)
    });

    const mesombResult = await mesombResponse.json();
    
    console.log('MeSomb API Response:', mesombResult);

    if (mesombResponse.ok && mesombResult.success) {
      // Update transaction with provider reference
      await supabase
        .from('transactions')
        .update({
          provider_reference: mesombResult.transaction?.pk,
          status: 'processing'
        })
        .eq('id', transactionData.id);

      return new Response(JSON.stringify({
        success: true,
        transactionId: transactionData.id,
        message: 'Payment initiated successfully',
        mesombData: mesombResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      // Update transaction status to failed
      await supabase
        .from('transactions')
        .update({ status: 'failed' })
        .eq('id', transactionData.id);

      return new Response(JSON.stringify({
        success: false,
        error: mesombResult.message || 'Payment failed'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in mesomb-payment function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateMeSombSignature(data: any, secretKey: string): Promise<string> {
  // Simple signature generation - in production, use proper HMAC
  const dataString = JSON.stringify(data);
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const msgData = encoder.encode(dataString);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}