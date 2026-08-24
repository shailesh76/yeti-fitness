// Pure derivations behind the Home screen's three data cards (nutrition
// summary, Today's Plan, Yeti Readiness). Extracted out of home.tsx so each
// one is directly testable against real-shaped inputs — including the
// zero-data case, which is exactly what regressed: the screen shipped seeded
// demo values (1,980 kcal consumed / "Push Day" / 87% readiness) that a real
// empty account never overwrote, so a brand-new athlete saw a stranger's
// numbers presented as their own.
//
// Rule for everything in this file: derive from real rows or report absence.
// Never substitute a plausible-looking placeholder for missing data.

import type { NutritionTargets } from './nutritionUtils';
import { getScreenData, setScreenData, persistScreenData, hydrateScreenData } from './screenDataCache';

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const ZERO_MACROS: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export interface HomeSnapshot {
  athleteName: string;
  currentWeight: number | null;
  targetMacros: NutritionTargets | null;
  consumedMacros: Macros;
  todayPlan: TodaysPlanSummary | null;
  waterMl: number;
  steps: number;
  weeklyWorkoutCount: number;
  weeklyCalories: number;
  streakDays?: number;
  updatedAt: number;
}

export const EMPTY_HOME_SNAPSHOT: HomeSnapshot = {
  athleteName: 'Athlete',
  currentWeight: null,
  targetMacros: null,
  consumedMacros: ZERO_MACROS,
  todayPlan: null,
  waterMl: 0,
  steps: 0,
  weeklyWorkoutCount: 0,
  weeklyCalories: 0,
  updatedAt: 0,
};

export function homeCacheKey(userId: string): string {
  return `home:${userId}`;
}

export function getHomeSnapshot(userId: string): HomeSnapshot | null {
  const cached = getScreenData<HomeSnapshot>(homeCacheKey(userId));
  return cached || null;
}

export async function hydrateHomeSnapshot(userId: string): Promise<HomeSnapshot | null> {
  const memory = getHomeSnapshot(userId);
  if (memory) return memory;
  const hydrated = await hydrateScreenData<HomeSnapshot>(homeCacheKey(userId));
  return hydrated || null;
}

export function patchHomeSnapshot(userId: string, patch: Partial<HomeSnapshot>): HomeSnapshot {
  const current = getHomeSnapshot(userId) || { ...EMPTY_HOME_SNAPSHOT };
  const next: HomeSnapshot = { ...current, ...patch, updatedAt: Date.now() };
  void Promise.resolve(persistScreenData(homeCacheKey(userId), next)).catch(() => {});
  return next;
}

export async function persistHomeSnapshot(userId: string, snapshot: HomeSnapshot): Promise<HomeSnapshot> {
  await Promise.resolve(persistScreenData(homeCacheKey(userId), snapshot)).catch(() => {});
  return snapshot;
}

/**
 * Normalizes whatever the nutrition source returned into real numbers.
 *
 * The bug this replaces was a `todayMacros.calories > 0` guard around the
 * setState: a genuine zero-calorie day left the seeded demo macros on screen
 * forever. Zero IS a real, correct answer for "nothing logged today" and must
 * render as zero — so this never treats 0 as "no data".
 */
export function resolveConsumedMacros(source: Partial<Macros> | null | undefined): Macros {
  if (!source) return { ...ZERO_MACROS };
  const safe = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);
  return {
    calories: safe(source.calories),
    protein: safe(source.protein),
    carbs: safe(source.carbs),
    fat: safe(source.fat),
  };
}

export interface MealLogLike {
  logged_at: number;
  servings?: number;
  athlete_id?: string;
  food?: Partial<Macros> | null;
}

/**
 * Sums a day's meal logs into real consumed macros, for one athlete only.
 *
 * Needed because NutritionRepository.calculateDailyNutrition() reads
 * WatermelonDB, which doesn't exist on web — it returns zero there regardless
 * of what the athlete actually logged. useFoodStore keeps the same logs in
 * AsyncStorage for the web path, so the Home screen sums those instead of
 * showing a zero that would be just as untrue as the old demo numbers.
 *
 * `athleteId` is REQUIRED and matched strictly. useFoodStore is a plain
 * zustand store persisted under one global AsyncStorage key
 * ('@dude_meal_logs'), and signing out (profile.tsx handleSignOut) clears only
 * the Supabase session — neither the store nor that key is user-scoped or
 * reset. Summing it unfiltered would show the previous account's food on the
 * next account's Home. Logs that carry no athlete_id can't be attributed to
 * anyone, so they're excluded rather than assumed to belong to the current
 * athlete: under-reporting your own day is recoverable, showing someone
 * else's is not.
 */
export function sumMealLogsForDay(
  logs: MealLogLike[] | null | undefined,
  dayMs: number,
  athleteId: string,
): Macros {
  if (!Array.isArray(logs) || logs.length === 0 || !athleteId) return { ...ZERO_MACROS };

  const start = new Date(dayMs).setHours(0, 0, 0, 0);
  const end = new Date(dayMs).setHours(23, 59, 59, 999);

  const total = { ...ZERO_MACROS };
  for (const log of logs) {
    if (log?.athlete_id !== athleteId) continue;
    if (typeof log?.logged_at !== 'number' || log.logged_at < start || log.logged_at > end) continue;
    const servings = typeof log.servings === 'number' && log.servings > 0 ? log.servings : 1;
    const food = log.food;
    if (!food) continue;
    total.calories += (food.calories || 0) * servings;
    total.protein += (food.protein || 0) * servings;
    total.carbs += (food.carbs || 0) * servings;
    total.fat += (food.fat || 0) * servings;
  }

  return {
    calories: Math.round(total.calories),
    protein: Math.round(total.protein),
    carbs: Math.round(total.carbs),
    fat: Math.round(total.fat),
  };
}

/** Whichever source actually has logged data — never silently prefers a zero
 * over a real total, in either direction, since either source can be the empty
 * one depending on platform (local DB on native, AsyncStorage on web). */
export function pickRicherMacros(a: Macros, b: Macros): Macros {
  return b.calories > a.calories ? b : a;
}

export interface PlanExerciseLike {
  sets?: number | string | null;
  exercise?: { muscle_group?: string | null; primary_muscle?: string | null; target_muscle?: string | null } | null;
}

export interface PlanLike {
  id?: string;
  plan_day_id?: string;
  assignment_id?: string;
  name?: string | null;
  days?: { id?: string; exercises?: PlanExerciseLike[] | null }[] | null;
  workout_plan_exercises?: PlanExerciseLike[] | null;
}

export interface TodaysPlanSummary {
  /** 'session' = an in-progress workout to resume; 'template' = the athlete's
   * most recent saved plan, offered as the obvious thing to start. */
  kind: 'session' | 'template';
  sessionId: string | null;
  name: string;
  /** Real muscle groups from the plan's own exercises — '' when the rows carry
   * no muscle data, so the caller renders nothing rather than a made-up split. */
  muscleSummary: string;
  exerciseCount: number;
  setCount: number;
}

function parseSets(value: number | string | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
  if (typeof value === 'string') {
    const n = parseInt(value, 10);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return 0;
}

/** Muscle groups actually referenced by the plan's exercises, in first-seen
 * order, capped at 3 — same derivation the Workouts screen already uses. */
export function planMuscleSummary(plan: PlanLike | null | undefined): string {
  const groups = new Set<string>();
  for (const day of plan?.days || []) {
    for (const ex of day?.exercises || []) {
      const g = ex?.exercise?.muscle_group || ex?.exercise?.primary_muscle || ex?.exercise?.target_muscle;
      if (g) groups.add(g);
    }
  }
  for (const ex of plan?.workout_plan_exercises || []) {
    const g = ex?.exercise?.muscle_group || ex?.exercise?.primary_muscle || ex?.exercise?.target_muscle;
    if (g) groups.add(g);
  }
  return Array.from(groups).slice(0, 3).join(' · ');
}

export function planExerciseCount(plan: PlanLike | null | undefined): number {
  let count = 0;
  for (const day of plan?.days || []) count += (day?.exercises || []).length;
  if (plan?.workout_plan_exercises) count += plan.workout_plan_exercises.length;
  return count;
}

export function planSetCount(plan: PlanLike | null | undefined): number {
  let count = 0;
  for (const day of plan?.days || []) {
    for (const ex of day?.exercises || []) count += parseSets(ex?.sets);
  }
  for (const ex of plan?.workout_plan_exercises || []) {
    count += parseSets(ex?.sets);
  }
  return count;
}

export interface ActiveSessionLike {
  id: string;
  name?: string | null;
}

/**
 * What the Today's Plan card should show, or null when the athlete genuinely
 * has nothing — an in-progress session wins over a saved template, and a
 * brand-new account gets null so the caller can render an honest empty state
 * instead of the old hardcoded "Push Day / Chest, Shoulders, Triceps / 75 min".
 *
 * Every field is a countable fact from the plan's own rows. There is
 * deliberately no duration estimate: nothing in the schema records how long a
 * plan takes, and inventing one from sets x rest would be the same class of
 * fabrication as the "75 min" it replaces.
 */
export function buildTodaysPlan(input: {
  activeSession?: ActiveSessionLike | null;
  plans?: PlanLike[] | null;
  completedPlanDayIds?: Set<string> | null;
}): TodaysPlanSummary | null {
  const { activeSession, plans, completedPlanDayIds } = input;

  if (activeSession?.id) {
    // An active session carries no exercise rows here (it's a live log, not a
    // template), so counts stay 0 and the caller omits the meta row rather
    // than showing zeros that read as "this workout has no exercises".
    const matching = (plans || []).find((p) => p?.name && p.name === activeSession.name) || null;
    return {
      kind: 'session',
      sessionId: activeSession.id,
      name: activeSession.name?.trim() || 'Workout in progress',
      muscleSummary: planMuscleSummary(matching),
      exerciseCount: planExerciseCount(matching),
      setCount: planSetCount(matching),
    };
  }

  // Filter out plans whose plan_day_id is already completed today
  const candidatePlans = (plans || []).filter((p) => {
    if (!p) return false;
    if (completedPlanDayIds && p.plan_day_id && completedPlanDayIds.has(p.plan_day_id)) {
      return false;
    }
    return planExerciseCount(p) > 0 || !!p.name;
  });

  const plan = candidatePlans[0] || null;
  if (!plan) return null;

  return {
    kind: 'template',
    sessionId: null,
    name: plan.name?.trim() || 'Untitled Plan',
    muscleSummary: planMuscleSummary(plan),
    exerciseCount: planExerciseCount(plan),
    setCount: planSetCount(plan),
  };
}

export type ReadinessState =
  | { available: false }
  | { available: true; score: number; delta: number | null; label: string; sub: string; tone: 'ready' | 'moderate' | 'recover' };

/**
 * Yeti Readiness, or an explicit "can't compute it".
 *
 * Nothing in the app currently produces a real readiness score — the screen
 * was rendering a hardcoded 87 with a hardcoded "+7 pts this week" (87 minus a
 * hardcoded previous 80) for every athlete, on every load, forever. Rather
 * than invent a formula out of the data that happens to be lying around, this
 * reports unavailable until a genuine source exists, and the card says so.
 */
export function describeReadiness(score: number | null | undefined, previousScore?: number | null): ReadinessState {
  if (typeof score !== 'number' || !Number.isFinite(score)) return { available: false };

  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const delta =
    typeof previousScore === 'number' && Number.isFinite(previousScore)
      ? clamped - Math.round(previousScore)
      : null;

  if (clamped < 60) {
    return { available: true, score: clamped, delta, label: 'Recovery Needed', sub: 'Consider an easier session today.', tone: 'recover' };
  }
  if (clamped < 80) {
    return { available: true, score: clamped, delta, label: 'Getting There', sub: 'Moderate intensity recommended.', tone: 'moderate' };
  }
  return { available: true, score: clamped, delta, label: 'Fully Ready', sub: "You're primed to perform!", tone: 'ready' };
}
