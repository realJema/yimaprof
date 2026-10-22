import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { PaymentOperation } from 'npm:@hachther/mesomb@2.0.1';
import { z } from 'npm:zod@3';
import { bounded, runPayout, localPhone, type Transfer, type ProviderTransaction } from './workflow.ts';

const schema = z.object({
  action: z.enum(['approve', 'reconcile']), kind: z.enum(['affiliate', 'establishment']), payoutId: z.string().uuid(),
}).strict();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return json({ error: 'Service unavailable' }, 503);
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Unauthorized' }, 401);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);
    const { data: role, error: roleError } = await admin.from('user_roles').select('id').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
    if (roleError || !role) return json({ error: 'Admin access required' }, 403);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: 'Invalid payout request' }, 400);
    const { action, kind, payoutId } = parsed.data;
    const applicationKey = Deno.env.get('MESOMB_APP_KEY');
    const accessKey = Deno.env.get('MESOMB_ACCESS_KEY');
    const secretKey = Deno.env.get('MESOMB_SECRET_KEY');
    if (!applicationKey || !accessKey || !secretKey) return json({ error: 'MeSomb unavailable' }, 503);
    const provider = new PaymentOperation({ applicationKey, accessKey, secretKey });
    const state = await runPayout(action, {
      async claim() {
        const { data, error } = await admin.rpc('claim_payout_transfer', { p_kind: kind, p_id: payoutId, p_actor: user.id });
        if (error) throw new Error('Payout cannot be approved');
        return data as { claimed: boolean; transfer: Transfer };
      },
      async find() {
        const { data, error } = await admin.from('payout_transfers').select('*').eq('kind', kind).eq('payout_id', payoutId).maybeSingle();
        if (error) throw new Error('Lookup unavailable');
        return data as Transfer | null;
      },
      async send(transfer) {
        console.info(JSON.stringify({ event: 'payout_send', transfer_id: transfer.id, payout_id: payoutId, kind, amount: transfer.amount }));
        const response = await bounded(provider.makeDeposit({
          receiver: localPhone(transfer.phone), amount: transfer.amount,
          service: transfer.method === 'mtn_momo' ? 'MTN' : 'ORANGE', country: 'CM', currency: 'XAF',
          trxID: transfer.id, nonce: crypto.randomUUID(),
        }));
        return response.transaction as ProviderTransaction | undefined;
      },
      async check(transfer) {
        // EXTERNAL lookup uses the durable transfer ID, never a new deposit.
        const txs = await bounded(provider.checkTransactions([transfer.id], 'EXTERNAL'));
        if (!Array.isArray(txs) || txs.length !== 1) return undefined;
        return txs[0] as ProviderTransaction;
      },
      async finish(transfer, result, tx, errorCode) {
        const { data, error } = await admin.rpc('finish_payout_transfer', {
          p_transfer: transfer.id, p_state: result, p_reference: tx?.pk ?? null,
          p_status: tx?.status ?? null, p_error: errorCode ?? null,
        });
        if (error) {
          console.error(JSON.stringify({ event: 'payout_settlement_unavailable', transfer_id: transfer.id, outcome: result }));
          throw new Error('Settlement unavailable');
        }
        console.info(JSON.stringify({ event: 'payout_outcome', transfer_id: transfer.id, state: data, provider_status: tx?.status }));
        return String(data);
      },
      log(event, transfer) { console.warn(JSON.stringify({ event, transfer_id: transfer.id, kind })); },
    });
    return json({ success: state === 'paid', state });
  } catch {
    // Never release the reservation or start a second deposit on exceptions.
    console.error(JSON.stringify({ event: 'admin_payout_request_failed' }));
    return json({ error: 'Retrait non confirmé. Actualisez puis vérifiez le versement ; ne créez pas de second envoi.' }, 503);
  }
});