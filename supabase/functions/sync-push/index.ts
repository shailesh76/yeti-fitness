import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createAnonClient } from '../_shared/supabaseClient.ts'

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
    const supabaseClient = createAnonClient(authHeader)

    const { data: { user } } = await supabaseClient.auth.getUser(token || undefined)
    if (!user) throw new Error("Unauthorized")

    // Guard: reject excessively large payloads (> 512KB JSON)
    const rawBody = await req.text();
    if (rawBody.length > 512 * 1024) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 413,
      });
    }
    const { changes, lastPulledAt = 0 } = JSON.parse(rawBody);

    // Athlete-authored workout plans. Server timestamps win when a remote row
    // changed after this client's last pull; WatermelonDB will retry after pull.
    const pushRows = async (table: string, rows: any[], mapRow: (row: any) => any) => {
      if (!rows.length) return
      const ids = []
      for (const row of rows) ids.push(await toUUID(row.id))
      if (lastPulledAt > 0) {
        const { data: conflicts, error: conflictError } = await supabaseClient
          .from(table).select('id').in('id', ids).gt('updated_at', new Date(lastPulledAt).toISOString()).limit(1)
        if (conflictError) throw conflictError
        if (conflicts?.length) throw new Error(`SYNC_CONFLICT:${table}`)
      }
      const payload = []
      for (const row of rows) payload.push({ ...await mapRow(row), id: await toUUID(row.id), updated_at: new Date().toISOString() })
      const { error } = await supabaseClient.from(table).upsert(payload)
      if (error) throw error
    }
    const deleteRows = async (table: string, ids: string[]) => {
      if (!ids.length) return
      const uuids = []
      for (const id of ids) uuids.push(await toUUID(id))
      if (lastPulledAt > 0) {
        const { data: conflicts, error: conflictError } = await supabaseClient
          .from(table).select('id').in('id', uuids).gt('updated_at', new Date(lastPulledAt).toISOString()).limit(1)
        if (conflictError) throw conflictError
        if (conflicts?.length) throw new Error(`SYNC_CONFLICT:${table}`)
      }
      const { error } = await supabaseClient.from(table).delete().in('id', uuids)
      if (error) throw error
    }

    if (changes.workout_plans) {
      const { created = [], updated = [], deleted = [] } = changes.workout_plans
      await pushRows('workout_plans', [...created, ...updated], row => ({
        user_id: user.id, coach_id: null, name: String(row.name).slice(0, 200), notes: row.notes || null,
        created_at: new Date(row.created_at || Date.now()).toISOString(),
      }))
      await deleteRows('workout_plans', deleted)
    }
    if (changes.plan_days) {
      const { created = [], updated = [], deleted = [] } = changes.plan_days
      await pushRows('plan_days', [...created, ...updated], async row => ({
        plan_id: await toUUID(row.plan_id), day_number: Number(row.day_number), name: row.name || null,
        created_at: new Date(row.created_at || Date.now()).toISOString(),
      }))
      await deleteRows('plan_days', deleted)
    }
    if (changes.plan_exercises) {
      const { created = [], updated = [], deleted = [] } = changes.plan_exercises
      await pushRows('plan_exercises', [...created, ...updated], async row => ({
        plan_day_id: await toUUID(row.plan_day_id), exercise_id: await toUUID(row.exercise_id), sets: row.sets || '3', reps: row.reps || '10',
        weight: row.weight || null, target_rpe: row.target_rpe ?? null, rest_seconds: row.rest_seconds ?? null,
        notes: row.notes || null, warmup_sets: row.warmup_sets || 0, is_dropset: Boolean(row.is_dropset),
        superset_group: row.superset_group || null, order_index: Number(row.order_index) || 0,
        created_at: new Date(row.created_at || Date.now()).toISOString(),
      }))
      await deleteRows('plan_exercises', deleted)
    }
    // assigned_plans is intentionally pull-only for athletes; only coaches may assign plans.

    // 1. Workout Sessions
    if (changes.workout_sessions) {
      const { created = [], updated = [], deleted = [] } = changes.workout_sessions;
      const toUpsert = [];
      for (const row of [...created, ...updated]) {
        if (row.status === 'abandoned') continue;
        toUpsert.push({
          id: await toUUID(row.id),
          athlete_id: user.id,
          plan_day_id: row.plan_day_id ? await toUUID(row.plan_day_id) : null,
          started_at: new Date(row.started_at).toISOString(),
          completed_at: row.finished_at ? new Date(row.finished_at).toISOString() : null,
          duration_seconds: row.duration_seconds || null,
          updated_at: new Date().toISOString(),
        });
      }
      if (toUpsert.length > 0) {
        const { error } = await supabaseClient.from('workout_sessions').upsert(toUpsert);
        if (error) throw error;
      }
      if (deleted.length > 0) {
        const idsToDelete = [];
        for (const id of deleted) {
          idsToDelete.push(await toUUID(id));
        }
        const { error } = await supabaseClient
          .from('workout_sessions')
          .delete()
          .in('id', idsToDelete)
          .eq('athlete_id', user.id)
          .is('completed_at', null);
        if (error) throw error;
      }
    }

    // 2. Session Sets
    if (changes.session_sets) {
      const { created = [], updated = [], deleted = [] } = changes.session_sets;
      const toUpsert = [];
      for (const row of [...created, ...updated]) {
        toUpsert.push({
          id: await toUUID(row.id),
          session_id: await toUUID(row.session_id),
          plan_exercise_id: row.plan_exercise_id ? await toUUID(row.plan_exercise_id) : null,
          weight: Math.min(Math.max(Number(row.weight_kg) || 0, 0), 1500),   // 0–1500 kg bounds
          reps: Math.min(Math.max(Number(row.reps) || 0, 0), 200),           // 0–200 reps bounds
          completed_at: new Date(row.completed_at).toISOString(),
          exercise_id: row.exercise_id ? await toUUID(row.exercise_id) : null,
          updated_at: new Date().toISOString(),
        });
      }
      if (toUpsert.length > 0) {
        const { error } = await supabaseClient.from('session_sets').upsert(toUpsert);
        if (error) throw error;
      }
      if (deleted.length > 0) {
        const idsToDelete = [];
        for (const id of deleted) {
          idsToDelete.push(await toUUID(id));
        }
        const { error } = await supabaseClient.from('session_sets').delete().in('id', idsToDelete);
        if (error) throw error;
      }
    }

    // Personal records are athlete-owned. Local display metadata stays local;
    // only columns in the live personal_records contract are transported.
    if (changes.personal_records) {
      const { created = [], updated = [], deleted = [] } = changes.personal_records;
      const toUpsert = [];
      for (const row of [...created, ...updated]) {
        toUpsert.push({
          id: await toUUID(row.id),
          athlete_id: user.id,
          exercise_id: await toUUID(row.exercise_id),
          record_type: row.record_type,
          value: Number(row.value),
          achieved_at: new Date(row.achieved_at).toISOString(),
        });
      }
      if (toUpsert.length > 0) {
        const { error } = await supabaseClient.from('personal_records').upsert(toUpsert);
        if (error) throw error;
      }
      if (deleted.length > 0) {
        const idsToDelete = [];
        for (const id of deleted) idsToDelete.push(await toUUID(id));
        const { error } = await supabaseClient.from('personal_records').delete().in('id', idsToDelete);
        if (error) throw error;
      }
    }

    // 3. Meal Logs
    if (changes.meal_logs) {
      const { created = [], updated = [], deleted = [] } = changes.meal_logs;
      const toUpsert = [];
      for (const row of [...created, ...updated]) {
        toUpsert.push({
          id: await toUUID(row.id),
          user_id: user.id,
          food_id: row.food_id ? await toUUID(row.food_id) : null,
          meal_type: String(row.meal_type || 'SNACK').toUpperCase().slice(0, 20),
          servings: Math.min(Math.max(Number(row.servings) || 1, 0.1), 50),  // 0.1–50 servings bounds
          logged_at: new Date(row.logged_at).toISOString(),
          source: String(row.source || 'manual').slice(0, 50),
          raw_response: row.raw_response ? JSON.parse(row.raw_response) : null,
          updated_at: new Date().toISOString(),
        });
      }
      if (toUpsert.length > 0) {
        const { error } = await supabaseClient.from('meal_logs').upsert(toUpsert);
        if (error) throw error;
      }
      if (deleted.length > 0) {
        const idsToDelete = [];
        for (const id of deleted) {
          idsToDelete.push(await toUUID(id));
        }
        const { error } = await supabaseClient.from('meal_logs').delete().in('id', idsToDelete);
        if (error) throw error;
      }
    }

    // 4. Measurements (type-value store split)
    if (changes.measurements) {
      const { created = [], updated = [], deleted = [] } = changes.measurements;
      const toUpsert = [];
      const measurementFields = ['weight_kg', 'body_fat_pct', 'chest_cm', 'waist_cm', 'hips_cm', 'arms_cm', 'legs_cm'];

      for (const row of [...created, ...updated]) {
        for (const field of measurementFields) {
          const val = row[field];
          if (val !== undefined && val !== null) {
            toUpsert.push({
              id: await toUUID(row.id + '_' + field),
              user_id: user.id,
              type: field,
              value: val,
              logged_at: new Date(row.logged_at).toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      if (toUpsert.length > 0) {
        const { error } = await supabaseClient.from('measurements').upsert(toUpsert);
        if (error) throw error;
      }

      if (deleted.length > 0) {
        const idsToDelete = [];
        for (const id of deleted) {
          for (const field of measurementFields) {
            idsToDelete.push(await toUUID(id + '_' + field));
          }
        }
        const { error } = await supabaseClient.from('measurements').delete().in('id', idsToDelete);
        if (error) throw error;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('[sync-push] error:', err);
    return new Response(JSON.stringify({ error: 'Sync failed. Please try again.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
