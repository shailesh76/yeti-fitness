import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  buildExerciseEditorRpcArgs,
  canEditExercise,
  ExerciseEditorForm,
  isExerciseEditorDirty,
  splitEditorList,
  validateExerciseEditor,
} from '../apps/coach-dashboard/lib/exerciseEditor';

const migrationPath = path.resolve('supabase/migrations/20260829120000_exercise_editor_foundation.sql');
const migration = fs.readFileSync(migrationPath, 'utf8');
const editor = fs.readFileSync(path.resolve('apps/coach-dashboard/app/exercises/[id]/edit/page.tsx'), 'utf8');
const creator = fs.readFileSync(path.resolve('apps/coach-dashboard/app/exercises/new/page.tsx'), 'utf8');
const library = fs.readFileSync(path.resolve('apps/coach-dashboard/app/exercises/page.tsx'), 'utf8');

const baseForm: ExerciseEditorForm = {
  name: 'Goblet Squat', primaryMuscle: 'quadriceps', equipment: 'dumbbell', category: 'strength',
  movementPattern: 'squat', difficulty: 'beginner', unilateral: false,
  setupInstructions: 'Hold the dumbbell.', executionInstructions: 'Squat under control.',
  breathing: 'Inhale down and exhale up.', coachingCues: 'Brace\nKnees track toes',
  commonMistakes: 'Heels lift', safetyNotes: 'Use a manageable load.', defaultSets: '3',
  defaultReps: '10', defaultRepsPrescription: '8-12', tempo: '3-1-1-0', archived: false,
};

describe('Exercise Editor Phase A authorization', () => {
  it('removes the permissive athlete insert policy and direct browser writes', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Coaches can insert exercises."');
    expect(migration).toMatch(/REVOKE INSERT, UPDATE[^;]+FROM authenticated;/);
    expect(migration).toMatch(/REVOKE DELETE ON public\.exercises FROM anon;/);
    expect(migration).not.toMatch(/CREATE POLICY[^;]+auth\.role\(\) = 'authenticated'/s);
  });

  it('permits coach ownership only for custom rows at the RLS boundary', () => {
    expect(migration).toContain('CREATE POLICY "Coaches can insert their own custom exercises"');
    expect(migration).toContain("source_type = 'custom'");
    expect(migration).toContain('created_by_coach_id = auth.uid()');
    expect(migration).toContain("profiles.role = 'coach'");
    expect(migration).toMatch(/CREATE POLICY "Coaches can update their own custom exercises"[\s\S]+WITH CHECK/);
  });

  it('allows admins through the authorized RPC and denies athletes', () => {
    expect(migration).toContain("IF v_role NOT IN ('coach', 'admin')");
    expect(migration).toContain("v_role = 'coach' AND NOT");
    expect(migration).toContain("v_existing.source_type = 'custom'");
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.save_exercise_editor');
    expect(canEditExercise('admin', 'admin-1', { source_type: 'yeti_first_party', created_by_coach_id: null })).toBe(true);
    expect(canEditExercise('athlete', 'athlete-1', { source_type: 'custom', created_by_coach_id: 'athlete-1' })).toBe(false);
    expect(migration).toContain('prevent_untrusted_profile_role_change');
    expect(migration).toContain('BEFORE UPDATE OF role ON public.profiles');
    expect(migration).toContain("COALESCE(auth.role(), '') <> 'service_role'");
  });

  it('allows only the owning coach to edit a custom exercise', () => {
    expect(canEditExercise('coach', 'coach-a', { source_type: 'custom', created_by_coach_id: 'coach-a' })).toBe(true);
    expect(canEditExercise('coach', 'coach-b', { source_type: 'custom', created_by_coach_id: 'coach-a' })).toBe(false);
    expect(canEditExercise('coach', 'coach-a', { source_type: 'legacy_catalog', created_by_coach_id: null })).toBe(false);
    expect(canEditExercise('coach', 'coach-a', { source_type: 'yeti_first_party', created_by_coach_id: null })).toBe(false);
  });

  it('creates only server-derived coach custom provenance', () => {
    const createBranch = migration.split('IF p_exercise_id IS NULL THEN')[1].split('SELECT * INTO v_existing')[0];
    expect(createBranch).toContain("IF v_role <> 'coach'");
    expect(createBranch).toContain("'custom', 'coach', v_user_id");
    expect(createBranch).not.toContain('p_source_type');
    expect(createBranch).not.toContain('p_created_by_coach_id');
    expect(creator).toMatch(/supabase\.rpc\('save_exercise_editor/);
    expect(creator).toMatch(/buildExerciseEditor(V2Payload|RpcArgs)/);
    expect(creator).not.toMatch(/\.from\('exercises'\)\.insert/);
    expect(creator).not.toContain('uploadFileToR2');
  });

  it('makes provenance immutable and enforces ownership constraints', () => {
    expect(migration).toContain('ADD CONSTRAINT exercises_ownership_check');
    expect(migration).toContain("source_type = 'custom' AND created_by_coach_id IS NOT NULL");
    expect(migration).toContain("source_type IN ('yeti_first_party', 'legacy_catalog') AND created_by_coach_id IS NULL");
    for (const field of ['source_type', 'source', 'source_id', 'created_by_coach_id']) {
      expect(migration).toContain(`NEW.${field} IS DISTINCT FROM OLD.${field}`);
      expect(editor).not.toContain(`p_${field}`);
    }
  });
});

describe('Exercise Editor Phase A form and atomic save', () => {
  it('validates required and numeric fields without weakening the contract', () => {
    expect(validateExerciseEditor(baseForm)).toEqual({});
    expect(validateExerciseEditor({ ...baseForm, name: '', defaultSets: '0', defaultReps: '-1' })).toMatchObject({
      name: expect.any(String), defaultSets: expect.any(String), defaultReps: expect.any(String),
    });
    expect(migration).toContain('jsonb_array_elements');
    expect(migration).toContain('strings no longer than 500 characters');
  });

  it('normalizes list fields and preserves the lossless prescription', () => {
    expect(splitEditorList('Brace\nBrace\nKnees out')).toEqual(['Brace', 'Knees out']);
    const args = buildExerciseEditorRpcArgs('exercise-1', baseForm);
    expect(args.p_coaching_cues).toEqual(['Brace', 'Knees track toes']);
    expect(args.p_default_reps).toBe(10);
    expect(args.p_default_reps_prescription).toBe('8-12');
    expect(args).not.toHaveProperty('p_source_type');
  });

  it('detects dirty state and resets only after an acknowledged save', () => {
    expect(isExerciseEditorDirty(baseForm, baseForm)).toBe(false);
    expect(isExerciseEditorDirty(baseForm, { ...baseForm, name: 'Changed' })).toBe(true);
    expect(editor).toContain("window.addEventListener('beforeunload', warn)");
    const saveBranch = editor.split('async function save')[1];
    expect(saveBranch.indexOf('if (error)')).toBeLessThan(saveBranch.indexOf('setInitialForm(nextForm)'));
  });

  it('uses one atomic RPC and never performs browser-side table updates', () => {
    expect(editor).toMatch(/supabase\.rpc\('save_exercise_editor/);
    expect(editor).not.toMatch(/\.from\('exercises'\)\.update/);
    const updateStatements = migration.match(/UPDATE public\.exercises/g) ?? [];
    expect(updateStatements).toHaveLength(1);
    expect(migration).toContain('FOR UPDATE');
    expect(migration).toContain('BEGIN;');
    expect(migration).toContain('COMMIT;');
  });

  it('archives active rows without hiding ID-based historical references', () => {
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL');
    expect(migration).toContain('COALESCE(archived_at, pg_catalog.now())');
    expect(library.match(/\.is\('archived_at', null\)/g)).toHaveLength(2);
    expect(migration).not.toMatch(/DELETE FROM public\.exercises/);
    expect(migration).not.toMatch(/CREATE POLICY[^;]+archived_at/s);
  });

  it('shows loading, not-found, denied, validation, dirty and save feedback states', () => {
    for (const text of ['Loading exercise', 'Exercise not found', 'You do not have permission', 'Correct the highlighted fields', 'Exercise saved', 'Exercise changes were not saved']) {
      expect(editor).toContain(text);
    }
  });
});
