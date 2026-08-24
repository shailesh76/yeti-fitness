import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Authenticate the user session (either client themselves, or their coach)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { clientId, exerciseId, limit = 10 } = await req.json()
    if (!clientId) {
      return new Response(JSON.stringify({ error: "Missing clientId parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Verify authorized user context
    if (user.id !== clientId) {
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', clientId)
        .single()

      if (!clientProfile) {
        return new Response(JSON.stringify({ error: "Forbidden or client profile not found" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }
    }

    // Prepare query for session sets from normalized tables
    let query = supabase
      .from('session_sets')
      .select('*, workout_sessions!inner(id, started_at, completed_at, plan_day:plan_days(name, workout_plans(name))), exercises(name, muscle_group, gif_url)')
      .eq('workout_sessions.athlete_id', clientId)
      .not('workout_sessions.completed_at', 'is', null)

    if (exerciseId) {
      query = query.eq('exercise_id', exerciseId)
    }

    const { data: rawSets, error: fetchError } = await query
      .order('completed_at', { ascending: false })

    if (fetchError) throw fetchError

    // Filter out null joins from in-progress/uncompleted workouts
    const completedSets = (rawSets || []).filter(s => s.workout_sessions)

    // Group completed sets by workout session
    const sessionsMap = new Map()
    for (const s of completedSets) {
      const sessionId = s.session_id || s.workout_sessions.id
      const date = new Date(s.workout_sessions.completed_at).toLocaleDateString()
      const exId = s.exercise_id || 'unknown'

      if (!sessionsMap.has(sessionId)) {
        const planName = s.workout_sessions.plan_day?.workout_plans?.name || s.workout_sessions.plan_day?.name || "Workout Session"
        sessionsMap.set(sessionId, {
          workout_log_id: sessionId,
          session_id: sessionId,
          date,
          completed_at: s.workout_sessions.completed_at,
          workout_name: planName,
          exercises: {}
        })
      }

      const session = sessionsMap.get(sessionId)
      if (!session.exercises[exId]) {
        session.exercises[exId] = {
          id: exId,
          name: s.exercises?.name || s.exercise_name || "Exercise",
          muscle_group: s.exercises?.muscle_group || "",
          gif_url: s.exercises?.gif_url || "",
          sets: []
        }
      }

      const reps = Number(s.reps) || 0
      const weight = Number(s.weight_kg ?? s.weight ?? 0)
      const estimatedOneRepMax = Math.round(weight * (1 + reps / 30))

      session.exercises[exId].sets.push({
        id: s.id,
        reps,
        weight_kg: weight,
        estimated_1rm: estimatedOneRepMax,
        completed_at: s.completed_at || s.workout_sessions.completed_at
      })
    }

    // Convert sessions map to sorted list
    const sessionsList = Array.from(sessionsMap.values())
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())

    // If a specific exercise was requested, extract the clean 1RM progression and stats
    let exerciseProgress = null
    if (exerciseId && sessionsList.length > 0) {
      const historyPoints = sessionsList.map(s => {
        const exData = s.exercises[exerciseId]
        if (!exData) return null
        
        // Find max 1RM achieved in this workout session
        const sessionMax1RM = Math.max(...exData.sets.map((set: any) => set.estimated_1rm))
        const sessionMaxWeight = Math.max(...exData.sets.map((set: any) => set.weight_kg))

        return {
          date: s.date,
          completed_at: s.completed_at,
          estimated_1rm: sessionMax1RM,
          max_weight: sessionMaxWeight,
          sets: exData.sets
        }
      }).filter(Boolean)

      // Calculate historical metrics
      const all1RMs = historyPoints.map(p => p!.estimated_1rm)
      const allWeights = historyPoints.map(p => p!.max_weight)
      const current1RM = all1RMs.length > 0 ? all1RMs[0] : 0
      const allTimeBest1RM = all1RMs.length > 0 ? Math.max(...all1RMs) : 0
      const allTimeMaxWeight = allWeights.length > 0 ? Math.max(...allWeights) : 0

      // Progress over last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const thirtyDayPoints = historyPoints.filter(p => new Date(p!.completed_at) >= thirtyDaysAgo)
      let thirtyDayDeltaPercent = 0
      if (thirtyDayPoints.length >= 2) {
        const oldestRecent1RM = thirtyDayPoints[thirtyDayPoints.length - 1]!.estimated_1rm
        const newest1RM = thirtyDayPoints[0]!.estimated_1rm
        if (oldestRecent1RM > 0) {
          thirtyDayDeltaPercent = Math.round(((newest1RM - oldestRecent1RM) / oldestRecent1RM) * 100)
        }
      }

      exerciseProgress = {
        exercise_id: exerciseId,
        exercise_name: sessionsList[0]?.exercises[exerciseId]?.name || "Exercise",
        current_estimated_1rm: current1RM,
        all_time_best_1rm: allTimeBest1RM,
        all_time_max_weight: allTimeMaxWeight,
        thirty_day_delta_percent: thirtyDayDeltaPercent,
        history: historyPoints.slice(0, Number(limit))
      }
    }

    return new Response(JSON.stringify({
      success: true,
      clientId,
      exercise_progress: exerciseProgress,
      sessions: sessionsList.slice(0, Number(limit))
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error: any) {
    console.error('[get-client-exercise-history] error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
