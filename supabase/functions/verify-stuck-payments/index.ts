import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PaymentOperation } from 'https://esm.sh/@hachther/mesomb@2.0.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Verify stuck payments function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    
    const applicationKey = Deno.env.get('MESOMB_APP_KEY');
    const accessKey = Deno.env.get('MESOMB_ACCESS_KEY');
    const secretKey = Deno.env.get('MESOMB_SECRET_KEY');
    
    if (!applicationKey || !accessKey || !secretKey) {
      console.error('Missing MeSomb credentials');
      return new Response(JSON.stringify({ error: 'MeSomb not configured' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Find stuck transactions (processing for > 5 minutes with provider_reference)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: stuckTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'processing')
      .not('provider_reference', 'is', null)
      .lt('created_at', fiveMinutesAgo);
    
    if (fetchError) {
      console.error('Error fetching stuck transactions:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to fetch transactions' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Found ${stuckTransactions?.length || 0} stuck transactions with provider_reference`);
    
    const paymentOp = new PaymentOperation({
      applicationKey: applicationKey,
      accessKey: accessKey,
      secretKey: secretKey,
    });
    
    let processed = 0;
    let completed = 0;
    let failed = 0;
    const errors: string[] = [];
    
    for (const tx of stuckTransactions || []) {
      try {
        console.log(`Checking transaction ${tx.id} with reference ${tx.provider_reference}`);
        
        const mesombTxs = await paymentOp.getTransactions([tx.provider_reference]);
        
        if (mesombTxs && mesombTxs.length > 0) {
          const mesombTx = mesombTxs[0];
          const mesombStatus = mesombTx.status;
          const metadata = tx.metadata as { plan_id?: string; referred_by?: string } || {};
          
          console.log(`MeSomb status for ${tx.id}: ${mesombStatus}`);
          
          if (mesombStatus === 'SUCCESS') {
            console.log(`Completing transaction ${tx.id} via atomic function`);
            
            const { data: result, error: rpcError } = await supabase.rpc('complete_payment_transaction', {
              p_transaction_id: tx.id,
              p_plan_id: metadata.plan_id,
              p_user_id: tx.user_id,
              p_referred_by: metadata.referred_by || null
            });
            
            if (rpcError) {
              console.error(`RPC error for ${tx.id}:`, rpcError);
              errors.push(`${tx.id}: ${rpcError.message}`);
            } else if (!result?.success && !result?.already_completed) {
              console.error(`Completion failed for ${tx.id}:`, result?.error);
              errors.push(`${tx.id}: ${result?.error}`);
            } else {
              console.log(`Successfully completed ${tx.id}`);
              completed++;
            }
            processed++;
          } else if (mesombStatus === 'FAILED' || mesombStatus === 'CANCELLED') {
            console.log(`Failing transaction ${tx.id} via atomic function`);
            
            const { data: result, error: rpcError } = await supabase.rpc('fail_payment_transaction', {
              p_transaction_id: tx.id,
              p_reason: `Background verification: MeSomb status ${mesombStatus}`
            });
            
            if (rpcError) {
              console.error(`RPC error for ${tx.id}:`, rpcError);
              errors.push(`${tx.id}: ${rpcError.message}`);
            } else {
              console.log(`Successfully failed ${tx.id}`);
              failed++;
            }
            processed++;
          }
          // PENDING status: leave as-is for next check cycle
        } else {
          console.log(`No MeSomb transaction found for ${tx.id}`);
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        console.error(`Error processing tx ${tx.id}:`, errorMsg);
        errors.push(`${tx.id}: ${errorMsg}`);
      }
    }
    
    // Also fail very old stuck transactions without provider_reference
    // These are transactions where the MeSomb call never completed
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: zombieTxs, error: zombieError } = await supabase
      .from('transactions')
      .select('id')
      .eq('status', 'processing')
      .is('provider_reference', null)
      .lt('created_at', thirtyMinutesAgo);
    
    if (zombieError) {
      console.error('Error fetching zombie transactions:', zombieError);
    } else {
      console.log(`Found ${zombieTxs?.length || 0} zombie transactions (no provider_reference)`);
      
      for (const tx of zombieTxs || []) {
        const { error: rpcError } = await supabase.rpc('fail_payment_transaction', {
          p_transaction_id: tx.id,
          p_reason: 'No provider reference after 30 minutes - payment initiation failed'
        });
        
        if (rpcError) {
          console.error(`Error failing zombie tx ${tx.id}:`, rpcError);
          errors.push(`zombie ${tx.id}: ${rpcError.message}`);
        } else {
          console.log(`Failed zombie transaction ${tx.id}`);
          failed++;
        }
        processed++;
      }
    }
    
    const summary = {
      processed,
      completed,
      failed,
      checked: (stuckTransactions?.length || 0) + (zombieTxs?.length || 0),
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    };
    
    console.log('Verification complete:', summary);
    
    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in verify-stuck-payments function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
