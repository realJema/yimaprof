// Creates (or repairs) the Yimaprof demo accounts: normal user, school, commercial and parent.
//
// Admin only, idempotent: existing demo accounts are reused, never duplicated.
// The demo password is a fixed, well-known value on purpose — these accounts hold no real data.
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

const DEMO_PASSWORD = 'Yimaprof2026!';

type DemoSpec = {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'school_admin' | 'commercial' | 'parent';
};

const DEMOS: DemoSpec[] = [
  { email: 'demo.eleve@yimaprof.com', username: 'demo_eleve', firstName: 'Élève', lastName: 'Démo', role: 'student' },
  { email: 'demo.ecole@yimaprof.com', username: 'demo_ecole', firstName: 'École', lastName: 'Démo', role: 'school_admin' },
  { email: 'demo.commercial@yimaprof.com', username: 'demo_commercial', firstName: 'Commercial', lastName: 'Démo', role: 'commercial' },
  { email: 'demo.parent@yimaprof.com', username: 'demo_parent', firstName: 'Parent', lastName: 'Démo', role: 'parent' },
  { email: 'demo.filleul1@yimaprof.com', username: 'demo_filleul1', firstName: 'Awa', lastName: 'Nkomo', role: 'student' },
  { email: 'demo.filleul2@yimaprof.com', username: 'demo_filleul2', firstName: 'Brice', lastName: 'Talla', role: 'student' },
  { email: 'demo.filleul3@yimaprof.com', username: 'demo_filleul3', firstName: 'Clarisse', lastName: 'Mbarga', role: 'student' },
  { email: 'demo.filleul4@yimaprof.com', username: 'demo_filleul4', firstName: 'Divine', lastName: 'Ekani', role: 'student' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Either an admin JWT, or the internal setup key (used for one-off provisioning).
    const seedSecret = Deno.env.get('DEMO_SEED_SECRET');
    const providedSecret = req.headers.get('x-seed-secret');
    const viaSecret = Boolean(seedSecret && providedSecret && providedSecret === seedSecret);

    let actorId: string | null = null;
    if (!viaSecret) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) return json({ error: 'Unauthorized' }, 401);
      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', ''),
      );
      if (userError || !user) return json({ error: 'Unauthorized' }, 401);

      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' });
      if (!isAdmin) return json({ error: 'Admin only' }, 403);
      actorId = user.id;
    }


    const ids: Record<string, string> = {};

    for (const spec of DEMOS) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', spec.email)
        .maybeSingle();

      let userId = existing?.id as string | undefined;

      if (!userId) {
        const { data: created, error: createError } = await supabase.auth.admin.createUser({
          email: spec.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
          user_metadata: {
            first_name: spec.firstName,
            last_name: spec.lastName,
            username: spec.username,
            preferred_language: 'fr',
          },
        });
        if (createError || !created?.user) {
          console.error('createUser failed', spec.email, createError?.message);
          return json({ error: `Could not create ${spec.email}` }, 400);
        }
        userId = created.user.id;
      } else {
        // Reset the known demo password so the account stays testable.
        await supabase.auth.admin.updateUserById(userId, { password: DEMO_PASSWORD, email_confirm: true });
      }

      await supabase
        .from('profiles')
        .update({
          first_name: spec.firstName,
          last_name: spec.lastName,
          username: spec.username,
          must_change_password: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (spec.role === 'student') {
        await supabase.from('user_roles').upsert({ user_id: userId, role: 'student' }, { onConflict: 'user_id,role' });
      } else {
        await supabase.from('user_roles').upsert({ user_id: userId, role: spec.role }, { onConflict: 'user_id,role' });
      }

      ids[spec.email] = userId!;
    }

    // ---- School demo account owns the demo establishment ----
    const { data: demoSchool } = await supabase
      .from('establishments')
      .select('id, name')
      .eq('is_demo', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    let schoolInfo: unknown = null;
    if (demoSchool) {
      const schoolUserId = ids['demo.ecole@yimaprof.com'];
      await supabase
        .from('establishments')
        .update({ owner_id: schoolUserId, approval_status: 'approved', is_active: true, updated_at: new Date().toISOString() })
        .eq('id', demoSchool.id);
      await supabase.from('profiles').update({ establishment_id: demoSchool.id }).eq('id', schoolUserId);
      schoolInfo = { id: demoSchool.id, name: demoSchool.name };
    }

    // ---- Parent demo: linked children + one pending declaration ----
    const parentId = ids['demo.parent@yimaprof.com'];
    const children: Array<{ email: string; name: string }> = [
      { email: 'demo.eleve@yimaprof.com', name: 'Élève Démo' },
      { email: 'demo.filleul1@yimaprof.com', name: 'Awa Nkomo' },
    ];
    for (const child of children) {
      const childId = ids[child.email];
      const { data: link } = await supabase
        .from('parent_children')
        .select('id')
        .eq('parent_id', parentId)
        .eq('child_user_id', childId)
        .maybeSingle();
      if (!link) {
        await supabase.from('parent_children').insert({
          parent_id: parentId,
          child_user_id: childId,
          child_name: child.name,
          status: 'linked',
          created_by: actorId,
        });
      }
    }
    const { data: pending } = await supabase
      .from('parent_children')
      .select('id')
      .eq('parent_id', parentId)
      .is('child_user_id', null)
      .maybeSingle();
    if (!pending) {
      await supabase.from('parent_children').insert({
        parent_id: parentId,
        child_name: 'Emmanuel Démo',
        status: 'pending',
        created_by: actorId,
      });
    }

    // ---- Commercial demo: approved affiliate so commissions are generated ----
    const commercialId = ids['demo.commercial@yimaprof.com'];
    await supabase
      .from('affiliate_applications')
      .upsert(
        { user_id: commercialId, status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: actorId },
        { onConflict: 'user_id' },
      );

    return json({
      success: true,
      password: DEMO_PASSWORD,
      accounts: ids,
      school: schoolInfo,
    });
  } catch (e) {
    console.error('seed-demo-accounts error', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'Unexpected error' }, 500);
  }
});
