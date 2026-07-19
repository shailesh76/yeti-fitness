-- Step 4.6: make workout plan entities safe for incremental WatermelonDB sync.
-- Idempotent because migration history is not proof that production matches it.

ALTER TABLE public.plan_days
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.plan_exercises
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.assigned_plans
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.plan_days SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE public.plan_exercises SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;
UPDATE public.assigned_plans SET updated_at = COALESCE(updated_at, assigned_at, NOW()) WHERE updated_at IS NULL;
UPDATE public.workout_plans SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;

ALTER TABLE public.workout_plans ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.plan_days ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.plan_exercises ALTER COLUMN updated_at SET NOT NULL;
ALTER TABLE public.assigned_plans ALTER COLUMN updated_at SET NOT NULL;

CREATE OR REPLACE FUNCTION public.set_workout_plan_sync_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE sync_table TEXT;
BEGIN
  FOREACH sync_table IN ARRAY ARRAY['workout_plans', 'plan_days', 'plan_exercises', 'assigned_plans']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_sync_updated_at ON public.%I', sync_table);
    EXECUTE format(
      'CREATE TRIGGER set_sync_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_workout_plan_sync_updated_at()',
      sync_table
    );
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS workout_plans_updated_at_idx ON public.workout_plans(updated_at);
CREATE INDEX IF NOT EXISTS plan_days_updated_at_idx ON public.plan_days(updated_at);
CREATE INDEX IF NOT EXISTS plan_exercises_updated_at_idx ON public.plan_exercises(updated_at);
CREATE INDEX IF NOT EXISTS assigned_plans_updated_at_idx ON public.assigned_plans(updated_at);

-- Hard deletes need tombstones or a second device can never remove its local row.
CREATE TABLE IF NOT EXISTS public.workout_plan_sync_deletions (
  table_name TEXT NOT NULL CHECK (table_name IN ('workout_plans', 'plan_days', 'plan_exercises', 'assigned_plans')),
  record_id UUID NOT NULL,
  audience_ids UUID[] NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (table_name, record_id)
);
ALTER TABLE public.workout_plan_sync_deletions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read their workout plan sync tombstones" ON public.workout_plan_sync_deletions;
CREATE POLICY "Users read their workout plan sync tombstones"
  ON public.workout_plan_sync_deletions FOR SELECT
  USING (auth.uid() = ANY(audience_ids));
CREATE INDEX IF NOT EXISTS workout_plan_sync_deletions_deleted_at_idx
  ON public.workout_plan_sync_deletions(deleted_at);

CREATE OR REPLACE FUNCTION public.capture_workout_plan_sync_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE audience UUID[];
BEGIN
  IF TG_TABLE_NAME = 'workout_plans' THEN
    SELECT array_remove(array_agg(DISTINCT id), NULL) INTO audience
    FROM (SELECT OLD.user_id id UNION SELECT OLD.coach_id UNION
          SELECT athlete_id FROM assigned_plans WHERE plan_id = OLD.id) users;
  ELSIF TG_TABLE_NAME = 'plan_days' THEN
    SELECT array_remove(array_agg(DISTINCT id), NULL) INTO audience FROM (
      SELECT wp.user_id id FROM workout_plans wp WHERE wp.id = OLD.plan_id
      UNION SELECT wp.coach_id FROM workout_plans wp WHERE wp.id = OLD.plan_id
      UNION SELECT ap.athlete_id FROM assigned_plans ap WHERE ap.plan_id = OLD.plan_id
    ) users;
  ELSIF TG_TABLE_NAME = 'plan_exercises' THEN
    SELECT array_remove(array_agg(DISTINCT id), NULL) INTO audience FROM (
      SELECT wp.user_id id FROM plan_days pd JOIN workout_plans wp ON wp.id = pd.plan_id WHERE pd.id = OLD.plan_day_id
      UNION SELECT wp.coach_id FROM plan_days pd JOIN workout_plans wp ON wp.id = pd.plan_id WHERE pd.id = OLD.plan_day_id
      UNION SELECT ap.athlete_id FROM plan_days pd JOIN assigned_plans ap ON ap.plan_id = pd.plan_id WHERE pd.id = OLD.plan_day_id
    ) users;
  ELSE
    audience := ARRAY[OLD.athlete_id];
  END IF;
  INSERT INTO workout_plan_sync_deletions(table_name, record_id, audience_ids, deleted_at)
  VALUES (TG_TABLE_NAME, OLD.id, COALESCE(audience, ARRAY[]::UUID[]), NOW())
  ON CONFLICT (table_name, record_id) DO UPDATE SET audience_ids = EXCLUDED.audience_ids, deleted_at = EXCLUDED.deleted_at;
  RETURN OLD;
END;
$$;

DO $$
DECLARE sync_table TEXT;
BEGIN
  FOREACH sync_table IN ARRAY ARRAY['workout_plans', 'plan_days', 'plan_exercises', 'assigned_plans'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS capture_sync_deletion ON public.%I', sync_table);
    EXECUTE format('CREATE TRIGGER capture_sync_deletion BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_workout_plan_sync_deletion()', sync_table);
  END LOOP;
END $$;
