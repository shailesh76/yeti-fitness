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
}

export type ExerciseEditorErrors = Partial<Record<keyof ExerciseEditorForm, string>>;

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

export function validateExerciseEditor(form: ExerciseEditorForm): ExerciseEditorErrors {
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
  return errors;
}

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

export function isExerciseEditorDirty(initial: ExerciseEditorForm, current: ExerciseEditorForm): boolean {
  return JSON.stringify(initial) !== JSON.stringify(current);
}
