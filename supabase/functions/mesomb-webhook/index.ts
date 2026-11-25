import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { normalizeStatus } from '../_shared/finalizeTransaction.ts';
import { authorizeWebhook, extractWebhook, webhookEventId, type WebhookPayload } from './webhookUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': [
    'authorization',
    'x-client-info',
    'apikey',
    'content-type',
    'x-mesomb-webhook-signature',
    'x-mesomb-webhook-event-id',
    'x-mesomb-webhook-request-timestamp',
    'x-mesomb-signature',
    'x-webhook-secret',
    'x-mesomb-secret',
  ].join(', '),
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const url = new URL(req.url);
    const rawBody = await req.text();
    const authorization = await authorizeWebhook(
      req.headers,
      url,
      rawBody,
      Deno.env.get('MESOMB_WEBHOOK_SECRET'),
    );
    if (!authorization.authorized) {
      console.error('Webhook authentication rejected:', authorization.reason);
      return json({ error: 'Unauthorized' }, 401);
    }

    let payload: WebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = Object.fromEntries(new URLSearchParams(rawBody));
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return json({ error: 'Invalid webhook payload' }, 400);
    }

    const event = extractWebhook(payload);
    const suppliedEventId = webhookEventId(req.headers, payload, event.isV2);
    console.log('Authenticated webhook received:', {
      eventId: suppliedEventId,
      eventType: event.eventType || 'legacy',
      status: event.status,
      mode: authorization.mode,
    });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) return json({ error: 'Server configuration error' }, 500);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Non-payment events (including endpoint tests) are acknowledged without
    // touching subscriptions. Their event ID is still durably deduplicated.
    const isPaymentEvent = !event.isV2 || !event.eventType || event.eventType.startsWith('payment.');
    if (!isPaymentEvent) {
      if (suppliedEventId) {
        const { error } = await supabase.rpc('process_mesomb_webhook_event', {
          p_event_id: suppliedEventId,
          p_event_type: event.eventType,
          p_transaction_id: null,
          p_action: 'ignored',
          p_payload: payload,
        });
        if (error) {
          console.error('Failed to store ignored webhook:', error.message);
          return json({ error: 'Webhook storage failed' }, 500);
        }
      }
      return json({ success: true, message: 'Event acknowledged' });
    }

    // deno-lint-ignore no-explicit-any
    let tx: any = null;
    if (event.ourIds.length > 0) {
      const { data, error } = await supabase.from('transactions').select('*').in('id', event.ourIds).limit(1);
      if (error) {
        console.error('Webhook transaction lookup failed:', error.message);
        return json({ error: 'Transaction lookup failed' }, 500);
      }
      tx = data?.[0] ?? null;
    }
    if (!tx && event.providerRefs.length > 0) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .in('provider_reference', event.providerRefs)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) {
        console.error('Webhook provider reference lookup failed:', error.message);
        return json({ error: 'Transaction lookup failed' }, 500);
      }
      tx = data?.[0] ?? null;
    }
    if (!tx) {
      console.error('Transaction not found for webhook', {
        eventId: suppliedEventId,
        eventType: event.eventType,
        hasInternalReference: event.ourIds.length > 0,
        hasProviderReference: event.providerRefs.length > 0,
      });
      return json({ error: 'Transaction not found' }, 404);
    }

    const normalized = normalizeStatus(event.status);
    const action = normalized === 'success' ? 'success' : normalized === 'failed' ? 'failed' : 'ignored';
    // Legacy events had no event ID. This deterministic key still prevents a
    // repeated terminal delivery from repeating the business action.
    const eventId = suppliedEventId || `legacy:${tx.id}:${action}:${event.providerRefs[0] || 'no-provider-reference'}`;
    const { data: result, error } = await supabase.rpc('process_mesomb_webhook_event', {
      p_event_id: eventId,
      p_event_type: event.eventType || 'legacy',
      p_transaction_id: tx.id,
      p_action: action,
      p_payload: payload,
      p_provider_reference: event.providerRefs[0] || null,
      p_failure_reason: normalized === 'failed' ? `MeSomb status: ${String(event.status)}` : null,
    });
    if (error) {
      console.error('Webhook processing failed:', { eventId, transactionId: tx.id, message: error.message });
      return json({ error: 'Webhook processing failed' }, 500);
    }
    if (!result?.ok) {
      console.error('Webhook rejected by finalizer:', { eventId, transactionId: tx.id, error: result?.error });
      return json({ error: result?.error || 'Webhook processing failed' }, 400);
    }

    console.log('Webhook processed:', {
      eventId,
      transactionId: tx.id,
      action,
      duplicate: result.duplicate === true,
      alreadyDone: result.already_done === true,
    });
    return json({
      success: true,
      message: result.duplicate ? 'Duplicate event acknowledged' : action === 'ignored' ? 'Event acknowledged' : 'Payment status updated',
      duplicate: result.duplicate === true,
      subscription_id: result.subscription_id,
    });
  } catch (error) {
    console.error('Unexpected webhook error:', error instanceof Error ? error.message : 'Unknown error');
    return json({ error: 'Internal server error' }, 500);
  }
});
