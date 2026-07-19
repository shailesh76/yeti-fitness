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

    // Get the last completed workout log
    const { data: lastLog, error: logError } = await supabase
      .from('workout_logs')
      .select('*, workout_plans(name)')
      .eq('user_id', clientId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (logError) throw logError
    if (!lastLog) {
      return new Response(JSON.stringify({ success: true, workout: null }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    // Get all exercise sets for this last log
    const { data: sets, error: setsError } = await supabase
      .from('exercise_sets')
      .select('*, exercises(*)')
      .eq('workout_log_id', lastLog.id)
      .order('completed_at', { ascending: true })

    if (setsError) throw setsError

    // Group sets by exercise
    const exercisesMap = new Map()
    for (const set of (sets || [])) {
      const exerciseId = set.exercise_id
      if (!exercisesMap.has(exerciseId)) {
        exercisesMap.set(exerciseId, {
          id: exerciseId,
          name: set.exercises?.name || "Exercise",
          muscle_group: set.exercises?.muscle_group || "",
          gif_url: set.exercises?.gif_url || "",
          sets: []
        })
      }
      
      const reps = Number(set.reps)
      const weight = Number(set.weight_kg)
      const estimatedOneRepMax = Math.round(weight * (1 + reps / 30))

      exercisesMap.get(exerciseId).sets.push({
        id: set.id,
        reps,
        weight_kg: weight,
        estimated_1rm: estimatedOneRepMax,
        completed_at: set.completed_at
      })
    }

    const groupedExercises = Array.from(exercisesMap.values())

    // Calculate duration and total volume
    const start = new Date(lastLog.started_at).getTime()
    const end = new Date(lastLog.completed_at).getTime()
    const durationMinutes = Math.round((end - start) / 60000)

    // Calculate personal records (PRs) achieved in this workout
    // A PR is achieved if the estimated 1RM for a set in this workout is higher than 
    // any completed set for that exercise prior to this workout's start.
    for (const group of groupedExercises) {
      const bestCurrent1RM = Math.max(...group.sets.map((s: any) => s.estimated_1rm))
      
      // Query previous max 1RM for this exercise
      const { data: prevSets } = await supabase
        .from('exercise_sets')
        .select('reps, weight_kg')
        .eq('exercise_id', group.id)
        .lt('completed_at', lastLog.started_at)

      let prevBest1RM = 0
      if (prevSets && prevSets.length > 0) {
        prevBest1RM = Math.max(...prevSets.map((s: any) => {
          const r = Number(s.reps)
          const w = Number(s.weight_kg)
          return Math.round(w * (1 + r / 30))
        }))
      }

      group.has_pr = prevBest1RM > 0 ? (bestCurrent1RM > prevBest1RM) : true
      group.prev_best_1rm = prevBest1RM
      group.current_best_1rm = bestCurrent1RM
    }

    const responsePayload = {
      success: true,
      workout: {
        id: lastLog.id,
        name: lastLog.workout_plans?.name || lastLog.name || "Custom Routine",
        completed_at: lastLog.completed_at,
        started_at: lastLog.started_at,
        duration_minutes: durationMinutes,
        total_volume: lastLog.total_volume || 0,
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
