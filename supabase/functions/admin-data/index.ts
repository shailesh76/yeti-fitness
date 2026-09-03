import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createAnonClient, createServiceRoleClient } from '../_shared/supabaseClient.ts'
import { authorizeAdminDataAction, dispatchAuthorizedAdminAction } from './authorization.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

async function verifyAdmin(authHeader: string) {
  const anonClient = createAnonClient(authHeader)
  const { data: { user }, error } = await anonClient.auth.getUser()
  if (error || !user) return { user: null, role: null, error: 'Unauthenticated' }

  const { data: profile } = await anonClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return { user: null, role: profile?.role ?? null, error: 'Forbidden: admin only' }
  return { user, role: profile.role, error: null }
}

function serviceClient() {
  return createServiceRoleClient()
}

function err(msg: string, status = 403) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return err('Missing authorization header', 401)

    const { user, role, error: authError } = await verifyAdmin(authHeader)
    if (!user) return err(authError ?? 'Unauthorized', authError === 'Unauthenticated' ? 401 : 403)

    const url = new URL(req.url)
    let body: any = {}
    if (req.method === 'POST') {
      body = await req.json().catch(() => ({}))
    }
    const action = url.searchParams.get('action') ?? body.action
    const startDate = url.searchParams.get('start_date') ?? body.start_date
    const endDate = url.searchParams.get('end_date') ?? body.end_date
    const actionAccess = authorizeAdminDataAction(role, action ?? null)
    if (!actionAccess.allowed) return err(actionAccess.error ?? 'Forbidden', actionAccess.status)
    const db = serviceClient()

    // ── dashboard_metrics ────────────────────────────────────────────────────
    if (action === 'dashboard_metrics') {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString()
      const sevenDaysAgo  = new Date(Date.now() -  7 * 86400_000).toISOString()

      // Calculate start_date if passed or default to thirtyDaysAgo
      const aiSince = startDate ?? thirtyDaysAgo

      const [
        totalUsersRes,
        athletesRes,
        coachesRes,
        newSignupsRes,
        consentsRes,
        premiumRes,
        activeLogsRes,
      ] = await Promise.all([
        db.from('profiles').select('id', { count: 'exact', head: true }),
        db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'athlete'),
        db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'coach'),
        db.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
        db.from('beta_consents').select('user_id', { count: 'exact', head: true }),
        db.from('user_entitlements').select('user_id', { count: 'exact', head: true }).eq('status', 'active'),
        db.from('activity_logs').select('user_id').gte('created_at', sevenDaysAgo),
      ])

      const totalUsers = totalUsersRes.count ?? 0
      const athletes = athletesRes.count ?? 0
      const coaches = coachesRes.count ?? 0
      const newSignups = newSignupsRes.count ?? 0
      const consentCount = consentsRes.count ?? 0
      const onboardingPct = totalUsers > 0 ? Math.round((consentCount / totalUsers) * 100) : 0
      const premiumUsers = premiumRes.count ?? 0
      const freeUsers = athletes - premiumUsers

      // WAU calculation
      const uniqueActive = new Set((activeLogsRes.data ?? []).map((a: any) => a.user_id))
      let wau = uniqueActive.size
      if (wau === 0) {
        const { count: profileActive } = await db.from('profiles').select('id', { count: 'exact', head: true }).gte('updated_at', sevenDaysAgo)
        wau = profileActive ?? 0
      }

      // Engagement metrics (Completed workouts & Meal logs)
      let workoutsQuery = db.from('workout_sessions').select('id', { count: 'exact', head: true }).not('completed_at', 'is', null)
      let mealLogsQuery = db.from('meal_logs').select('id', { count: 'exact', head: true })

      if (startDate) {
        workoutsQuery = workoutsQuery.gte('completed_at', startDate)
        mealLogsQuery = mealLogsQuery.gte('created_at', startDate)
      }
      if (endDate) {
        workoutsQuery = workoutsQuery.lte('completed_at', endDate)
        mealLogsQuery = mealLogsQuery.lte('created_at', endDate)
      }

      // AI logs for engagement and health
      let aiQuery = db.from('ai_request_logs').select('coach_type, success, error_reason').gte('requested_at', aiSince)
      if (endDate) {
        aiQuery = aiQuery.lte('requested_at', endDate)
      }

      const [workoutsRes, mealLogsRes, aiRes] = await Promise.all([
        workoutsQuery,
        mealLogsQuery,
        aiQuery,
      ])

      const aiLogs = aiRes.data ?? []
      const aiTotal = aiLogs.length
      const aiSuccess = aiLogs.filter(r => r.success).length
      const aiChats = aiLogs.filter(r => ['workout', 'nutrition'].includes(r.coach_type ?? '')).length
      const aiScans = aiLogs.filter(r => r.coach_type === 'nutrition_image').length
      const aiFailReasons = aiLogs
        .filter(r => !r.success && r.error_reason)
        .reduce((acc: Record<string, number>, r) => {
          const k = r.error_reason ?? 'unknown'
          acc[k] = (acc[k] ?? 0) + 1
          return acc
        }, {})

      return ok({
        users: { totalUsers, athletes, coaches, newSignups, wau, onboardingPct },
        engagement: {
          workoutsCompleted: workoutsRes.count ?? 0,
          mealLogs: mealLogsRes.count ?? 0,
          aiChats,
          aiScans,
        },
        ai: { total: aiTotal, success: aiSuccess, failed: aiTotal - aiSuccess, failReasons: aiFailReasons },
        subscriptions: { premium: premiumUsers, free: freeUsers > 0 ? freeUsers : 0 },
      })
    }

    // ── users_list ───────────────────────────────────────────────────────────
    if (action === 'users_list') {
      const { data: profiles } = await db
        .from('profiles')
        .select('id, full_name, role, created_at, updated_at')
        .order('created_at', { ascending: false })

      // Fetch emails via admin API
      const { data: { users: authUsers } } = await db.auth.admin.listUsers({ perPage: 1000 })
      const emailMap: Record<string, string> = {}
      authUsers?.forEach(u => { emailMap[u.id] = u.email ?? '' })

      // Fetch active entitlements
      const { data: ents } = await db
        .from('user_entitlements')
        .select('user_id, plan_id, status')
        .eq('status', 'active')
      const entMap: Record<string, string> = {}
      ents?.forEach(e => { entMap[e.user_id] = e.plan_id ?? 'FREE' })

      // Workout counts per user
      const { data: wSessions } = await db
        .from('workout_sessions')
        .select('athlete_id')
        .not('completed_at', 'is', null)
      const workoutCounts: Record<string, number> = {}
      wSessions?.forEach(s => {
        workoutCounts[s.athlete_id] = (workoutCounts[s.athlete_id] ?? 0) + 1
      })

      // AI usage counts per user
      const { data: aiLogs } = await db
        .from('ai_request_logs')
        .select('athlete_id')
        .eq('success', true)
      const aiCounts: Record<string, number> = {}
      aiLogs?.forEach(l => {
        if (l.athlete_id) aiCounts[l.athlete_id] = (aiCounts[l.athlete_id] ?? 0) + 1
      })

      const enriched = (profiles ?? []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: emailMap[p.id] ?? '—',
        role: p.role,
        created_at: p.created_at,
        last_active: p.updated_at,
        subscription: entMap[p.id] ?? 'FREE',
        workouts: workoutCounts[p.id] ?? 0,
        ai_requests: aiCounts[p.id] ?? 0,
      }))

      return ok({ users: enriched })
    }

    // ── user_detail ──────────────────────────────────────────────────────────
    if (action === 'user_detail') {
      const userId = url.searchParams.get('user_id')
      if (!userId) return err('Missing user_id', 400)

      const [profileRes, authUserRes, entRes, workoutsRes, mealRes, aiRes, feedbackRes] = await Promise.all([
        db.from('profiles').select('*').eq('id', userId).single(),
        db.auth.admin.getUserById(userId),
        db.from('user_entitlements').select('plan_id, status, expires_at, created_at').eq('user_id', userId).eq('status', 'active').maybeSingle(),
        db.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('athlete_id', userId).not('completed_at', 'is', null),
        db.from('meal_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        db.from('ai_request_logs').select('id', { count: 'exact', head: true }).eq('athlete_id', userId).eq('success', true),
        db.from('beta_user_feedback').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ])

      return ok({
        profile: profileRes.data,
        email: authUserRes.data.user?.email ?? '—',
        entitlement: entRes.data,
        stats: {
          workouts: workoutsRes.count ?? 0,
          meals: mealRes.count ?? 0,
          ai_requests: aiRes.count ?? 0,
          feedback: feedbackRes.count ?? 0,
        },
      })
    }

    // ── system_errors ────────────────────────────────────────────────────────
    if (action === 'system_errors') {
      const errorType = url.searchParams.get('error_type')
      const platform  = url.searchParams.get('platform')
      const since     = startDate ?? url.searchParams.get('since') ?? new Date(Date.now() - 30 * 86400_000).toISOString()

      let q = db
        .from('system_errors')
        .select('id, error_type, message, user_id, platform, app_version, stack_trace, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(50)
      let countQ = db
        .from('system_errors')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since)

      if (endDate) {
        q = q.lte('created_at', endDate)
        countQ = countQ.lte('created_at', endDate)
      }
      if (errorType) { q = q.eq('error_type', errorType); countQ = countQ.eq('error_type', errorType) }
      if (platform)  { q = q.eq('platform', platform); countQ = countQ.eq('platform', platform) }

      const result = await dispatchAuthorizedAdminAction(role, action, async () => {
        const [rowsResult, countResult] = await Promise.all([q, countQ])
        if (rowsResult.error) throw rowsResult.error
        if (countResult.error) throw countResult.error
        if (!Number.isInteger(countResult.count) || (countResult.count ?? -1) < 0) throw new Error('Invalid system error count')
        return { errors: rowsResult.data ?? [], error_count: countResult.count }
      })
      if (!result.allowed) return err(result.error ?? 'Forbidden', result.status)
      return ok(result.value)
    }

    // ── ai_logs ──────────────────────────────────────────────────────────────
    if (action === 'ai_logs') {
      const since = startDate ?? url.searchParams.get('since') ?? new Date(Date.now() - 30 * 86400_000).toISOString()

      let q = db
        .from('ai_request_logs')
        .select('id, athlete_id, coach_type, success, error_reason, requested_at, provider, model')
        .gte('requested_at', since)
        .order('requested_at', { ascending: false })

      if (endDate) {
        q = q.lte('requested_at', endDate)
      }

      const result = await dispatchAuthorizedAdminAction(role, action, async () => {
        const { data, error } = await q
        if (error) throw error
        return data ?? []
      })
      if (!result.allowed) return err(result.error ?? 'Forbidden', result.status)
      const logs = result.value ?? []
      const byType: Record<string, { total: number; success: number; failed: number }> = {}
      logs.forEach(l => {
        const t = l.coach_type ?? 'unknown'
        if (!byType[t]) byType[t] = { total: 0, success: 0, failed: 0 }
        byType[t].total++
        if (l.success) byType[t].success++
        else byType[t].failed++
      })

      const failReasons = logs
        .filter(l => !l.success && l.error_reason)
        .reduce((acc: Record<string, number>, l) => {
          const k = l.error_reason ?? 'unknown'
          acc[k] = (acc[k] ?? 0) + 1
          return acc
        }, {})

      // Actual failed-request rows (not just aggregates) for the diagnostics
      // page — most recent 50, matching system_errors' own list size.
      const recentFailures = logs.filter(l => !l.success).slice(0, 50)

      return ok({
        total: logs.length,
        success: logs.filter(l => l.success).length,
        failed: logs.filter(l => !l.success).length,
        byType,
        failReasons,
        recentFailures,
      })
    }

    // ── coach_clients ────────────────────────────────────────────────────────
    if (action === 'coach_clients') {
      const { data, error } = await db
        .from('coach_clients')
        .select(`
          coach_id,
          athlete_id,
          coach:profiles!coach_clients_coach_id_fkey(full_name),
          athlete:profiles!coach_clients_athlete_id_fkey(full_name, created_at)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return ok({ assignments: data })
    }

    // ── list_assignments ─────────────────────────────────────────────────────
    // Returns all coaches, all unassigned athletes, and all current assignments
    if (action === 'list_assignments') {
      const [coachesRes, athletesRes, assignmentsRes] = await Promise.all([
        db.from('profiles').select('id, full_name').eq('role', 'coach').order('full_name'),
        db.from('profiles').select('id, full_name, created_at').eq('role', 'athlete').order('full_name'),
        db.from('coach_clients').select(`
          coach_id,
          athlete_id,
          created_at,
          coach:profiles!coach_clients_coach_id_fkey(full_name),
          athlete:profiles!coach_clients_athlete_id_fkey(full_name)
        `).order('created_at', { ascending: false }),
      ])

      if (coachesRes.error) throw coachesRes.error
      if (athletesRes.error) throw athletesRes.error
      if (assignmentsRes.error) throw assignmentsRes.error

      // Build a set of already-assigned athlete IDs
      const assignedIds = new Set((assignmentsRes.data ?? []).map(a => a.athlete_id))
      const unassigned = (athletesRes.data ?? []).filter(a => !assignedIds.has(a.id))

      return ok({
        coaches: coachesRes.data ?? [],
        athletes: athletesRes.data ?? [],
        unassigned,
        assignments: assignmentsRes.data ?? [],
      })
    }

    // ── assign_coach ─────────────────────────────────────────────────────────
    // Body: { athlete_id, coach_id }
    // If athlete already has a coach, removes old assignment first (transfer)
    if (action === 'assign_coach') {
      const { athlete_id, coach_id } = body
      if (!athlete_id || !coach_id) return err('Missing athlete_id or coach_id', 400)

      // Remove any existing assignment for this athlete (transfer logic)
      await db.from('coach_clients').delete().eq('athlete_id', athlete_id)

      // Insert new assignment
      const { error: insertErr } = await db
        .from('coach_clients')
        .insert({ coach_id, athlete_id })

      if (insertErr) throw insertErr
      return ok({ success: true })
    }

    // ── remove_assignment ────────────────────────────────────────────────────
    // Body: { athlete_id }
    if (action === 'remove_assignment') {
      const { athlete_id } = body
      if (!athlete_id) return err('Missing athlete_id', 400)

      const { error: delErr } = await db
        .from('coach_clients')
        .delete()
        .eq('athlete_id', athlete_id)

      if (delErr) throw delErr
      return ok({ success: true })
    }

    // ── entitlements_list ────────────────────────────────────────────────────
    // Returns all athletes with their current entitlement status
    if (action === 'entitlements_list') {
      const [profilesRes, authUsersRes, entsRes] = await Promise.all([
        db.from('profiles').select('id, full_name').eq('role', 'athlete').order('full_name'),
        db.auth.admin.listUsers({ perPage: 1000 }),
        db.from('user_entitlements').select('user_id, plan_id, status, expires_at, source, created_at, updated_at').order('updated_at', { ascending: false }),
      ])

      if (profilesRes.error) throw profilesRes.error

      const emailMap: Record<string, string> = {}
      authUsersRes.data?.users?.forEach(u => { emailMap[u.id] = u.email ?? '' })

      // Build a map: user_id → most recent entitlement, preferring active ones
      const entMap: Record<string, any> = {}
      ;(entsRes.data ?? []).forEach(e => {
        if (!entMap[e.user_id] || (entMap[e.user_id].status !== 'active' && e.status === 'active')) {
          entMap[e.user_id] = e
        }
      })

      const list = (profilesRes.data ?? []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: emailMap[p.id] ?? '—',
        entitlement: entMap[p.id] ?? null,
      }))

      return ok({ users: list })
    }

    return err('Unknown action', 400)

  } catch (e: any) {
    console.error('[admin-data] error:', e.message)
    return new Response(JSON.stringify({ error: 'Internal error', details: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
