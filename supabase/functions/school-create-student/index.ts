// Creates a real Yimaprof account for a student added by a school.
//
// Flow:
//   1. Verify caller JWT.
//   2. Verify caller is an approved school admin of the target establishment
//      (is_establishment_admin() already enforces approval).
//   3. Verify the requested class belongs to that establishment (establishment_classes).
//   4. Create the auth user with a generated password (service role, email pre-confirmed).
//   5. Link profile -> establishment, force password change on first login.
//   6. Insert / update the establishment_students row with the class association.
//   7. Return the generated password ONCE so the school can hand it to the student.
//      The password is never stored in plain text anywhere.
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

function generatePassword(): string {
  // Human-readable but random: e.g. "Yima-7F3K9Q"
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const code = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  return `Yima-${code}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => null);
    const establishmentId = typeof body?.establishmentId === 'string' ? body.establishmentId : '';
    const classId = typeof body?.classId === 'string' ? body.classId : '';
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim().slice(0, 120) : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 255) : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim().slice(0, 30) : '';

    if (!establishmentId || !classId || fullName.length < 3 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: 'Invalid input' }, 400);
    }

    // Caller must administer this (approved) establishment.
    const { data: allowed } = await supabase.rpc('is_establishment_admin', {
      _user_id: user.id,
      _establishment_id: establishmentId,
    });
    if (!allowed) return json({ error: 'Not authorized for this school' }, 403);

    // The class must be one of the school's associated platform classes.
    const { data: link } = await supabase
      .from('establishment_classes')
      .select('id')
      .eq('establishment_id', establishmentId)
      .eq('class_id', classId)
      .maybeSingle();
    if (!link) return json({ error: 'Class is not associated with this school' }, 400);

    // Refuse to hijack an existing account.
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, establishment_id')
      .ilike('email', email)
      .maybeSingle();
    if (existingProfile) {
      return json({ error: 'An account already exists with this email' }, 409);
    }

    const password = generatePassword();
    const [firstName, ...rest] = fullName.split(/\s+/);

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: rest.join(' '), preferred_language: 'fr' },
    });
    if (createError || !created?.user) {
      console.error('createUser failed', createError?.message);
      return json({ error: 'Could not create the student account' }, 400);
    }

    const studentUserId = created.user.id;

    // handle_new_user() already created the profile row; complete it.
    await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: rest.join(' ') || null,
        phone: phone || null,
        establishment_id: establishmentId,
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentUserId);

    // assign_default_role() already grants 'student'; make sure nothing else is attached.
    await supabase.from('user_roles').delete().eq('user_id', studentUserId).neq('role', 'student');
    await supabase
      .from('user_roles')
      .upsert({ user_id: studentUserId, role: 'student' }, { onConflict: 'user_id,role' });

    // School-side record, linked to the platform account and the class.
    const { error: studentError } = await supabase.from('establishment_students').insert({
      establishment_id: establishmentId,
      class_id: classId,
      user_id: studentUserId,
      full_name: fullName,
      email,
      phone: phone || null,
      status: 'active',
    });
    if (studentError) {
      console.error('establishment_students insert failed', studentError.message);
      return json({ error: 'Account created but could not be linked to the class' }, 500);
    }

    return json({ success: true, userId: studentUserId, email, password });
  } catch (e) {
    console.error('school-create-student error', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'Unexpected error' }, 500);
  }
});
