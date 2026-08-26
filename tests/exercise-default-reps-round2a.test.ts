import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getExecutableDefaultReps,
  getExercisePrescriptionDisplay,
} from '../packages/types/src/exercisePrescription';
import { mapExerciseForPull } from '../supabase/functions/sync-pull/exerciseMapping';

const ROOT = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('Round 2A behavioral prescription contract', () => {
  it('keeps numeric compatibility separate from a rep range', () => {
    const exercise = { default_reps: 8, default_reps_prescription: '8–12' };
    expect(getExercisePrescriptionDisplay(exercise)).toBe('8–12');
    expect(getExecutableDefaultReps(exercise)).toBe(8);
  });

  it('never interprets a duration prescription as repetitions', () => {
    const exercise = { default_reps: 30, default_reps_prescription: '30–60 sec' };
    expect(getExercisePrescriptionDisplay(exercise)).toBe('30–60 sec');
    expect(getExecutableDefaultReps(exercise)).toBe(30);
    expect(getExecutableDefaultReps({ default_reps_prescription: '30–60 sec' })).toBeNull();
  });

  it('supports numeric-only, null, blank, and malformed values safely', () => {
    expect(getExercisePrescriptionDisplay({ default_reps: 12 })).toBe('12');
    expect(getExercisePrescriptionDisplay({ default_reps: 12, default_reps_prescription: null })).toBe('12');
    expect(getExercisePrescriptionDisplay({ default_reps: 12, default_reps_prescription: '  ' })).toBe('12');
    expect(getExecutableDefaultReps({ default_reps: Number.NaN, default_reps_prescription: '8–12' })).toBeNull();
  });

  it('behaviorally gates v8 exercise fields by the requesting schema version', () => {
    const row = {
      id: 'exercise-1', name: 'Sled Push', updated_at: '2026-08-14T00:00:00Z',
      default_reps: 30, default_reps_prescription: '30–60 sec',
    };
    for (const version of [7, undefined, null, '8', 8.5, Number.NaN]) {
      const mapped = mapExerciseForPull(row, 1, version);
      expect(mapped).not.toHaveProperty('default_reps');
      expect(mapped).not.toHaveProperty('default_reps_prescription');
    }
    for (const version of [8, 9, 100]) {
      const mapped = mapExerciseForPull(row, 1, version);
      expect(mapped.default_reps).toBe(30);
      expect(mapped.default_reps_prescription).toBe('30–60 sec');
    }
  });
});

describe('Round 2A structural schema and ownership checks (not a native Watermelon migration test)', () => {
  it('defines every v7 to v8 column in both migration and fresh schema', () => {
    const schema = read('packages/database/src/schema.ts');
    const migrations = read('packages/database/src/migrations.ts');
    const addedColumns = [
      'slug', 'primary_muscle', 'movement_pattern', 'unilateral',
      'setup_instructions', 'execution_instructions', 'breathing', 'coaching_cues',
      'common_mistakes', 'safety_notes', 'default_sets', 'default_reps',
      'default_reps_prescription', 'tempo',
    ];
    expect(schema).toContain('version: 9');
    expect(migrations).toContain('toVersion: 8');
    expect(migrations).toContain('toVersion: 9');
    for (const column of addedColumns) {
      expect(schema).toContain(`{ name: '${column}'`);
      expect(migrations).toContain(`{ name: '${column}'`);
    }
    // v9 adds source_type (curation provenance) to both the fresh schema and the migration.
    expect(schema).toContain("{ name: 'source_type'");
    expect(migrations).toContain("{ name: 'source_type'");
    expect(migrations).toContain("{ name: 'default_reps', type: 'number', isOptional: true }");
    expect(migrations).toContain("{ name: 'default_reps_prescription', type: 'string', isOptional: true }");
    expect(schema).not.toMatch(/name: 'exercise_(aliases|tags|muscles|media|alternatives|progressions|regressions)'/);
  });

  it('preserves both fields through DTO/cache and sync-pull mapping', () => {
    const repository = read('packages/database/src/repositories/ExerciseRepository.ts');
    const pull = read('supabase/functions/sync-pull/index.ts');
    expect(repository).toContain('default_reps_prescription: row.default_reps_prescription ?? null');
    expect(repository).toContain('r.default_reps_prescription = ex.default_reps_prescription');
    expect(pull).toContain('mapExerciseForPull(row, nowMs, schemaVersion)');
  });

  it('keeps the canonical catalog pull-only', () => {
    const push = read('supabase/functions/sync-push/index.ts');
    expect(push).not.toMatch(/changes\.exercises|from\(['"]exercises['"]\)/);
  });

  it('uses an additive server migration with canonical assertions', () => {
    const migration = read('supabase/migrations/20260814120000_exercise_default_reps_prescription.sql');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS default_reps_prescription text NULL');
    expect(migration).not.toMatch(/ALTER COLUMN default_reps TYPE/i);
    expect(migration).toContain('v_source_count <> 396');
    expect(migration).toContain("metadata ->> 'default_reps_authored'");
    expect(migration).toContain('SET default_reps_prescription = p.default_reps');
    expect(migration.match(/updated_at = pg_catalog\.now\(\)/g)).toHaveLength(2);
    expect(migration.match(/IS DISTINCT FROM/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('structurally advances changed backfills only and exposes them to incremental pull', () => {
    const migration = read('supabase/migrations/20260814120000_exercise_default_reps_prescription.sql');
    const pull = read('supabase/functions/sync-pull/index.ts');
    expect(migration).toMatch(/default_reps_prescription IS NULL\s+AND default_reps_prescription IS DISTINCT FROM COALESCE/);
    expect(migration).toMatch(/e\.default_reps_prescription IS DISTINCT FROM p\.default_reps/);
    expect(migration.match(/updated_at = pg_catalog\.now\(\)/g)).toHaveLength(2);
    expect(pull).toContain(".gte('updated_at', pullDate)");
  });

  it('routes the dashboard display through the shared prescription helper', () => {
    const dashboard = read('apps/coach-dashboard/app/exercises/page.tsx');
    expect(dashboard).toContain('default_reps_prescription?: string | null');
    expect(dashboard).toContain('getExercisePrescriptionDisplay(selectedExercise)');
    expect(dashboard).not.toContain('selectedExercise.default_reps || 10} reps');
  });
});
