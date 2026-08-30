import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  buildExerciseEditorRpcArgs,
  buildExerciseEditorV2Payload,
  canEditExercise,
  ExerciseEditorForm,
  isExerciseEditorDirty,
  validateExerciseEditor,
} from '../apps/coach-dashboard/lib/exerciseEditor';

const migrationPathA = path.resolve('supabase/migrations/20260829120000_exercise_editor_foundation.sql');
const migrationA = fs.readFileSync(migrationPathA, 'utf8');

const migrationPathB = path.resolve('supabase/migrations/20260831120000_exercise_editor_phase_b_relations.sql');
const migrationB = fs.readFileSync(migrationPathB, 'utf8');

const editor = fs.readFileSync(path.resolve('apps/coach-dashboard/app/exercises/[id]/edit/page.tsx'), 'utf8');
const creator = fs.readFileSync(path.resolve('apps/coach-dashboard/app/exercises/new/page.tsx'), 'utf8');
const sections = fs.readFileSync(path.resolve('apps/coach-dashboard/components/ExerciseRelationSections.tsx'), 'utf8');

const baseForm: ExerciseEditorForm = {
  name: 'Goblet Squat',
  primaryMuscle: 'quadriceps',
  equipment: 'dumbbell',
  category: 'strength',
  movementPattern: 'squat',
  difficulty: 'beginner',
  unilateral: false,
  setupInstructions: 'Hold the dumbbell at chest level.',
  executionInstructions: 'Squat down under control.',
  breathing: 'Inhale down, exhale up.',
  coachingCues: 'Chest up\nKnees track toes',
  commonMistakes: 'Knees cave in',
  safetyNotes: 'Use manageable load.',
  defaultSets: '3',
  defaultReps: '10',
  defaultRepsPrescription: '8-12',
  tempo: '3-0-1-0',
  archived: false,
  aliases: ['Kettlebell Goblet Squat', 'DB Goblet Squat'],
  tags: [{ tag: 'quads', tagType: 'coach' }, { tag: 'squat', tagType: 'coach' }],
  muscles: [
    { muscle: 'quadriceps', role: 'primary' },
    { muscle: 'gluteus maximus', role: 'secondary' },
    { muscle: 'core', role: 'stabilizer' },
  ],
  alternatives: [
    { alternativeExerciseId: '00000000-0000-4000-a000-000000000002', name: 'Barbell Front Squat', reason: 'Barbell variation' },
  ],
  progressions: [
    { progressionExerciseId: '00000000-0000-4000-a000-000000000005', name: 'Barbell Back Squat', difficultyDelta: 1 },
  ],
  regressions: [
    { regressionExerciseId: '00000000-0000-4000-a000-000000000009', name: 'Bodyweight Squat', difficultyDelta: -1 },
  ],
};

describe('Exercise Editor Phase B: Architecture & Migration Integrity', () => {
  it('preserves Phase A save_exercise_editor intact without altering signature', () => {
    expect(migrationA).toContain('CREATE OR REPLACE FUNCTION public.save_exercise_editor(');
    expect(migrationB).not.toContain('CREATE OR REPLACE FUNCTION public.save_exercise_editor(');
    expect(migrationB).toContain('CREATE OR REPLACE FUNCTION public.save_exercise_editor_v2(');
  });

  it('hardens child table security by revoking browser-direct mutations', () => {
    const childTables = [
      'exercise_aliases',
      'exercise_tags',
      'exercise_muscles',
      'exercise_alternatives',
      'exercise_progressions',
      'exercise_regressions',
    ];
    for (const table of childTables) {
      expect(migrationB).toContain(`REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.${table} FROM anon, authenticated;`);
      expect(migrationB).toContain(`GRANT SELECT ON public.${table} TO anon, authenticated;`);
    }
  });

  it('restricts save_exercise_editor_v2 EXECUTE privileges strictly to authenticated', () => {
    expect(migrationB).toContain('REVOKE ALL ON FUNCTION public.save_exercise_editor_v2(jsonb) FROM PUBLIC;');
    expect(migrationB).toContain('REVOKE ALL ON FUNCTION public.save_exercise_editor_v2(jsonb) FROM anon;');
    expect(migrationB).toContain('REVOKE ALL ON FUNCTION public.save_exercise_editor_v2(jsonb) FROM service_role;');
    expect(migrationB).toContain('GRANT EXECUTE ON FUNCTION public.save_exercise_editor_v2(jsonb) TO authenticated;');
    expect(migrationB).toContain('SECURITY DEFINER');
    expect(migrationB).toContain("SET search_path = ''");
  });

  it('enforces atomic transactional replacement on child relations in migration', () => {
    expect(migrationB).toContain('DELETE FROM public.exercise_aliases WHERE exercise_id = v_id;');
    expect(migrationB).toContain('DELETE FROM public.exercise_tags WHERE exercise_id = v_id;');
    expect(migrationB).toContain('DELETE FROM public.exercise_muscles WHERE exercise_id = v_id;');
    expect(migrationB).toContain('DELETE FROM public.exercise_alternatives WHERE exercise_id = v_id;');
    expect(migrationB).toContain('DELETE FROM public.exercise_progressions WHERE exercise_id = v_id;');
    expect(migrationB).toContain('DELETE FROM public.exercise_regressions WHERE exercise_id = v_id;');
  });

  it('synchronizes normalized muscles into legacy flat fields for offline mobile compatibility', () => {
    expect(migrationB).toContain('primary_muscle = v_calc_primary');
    expect(migrationB).toContain('target_muscle = v_calc_primary');
    expect(migrationB).toContain('secondary_muscles = CASE WHEN pg_catalog.cardinality(v_secondary_arr) > 0 THEN v_secondary_arr ELSE NULL END');
  });

  it('prevents self-referencing and progression/regression contradictions in SQL', () => {
    expect(migrationB).toContain('v_target_id = v_id');
    expect(migrationB).toContain('An exercise cannot be an alternative to itself');
    expect(migrationB).toContain('An exercise cannot be a progression of itself');
    expect(migrationB).toContain('An exercise cannot be a regression of itself');
    expect(migrationB).toContain('cannot simultaneously be both a progression and a regression');
  });
});

describe('Exercise Editor Phase B: Authorization Contract', () => {
  it('enforces admin, coach, and athlete role boundaries', () => {
    expect(canEditExercise('admin', 'admin-1', { source_type: 'yeti_first_party', created_by_coach_id: null })).toBe(true);
    expect(canEditExercise('admin', 'admin-1', { source_type: 'legacy_catalog', created_by_coach_id: null })).toBe(true);
    expect(canEditExercise('admin', 'admin-1', { source_type: 'custom', created_by_coach_id: 'coach-x' })).toBe(true);

    expect(canEditExercise('coach', 'coach-1', { source_type: 'custom', created_by_coach_id: 'coach-1' })).toBe(true);
    expect(canEditExercise('coach', 'coach-1', { source_type: 'custom', created_by_coach_id: 'coach-2' })).toBe(false);
    expect(canEditExercise('coach', 'coach-1', { source_type: 'yeti_first_party', created_by_coach_id: null })).toBe(false);
    expect(canEditExercise('coach', 'coach-1', { source_type: 'legacy_catalog', created_by_coach_id: null })).toBe(false);

    expect(canEditExercise('athlete', 'athlete-1', { source_type: 'custom', created_by_coach_id: 'athlete-1' })).toBe(false);
    expect(canEditExercise(null, 'anon-1', { source_type: 'custom', created_by_coach_id: null })).toBe(false);
  });
});

describe('Exercise Editor Phase B: Form Validation & Payload Building', () => {
  it('validates a clean Phase B form without errors', () => {
    const errors = validateExerciseEditor(baseForm, 'curr-id');
    expect(errors).toEqual({});
  });

  it('catches blank and duplicate aliases', () => {
    const blankErrors = validateExerciseEditor({ ...baseForm, aliases: ['Valid', '   '] });
    expect(blankErrors.aliases).toContain('blank');

    const dupeErrors = validateExerciseEditor({ ...baseForm, aliases: ['Goblet', 'goblet'] });
    expect(dupeErrors.aliases).toContain('Duplicate');
  });

  it('catches blank and duplicate tags', () => {
    const blankErrors = validateExerciseEditor({ ...baseForm, tags: [{ tag: '', tagType: 'coach' }] });
    expect(blankErrors.tags).toContain('blank');

    const dupeErrors = validateExerciseEditor({
      ...baseForm,
      tags: [{ tag: 'quads', tagType: 'coach' }, { tag: 'QUADS', tagType: 'coach' }],
    });
    expect(dupeErrors.tags).toContain('Duplicate');
  });

  it('enforces single primary muscle and catches duplicate muscle roles', () => {
    const twoPrimaries = validateExerciseEditor({
      ...baseForm,
      muscles: [
        { muscle: 'quadriceps', role: 'primary' },
        { muscle: 'glutes', role: 'primary' },
      ],
    });
    expect(twoPrimaries.muscles).toContain('Only one primary muscle');

    const dupeMuscles = validateExerciseEditor({
      ...baseForm,
      muscles: [
        { muscle: 'quadriceps', role: 'secondary' },
        { muscle: 'quadriceps', role: 'secondary' },
      ],
    });
    expect(dupeMuscles.muscles).toContain('Duplicate muscle');
  });

  it('catches self-references and duplicate IDs in alternatives, progressions, and regressions', () => {
    const currentId = '00000000-0000-4000-a000-000000000001';

    const selfAlt = validateExerciseEditor(
      {
        ...baseForm,
        alternatives: [{ alternativeExerciseId: currentId, name: 'Self' }],
      },
      currentId,
    );
    expect(selfAlt.alternatives).toContain('itself');

    const dupeAlt = validateExerciseEditor({
      ...baseForm,
      alternatives: [
        { alternativeExerciseId: 'alt-1', name: 'Alt 1' },
        { alternativeExerciseId: 'alt-1', name: 'Alt 1 Dupe' },
      ],
    });
    expect(dupeAlt.alternatives).toContain('Duplicate');

    const contradiction = validateExerciseEditor({
      ...baseForm,
      progressions: [{ progressionExerciseId: 'ex-x', name: 'Ex X' }],
      regressions: [{ regressionExerciseId: 'ex-x', name: 'Ex X' }],
    });
    expect(contradiction.regressions).toContain('simultaneously');
  });

  it('builds a complete versioned v2 JSON payload', () => {
    const payload = buildExerciseEditorV2Payload('ex-uuid-1', baseForm);
    expect(payload.exercise_id).toBe('ex-uuid-1');
    expect(payload.name).toBe('Goblet Squat');
    expect(payload.aliases).toEqual(['Kettlebell Goblet Squat', 'DB Goblet Squat']);
    expect(payload.muscles).toEqual([
      { muscle: 'quadriceps', role: 'primary' },
      { muscle: 'gluteus maximus', role: 'secondary' },
      { muscle: 'core', role: 'stabilizer' },
    ]);
    expect(payload.alternatives).toEqual([
      { alternative_exercise_id: '00000000-0000-4000-a000-000000000002', reason: 'Barbell variation' },
    ]);
    expect(payload.progressions).toEqual([
      { progression_exercise_id: '00000000-0000-4000-a000-000000000005', difficulty_delta: 1 },
    ]);
    expect(payload.regressions).toEqual([
      { regression_exercise_id: '00000000-0000-4000-a000-000000000009', difficulty_delta: -1 },
    ]);
  });

  it('detects dirty state changes across all Phase B relation collections', () => {
    expect(isExerciseEditorDirty(baseForm, baseForm)).toBe(false);

    // Aliases change
    expect(isExerciseEditorDirty(baseForm, { ...baseForm, aliases: [...baseForm.aliases, 'New Alias'] })).toBe(true);

    // Tags change
    expect(isExerciseEditorDirty(baseForm, { ...baseForm, tags: [] })).toBe(true);

    // Muscles change
    expect(isExerciseEditorDirty(baseForm, { ...baseForm, muscles: [{ muscle: 'hamstrings', role: 'primary' }] })).toBe(true);

    // Alternatives change
    expect(isExerciseEditorDirty(baseForm, { ...baseForm, alternatives: [] })).toBe(true);

    // Progressions change
    expect(isExerciseEditorDirty(baseForm, { ...baseForm, progressions: [] })).toBe(true);

    // Regressions change
    expect(isExerciseEditorDirty(baseForm, { ...baseForm, regressions: [] })).toBe(true);
  });
});

describe('Exercise Editor Phase B: UI Integration', () => {
  it('calls save_exercise_editor_v2 in both edit and new pages', () => {
    expect(editor).toContain("supabase.rpc('save_exercise_editor_v2'");
    expect(editor).toContain('buildExerciseEditorV2Payload(exerciseId, nextForm)');

    expect(creator).toContain("supabase.rpc('save_exercise_editor_v2'");
    expect(creator).toContain('buildExerciseEditorV2Payload(null, form)');
  });

  it('includes ExerciseRelationSections in edit and new exercise forms', () => {
    expect(editor).toContain('<ExerciseRelationSections');
    expect(creator).toContain('<ExerciseRelationSections');
    expect(sections).toMatch(/Aliases &amp; Search Synonyms|Aliases & Search Synonyms/);
    expect(sections).toContain('Muscle Involvement');
    expect(sections).toMatch(/Tags &amp; Categorization|Tags & Categorization/);
    expect(sections).toContain('Biomechanical Alternatives');
    expect(sections).toContain('Progressions (Harder)');
    expect(sections).toContain('Regressions (Easier)');
    expect(sections).toContain('Derived Inverse Relationships');
  });
});
