import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { authorizeWebhook, extractWebhook, hmacHex, webhookEventId } from './webhookUtils.ts';

const secret = 'whsec_test_only';
const body = JSON.stringify({
  id: 'evt_123',
  event_type: 'payment.transaction.succeeded',
  data: {
    object: {
      id: 'txn_provider_123',
      status: 'succeeded',
      reference: '52dedb63-8b49-4d7e-bda7-490f40a09330',
    },
  },
});

Deno.test('accepts a valid current MeSomb signature', async () => {
  const timestamp = 1_800_000_000;
  const signature = await hmacHex(secret, `${timestamp}.${body}`);
  const headers = new Headers({
    'x-mesomb-webhook-signature': `t=${timestamp},v1=${signature}`,
    'x-mesomb-webhook-request-timestamp': String(timestamp),
  });
  assertEquals(await authorizeWebhook(headers, new URL('https://example.com'), body, secret, timestamp * 1000), {
    authorized: true,
    mode: 'v2',
  });
});

Deno.test('rejects a modified body', async () => {
  const timestamp = 1_800_000_000;
  const signature = await hmacHex(secret, `${timestamp}.${body}`);
  const headers = new Headers({ 'x-mesomb-webhook-signature': `t=${timestamp},v1=${signature}` });
  const result = await authorizeWebhook(headers, new URL('https://example.com'), `${body} `, secret, timestamp * 1000);
  assertEquals(result.authorized, false);
  assertEquals(result.reason, 'signature_mismatch');
});

Deno.test('rejects a signature older than five minutes', async () => {
  const timestamp = 1_800_000_000;
  const signature = await hmacHex(secret, `${timestamp}.${body}`);
  const headers = new Headers({ 'x-mesomb-webhook-signature': `t=${timestamp},v1=${signature}` });
  const result = await authorizeWebhook(headers, new URL('https://example.com'), body, secret, (timestamp + 301) * 1000);
  assertEquals(result.authorized, false);
  assertEquals(result.reason, 'stale_timestamp');
});

Deno.test('rejects mismatched signature and request timestamps', async () => {
  const timestamp = 1_800_000_000;
  const signature = await hmacHex(secret, `${timestamp}.${body}`);
  const headers = new Headers({
    'x-mesomb-webhook-signature': `t=${timestamp},v1=${signature}`,
    'x-mesomb-webhook-request-timestamp': String(timestamp + 1),
  });
  const result = await authorizeWebhook(headers, new URL('https://example.com'), body, secret, timestamp * 1000);
  assertEquals(result.authorized, false);
  assertEquals(result.reason, 'timestamp_mismatch');
});

Deno.test('preserves legacy raw-body HMAC authentication', async () => {
  const signature = await hmacHex(secret, body);
  const headers = new Headers({ 'x-mesomb-signature': `sha256=${signature}` });
  assertEquals((await authorizeWebhook(headers, new URL('https://example.com'), body, secret)).authorized, true);
});

Deno.test('extracts transaction and provider IDs from data.object', () => {
  const result = extractWebhook(JSON.parse(body));
  assertEquals(result.ourIds, ['52dedb63-8b49-4d7e-bda7-490f40a09330']);
  assertEquals(result.providerRefs, ['txn_provider_123']);
  assertEquals(result.status, 'succeeded');
  assertEquals(result.eventType, 'payment.transaction.succeeded');
  assertEquals(result.providerRefs.includes('evt_123'), false);
});

Deno.test('uses the V2 event ID without confusing it with the provider transaction ID', () => {
  const payload = JSON.parse(body);
  assertEquals(webhookEventId(new Headers(), payload, true), 'evt_123');
  assertEquals(webhookEventId(new Headers({ 'x-mesomb-webhook-event-id': 'evt_header' }), payload, true), 'evt_header');
});

Deno.test('preserves the legacy flat payload mapping', () => {
  const payload = {
    pk: 'provider_legacy',
    status: 'SUCCESS',
    reference: 'a714b533-be66-41bd-904f-f08d46354710',
  };
  const result = extractWebhook(payload);
  assertEquals(result.isV2, false);
  assertEquals(result.ourIds, [payload.reference]);
  assertEquals(result.providerRefs, ['provider_legacy']);
  assertEquals(result.status, 'SUCCESS');
});
