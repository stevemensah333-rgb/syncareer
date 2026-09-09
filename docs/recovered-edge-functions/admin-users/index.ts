import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── AUTH: validate JWT and require admin role ───────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const callerId = claimsData.claims.sub as string;

    // Use service role to bypass RLS for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify admin role server-side via has_role()
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role', {
      _user_id: callerId,
      _role: 'admin',
    });
    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { action, user_id, tier, role_action } = body ?? {};

    // ── LIST USERS ───────────────────────────────────────────────────────────
    if (!action || action === 'list') {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, username, user_type, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all subscriptions
      const { data: subscriptions, error: subsError } = await supabaseAdmin
        .from('subscriptions')
        .select('user_id, tier, status, current_period_end, updated_at');

      if (subsError) throw subsError;

      // Fetch auth users for emails
      const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

      if (authError) throw authError;

      // Fetch all admin roles
      const { data: adminRoles, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const emailMap: Record<string, string> = {};
      authUsers.forEach((u: any) => {
        emailMap[u.id] = u.email ?? '';
      });

      const subMap: Record<string, any> = {};
      (subscriptions ?? []).forEach((s: any) => {
        subMap[s.user_id] = s;
      });

      const adminSet = new Set((adminRoles ?? []).map((r: any) => r.user_id));

      const users = (profiles ?? []).map((p: any) => ({
        id: p.id,
        full_name: p.full_name,
        username: p.username,
        user_type: p.user_type,
        email: emailMap[p.id] ?? '',
        created_at: p.created_at,
        subscription: subMap[p.id] ?? null,
        is_admin: adminSet.has(p.id),
      }));

      console.log(`[admin-users] caller=${callerId} listed ${users.length} users`);
      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── UPDATE SUBSCRIPTION ──────────────────────────────────────────────────
    if (action === 'set_tier') {
      if (!user_id || !tier) {
        return new Response(JSON.stringify({ error: 'Missing user_id or tier' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!['free', 'premium'].includes(tier)) {
        return new Response(JSON.stringify({ error: 'Invalid tier' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const now = new Date();
      const periodEnd = tier === 'premium'
        ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString()
        : null;

      const { data, error } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          user_id,
          tier,
          status: 'active',
          current_period_start: tier === 'premium' ? now.toISOString() : null,
          current_period_end: periodEnd,
          updated_at: now.toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) throw error;

      console.log(`[admin-users] caller=${callerId} set tier user=${user_id} tier=${tier}`);
      return new Response(JSON.stringify({ success: true, subscription: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── SET ADMIN ROLE ───────────────────────────────────────────────────────
    if (action === 'set_role') {
      if (!user_id || !role_action) {
        return new Response(JSON.stringify({ error: 'Missing user_id or role_action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!['grant', 'revoke'].includes(role_action)) {
        return new Response(JSON.stringify({ error: 'Invalid role_action. Use "grant" or "revoke".' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (role_action === 'grant') {
        const { error } = await supabaseAdmin
          .from('user_roles')
          .upsert({ user_id, role: 'admin' }, { onConflict: 'user_id,role' });

        if (error) throw error;

        console.log(`[admin-users] caller=${callerId} GRANTED admin to user=${user_id}`);
        return new Response(JSON.stringify({ success: true, is_admin: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Prevent self-demotion to avoid lock-out
        if (user_id === callerId) {
          return new Response(JSON.stringify({ error: 'You cannot revoke your own admin role.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', user_id)
          .eq('role', 'admin');

        if (error) throw error;

        console.log(`[admin-users] caller=${callerId} REVOKED admin from user=${user_id}`);
        return new Response(JSON.stringify({ success: true, is_admin: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[admin-users]', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
