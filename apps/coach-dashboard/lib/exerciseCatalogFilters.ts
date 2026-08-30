export interface ExerciseFilterSourceRow {
  id: string;
  category: string | null;
  primary_muscle: string | null;
  target_muscle: string | null;
  equipment: string | null;
  difficulty: string | null;
}

export interface ExerciseFilterOptions {
  category: string[];
  muscle: string[];
  equipment: string[];
  difficulty: string[];
}

function sortedValues(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))))
    .sort((left, right) => left.localeCompare(right));
}

export function buildExerciseFilterOptions(rows: ExerciseFilterSourceRow[]): ExerciseFilterOptions {
  return {
    category: sortedValues(rows.map((row) => row.category)),
    muscle: sortedValues(rows.flatMap((row) => [row.primary_muscle, row.target_muscle])),
    equipment: sortedValues(rows.map((row) => row.equipment)),
    difficulty: sortedValues(rows.map((row) => row.difficulty)),
  };
}
