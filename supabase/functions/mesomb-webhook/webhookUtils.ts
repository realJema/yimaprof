const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNATURE_TOLERANCE_SECONDS = 300;

export async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeHexEqual(received: string, expected: string): boolean {
  const left = received.replace(/^sha256=/i, '').toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(left) || left.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return difference === 0;
}

export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  mode?: 'v2' | 'legacy';
}

/** Verify MeSomb V2 signatures while preserving the previously working legacy formats. */
export async function authorizeWebhook(
  headers: Headers,
  url: URL,
  rawBody: string,
  secret: string | undefined,
  nowMs = Date.now(),
): Promise<AuthorizationResult> {
  if (!secret) return { authorized: false, reason: 'missing_webhook_secret' };

  const signedHeader = headers.get('x-mesomb-webhook-signature');
  if (signedHeader) {
    const parts = Object.fromEntries(
      signedHeader.split(',').map((part) => {
        const separator = part.indexOf('=');
        return separator < 0 ? [part.trim(), ''] : [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
      }),
    );
    const timestamp = Number(parts.t);
    if (!Number.isInteger(timestamp) || !parts.v1) {
      return { authorized: false, reason: 'invalid_signature_format', mode: 'v2' };
    }
    const requestTimestamp = headers.get('x-mesomb-webhook-request-timestamp');
    if (requestTimestamp && Number(requestTimestamp) !== timestamp) {
      return { authorized: false, reason: 'timestamp_mismatch', mode: 'v2' };
    }
    if (Math.abs(Math.floor(nowMs / 1000) - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
      return { authorized: false, reason: 'stale_timestamp', mode: 'v2' };
    }
    const expected = await hmacHex(secret, `${timestamp}.${rawBody}`);
    return safeHexEqual(parts.v1, expected)
      ? { authorized: true, mode: 'v2' }
      : { authorized: false, reason: 'signature_mismatch', mode: 'v2' };
  }

  const candidates = [
    headers.get('x-mesomb-signature'),
    headers.get('x-mesomb-secret'),
    headers.get('x-webhook-secret'),
    headers.get('x-signature'),
    headers.get('signature'),
    url.searchParams.get('secret'),
    url.searchParams.get('key'),
  ].filter((value): value is string => Boolean(value));
  const authorization = headers.get('authorization');
  if (authorization) candidates.push(authorization.replace(/^Bearer\s+/i, '').trim());
  if (candidates.some((candidate) => candidate === secret)) return { authorized: true, mode: 'legacy' };

  const expected = await hmacHex(secret, rawBody);
  return candidates.some((candidate) => safeHexEqual(candidate, expected))
    ? { authorized: true, mode: 'legacy' }
    : { authorized: false, reason: 'unauthorized', mode: 'legacy' };
}

// deno-lint-ignore no-explicit-any
export type WebhookPayload = any;

function strings(values: unknown[]): string[] {
  return [...new Set(values.map((value) => typeof value === 'string' ? value.trim() : '').filter(Boolean))];
}

/** Supports both current MeSomb events (data.object) and the legacy flat transaction payload. */
export function extractWebhook(payload: WebhookPayload) {
  const isV2 = Boolean(payload?.data?.object && typeof payload.data.object === 'object');
  const resource = isV2 ? payload.data.object : (payload?.transaction ?? payload ?? {});
  const ourIds = strings([
    resource?.trxID,
    resource?.trxid,
    resource?.reference,
    resource?.external_id,
    payload?.trxID,
    payload?.trxid,
    payload?.reference,
    payload?.external_id,
  ]).filter((value) => UUID_RE.test(value));
  const providerRefs = strings([
    resource?.pk,
    resource?.id,
    resource?.transaction_id,
    ...(isV2 ? [] : [payload?.pk, payload?.id, payload?.transaction?.pk, payload?.transaction?.id]),
  ]);
  const status = resource?.status ?? payload?.status ?? payload?.state;
  const eventType = String(payload?.event_type ?? payload?.type ?? '');
  return { isV2, ourIds, providerRefs, status, eventType };
}

export function webhookEventId(headers: Headers, payload: WebhookPayload, isV2: boolean): string | null {
  const headerId = headers.get('x-mesomb-webhook-event-id')?.trim();
  if (headerId) return headerId;
  if (isV2 && typeof payload?.id === 'string' && payload.id.trim()) return payload.id.trim();
  return null;
}
