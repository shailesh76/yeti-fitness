export interface ExerciseMediaContextRow {
  id: string;
  exercise_id: string;
}

export function mediaForActiveExercise<T extends ExerciseMediaContextRow>(
  media: T[],
  exerciseId: string,
): T[] {
  return media.filter((row) => row.exercise_id === exerciseId);
}

export function canMutateExerciseMedia<T extends ExerciseMediaContextRow>(options: {
  exerciseId: string;
  media: T[];
  row?: T;
  canManage: boolean;
  loading: boolean;
}): boolean {
  if (!options.canManage || options.loading) return false;
  if (!options.row) return true;
  return options.row.exercise_id === options.exerciseId
    && options.media.some((row) => row.id === options.row?.id && row.exercise_id === options.exerciseId);
}

export function createExerciseDetailRequestGate(initialExerciseId: string | null = null) {
  let exerciseId = initialExerciseId;
  let generation = 0;

  return {
    activate(nextExerciseId: string | null) {
      exerciseId = nextExerciseId;
      generation += 1;
      return generation;
    },
    begin(requestExerciseId: string) {
      exerciseId = requestExerciseId;
      generation += 1;
      const requestGeneration = generation;
      return () => exerciseId === requestExerciseId && generation === requestGeneration;
    },
    invalidate() {
      generation += 1;
    },
  };
}
