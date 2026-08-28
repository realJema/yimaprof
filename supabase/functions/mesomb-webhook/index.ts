import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  activateSubscriptionForTransaction,
  markTransactionFailed,
  normalizeStatus,
} from '../_shared/finalizeTransaction.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-mesomb-signature, x-webhook-secret, x-mesomb-secret',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Accepts either the raw secret sent in a header/query param, or an HMAC-SHA256
// signature of the raw body computed with the secret.
async function isAuthorized(req: Request, url: URL, rawBody: string): Promise<boolean> {
  const secret = Deno.env.get('MESOMB_WEBHOOK_SECRET');
  if (!secret) {
    console.warn('MESOMB_WEBHOOK_SECRET not configured - rejecting webhook');
    return false;
  }

  const candidates = [
    req.headers.get('x-mesomb-signature'),
    req.headers.get('x-mesomb-secret'),
    req.headers.get('x-webhook-secret'),
    req.headers.get('x-signature'),
    req.headers.get('signature'),
    url.searchParams.get('secret'),
    url.searchParams.get('key'),
  ].filter(Boolean) as string[];

  const authHeader = req.headers.get('authorization');
  if (authHeader) candidates.push(authHeader.replace(/^Bearer\s+/i, '').trim());

  if (candidates.some((c) => c === secret)) return true;

  const expected = await hmacHex(secret, rawBody);
  return candidates.some((c) => c.replace(/^sha256=/i, '').toLowerCase() === expected);
}

// MeSomb payload shapes vary; look for our transaction UUID everywhere plausible.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// deno-lint-ignore no-explicit-any
function extractIds(payload: any) {
  const t = payload?.transaction ?? {};
  const ourIds = [payload?.trxID, payload?.trxid, payload?.reference, t?.trxID, t?.reference, payload?.external_id]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => UUID_RE.test(v));
  const providerRefs = [payload?.pk, t?.pk, payload?.id, t?.id]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);
  const status = payload?.status ?? t?.status ?? payload?.state;
  return { ourIds: [...new Set(ourIds)], providerRefs: [...new Set(providerRefs)], status };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const rawBody = await req.text();

    if (!(await isAuthorized(req, url, rawBody))) {
      console.error('Unauthorized webhook call');
      return json({ error: 'Unauthorized' }, 401);
    }

    // deno-lint-ignore no-explicit-any
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // Some providers post form-encoded bodies
      payload = Object.fromEntries(new URLSearchParams(rawBody));
    }
    console.log('Webhook payload:', JSON.stringify(payload));

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      return json({ error: 'Server configuration error' }, 500);
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { ourIds, providerRefs, status } = extractIds(payload);
    console.log('Extracted:', { ourIds, providerRefs, status });

    // deno-lint-ignore no-explicit-any
    let tx: any = null;
    if (ourIds.length > 0) {
      const { data } = await supabase.from('transactions').select('*').in('id', ourIds).limit(1);
      tx = data?.[0] ?? null;
    }
    if (!tx && providerRefs.length > 0) {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .in('provider_reference', providerRefs)
        .order('created_at', { ascending: false })
        .limit(1);
      tx = data?.[0] ?? null;
    }

    if (!tx) {
      console.error('Transaction not found for webhook', { ourIds, providerRefs });
      return json({ error: 'Transaction not found' }, 404);
    }

    console.log('Found transaction:', tx.id, 'current status:', tx.status);

    if (tx.status === 'completed' || tx.status === 'failed') {
      return json({ message: `Already ${tx.status}` });
    }

    const normalized = normalizeStatus(status);

    if (normalized === 'success') {
      if (providerRefs[0] && !tx.provider_reference) {
        await supabase.from('transactions').update({ provider_reference: providerRefs[0] }).eq('id', tx.id);
      }
      const result = await activateSubscriptionForTransaction(supabase, tx, {
        mesomb_webhook: payload,
        confirmed_by: 'webhook',
      });
      if (!result.ok) return json({ error: result.error }, 400);
      return json({ success: true, message: 'Payment completed', subscription_id: result.subscriptionId });
    }

    if (normalized === 'failed') {
      await markTransactionFailed(supabase, tx, `MeSomb status: ${status}`, {
        mesomb_webhook: payload,
        confirmed_by: 'webhook',
      });
      return json({ success: true, message: 'Payment marked as failed' });
    }

    console.log('Non-terminal or unknown status, no action:', status);
    return json({ success: true, message: `No action for status: ${status}` });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
});
