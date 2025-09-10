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
    const { transactionId } = await req.json();
    
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

    // Get transaction details
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single();

    if (transactionError || !transaction) {
      return new Response(JSON.stringify({ error: 'Transaction not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If transaction is already completed or failed, return status
    if (transaction.status === 'completed' || transaction.status === 'failed') {
      return new Response(JSON.stringify({
        status: transaction.status,
        transaction: transaction
      }), {
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

    // Check payment status with MeSomb
    if (transaction.provider_reference) {
      const statusResponse = await fetch(`${apiUrl}/payment/status/${transaction.provider_reference}/`, {
        method: 'GET',
        headers: {
          'X-MeSomb-Application': appKey,
          'X-MeSomb-AccessKey': accessKey,
        }
      });

      const statusResult = await statusResponse.json();
      console.log('MeSomb Status Response:', statusResult);

      let newStatus = transaction.status;
      
      if (statusResponse.ok && statusResult.success) {
        if (statusResult.transaction?.status === 'SUCCESS') {
          newStatus = 'completed';
          
          // If payment is successful, activate subscription
          if (transaction.metadata?.plan_id) {
            try {
              const result = await supabase.rpc('transition_subscription_plan', {
                p_user_id: user.id,
                p_new_plan_id: transaction.metadata.plan_id
              });
              
              console.log('Subscription transition result:', result);
            } catch (error) {
              console.error('Error transitioning subscription:', error);
            }
          }
        } else if (statusResult.transaction?.status === 'FAILED') {
          newStatus = 'failed';
        }
      }

      // Update transaction status
      await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', transactionId);

      return new Response(JSON.stringify({
        status: newStatus,
        transaction: { ...transaction, status: newStatus },
        mesombData: statusResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      status: transaction.status,
      transaction: transaction
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in check-payment-status function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});