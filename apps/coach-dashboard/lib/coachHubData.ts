export type CoachClient = {
  id: string;
  name: string;
  dailyCalorieTarget: number | null;
  dailyProteinTarget: number | null;
  dailyCarbTarget: number | null;
  dailyFatTarget: number | null;
};

export type MealLogRow = {
  id: string;
  user_id: string;
  meal_type: string;
  servings: number | string | null;
  logged_at: string;
  food: { name?: string | null; calories?: number | null; protein?: number | null; carbs?: number | null; fat?: number | null } | null;
};

export type NutritionTotals = { calories: number; protein: number; carbs: number; fat: number };

export const DASHBOARD_TIME_ZONE = 'Australia/Sydney';

export function dashboardDateKey(date: Date | string | number, timeZone = DASHBOARD_TIME_ZONE): string {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(date));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function calendarMonthBounds(year: number, monthIndex: number): { startDate: string; endDate: string } {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);
  const localKey = (date: Date) => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  return { startDate: localKey(start), endDate: localKey(end) };
}

export function groupCompletedSessionsByDashboardDay(sessions: any[]): Record<string, number> {
  return sessions.filter((row) => row.completed_at).reduce<Record<string, number>>((map, row) => {
    const day = dashboardDateKey(row.started_at);
    map[day] = (map[day] || 0) + 1;
    return map;
  }, {});
}

export function aggregateNutrition(rows: MealLogRow[]): NutritionTotals {
  return rows.reduce<NutritionTotals>((totals, row) => {
    const servings = Number(row.servings) || 0;
    return {
      calories: totals.calories + (Number(row.food?.calories) || 0) * servings,
      protein: totals.protein + (Number(row.food?.protein) || 0) * servings,
      carbs: totals.carbs + (Number(row.food?.carbs) || 0) * servings,
      fat: totals.fat + (Number(row.food?.fat) || 0) * servings,
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
}

export function localDayBounds(date: string): { start: string; end: string } {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export type CalendarEvent = {
  id: string;
  athleteId: string;
  athleteName: string;
  title: string;
  date: string;
  kind: 'assignment' | 'completed' | 'in_progress';
};

export function buildCalendarEvents(
  assignments: any[],
  sessions: any[],
  clientNames: Map<string, string>,
): CalendarEvent[] {
  const assignmentEvents = assignments
    .filter((row) => row.start_date)
    .map((row) => ({
      id: `assignment-${row.id}`,
      athleteId: row.athlete_id,
      athleteName: clientNames.get(row.athlete_id) || 'Athlete',
      title: relationName(row.workout_plans) || 'Assigned plan',
      date: row.start_date,
      kind: 'assignment' as const,
    }));
  const sessionEvents = sessions.map((row) => ({
    id: `session-${row.id}`,
    athleteId: row.athlete_id,
    athleteName: clientNames.get(row.athlete_id) || 'Athlete',
    title: relationName(row.plan_days) || row.name || 'Workout session',
    date: row.started_at,
    kind: row.completed_at ? 'completed' as const : 'in_progress' as const,
  }));
  return [...assignmentEvents, ...sessionEvents].sort((a, b) => a.date.localeCompare(b.date));
}

export function relationName(value: any): string | null {
  if (Array.isArray(value)) return value[0]?.name || null;
  return value?.name || null;
}

export type AnalyticsMetrics = {
  activeAthletes: number;
  completedSessions: number;
  totalVolumeKg: number;
  averageDurationMinutes: number | null;
};

export function calculateAnalytics(clientCount: number, sessions: any[], sets: any[]): AnalyticsMetrics {
  const completed = sessions.filter((row) => Boolean(row.completed_at));
  const durations = completed.map((row) => Number(row.duration_seconds)).filter((value) => Number.isFinite(value) && value >= 0);
  const totalVolumeKg = sets.reduce((total, row) => {
    const weight = Number(row.weight);
    const reps = Number(row.reps);
    return total + (Number.isFinite(weight) && Number.isFinite(reps) && weight >= 0 && reps >= 0 ? weight * reps : 0);
  }, 0);
  return {
    activeAthletes: clientCount,
    completedSessions: completed.length,
    totalVolumeKg,
    averageDurationMinutes: durations.length
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length / 60)
      : null,
  };
}

export function activeTodaySessions(rows: any[], now = new Date()): any[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return rows.filter((row) => {
    const started = new Date(row.started_at);
    return !row.completed_at && started >= start && started < end;
  });
}
