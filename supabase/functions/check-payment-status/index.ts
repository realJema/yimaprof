import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PaymentOperation } from 'https://esm.sh/@hachther/mesomb@2.0.1';
import {
  activateSubscriptionForTransaction,
  markTransactionFailed,
  normalizeStatus,
} from '../_shared/finalizeTransaction.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'No authorization header' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) return json({ error: 'Server configuration error' }, 500);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (userError || !user) return json({ error: 'Invalid user' }, 401);

    const body = await req.json().catch(() => ({}));
    const transactionId = typeof body?.transactionId === 'string' ? body.transactionId.trim() : '';
    if (!UUID_RE.test(transactionId)) return json({ error: 'Invalid transactionId' }, 400);

    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .single();

    if (txError || !tx) return json({ error: 'Transaction not found' }, 404);

    if (tx.status === 'completed' || tx.status === 'failed') {
      return json({ status: tx.status, source: 'database' });
    }

    const applicationKey = Deno.env.get('MESOMB_APP_KEY');
    const accessKey = Deno.env.get('MESOMB_ACCESS_KEY');
    const secretKey = Deno.env.get('MESOMB_SECRET_KEY');
    if (!applicationKey || !accessKey || !secretKey) {
      return json({ status: tx.status, source: 'database', note: 'provider not configured' });
    }

    const metadata = (tx.metadata || {}) as Record<string, unknown>;
    const providerRef = tx.provider_reference as string | null;

    // Fall back to the status the SDK already recorded on the transaction.
    let remoteStatus: unknown = metadata.mesomb_status ?? null;

    if (providerRef) {
      try {
        const operation = new PaymentOperation({ applicationKey, accessKey, secretKey });
        // deno-lint-ignore no-explicit-any
        const results: any = await operation.getTransactions([providerRef]);
        const remote = Array.isArray(results) ? results[0] : results;
        console.log('MeSomb status lookup:', JSON.stringify(remote ?? null));
        if (remote?.status) remoteStatus = remote.status;
      } catch (e) {
        console.error('MeSomb status lookup failed:', e instanceof Error ? e.message : e);
      }
    }

    const normalized = normalizeStatus(remoteStatus);
    console.log('Reconciliation for', tx.id, 'remote:', remoteStatus, '->', normalized);

    if (normalized === 'success') {
      const result = await activateSubscriptionForTransaction(supabase, tx, {
        confirmed_by: 'status-check',
        checked_status: remoteStatus,
      });
      if (!result.ok) return json({ status: tx.status, error: result.error }, 400);
      return json({ status: 'completed', source: 'provider', subscription_id: result.subscriptionId });
    }

    if (normalized === 'failed') {
      await markTransactionFailed(supabase, tx, `MeSomb status: ${remoteStatus}`, {
        confirmed_by: 'status-check',
      });
      return json({ status: 'failed', source: 'provider' });
    }

    return json({ status: tx.status, source: 'provider', pending: true });
  } catch (error) {
    console.error('check-payment-status error:', error);
    return json({ error: 'Status check failed' }, 500);
  }
});
