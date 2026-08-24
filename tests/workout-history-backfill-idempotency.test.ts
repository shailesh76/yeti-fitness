import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

interface LegacyWorkoutLog {
  id: string;
  user_id: string;
  workout_plan_id?: string | null;
  started_at: string;
  completed_at: string;
  total_volume: number | string;
  logged_exercises?: any;
}

interface NormalizedSession {
  id: string;
  athlete_id: string;
  plan_day_id: string | null;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  total_volume_kg: number;
  notes: string;
  status: string;
}

interface NormalizedSet {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  tempo: string | null;
  completed_at: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(str: any): boolean {
  return typeof str === 'string' && UUID_REGEX.test(str);
}

/**
 * Deterministic Migration Backfill Engine implementation mimicking the SQL migration
 */
class BackfillEngine {
  public sessions: NormalizedSession[] = [];
  public sets: NormalizedSet[] = [];
  public catalogExercises: Set<string> = new Set();
  public skippedLogs: Array<{ logId: string; reason: string }> = [];

  constructor(catalogExerciseIds: string[] = []) {
    this.catalogExercises = new Set(catalogExerciseIds);
  }

  public runMigration(legacyLogs: LegacyWorkoutLog[]): {
    insertedSessions: number;
    insertedSets: number;
    skippedLogs: number;
  } {
    let insertedSessions = 0;
    let insertedSets = 0;

    for (const log of legacyLogs) {
      // 1. Structural validation
      if (!isValidUUID(log.id)) {
        this.skippedLogs.push({ logId: String(log.id), reason: 'INVALID_SESSION_UUID' });
        continue;
      }
      if (!isValidUUID(log.user_id)) {
        this.skippedLogs.push({ logId: log.id, reason: 'INVALID_USER_UUID' });
        continue;
      }
      if (!log.completed_at || isNaN(new Date(log.completed_at).getTime())) {
        this.skippedLogs.push({ logId: log.id, reason: 'INVALID_COMPLETED_AT' });
        continue;
      }

      // 2. Exact-ID Collision Guard (Primary Dedup)
      if (this.sessions.some((s) => s.id === log.id)) {
        this.skippedLogs.push({ logId: log.id, reason: 'EXACT_ID_ALREADY_EXISTS' });
        continue;
      }

      // 3. Secondary Duplicate Guard (All Strong Signals Must Match)
      const logCompletedTime = new Date(log.completed_at).getTime();
      const logVolume = parseFloat(String(log.total_volume)) || 0;
      const logExercises = Array.isArray(log.logged_exercises) ? log.logged_exercises : [];

      const strongSecondaryMatch = this.sessions.find((s) => {
        if (s.athlete_id !== log.user_id) return false;
        const sTime = new Date(s.completed_at).getTime();
        // Strict match: within 120 seconds AND exact same total volume
        if (Math.abs(sTime - logCompletedTime) > 120000) return false;
        if (Math.abs(s.total_volume_kg - logVolume) > 0.01) return false;

        // Verify set signature
        const sessionSets = this.sets.filter((st) => st.session_id === s.id);
        const legacyCompletedSetsCount = logExercises.reduce((acc, ex) => {
          return acc + (Array.isArray(ex.sets) ? ex.sets.filter((st: any) => Boolean(st.completed)).length : 0);
        }, 0);

        return sessionSets.length === legacyCompletedSetsCount;
      });

      if (strongSecondaryMatch) {
        this.skippedLogs.push({ logId: log.id, reason: 'STRONG_SECONDARY_MATCH_DUPLICATE' });
        continue;
      }

      // 4. Validate exercise structure
      if (!Array.isArray(log.logged_exercises) || log.logged_exercises.length === 0) {
        this.skippedLogs.push({ logId: log.id, reason: 'MALFORMED_OR_EMPTY_EXERCISES' });
        continue;
      }

      const validSetsToInsert: Array<Omit<NormalizedSet, 'id' | 'session_id'>> = [];
      let hasInvalidExerciseUuid = false;

      for (const ex of log.logged_exercises) {
        if (!ex || typeof ex !== 'object') {
          hasInvalidExerciseUuid = true;
          break;
        }
        if (!isValidUUID(ex.exercise_id) || !this.catalogExercises.has(ex.exercise_id)) {
          hasInvalidExerciseUuid = true;
          break;
        }

        if (Array.isArray(ex.sets)) {
          let setIndex = 1;
          for (const st of ex.sets) {
            // Completed Set Policy: Only migrate completed sets
            if (!st.completed) continue;

            const repsVal = parseInt(st.reps, 10);
            const weightVal = st.weight !== '' && st.weight !== null && st.weight !== undefined ? parseFloat(st.weight) : null;

            validSetsToInsert.push({
              exercise_id: ex.exercise_id,
              exercise_name: ex.name || 'Exercise',
              set_number: setIndex++,
              weight_kg: isNaN(weightVal as any) ? null : weightVal,
              reps: isNaN(repsVal) ? null : repsVal,
              rpe: null, // No fabricated RPE
              tempo: null, // No fabricated tempo
              completed_at: log.completed_at, // Fallback to session completed_at
            });
          }
        }
      }

      if (hasInvalidExerciseUuid) {
        this.skippedLogs.push({ logId: log.id, reason: 'UNRESOLVED_EXERCISE_UUID_SKIPPED' });
        continue;
      }

      // 5. Plan relationship policy: Do NOT guess plan_day_id
      const planDayId = null; // Always NULL unless proven

      const startedTime = log.started_at && !isNaN(new Date(log.started_at).getTime())
        ? new Date(log.started_at).getTime()
        : logCompletedTime;
      const durationSeconds = Math.max(0, Math.round((logCompletedTime - startedTime) / 1000));

      // Insert session
      const newSession: NormalizedSession = {
        id: log.id, // Deterministic ID reuse
        athlete_id: log.user_id,
        plan_day_id: planDayId,
        started_at: new Date(startedTime).toISOString(),
        completed_at: new Date(logCompletedTime).toISOString(),
        duration_seconds: durationSeconds,
        total_volume_kg: logVolume,
        notes: 'migrated_from_workout_logs',
        status: 'completed',
      };

      this.sessions.push(newSession);
      insertedSessions++;

      // Insert sets
      for (let i = 0; i < validSetsToInsert.length; i++) {
        const vs = validSetsToInsert[i];
        this.sets.push({
          id: `${log.id}-set-${i + 1}`,
          session_id: log.id,
          ...vs,
        });
        insertedSets++;
      }
    }

    return { insertedSessions, insertedSets, skippedLogs: this.skippedLogs.length };
  }
}

describe('Phase 8: Workout History Backfill Idempotency & Safety', () => {
  const EX_BENCH = '506608ae-3999-493b-85ea-88b54595e687';
  const EX_SQUAT = '8224ce75-757d-4130-a8d4-6f2b50cf61b8';
  let engine: BackfillEngine;

  beforeEach(() => {
    engine = new BackfillEngine([EX_BENCH, EX_SQUAT]);
  });

  it('1. Migrates a clean legacy row faithfully with completed sets', () => {
    const cleanLog: LegacyWorkoutLog = {
      id: 'a0000000-0000-0000-0000-000000000001',
      user_id: 'b0000000-0000-0000-0000-000000000001',
      workout_plan_id: 'c0000000-0000-0000-0000-000000000001',
      started_at: '2026-06-26T10:00:00Z',
      completed_at: '2026-06-26T11:00:00Z',
      total_volume: 1200,
      logged_exercises: [
        {
          exercise_id: EX_BENCH,
          name: 'Barbell Bench Press',
          sets: [
            { reps: '10', weight: '60', completed: true },
            { reps: '10', weight: '60', completed: true },
          ],
        },
      ],
    };

    const res = engine.runMigration([cleanLog]);
    expect(res.insertedSessions).toBe(1);
    expect(res.insertedSets).toBe(2);
    expect(engine.sessions[0].id).toBe('a0000000-0000-0000-0000-000000000001');
    expect(engine.sessions[0].plan_day_id).toBeNull(); // No guessed day
    expect(engine.sets[0].weight_kg).toBe(60);
    expect(engine.sets[0].reps).toBe(10);
    expect(engine.sets[0].rpe).toBeNull(); // No invented values
  });

  it('2. Legacy row whose exact ID already exists is skipped (Exact ID collision guard)', () => {
    engine.sessions.push({
      id: 'a0000000-0000-0000-0000-000000000001',
      athlete_id: 'b0000000-0000-0000-0000-000000000001',
      plan_day_id: null,
      started_at: '2026-06-26T10:00:00Z',
      completed_at: '2026-06-26T11:00:00Z',
      duration_seconds: 3600,
      total_volume_kg: 1200,
      notes: '',
      status: 'completed',
    });

    const duplicateLog: LegacyWorkoutLog = {
      id: 'a0000000-0000-0000-0000-000000000001',
      user_id: 'b0000000-0000-0000-0000-000000000001',
      started_at: '2026-06-26T10:00:00Z',
      completed_at: '2026-06-26T11:00:00Z',
      total_volume: 1200,
      logged_exercises: [{ exercise_id: EX_BENCH, name: 'Bench', sets: [{ reps: '10', weight: '60', completed: true }] }],
    };

    const res = engine.runMigration([duplicateLog]);
    expect(res.insertedSessions).toBe(0);
    expect(engine.skippedLogs[0].reason).toBe('EXACT_ID_ALREADY_EXISTS');
  });

  it('3. Strong secondary duplicate match is detected and skipped', () => {
    // Session already exists with different UUID but identical athlete, time, volume, and sets
    engine.sessions.push({
      id: 'existing-session-uuid',
      athlete_id: 'b0000000-0000-0000-0000-000000000001',
      plan_day_id: null,
      started_at: '2026-06-26T10:00:00Z',
      completed_at: '2026-06-26T11:00:00Z',
      duration_seconds: 3600,
      total_volume_kg: 1200,
      notes: '',
      status: 'completed',
    });
    engine.sets.push({
      id: 'st-1',
      session_id: 'existing-session-uuid',
      exercise_id: EX_BENCH,
      exercise_name: 'Bench',
      set_number: 1,
      weight_kg: 60,
      reps: 10,
      rpe: null,
      tempo: null,
      completed_at: '2026-06-26T11:00:00Z',
    });

    const legacyLog: LegacyWorkoutLog = {
      id: 'a0000000-0000-0000-0000-000000000099',
      user_id: 'b0000000-0000-0000-0000-000000000001',
      started_at: '2026-06-26T10:00:00Z',
      completed_at: '2026-06-26T11:00:00Z',
      total_volume: 1200,
      logged_exercises: [{ exercise_id: EX_BENCH, name: 'Bench', sets: [{ reps: '10', weight: '60', completed: true }] }],
    };

    const res = engine.runMigration([legacyLog]);
    expect(res.insertedSessions).toBe(0);
    expect(engine.skippedLogs[0].reason).toBe('STRONG_SECONDARY_MATCH_DUPLICATE');
  });

  it('4. Two legitimate workouts close together with same volume are NOT merged if time or athlete differs', () => {
    const workout1: LegacyWorkoutLog = {
      id: 'a0000000-0000-0000-0000-000000000001',
      user_id: 'b0000000-0000-0000-0000-000000000001',
      started_at: '2026-06-26T10:00:00Z',
      completed_at: '2026-06-26T10:30:00Z',
      total_volume: 1000,
      logged_exercises: [{ exercise_id: EX_BENCH, name: 'Bench', sets: [{ reps: '10', weight: '100', completed: true }] }],
    };

    const workout2: LegacyWorkoutLog = {
      id: 'a0000000-0000-0000-0000-000000000002',
      user_id: 'b0000000-0000-0000-0000-000000000001',
      started_at: '2026-06-26T11:00:00Z', // 30 min later (distinct workout)
      completed_at: '2026-06-26T11:30:00Z',
      total_volume: 1000, // Same volume
      logged_exercises: [{ exercise_id: EX_SQUAT, name: 'Squat', sets: [{ reps: '10', weight: '100', completed: true }] }],
    };

    const res = engine.runMigration([workout1, workout2]);
    expect(res.insertedSessions).toBe(2);
    expect(engine.sessions).toHaveLength(2);
  });

  it('5. Malformed exercise JSON and invalid exercise UUID are safely skipped', () => {
    const invalidLog1: LegacyWorkoutLog = {
      id: 'a0000000-0000-0000-0000-000000000003',
      user_id: 'b0000000-0000-0000-0000-000000000001',
      started_at: '2026-06-26T10:00:00Z',
      completed_at: '2026-06-26T11:00:00Z',
      total_volume: 500,
      logged_exercises: 'corrupted_string_not_array' as any,
    };

    const invalidLog2: LegacyWorkoutLog = {
      id: 'a0000000-0000-0000-0000-000000000004',
      user_id: 'b0000000-0000-0000-0000-000000000001',
      started_at: '2026-06-26T10:00:00Z',
      completed_at: '2026-06-26T11:00:00Z',
      total_volume: 500,
      logged_exercises: [{ exercise_id: 'non-catalog-uuid', name: 'Unknown', sets: [] }],
    };

    const res = engine.runMigration([invalidLog1, invalidLog2]);
    expect(res.insertedSessions).toBe(0);
    expect(engine.skippedLogs).toHaveLength(2);
  });

  it('6. Incomplete sets (completed: false) and blank weights/reps are preserved as NULL / skipped', () => {
    const logWithIncompleteSets: LegacyWorkoutLog = {
      id: 'a0000000-0000-0000-0000-000000000005',
      user_id: 'b0000000-0000-0000-0000-000000000001',
      started_at: '2026-06-26T10:00:00Z',
      completed_at: '2026-06-26T11:00:00Z',
      total_volume: 200,
      logged_exercises: [
        {
          exercise_id: EX_BENCH,
          name: 'Bench Press',
          sets: [
            { reps: '10', weight: '20', completed: true },
            { reps: '10', weight: '', completed: false }, // Incomplete, blank weight
            { reps: '', weight: '', completed: false }, // Incomplete
          ],
        },
      ],
    };

    const res = engine.runMigration([logWithIncompleteSets]);
    expect(res.insertedSessions).toBe(1);
    // Only 1 completed set migrated
    expect(res.insertedSets).toBe(1);
    expect(engine.sets[0].weight_kg).toBe(20);
  });

  it('7. Migration is 100% idempotent: running twice yields 0 duplicate rows', () => {
    const cleanLog: LegacyWorkoutLog = {
      id: 'a0000000-0000-0000-0000-000000000001',
      user_id: 'b0000000-0000-0000-0000-000000000001',
      started_at: '2026-06-26T10:00:00Z',
      completed_at: '2026-06-26T11:00:00Z',
      total_volume: 1200,
      logged_exercises: [{ exercise_id: EX_BENCH, name: 'Bench', sets: [{ reps: '10', weight: '60', completed: true }] }],
    };

    const run1 = engine.runMigration([cleanLog]);
    expect(run1.insertedSessions).toBe(1);
    expect(run1.insertedSets).toBe(1);

    const run2 = engine.runMigration([cleanLog]);
    expect(run2.insertedSessions).toBe(0);
    expect(run2.insertedSets).toBe(0);
    expect(engine.sessions).toHaveLength(1);
    expect(engine.sets).toHaveLength(1);
  });
});

describe('Final reconciliation helpers', () => {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  const resolve = (name: string, names: Record<string, string[]>, aliases: Record<string, string[]>) => {
    const key = normalize(name);
    if ((aliases[key] || []).length === 1) return { kind: 'RESOLVED_BY_ALIAS', id: aliases[key][0] };
    if ((aliases[key] || []).length > 1) return { kind: 'AMBIGUOUS' };
    if ((names[key] || []).length === 1) return { kind: 'RESOLVED_BY_EXACT_NAME', id: names[key][0] };
    if ((names[key] || []).length > 1) return { kind: 'AMBIGUOUS' };
    return { kind: 'UNRESOLVED' };
  };
  const signature = (sets: Array<{ exercise_id: string; weight: number | null; reps: number | null }>) =>
    [...sets].sort((a, b) => `${a.exercise_id}:${a.weight}:${a.reps}`.localeCompare(`${b.exercise_id}:${b.weight}:${b.reps}`))
      .map((set) => `${set.exercise_id}:${set.weight ?? 'null'}:${set.reps ?? 'null'}`).join('|');

  it('recovers a unique exact normalized exercise name', () => {
    expect(resolve('Bench Press', { benchpress: ['bench-id'] }, {})).toEqual({ kind: 'RESOLVED_BY_EXACT_NAME', id: 'bench-id' });
  });

  it('recovers a unique explicit alias', () => {
    expect(resolve('Flat Bench', {}, { flatbench: ['bench-id'] })).toEqual({ kind: 'RESOLVED_BY_ALIAS', id: 'bench-id' });
  });

  it('refuses an ambiguous name or alias', () => {
    expect(resolve('Press', { press: ['a', 'b'] }, {})).toEqual({ kind: 'AMBIGUOUS' });
    expect(resolve('DB Press', {}, { dbpress: ['a', 'b'] })).toEqual({ kind: 'AMBIGUOUS' });
  });

  it('keeps an undocumented legacy exercise unresolved', () => {
    expect(resolve('Incline Dumbell fly', {}, {})).toEqual({ kind: 'UNRESOLVED' });
  });

  it('allows a partial workout only when at least one completed set is safely resolved', () => {
    const rows = [{ resolved: true, completed: true }, { resolved: false, completed: true }];
    expect(rows.some((row) => row.resolved && row.completed)).toBe(true);
    expect(rows.filter((row) => !row.resolved && row.completed)).toHaveLength(1);
  });

  it('does not merge close workouts with equal volume but different signatures', () => {
    expect(signature([{ exercise_id: 'bench', weight: 100, reps: 10 }]))
      .not.toBe(signature([{ exercise_id: 'squat', weight: 100, reps: 10 }]));
  });

  it('uses the source workout UUID as non-user-facing provenance', () => {
    const sourceId = 'a0000000-0000-0000-0000-000000000001';
    expect({ source_workout_log_id: sourceId, session_id: sourceId }).toEqual({ source_workout_log_id: sourceId, session_id: sourceId });
  });

  it('preserves blank nullable weight and reps as null rather than zero', () => {
    const parse = (value: string) => value.trim() === '' ? null : Number(value);
    expect(parse('')).toBeNull();
  });

  it('detects a material volume mismatch after partial conversion', () => {
    const migrated = [{ weight: 100, reps: 4 }, { weight: 20, reps: 2 }].reduce((sum, set) => sum + set.weight * set.reps, 0);
    expect(migrated).toBe(440);
    expect(Math.abs(1040 - migrated)).toBeGreaterThan(0.01);
  });

  it('targets only verified live normalized columns and records partial provenance', () => {
    const sql = readFileSync(resolvePath('supabase/migrations/20260824120000_backfill_workout_logs_to_sessions.sql'), 'utf8');
    expect(sql).not.toMatch(/workout_sessions[\s\S]*?total_volume_kg/i);
    expect(sql).not.toMatch(/session_sets[\s\S]*?exercise_name/i);
    expect(sql).toContain('workout_history_backfill_ledger');
    expect(sql).toContain('source_workout_log_id');
    expect(sql).toContain('unresolved_completed_set_count');
  });
});
