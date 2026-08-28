// Password + email OTP protected payout requests for schools.
//
// Actions:
//   "request" -> verifies the caller's password, the establishment admin rights and the
//                requested amount, then stores a hashed single-use OTP and emails the code.
//   "confirm" -> verifies the OTP (expiry, attempts, single use, matching context) and only
//                then creates the establishment_payouts row with the service role.
//
// The plain OTP is never stored: only a SHA-256 hash. Payout rows can no longer be
// inserted from the browser (the client INSERT policy was removed).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const PURPOSE = 'establishment_payout';
const OTP_TTL_MINUTES = 10;

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateOtp(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(bytes[0] % 1000000).padStart(6, '0');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user?.email) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null);
    const action = body?.action;
    const establishmentId = typeof body?.establishmentId === 'string' ? body.establishmentId : '';
    if (!establishmentId) return json({ error: 'Invalid input' }, 400);

    const { data: allowed } = await admin.rpc('is_establishment_admin', {
      _user_id: user.id,
      _establishment_id: establishmentId,
    });
    if (!allowed) return json({ error: 'Not authorized for this school' }, 403);

    // Available balance is always recomputed server-side, never trusted from the client.
    const { data: commissions } = await admin
      .from('establishment_commissions')
      .select('amount, status')
      .eq('establishment_id', establishmentId);
    const available = (commissions || [])
      .filter((c) => c.status === 'available')
      .reduce((sum, c) => sum + Number(c.amount), 0);

    if (action === 'request') {
      const amount = Number.parseInt(String(body?.amount ?? ''), 10);
      const method = body?.method === 'orange_money' ? 'orange_money' : 'mtn_momo';
      const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
      const password = typeof body?.password === 'string' ? body.password : '';

      if (!Number.isFinite(amount) || amount < 500 || amount > available) {
        return json({ error: 'Invalid amount', available }, 400);
      }
      if (!/^\+?[0-9]{8,15}$/.test(phone)) return json({ error: 'Invalid phone number' }, 400);
      if (password.length < 6) return json({ error: 'Password required' }, 400);

      // Re-verify the password with a throwaway client (no session persistence).
      const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
        auth: { persistSession: false },
      });
      const { error: pwError } = await anon.auth.signInWithPassword({ email: user.email, password });
      if (pwError) return json({ error: 'Incorrect password' }, 401);

      // No duplicate pending payout for the same school.
      const { data: pendingPayout } = await admin
        .from('establishment_payouts')
        .select('id')
        .eq('establishment_id', establishmentId)
        .eq('status', 'pending')
        .maybeSingle();
      if (pendingPayout) return json({ error: 'A payout request is already pending' }, 409);

      // Throttle: max 3 codes per 15 minutes.
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await admin
        .from('security_otps')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('purpose', PURPOSE)
        .gte('created_at', since);
      if ((count ?? 0) >= 3) return json({ error: 'Too many attempts, try again later' }, 429);

      // Invalidate previous unused codes for this purpose.
      await admin
        .from('security_otps')
        .update({ consumed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('purpose', PURPOSE)
        .is('consumed_at', null);

      const code = generateOtp();
      const { data: otpRow, error: otpError } = await admin
        .from('security_otps')
        .insert({
          user_id: user.id,
          purpose: PURPOSE,
          code_hash: await sha256(code),
          context: { establishment_id: establishmentId, amount, method, phone },
          expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString(),
        })
        .select('id')
        .single();
      if (otpError || !otpRow) return json({ error: 'Could not start verification' }, 500);

      // Reuse the existing notification/email pipeline.
      await admin.rpc('send_notification', {
        p_user_id: user.id,
        p_title: 'Code de confirmation de retrait',
        p_message:
          `Votre code de confirmation est ${code}. Il expire dans ${OTP_TTL_MINUTES} minutes. ` +
          `Montant demandé : ${amount.toLocaleString()} FCFA. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message et changez votre mot de passe.`,
        p_type: 'account_activity',
        p_priority: 'high',
        p_metadata: {},
        p_action_url: '/school',
      });

      await admin.rpc('log_audit', {
        p_action: 'payout_otp_requested',
        p_target_type: 'establishments',
        p_target_id: establishmentId,
        p_metadata: { amount, method },
      });

      return json({ success: true, otpId: otpRow.id, expiresInMinutes: OTP_TTL_MINUTES });
    }

    if (action === 'confirm') {
      const otpId = typeof body?.otpId === 'string' ? body.otpId : '';
      const code = typeof body?.code === 'string' ? body.code.trim() : '';
      if (!otpId || !/^[0-9]{6}$/.test(code)) return json({ error: 'Invalid code' }, 400);

      const { data: otp } = await admin
        .from('security_otps')
        .select('*')
        .eq('id', otpId)
        .eq('user_id', user.id)
        .eq('purpose', PURPOSE)
        .maybeSingle();

      if (!otp) return json({ error: 'Verification not found' }, 404);
      if (otp.consumed_at) return json({ error: 'Code already used' }, 400);
      if (new Date(otp.expires_at).getTime() < Date.now()) return json({ error: 'Code expired' }, 400);
      if (otp.attempts >= otp.max_attempts) return json({ error: 'Too many attempts' }, 429);

      if (otp.code_hash !== (await sha256(code))) {
        await admin.from('security_otps').update({ attempts: otp.attempts + 1 }).eq('id', otp.id);
        return json({ error: 'Incorrect code', attemptsLeft: otp.max_attempts - otp.attempts - 1 }, 400);
      }

      const ctx = otp.context as { establishment_id: string; amount: number; method: string; phone: string };
      if (ctx.establishment_id !== establishmentId) return json({ error: 'Context mismatch' }, 400);
      if (ctx.amount > available) return json({ error: 'Balance changed, restart the request' }, 409);

      // Consume first: a replayed request can no longer create a second payout.
      const { data: consumed } = await admin
        .from('security_otps')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', otp.id)
        .is('consumed_at', null)
        .select('id')
        .maybeSingle();
      if (!consumed) return json({ error: 'Code already used' }, 400);

      const { error: payoutError } = await admin.from('establishment_payouts').insert({
        establishment_id: establishmentId,
        amount: ctx.amount,
        currency: 'XAF',
        method: ctx.method,
        phone: ctx.phone,
        status: 'pending',
        requested_by: user.id,
      });
      if (payoutError) {
        console.error('payout insert failed', payoutError.message);
        return json({ error: 'Could not create the payout request' }, 500);
      }

      await admin.rpc('log_audit', {
        p_action: 'payout_requested',
        p_target_type: 'establishments',
        p_target_id: establishmentId,
        p_metadata: { amount: ctx.amount, method: ctx.method },
      });

      return json({ success: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('payout-security error', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'Unexpected error' }, 500);
  }
});
