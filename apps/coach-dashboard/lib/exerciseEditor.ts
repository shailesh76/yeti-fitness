export type MuscleRole = 'primary' | 'secondary' | 'stabilizer';

export interface ExerciseMuscleItem {
  id?: string;
  muscle: string;
  role: MuscleRole;
}

export interface ExerciseTagItem {
  id?: string;
  tag: string;
  tagType?: string;
}

export interface ExerciseAlternativeItem {
  id?: string;
  alternativeExerciseId: string;
  name?: string;
  reason?: string;
}

export interface ExerciseProgressionItem {
  id?: string;
  progressionExerciseId: string;
  name?: string;
  difficultyDelta?: number;
}

export interface ExerciseRegressionItem {
  id?: string;
  regressionExerciseId: string;
  name?: string;
  difficultyDelta?: number;
}

export interface DerivedRelationItem {
  exerciseId: string;
  name: string;
  slug?: string | null;
  relationship: 'derived_progression' | 'derived_regression';
  reason?: string;
}

export interface ExerciseEditorForm {
  name: string;
  primaryMuscle: string;
  equipment: string;
  category: string;
  movementPattern: string;
  difficulty: string;
  unilateral: boolean;
  setupInstructions: string;
  executionInstructions: string;
  breathing: string;
  coachingCues: string;
  commonMistakes: string;
  safetyNotes: string;
  defaultSets: string;
  defaultReps: string;
  defaultRepsPrescription: string;
  tempo: string;
  archived: boolean;
  // Phase B Relations
  aliases: string[];
  tags: ExerciseTagItem[];
  muscles: ExerciseMuscleItem[];
  alternatives: ExerciseAlternativeItem[];
  progressions: ExerciseProgressionItem[];
  regressions: ExerciseRegressionItem[];
}

export type ExerciseEditorErrors = Partial<Record<keyof ExerciseEditorForm | 'relations', string>>;

export function canEditExercise(
  role: string | null | undefined,
  userId: string,
  exercise: { source_type: string; created_by_coach_id: string | null },
): boolean {
  if (role === 'admin') return true;
  return role === 'coach'
    && exercise.source_type === 'custom'
    && exercise.created_by_coach_id === userId;
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function splitEditorList(value: string): string[] {
  return Array.from(new Set(value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)));
}

export function validateExerciseEditor(form: ExerciseEditorForm, currentExerciseId?: string | null): ExerciseEditorErrors {
  const errors: ExerciseEditorErrors = {};
  if (!form.name.trim()) errors.name = 'Exercise name is required.';
  if (form.name.trim().length > 160) errors.name = 'Exercise name must be 160 characters or fewer.';

  const defaultSets = Number(form.defaultSets);
  if (!Number.isInteger(defaultSets) || defaultSets < 1 || defaultSets > 100) {
    errors.defaultSets = 'Default sets must be a whole number from 1 to 100.';
  }

  if (form.defaultReps.trim()) {
    const defaultReps = Number(form.defaultReps);
    if (!Number.isInteger(defaultReps) || defaultReps < 0 || defaultReps > 10000) {
      errors.defaultReps = 'Default reps must be a whole number from 0 to 10000.';
    }
  }

  if (form.tempo.trim().length > 40) errors.tempo = 'Tempo must be 40 characters or fewer.';
  if (splitEditorList(form.coachingCues).some((cue) => cue.length > 500)) {
    errors.coachingCues = 'Each coaching cue must be 500 characters or fewer.';
  }
  if (splitEditorList(form.commonMistakes).some((mistake) => mistake.length > 500)) {
    errors.commonMistakes = 'Each common mistake must be 500 characters or fewer.';
  }

  // Phase B Validations
  // 1. Aliases validation
  const seenAliases = new Set<string>();
  for (const alias of form.aliases || []) {
    const trimmed = alias.trim();
    if (!trimmed) {
      errors.aliases = 'Aliases cannot contain blank entries.';
      break;
    }
    if (trimmed.length > 160) {
      errors.aliases = 'Each alias must be 160 characters or fewer.';
      break;
    }
    const lower = trimmed.toLowerCase();
    if (seenAliases.has(lower)) {
      errors.aliases = `Duplicate alias "${trimmed}" detected.`;
      break;
    }
    seenAliases.add(lower);
  }

  // 2. Tags validation
  const seenTags = new Set<string>();
  for (const tagItem of form.tags || []) {
    const trimmed = tagItem.tag.trim();
    if (!trimmed) {
      errors.tags = 'Tags cannot contain blank entries.';
      break;
    }
    if (trimmed.length > 100) {
      errors.tags = 'Each tag must be 100 characters or fewer.';
      break;
    }
    const lower = trimmed.toLowerCase();
    if (seenTags.has(lower)) {
      errors.tags = `Duplicate tag "${trimmed}" detected.`;
      break;
    }
    seenTags.add(lower);
  }

  // 3. Muscles validation
  let primaryCount = 0;
  const seenMuscles = new Set<string>();
  for (const m of form.muscles || []) {
    const trimmed = m.muscle.trim();
    if (!trimmed) {
      errors.muscles = 'Muscle names cannot be blank.';
      break;
    }
    if (m.role === 'primary') primaryCount++;
    const key = `${trimmed.toLowerCase()}:${m.role}`;
    if (seenMuscles.has(key)) {
      errors.muscles = `Duplicate muscle entry for "${trimmed}" (${m.role}).`;
      break;
    }
    seenMuscles.add(key);
  }
  if (primaryCount > 1) {
    errors.muscles = 'Only one primary muscle can be selected.';
  }

  // 4. Relations: Alternatives, Progressions, Regressions
  const altIds = new Set<string>();
  for (const alt of form.alternatives || []) {
    if (currentExerciseId && alt.alternativeExerciseId === currentExerciseId) {
      errors.alternatives = 'An exercise cannot be an alternative to itself.';
      break;
    }
    if (altIds.has(alt.alternativeExerciseId)) {
      errors.alternatives = 'Duplicate alternative exercise selected.';
      break;
    }
    altIds.add(alt.alternativeExerciseId);
  }

  const progIds = new Set<string>();
  for (const prog of form.progressions || []) {
    if (currentExerciseId && prog.progressionExerciseId === currentExerciseId) {
      errors.progressions = 'An exercise cannot be a progression of itself.';
      break;
    }
    if (progIds.has(prog.progressionExerciseId)) {
      errors.progressions = 'Duplicate progression exercise selected.';
      break;
    }
    progIds.add(prog.progressionExerciseId);
  }

  const regIds = new Set<string>();
  for (const reg of form.regressions || []) {
    if (currentExerciseId && reg.regressionExerciseId === currentExerciseId) {
      errors.regressions = 'An exercise cannot be a regression of itself.';
      break;
    }
    if (regIds.has(reg.regressionExerciseId)) {
      errors.regressions = 'Duplicate regression exercise selected.';
      break;
    }
    if (progIds.has(reg.regressionExerciseId)) {
      errors.regressions = 'An exercise cannot simultaneously be both a progression and a regression.';
      break;
    }
    regIds.add(reg.regressionExerciseId);
  }

  return errors;
}

/** Legacy Phase A RPC builder — kept intact for backward compatibility */
export function buildExerciseEditorRpcArgs(exerciseId: string | null, form: ExerciseEditorForm) {
  return {
    p_exercise_id: exerciseId,
    p_name: form.name.trim(),
    p_primary_muscle: optionalText(form.primaryMuscle),
    p_equipment: optionalText(form.equipment),
    p_category: optionalText(form.category),
    p_movement_pattern: optionalText(form.movementPattern),
    p_difficulty: optionalText(form.difficulty),
    p_unilateral: form.unilateral,
    p_setup_instructions: optionalText(form.setupInstructions),
    p_execution_instructions: optionalText(form.executionInstructions),
    p_breathing: optionalText(form.breathing),
    p_coaching_cues: splitEditorList(form.coachingCues),
    p_common_mistakes: splitEditorList(form.commonMistakes),
    p_safety_notes: optionalText(form.safetyNotes),
    p_default_sets: Number(form.defaultSets),
    p_default_reps: form.defaultReps.trim() ? Number(form.defaultReps) : null,
    p_default_reps_prescription: optionalText(form.defaultRepsPrescription),
    p_tempo: optionalText(form.tempo),
    p_archived: form.archived,
  };
}

/** Phase B Versioned RPC payload builder */
export function buildExerciseEditorV2Payload(exerciseId: string | null, form: ExerciseEditorForm) {
  // Sync primary muscle between muscles array and core field
  const primaryFromMuscles = form.muscles.find((m) => m.role === 'primary')?.muscle;
  const effectivePrimary = optionalText(primaryFromMuscles || form.primaryMuscle);

  return {
    exercise_id: exerciseId,
    name: form.name.trim(),
    primary_muscle: effectivePrimary,
    equipment: optionalText(form.equipment),
    category: optionalText(form.category),
    movement_pattern: optionalText(form.movementPattern),
    difficulty: optionalText(form.difficulty),
    unilateral: form.unilateral,
    setup_instructions: optionalText(form.setupInstructions),
    execution_instructions: optionalText(form.executionInstructions),
    breathing: optionalText(form.breathing),
    coaching_cues: splitEditorList(form.coachingCues),
    common_mistakes: splitEditorList(form.commonMistakes),
    safety_notes: optionalText(form.safetyNotes),
    default_sets: Number(form.defaultSets),
    default_reps: form.defaultReps.trim() ? Number(form.defaultReps) : null,
    default_reps_prescription: optionalText(form.defaultRepsPrescription),
    tempo: optionalText(form.tempo),
    archived: form.archived,
    aliases: form.aliases.map((a) => a.trim()).filter(Boolean),
    tags: form.tags
      .map((t) => ({ tag: t.tag.trim(), tag_type: t.tagType || 'coach' }))
      .filter((t) => t.tag.length > 0),
    muscles: form.muscles
      .map((m) => ({ muscle: m.muscle.trim(), role: m.role }))
      .filter((m) => m.muscle.length > 0),
    alternatives: form.alternatives.map((a) => ({
      alternative_exercise_id: a.alternativeExerciseId,
      reason: optionalText(a.reason || ''),
    })),
    progressions: form.progressions.map((p) => ({
      progression_exercise_id: p.progressionExerciseId,
      difficulty_delta: p.difficultyDelta ?? 1,
    })),
    regressions: form.regressions.map((r) => ({
      regression_exercise_id: r.regressionExerciseId,
      difficulty_delta: r.difficultyDelta ?? -1,
    })),
  };
}

export function isExerciseEditorDirty(initial: ExerciseEditorForm, current: ExerciseEditorForm): boolean {
  return JSON.stringify(initial) !== JSON.stringify(current);
}

export function copyExerciseEditorForm(form: ExerciseEditorForm): ExerciseEditorForm {
  return {
    ...form,
    aliases: [...form.aliases],
    tags: form.tags.map((tag) => ({ ...tag })),
    muscles: form.muscles.map((muscle) => ({ ...muscle })),
    alternatives: form.alternatives.map((alternative) => ({ ...alternative })),
    progressions: form.progressions.map((progression) => ({ ...progression })),
    regressions: form.regressions.map((regression) => ({ ...regression })),
  };
}
