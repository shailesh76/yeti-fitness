import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createAnonClient, createServiceRoleClient } from '../_shared/supabaseClient.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate the caller (admin/coach JWT)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createAnonClient(authHeader)

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized user authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Authorize the caller: must have role = 'coach' or 'admin' in profiles table
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || (profile.role !== 'coach' && profile.role !== 'admin')) {
      return new Response(JSON.stringify({ error: 'Access denied: requires coach or admin privilege' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Parse input body parameters
    const { action, athleteId, email, plan } = await req.json()
    if (!action || !['grant', 'revoke', 'list'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid or missing action: must be grant, revoke, or list' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Initialize service role client to write entitlements
    const supabaseServiceRole = createServiceRoleClient()

    // ── list: return all PRO entitlements joined with emails (emails live in
    //    auth.users, not profiles, so this must run with service_role) ──────────
    if (action === 'list') {
      const { data: ents, error: entErr } = await supabaseServiceRole
        .from('user_entitlements')
        .select('user_id, plan_id, status, source, created_at')
        .eq('plan_id', 'PRO')
        .order('created_at', { ascending: false })
      if (entErr) throw entErr

      const { data: authList } = await supabaseServiceRole.auth.admin.listUsers({ perPage: 1000 })
      const emailMap: Record<string, string> = {}
      ;(authList?.users ?? []).forEach((u) => { emailMap[u.id] = u.email ?? '' })

      const entitlements = (ents ?? []).map((e) => ({
        user_id: e.user_id,
        plan_id: e.plan_id,
        status: e.status,
        source: e.source,
        created_at: e.created_at,
        email: emailMap[e.user_id] || e.user_id,
      }))
      return new Response(JSON.stringify({ entitlements }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // grant/revoke: resolve the target athlete by id, or by email via the auth API
    // (profiles has no email column — it lives in auth.users).
    let targetId: string | undefined = athleteId
    if (!targetId && email) {
      const { data: authList } = await supabaseServiceRole.auth.admin.listUsers({ perPage: 1000 })
      targetId = (authList?.users ?? []).find(
        (u) => (u.email ?? '').toLowerCase() === String(email).toLowerCase(),
      )?.id
      if (!targetId) {
        return new Response(JSON.stringify({ error: 'No user found with that email address.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }
    if (!targetId) {
      return new Response(JSON.stringify({ error: 'Missing athleteId or email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'grant') {
      const targetPlan = plan || 'PRO'

      // Validate the plan exists in subscription_plans
      const { data: planExists } = await supabaseServiceRole
        .from('subscription_plans')
        .select('id')
        .eq('id', targetPlan)
        .single()

      if (!planExists) {
        return new Response(JSON.stringify({
          error: 'Invalid plan',
          details: `Plan "${targetPlan}" does not exist in subscription_plans`,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Validate the athlete exists in profiles
      const { data: athleteExists } = await supabaseServiceRole
        .from('profiles')
        .select('id')
        .eq('id', targetId)
        .single()

      if (!athleteExists) {
        return new Response(JSON.stringify({
          error: 'Athlete not found',
          details: `No profile found for athlete ID: ${targetId}`,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Deactivate any pre-existing entitlements for this athlete
      const { error: deactivateErr } = await supabaseServiceRole
        .from('user_entitlements')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('user_id', targetId)

      if (deactivateErr) {
        throw new Error(`Failed to deactivate existing entitlements: ${deactivateErr.message}`)
      }

      // Upsert the new entitlement
      const { data, error } = await supabaseServiceRole
        .from('user_entitlements')
        .upsert({
          user_id: targetId,
          plan_id: targetPlan,
          status: 'active',
          source: 'admin_grant',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id, plan_id' })
        .select()
        .single()

      if (error) {
        throw error
      }

      return new Response(JSON.stringify({ success: true, entitlement: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      // Revoke action: mark status as inactive
      const { data, error } = await supabaseServiceRole
        .from('user_entitlements')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', targetId)
        .select()

      if (error) {
        throw error
      }

      return new Response(JSON.stringify({ success: true, count: data?.length || 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error: any) {
    console.error('[manage-entitlements] error:', error.message, error.stack)
    return new Response(JSON.stringify({
      error: 'Internal system error',
      details: error.message,
      hint: 'Check Supabase Edge Function logs for full stack trace',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
