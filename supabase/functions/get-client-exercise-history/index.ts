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
      // User is not the athlete themselves. Check if they are a coach
      // Verification is true if there's a profiles row or relationship context.
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

    // Prepare query for exercise sets
    let query = supabase
      .from('exercise_sets')
      .select('*, workout_logs(id, started_at, completed_at, workout_plans(name)), exercises(name, muscle_group, gif_url)')
      .eq('workout_logs.user_id', clientId)
      .not('workout_logs.completed_at', 'is', null)

    if (exerciseId) {
      query = query.eq('exercise_id', exerciseId)
    }

    const { data: rawSets, error: fetchError } = await query
      .order('completed_at', { ascending: false })

    if (fetchError) throw fetchError

    // Filter out null joins from in-progress/uncompleted workouts
    const completedSets = (rawSets || []).filter(s => s.workout_logs)

    // Group completed sets by workout session
    const sessionsMap = new Map()
    for (const s of completedSets) {
      const logId = s.workout_log_id
      const date = new Date(s.workout_logs.completed_at).toLocaleDateString()
      const exId = s.exercise_id

      if (!sessionsMap.has(logId)) {
        sessionsMap.set(logId, {
          workout_log_id: logId,
          date,
          completed_at: s.workout_logs.completed_at,
          workout_name: s.workout_logs.workout_plans?.name || "Workout Session",
          exercises: {}
        })
      }

      const session = sessionsMap.get(logId)
      if (!session.exercises[exId]) {
        session.exercises[exId] = {
          id: exId,
          name: s.exercises?.name || "Exercise",
          muscle_group: s.exercises?.muscle_group || "",
          gif_url: s.exercises?.gif_url || "",
          sets: []
        }
      }

      const reps = Number(s.reps)
      const weight = Number(s.weight_kg)
      const estimatedOneRepMax = Math.round(weight * (1 + reps / 30))

      session.exercises[exId].sets.push({
        id: s.id,
        reps,
        weight_kg: weight,
        estimated_1rm: estimatedOneRepMax,
        completed_at: s.completed_at
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
          max_1rm: sessionMax1RM,
          max_weight: sessionMaxWeight,
          workout_name: s.workout_name,
          sets: exData.sets
        }
      }).filter(Boolean) as any[]

      // Calculate personal record (all-time best 1RM & set details)
      let prEntry = null
      if (historyPoints.length > 0) {
        let best1RM = 0
        let bestSet = null
        let prDate = ""
        let prWorkout = ""

        historyPoints.forEach(h => {
          h.sets.forEach((set: any) => {
            if (set.estimated_1rm > best1RM) {
              best1RM = set.estimated_1rm
              bestSet = set
              prDate = h.date
              prWorkout = h.workout_name
            }
          })
        })

        if (bestSet) {
          prEntry = {
            weight_kg: (bestSet as any).weight_kg,
            reps: (bestSet as any).reps,
            estimated_1rm: best1RM,
            date: prDate,
            workout_name: prWorkout
          }
        }
      }

      // Determine progression trend based on last 3 sessions
      let trend = "Plateaued"
      if (historyPoints.length >= 3) {
        const last3 = historyPoints.slice(0, 3).map(h => h.max_1rm).reverse()
        // If 1RMs are ascending
        if (last3[2] > last3[1] && last3[1] >= last3[0]) {
          trend = "Improving"
        } else if (last3[2] < last3[1] && last3[1] <= last3[0]) {
          trend = "Declining"
        }
      } else if (historyPoints.length === 2) {
        const last2 = historyPoints.slice(0, 2).map(h => h.max_1rm)
        if (last2[0] > last2[1]) trend = "Improving"
        else if (last2[0] < last2[1]) trend = "Declining"
      }

      exerciseProgress = {
        history: historyPoints.slice(0, limit),
        pr: prEntry,
        trend
      }
    }

    // Format all exercises ever performed (unique checklist for search filters)
    const uniqueExercises = new Map()
    completedSets.forEach(s => {
      if (s.exercises) {
        uniqueExercises.set(s.exercise_id, {
          id: s.exercise_id,
          name: s.exercises.name,
          muscle_group: s.exercises.muscle_group,
          gif_url: s.exercises.gif_url
        })
      }
    })

    return new Response(JSON.stringify({
      success: true,
      sessions: sessionsList.slice(0, limit),
      exercise_progress: exerciseProgress,
      available_exercises: Array.from(uniqueExercises.values())
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
