import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { mapExerciseForPull } from './exerciseMapping.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

async function toUUID(str: string): Promise<string> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return [
    hashHex.slice(0, 8),
    hashHex.slice(8, 12),
    hashHex.slice(12, 16),
    hashHex.slice(16, 20),
    hashHex.slice(20, 32)
  ].join('-');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user } } = await supabaseClient.auth.getUser(token || undefined)
    if (!user) throw new Error("Unauthorized")

    const { lastPulledAt, schemaVersion } = await req.json()
    const pullDate = lastPulledAt ? new Date(lastPulledAt).toISOString() : new Date(0).toISOString()
    const nowMs = Date.now()

    const changes = {
      exercises: { created: [] as any[], updated: [] as any[], deleted: [] as any[] },
      workout_plans: { created: [] as any[], updated: [] as any[], deleted: [] as any[] },
      plan_days: { created: [] as any[], updated: [] as any[], deleted: [] as any[] },
      plan_exercises: { created: [] as any[], updated: [] as any[], deleted: [] as any[] },
      assigned_plans: { created: [] as any[], updated: [] as any[], deleted: [] as any[] },
      workout_sessions: { created: [] as any[], updated: [] as any[], deleted: [] as any[] },
      session_sets: { created: [] as any[], updated: [] as any[], deleted: [] as any[] },
      personal_records: { created: [] as any[], updated: [] as any[], deleted: [] as any[] },
      meal_logs: { created: [] as any[], updated: [] as any[], deleted: [] as any[] },
      measurements: { created: [] as any[], updated: [] as any[], deleted: [] as any[] }
    }

    // 1. Fetch Workout Sessions
    const { data: sessions, error: sessionErr } = await supabaseClient
      .from('workout_sessions')
      .select('*, plan_day:plan_days(name, workout_plans(name))')
      .eq('athlete_id', user.id)
      .gte('updated_at', pullDate)

    if (sessionErr) throw sessionErr

    if (sessions) {
      for (const row of sessions) {
        const mapped: Record<string, unknown> = {
          id: row.id,
          user_id: row.athlete_id,
          plan_day_id: row.plan_day_id || null,
          name: [row.plan_day?.workout_plans?.name, row.plan_day?.name].filter(Boolean).join(' - ') || 'Workout Session',
          status: row.completed_at ? 'completed' : 'active',
          started_at: new Date(row.started_at).getTime(),
          finished_at: row.completed_at ? new Date(row.completed_at).getTime() : null,
          duration_seconds: row.duration_seconds || null,
          total_volume_kg: null,
          notes: null,
          progression_suggestion: null,
          is_synced: true,
          created_at: new Date(row.started_at).getTime(),
          updated_at: new Date(row.updated_at || row.completed_at || row.started_at).getTime()
        }

        const isNew = lastPulledAt === 0 || new Date(row.started_at).getTime() > lastPulledAt
        if (isNew) {
          changes.workout_sessions.created.push(mapped)
        } else {
          changes.workout_sessions.updated.push(mapped)
        }
      }
    }

    // 2. Fetch Session Sets (query sets directly for user's sessions since pullDate)
    const { data: allUserSessions } = await supabaseClient
      .from('workout_sessions')
      .select('id')
      .eq('athlete_id', user.id)
    const allSessionIds = allUserSessions?.map(s => s.id) || []

    if (allSessionIds.length > 0) {
      // Chunk session IDs into batches of 200 to prevent oversized parameters or payload timeouts
      const CHUNK_SIZE = 200;
      let sets: any[] = [];
      
      for (let i = 0; i < allSessionIds.length; i += CHUNK_SIZE) {
        const chunk = allSessionIds.slice(i, i + CHUNK_SIZE);
        const { data: setsChunk, error: setsErr } = await supabaseClient
          .from('session_sets')
          .select('*, exercises(name)')
          .in('session_id', chunk)
          .gte('updated_at', pullDate);

        if (setsErr) throw setsErr;
        if (setsChunk) {
          sets = sets.concat(setsChunk);
        }
      }

      if (sets.length > 0) {
        for (const row of sets) {
          const mapped = {
            id: row.id,
            session_id: row.session_id,
            plan_exercise_id: row.plan_exercise_id || null,
            user_id: user.id,
            exercise_id: row.exercise_id || '',
            exercise_name: row.exercises?.name || 'Exercise',
            set_number: row.set_number || 1,
            weight_kg: row.weight || 0,
            reps: row.reps || 0,
            completed_at: new Date(row.completed_at).getTime(),
            is_synced: true,
            created_at: new Date(row.completed_at).getTime(),
            updated_at: new Date(row.updated_at || row.completed_at).getTime()
          }

          const isNew = lastPulledAt === 0 || new Date(row.completed_at).getTime() > lastPulledAt
          if (isNew) {
            changes.session_sets.created.push(mapped)
          } else {
            changes.session_sets.updated.push(mapped)
          }
        }
      }
    }

    // personal_records has no updated_at column in the live schema. achieved_at
    // is immutable and therefore provides the incremental cursor for new PRs.
    const { data: records, error: recordsErr } = await supabaseClient
      .from('personal_records')
      .select('id, athlete_id, exercise_id, record_type, value, achieved_at')
      .eq('athlete_id', user.id)
      .gte('achieved_at', pullDate)
    if (recordsErr) throw recordsErr
    for (const row of records || []) {
      const achievedAt = new Date(row.achieved_at).getTime()
      changes.personal_records.created.push({
        id: row.id,
        athlete_id: row.athlete_id,
        exercise_id: row.exercise_id,
        record_type: row.record_type,
        value: Number(row.value),
        achieved_at: achievedAt,
        created_at: achievedAt,
        updated_at: achievedAt,
      })
    }

    // 3. Fetch Meal Logs
    const { data: meals, error: mealsErr } = await supabaseClient
      .from('meal_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('updated_at', pullDate)

    if (mealsErr) throw mealsErr

    if (meals) {
      for (const row of meals) {
        const mapped = {
          id: row.id,
          athlete_id: row.user_id,
          food_id: row.food_id || null,
          meal_type: row.meal_type,
          servings: row.servings,
          logged_at: new Date(row.logged_at).getTime(),
          source: row.source || 'manual',
          raw_response: row.raw_response ? JSON.stringify(row.raw_response) : null,
          is_synced: true,
          created_at: new Date(row.logged_at).getTime(),
          updated_at: new Date(row.updated_at || row.logged_at).getTime()
        }

        const isNew = lastPulledAt === 0 || new Date(row.logged_at).getTime() > lastPulledAt
        if (isNew) {
          changes.meal_logs.created.push(mapped)
        } else {
          changes.meal_logs.updated.push(mapped)
        }
      }
    }

    // 4. Fetch Measurements (consolidate type-value rows using updated_at)
    const { data: measurementsData, error: measErr } = await supabaseClient
      .from('measurements')
      .select('*')
      .eq('user_id', user.id)
      .gte('updated_at', pullDate)

    if (measErr) throw measErr

    if (measurementsData) {
      const groups: Record<string, any> = {}
      for (const row of measurementsData) {
        const key = `${row.user_id}_${new Date(row.logged_at).getTime()}`
        if (!groups[key]) {
          groups[key] = {
            id: await toUUID(key),
            user_id: row.user_id,
            logged_at: new Date(row.logged_at).getTime(),
            is_synced: true,
            created_at: new Date(row.logged_at).getTime(),
            updated_at: new Date(row.updated_at || row.logged_at).getTime()
          }
        }
        groups[key][row.type] = row.value
        // Ensure updated_at tracks the latest update in the group
        const rowUpdatedAt = new Date(row.updated_at || row.logged_at).getTime()
        if (rowUpdatedAt > groups[key].updated_at) {
          groups[key].updated_at = rowUpdatedAt
        }
      }

      for (const key of Object.keys(groups)) {
        const row = groups[key]
        const isNew = lastPulledAt === 0 || row.logged_at > lastPulledAt
        if (isNew) {
          changes.measurements.created.push(row)
        } else {
          changes.measurements.updated.push(row)
        }
      }
    }

    // Workout plan graph. RLS limits these queries to own or assigned plans.
    const pullPlanTable = async (table: keyof typeof changes, mapRow: (row: any) => any, createdField = 'created_at') => {
      const { data, error } = await supabaseClient.from(table).select('*').gte('updated_at', pullDate)
      if (error) throw error
      for (const row of data || []) {
        const mapped = mapRow(row)
        const createdAt = new Date(row[createdField] || row.updated_at).getTime()
        const bucket = lastPulledAt === 0 || createdAt > lastPulledAt ? 'created' : 'updated'
        ;(changes[table] as any)[bucket].push(mapped)
      }
    }

    await pullPlanTable('workout_plans', row => ({
      id: row.id, user_id: row.user_id, coach_id: row.coach_id, name: row.name,
      notes: row.notes, created_at: new Date(row.created_at).getTime(),
      updated_at: new Date(row.updated_at || row.created_at).getTime(),
    }))
    await pullPlanTable('plan_days', row => ({
      id: row.id, plan_id: row.plan_id, day_number: row.day_number, name: row.name,
      created_at: new Date(row.created_at).getTime(), updated_at: new Date(row.updated_at).getTime(),
    }))
    await pullPlanTable('plan_exercises', row => ({
      id: row.id, plan_day_id: row.plan_day_id, exercise_id: row.exercise_id,
      sets: row.sets, reps: row.reps, weight: row.weight, target_rpe: row.target_rpe,
      rest_seconds: row.rest_seconds, notes: row.notes, warmup_sets: row.warmup_sets,
      is_dropset: row.is_dropset, superset_group: row.superset_group,
      order_index: row.order_index, created_at: new Date(row.created_at).getTime(),
      updated_at: new Date(row.updated_at).getTime(),
    }))
    await pullPlanTable('assigned_plans', row => ({
      id: row.id, plan_id: row.plan_id, athlete_id: row.athlete_id,
      assigned_at: new Date(row.assigned_at).getTime(), start_date: row.start_date,
      updated_at: new Date(row.updated_at).getTime(),
    }), 'assigned_at')

    // Exercise catalog (pull-only, read-only global catalog — no RLS user filter)
    const BATCH_SIZE = 1000
    let exercisesData: any[] = []
    let exerciseFrom = 0
    const seenExerciseIds = new Set<string>()

    while (true) {
      const { data: pageChunk, error: exercisesErr } = await supabaseClient
        .from('exercises')
        .select('*')
        .gte('updated_at', pullDate)
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .range(exerciseFrom, exerciseFrom + BATCH_SIZE - 1)

      if (exercisesErr) throw exercisesErr
      if (!pageChunk || pageChunk.length === 0) break

      for (const row of pageChunk) {
        if (!seenExerciseIds.has(row.id)) {
          seenExerciseIds.add(row.id)
          exercisesData.push(row)
        }
      }

      if (pageChunk.length < BATCH_SIZE) break
      exerciseFrom += BATCH_SIZE
    }

    if (exercisesData.length > 0) {
      for (const row of exercisesData) {
        const mapped = mapExerciseForPull(row, nowMs, schemaVersion)

        const isNew = lastPulledAt === 0 || new Date(row.created_at || row.updated_at).getTime() > lastPulledAt
        if (isNew) {
          changes.exercises.created.push(mapped)
        } else {
          changes.exercises.updated.push(mapped)
        }
      }
    }

    const { data: tombstones, error: tombstoneError } = await supabaseClient
      .from('workout_plan_sync_deletions').select('table_name, record_id').gt('deleted_at', pullDate)
    if (tombstoneError) throw tombstoneError
    for (const tombstone of tombstones || []) {
      const tableChanges = changes[tombstone.table_name as keyof typeof changes] as any
      if (tableChanges) tableChanges.deleted.push(tombstone.record_id)
    }

    return new Response(JSON.stringify({ changes, timestamp: nowMs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('[sync-pull] error:', err);
    return new Response(JSON.stringify({ error: 'Sync failed. Please try again.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
