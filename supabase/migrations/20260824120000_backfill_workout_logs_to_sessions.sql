-- Idempotent legacy workout history backfill. Uses only columns verified on
-- the live normalized tables on 2026-08-23. Source workout_logs are untouched.
BEGIN;

CREATE TABLE IF NOT EXISTS public.workout_history_backfill_ledger (
  source_workout_log_id UUID PRIMARY KEY REFERENCES public.workout_logs(id),
  session_id UUID NOT NULL UNIQUE REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  migrated_set_count INTEGER NOT NULL,
  unresolved_exercise_count INTEGER NOT NULL,
  unresolved_completed_set_count INTEGER NOT NULL,
  incomplete_set_count INTEGER NOT NULL,
  invalid_set_count INTEGER NOT NULL,
  legacy_total_volume NUMERIC,
  migrated_total_volume NUMERIC NOT NULL,
  volume_class TEXT NOT NULL CHECK (volume_class IN ('EXACT', 'ROUNDING_ONLY', 'DIFFERENT')),
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.workout_history_backfill_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workout_history_backfill_ledger FROM anon, authenticated;

CREATE TEMP TABLE _yeti_history_sets ON COMMIT DROP AS
WITH occurrences AS (
  SELECT wl.id source_id, wl.user_id athlete_id, wl.started_at,
         wl.completed_at, wl.total_volume legacy_volume,
         ex.ordinality exercise_ordinal, ex.value exercise_json,
         lower(regexp_replace(trim(coalesce(ex.value->>'name', '')), '[^a-z0-9]+', '', 'g')) normalized_name
  FROM public.workout_logs wl
  CROSS JOIN LATERAL jsonb_array_elements(wl.logged_exercises) WITH ORDINALITY ex(value, ordinality)
  WHERE wl.completed_at IS NOT NULL AND jsonb_typeof(wl.logged_exercises) = 'array'
), resolved AS (
  SELECT o.*,
    CASE
      WHEN o.exercise_json->>'exercise_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       AND EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = (o.exercise_json->>'exercise_id')::uuid)
        THEN (o.exercise_json->>'exercise_id')::uuid
      WHEN (SELECT count(DISTINCT ea.exercise_id) FROM public.exercise_aliases ea
            WHERE lower(regexp_replace(trim(ea.alias), '[^a-z0-9]+', '', 'g')) = o.normalized_name) = 1
        THEN (SELECT min(ea.exercise_id::text)::uuid FROM public.exercise_aliases ea
              WHERE lower(regexp_replace(trim(ea.alias), '[^a-z0-9]+', '', 'g')) = o.normalized_name)
      WHEN (SELECT count(*) FROM public.exercises e
            WHERE lower(regexp_replace(trim(e.name), '[^a-z0-9]+', '', 'g')) = o.normalized_name) = 1
        THEN (SELECT min(e.id::text)::uuid FROM public.exercises e
              WHERE lower(regexp_replace(trim(e.name), '[^a-z0-9]+', '', 'g')) = o.normalized_name)
      WHEN (SELECT count(*) FROM public.exercises e
            WHERE lower(regexp_replace(trim(coalesce(e.slug, '')), '[^a-z0-9]+', '', 'g')) = o.normalized_name) = 1
        THEN (SELECT min(e.id::text)::uuid FROM public.exercises e
              WHERE lower(regexp_replace(trim(coalesce(e.slug, '')), '[^a-z0-9]+', '', 'g')) = o.normalized_name)
      ELSE NULL
    END resolved_exercise_id
  FROM occurrences o
)
SELECT r.source_id, r.athlete_id, r.started_at, r.completed_at,
       r.legacy_volume, r.exercise_ordinal, r.resolved_exercise_id,
       st.ordinality set_ordinal,
       coalesce((st.value->>'completed')::boolean, false) completed,
       CASE WHEN st.value->>'weight' ~ '^-?[0-9]+([.][0-9]+)?$' THEN (st.value->>'weight')::numeric END weight,
       CASE WHEN st.value->>'reps' ~ '^[0-9]+$' THEN (st.value->>'reps')::integer END reps
FROM resolved r
LEFT JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(r.exercise_json->'sets') = 'array' THEN r.exercise_json->'sets' ELSE '[]'::jsonb END
) WITH ORDINALITY st(value, ordinality) ON TRUE;

DO $$
DECLARE
  r RECORD; c RECORD; inserted_count INTEGER;
  source_signature TEXT; candidate_signature TEXT;
  source_exercise_count INTEGER; source_set_count INTEGER; source_volume NUMERIC;
  candidate_exercise_count INTEGER; candidate_set_count INTEGER; candidate_volume NUMERIC;
  unresolved_exercises INTEGER; unresolved_sets INTEGER;
  incomplete_sets INTEGER; invalid_sets INTEGER; volume_class TEXT;
  duplicate_found BOOLEAN;
BEGIN
  FOR r IN SELECT DISTINCT source_id, athlete_id, started_at, completed_at, legacy_volume
           FROM _yeti_history_sets ORDER BY completed_at, source_id
  LOOP
    IF EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = r.source_id)
       OR EXISTS (SELECT 1 FROM public.workout_history_backfill_ledger l WHERE l.source_workout_log_id = r.source_id) THEN
      CONTINUE;
    END IF;

    SELECT count(DISTINCT resolved_exercise_id), count(*),
           coalesce(sum(coalesce(weight, 0) * coalesce(reps, 0)), 0),
           string_agg(format('%s:%s:%s', resolved_exercise_id, coalesce(weight::text, 'null'), coalesce(reps::text, 'null')),
             '|' ORDER BY resolved_exercise_id, weight NULLS FIRST, reps NULLS FIRST, exercise_ordinal, set_ordinal)
    INTO source_exercise_count, source_set_count, source_volume, source_signature
    FROM _yeti_history_sets
    WHERE source_id = r.source_id AND completed AND resolved_exercise_id IS NOT NULL;
    IF source_set_count = 0 THEN CONTINUE; END IF;

    SELECT count(DISTINCT exercise_ordinal) FILTER (WHERE resolved_exercise_id IS NULL),
           count(*) FILTER (WHERE completed AND resolved_exercise_id IS NULL),
           count(*) FILTER (WHERE NOT completed),
           0
    INTO unresolved_exercises, unresolved_sets, incomplete_sets, invalid_sets
    FROM _yeti_history_sets
    WHERE source_id = r.source_id;

    duplicate_found := FALSE;
    FOR c IN SELECT ws.id FROM public.workout_sessions ws
             WHERE ws.athlete_id = r.athlete_id
               AND abs(extract(epoch FROM (ws.completed_at - r.completed_at))) <= 120
               AND abs(extract(epoch FROM (ws.started_at - coalesce(r.started_at, r.completed_at)))) <= 120
    LOOP
      SELECT count(DISTINCT ss.exercise_id), count(*),
             coalesce(sum(coalesce(ss.weight, 0) * coalesce(ss.reps, 0)), 0),
             string_agg(format('%s:%s:%s', ss.exercise_id, coalesce(ss.weight::text, 'null'), coalesce(ss.reps::text, 'null')),
               '|' ORDER BY ss.exercise_id, ss.weight NULLS FIRST, ss.reps NULLS FIRST, ss.id)
      INTO candidate_exercise_count, candidate_set_count, candidate_volume, candidate_signature
      FROM public.session_sets ss WHERE ss.session_id = c.id;
      IF candidate_exercise_count = source_exercise_count AND candidate_set_count = source_set_count
         AND abs(candidate_volume - source_volume) <= 0.01 AND candidate_signature = source_signature THEN
        duplicate_found := TRUE; EXIT;
      END IF;
    END LOOP;
    IF duplicate_found THEN CONTINUE; END IF;

    INSERT INTO public.workout_sessions (
      id, athlete_id, plan_day_id, started_at, completed_at, duration_seconds, updated_at
    ) VALUES (
      r.source_id, r.athlete_id, NULL, coalesce(r.started_at, r.completed_at), r.completed_at,
      greatest(0, round(extract(epoch FROM (r.completed_at - coalesce(r.started_at, r.completed_at)))))::integer, NOW()
    ) ON CONFLICT (id) DO NOTHING;
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    IF inserted_count = 0 THEN CONTINUE; END IF;

    INSERT INTO public.session_sets (
      session_id, exercise_id, plan_exercise_id, weight, reps, completed_at, updated_at
    )
    SELECT source_id, resolved_exercise_id, NULL, weight, reps, NULL, NOW()
    FROM _yeti_history_sets
    WHERE source_id = r.source_id AND completed AND resolved_exercise_id IS NOT NULL
    ORDER BY exercise_ordinal, set_ordinal;

    volume_class := CASE
      WHEN abs(coalesce(r.legacy_volume, 0) - source_volume) <= 0.000001 THEN 'EXACT'
      WHEN abs(coalesce(r.legacy_volume, 0) - source_volume) <= 0.01 THEN 'ROUNDING_ONLY'
      ELSE 'DIFFERENT' END;
    INSERT INTO public.workout_history_backfill_ledger (
      source_workout_log_id, session_id, migrated_set_count,
      unresolved_exercise_count, unresolved_completed_set_count,
      incomplete_set_count, invalid_set_count, legacy_total_volume,
      migrated_total_volume, volume_class
    ) VALUES (
      r.source_id, r.source_id, source_set_count, unresolved_exercises,
      unresolved_sets, incomplete_sets, invalid_sets, r.legacy_volume,
      source_volume, volume_class
    );
  END LOOP;
END $$;

COMMIT;
