export interface ExercisePrescriptionFields {
  default_reps?: number | null;
  default_reps_prescription?: string | null;
}

/** Returns authored display text, falling back to the numeric compatibility value. */
export function getExercisePrescriptionDisplay(fields: ExercisePrescriptionFields): string | null {
  const prescription = fields.default_reps_prescription;
  if (typeof prescription === 'string' && prescription.trim().length > 0) {
    return prescription.trim();
  }

  const reps = getExecutableDefaultReps(fields);
  return reps === null ? null : String(reps);
}

/** Returns only the numeric compatibility field and never parses display text. */
export function getExecutableDefaultReps(fields: ExercisePrescriptionFields): number | null {
  const reps = fields.default_reps;
  return typeof reps === 'number' && Number.isInteger(reps) && reps >= 0 ? reps : null;
}
