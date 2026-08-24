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

    // Authenticate the caller (coach)
    const { data: { user: coach }, error: authError } = await supabase.auth.getUser()
    if (authError || !coach) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { clientId } = await req.json()
    if (!clientId) {
      return new Response(JSON.stringify({ error: "Missing clientId parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Verify coach-client relationship or that coach is authorized to view
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', clientId)
      .single()

    if (!profile) {
      return new Response(JSON.stringify({ error: "Client profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Get the last completed workout session from normalized table
    const { data: lastSession, error: sessionError } = await supabase
      .from('workout_sessions')
      .select('*, plan_day:plan_days(name, workout_plans(name))')
      .eq('athlete_id', clientId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionError) throw sessionError
    if (!lastSession) {
      return new Response(JSON.stringify({ success: true, workout: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Get all session sets for this last completed session
    const { data: sets, error: setsError } = await supabase
      .from('session_sets')
      .select('*, exercises(*)')
      .eq('session_id', lastSession.id)
      .order('completed_at', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })

    if (setsError) throw setsError

    // Group sets by exercise
    const exercisesMap = new Map()
    for (const set of (sets || [])) {
      const exerciseId = set.exercise_id || set.id
      if (!exercisesMap.has(exerciseId)) {
        exercisesMap.set(exerciseId, {
          id: exerciseId,
          name: set.exercises?.name || set.exercise_name || "Exercise",
          muscle_group: set.exercises?.muscle_group || "",
          gif_url: set.exercises?.gif_url || "",
          sets: []
        })
      }
      
      const reps = Number(set.reps) || 0
      const weight = Number(set.weight ?? 0)
      const estimatedOneRepMax = Math.round(weight * (1 + reps / 30))

      exercisesMap.get(exerciseId).sets.push({
        id: set.id,
        reps,
        weight_kg: weight,
        estimated_1rm: estimatedOneRepMax,
        completed_at: set.completed_at || lastSession.completed_at
      })
    }

    const groupedExercises = Array.from(exercisesMap.values())

    // Calculate duration and total volume
    const start = new Date(lastSession.started_at).getTime()
    const end = new Date(lastSession.completed_at).getTime()
    const durationMinutes = lastSession.duration_seconds
      ? Math.round(lastSession.duration_seconds / 60)
      : Math.round((end - start) / 60000)

    // Calculate personal records (PRs) achieved in this workout
    for (const group of groupedExercises) {
      const bestCurrent1RM = Math.max(...group.sets.map((s: any) => s.estimated_1rm))
      
      // Query previous max 1RM for this exercise
      const { data: prevSets } = await supabase
        .from('session_sets')
        .select('reps, weight, workout_sessions!inner(athlete_id, started_at)')
        .eq('exercise_id', group.id)
        .eq('workout_sessions.athlete_id', clientId)
        .lt('workout_sessions.started_at', lastSession.started_at)

      let prevBest1RM = 0
      if (prevSets && prevSets.length > 0) {
        prevBest1RM = Math.max(...prevSets.map((s: any) => {
          const r = Number(s.reps) || 0
          const w = Number(s.weight ?? 0)
          return Math.round(w * (1 + r / 30))
        }))
      }

      group.has_pr = prevBest1RM > 0 ? (bestCurrent1RM > prevBest1RM) : (bestCurrent1RM > 0)
      group.prev_best_1rm = prevBest1RM
      group.current_best_1rm = bestCurrent1RM
    }

    const planName = (lastSession as any).plan_day?.workout_plans?.name || (lastSession as any).plan_day?.name || "Workout Session"
    const totalVolume = (sets || []).reduce((sum: number, set: any) =>
      sum + (Number(set.weight ?? 0) * Number(set.reps ?? 0)), 0)

    const responsePayload = {
      success: true,
      workout: {
        id: lastSession.id,
        name: planName,
        completed_at: lastSession.completed_at,
        started_at: lastSession.started_at,
        duration_minutes: durationMinutes,
        total_volume: totalVolume,
        exercises: groupedExercises,
      }
    }

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error: any) {
    console.error('[get-client-last-workout] error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
