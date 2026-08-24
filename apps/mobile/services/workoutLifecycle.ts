export interface CompletedWorkoutLike {
  id: string;
  completed_at?: string | number | null;
  finished_at?: string | number | null;
  plan_day_id?: string | null;
}

export function completedPlanDayIds(history: CompletedWorkoutLike[]): Set<string> {
  return new Set(
    history
      .filter((session) => session.completed_at || session.finished_at)
      .map((session) => session.plan_day_id)
      .filter((id): id is string => Boolean(id)),
  );
}

export function workoutDaysInRange(
  history: CompletedWorkoutLike[],
  startInclusive: number,
  endExclusive: number,
): Set<string> {
  const days = new Set<string>();
  for (const session of history) {
    const raw = session.completed_at || session.finished_at;
    if (!raw) continue;
    const timestamp = typeof raw === 'number' ? raw : new Date(raw).getTime();
    if (timestamp >= startInclusive && timestamp < endExclusive) {
      days.add(new Date(timestamp).toDateString());
    }
  }
  return days;
}

export function nextUncompletedPlanDay<T extends { plan_day_id?: string }>(
  plans: T[],
  completedIds: Set<string>,
): T | null {
  return plans.find((plan) => !plan.plan_day_id || !completedIds.has(plan.plan_day_id)) || null;
}

export function assignedPlanProgress<T extends { plan_day_id?: string }>(
  plans: T[],
  completedIds: Set<string>,
): { next: T | null; completed: T[]; isComplete: boolean } {
  const completed = plans.filter((plan) => Boolean(plan.plan_day_id && completedIds.has(plan.plan_day_id)));
  const next = nextUncompletedPlanDay(plans, completedIds);
  return { next, completed, isComplete: plans.length > 0 && next === null };
}
