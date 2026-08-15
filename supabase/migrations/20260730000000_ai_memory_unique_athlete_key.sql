-- QA-audit fix (Fix 6, discovered via the new read-back verification test):
-- ai_memory has never had a unique constraint on (athlete_id, memory_key).
-- ai-coach/index.ts upserts with `onConflict: 'athlete_id,memory_key'`, which
-- requires a matching unique index/constraint to resolve conflicts against —
-- without one, every upsert call has been throwing Postgres error 42P10
-- (invalid ON CONFLICT target), silently swallowed by the call's own
-- `.catch(() => {})`. This is a deeper, independent cause of "the coach says
-- it remembered something but zero rows were written" than the memory
-- category mismatch fixed separately in this same pass.
--
-- Verified safe before writing this migration: 0 existing rows in ai_memory
-- on the live project (confirmed via `SELECT COUNT(*)`), and no duplicate
-- (athlete_id, memory_key) pairs exist to conflict with a unique constraint.

ALTER TABLE public.ai_memory
  ADD CONSTRAINT ai_memory_athlete_key_unique UNIQUE (athlete_id, memory_key);
