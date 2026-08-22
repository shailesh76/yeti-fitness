export const CORE_MEAL_TYPES = [
  { key: 'BREAKFAST', title: 'Breakfast', icon: 'sunny-outline' },
  { key: 'LUNCH', title: 'Lunch', icon: 'restaurant-outline' },
  { key: 'DINNER', title: 'Dinner', icon: 'moon-outline' },
  { key: 'SNACK', title: 'Snacks', icon: 'nutrition-outline' },
] as const;

const OPTIONAL_MEAL_TYPES = [
  { key: 'PRE_WORKOUT', title: 'Pre-Workout', icon: 'barbell-outline' },
  { key: 'POST_WORKOUT', title: 'Post-Workout', icon: 'flash-outline' },
] as const;

export function normalizeMealType(value?: string): string {
  const normalized = (value || '').toUpperCase().trim();
  if (normalized.startsWith('PRE')) return 'PRE_WORKOUT';
  if (normalized.startsWith('POST')) return 'POST_WORKOUT';
  if (normalized.startsWith('SNACK')) return 'SNACK';
  if (normalized.startsWith('BREAK')) return 'BREAKFAST';
  if (normalized.startsWith('LUNCH')) return 'LUNCH';
  if (normalized.startsWith('DINNER')) return 'DINNER';
  return normalized || 'SNACK';
}

export interface GroupableMealLog {
  athlete_id?: string;
  meal_type: string;
  servings: number;
  food?: { name?: string; calories?: number };
}

export function restoreMealLogsForUser<T extends GroupableMealLog>(logs: T[], userId: string): T[] {
  if (!Array.isArray(logs) || !userId) return [];
  return logs
    .filter((log) => log.athlete_id === userId)
    .map((log) => ({ ...log, meal_type: normalizeMealType(log.meal_type) }));
}

export function buildMealGroups<T extends GroupableMealLog>(logs: T[]) {
  const build = (meal: { key: string; title: string; icon: string }) => {
    const groupedLogs = logs.filter((log) => normalizeMealType(log.meal_type) === meal.key);
    return {
      ...meal,
      logs: groupedLogs,
      kcal: groupedLogs.reduce((sum, log) => sum + Math.round((log.food?.calories || 0) * log.servings), 0),
      description: groupedLogs.map((log) => log.food?.name).filter(Boolean).join(', '),
    };
  };

  return [
    ...CORE_MEAL_TYPES.map(build),
    ...OPTIONAL_MEAL_TYPES.map(build).filter((group) => group.logs.length > 0),
  ];
}
