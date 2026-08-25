// Pure, deterministic derivations behind the Progress screen's five tabs.
//
// Hard rules (enforced by tests/progress-analytics.test.ts):
//   - No React / expo / store / network imports. Inputs come in as plain
//     already-loaded arrays; nothing here fetches or reads global state.
//   - No mutation of inputs. Every function returns fresh objects.
//   - null-safe + NaN-safe: malformed rows are skipped, never counted as zero.
//   - Timezone-safe: all day grouping uses the device's LOCAL calendar day
//     (Y/M/D), matching the existing `new Date(ms).toDateString()` grouping in
//     analytics.tsx and homeSummary.
//   - Never fabricate values. Zero real data → a clean empty shape, not a
//     plausible-looking placeholder. (Same honesty rule as homeSummary.)
//
// The Progress screen loads workout history, meal logs, measurements, PRs and
// nutrition targets ONCE, then feeds them here via useMemo — one loaded dataset
// → many derived cards, no per-card queries.

import { currentPersonalRecords, isPlausiblePersonalRecord } from './personalRecordPresentation';
import { buildDailySeries, type DailyPoint } from './progressChart';

// ─── Tab → section composition ───────────────────────────────────────────────
// The single source of truth for which sections each tab renders. The screen is
// driven by this map, so a tab can never silently borrow another tab's tree
// (the Body-shows-Overview bug). Tested directly.
export type ProgressTabKey = 'overview' | 'workout' | 'nutrition' | 'body' | 'strength';

export type ProgressSection =
  | 'score' // Yeti Score (activity-derived)
  | 'weeklySnapshot' // weekly workout snapshot (overview only)
  | 'weightTrendPreview' // compact weight trend (overview only)
  | 'strengthSummary' // PR count + top PRs (overview only)
  | 'nutritionSummary' // calorie/protein averages (overview only)
  | 'workoutStats' // workout stat grid + volume trend + recent sessions
  | 'consistency' // this-week training-day calendar
  | 'nutritionStats' // averages, vs-target, logging consistency, trends, diary CTA
  | 'bodyStats' // weight, weight change, BMI, body fat, circumferences
  | 'bodyMeasurements' // recent measurements list + log-weight CTA
  | 'strengthStats'; // current PRs, recent PRs, PR history by exercise

export const PROGRESS_TAB_SECTIONS: Record<ProgressTabKey, ProgressSection[]> = {
  overview: ['score', 'weeklySnapshot', 'weightTrendPreview', 'strengthSummary', 'nutritionSummary'],
  workout: ['workoutStats', 'consistency'],
  nutrition: ['nutritionStats'],
  body: ['bodyStats', 'bodyMeasurements'],
  strength: ['strengthStats'],
};

export function sectionsForTab(tab: ProgressTabKey): ProgressSection[] {
  return PROGRESS_TAB_SECTIONS[tab] ? [...PROGRESS_TAB_SECTIONS[tab]] : [];
}

// ─── Shared numeric / date guards ──────────────────────────────────────────────
const DAY_MS = 864e5;

/** Finite number or null (never NaN/Infinity). Strings are coerced. */
function finite(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Finite and strictly positive, else null. */
function positive(value: unknown): number | null {
  const n = finite(value);
  return n != null && n > 0 ? n : null;
}

/** ISO string or epoch-ms → epoch ms, or null when unparseable. */
function toMs(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value) {
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

function dateLabel(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function round(n: number, dp = 0): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

/** Monday-00:00 (local) of the week containing nowMs — matches analytics.tsx. */
function startOfWeekMs(nowMs: number): number {
  const d = new Date(nowMs);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

function sameLocalMonth(ms: number, nowMs: number): boolean {
  const a = new Date(ms);
  const b = new Date(nowMs);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function localDayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export interface RangeOptions {
  /** "Now" in epoch ms. Pass explicitly for determinism; defaults to Date.now(). */
  nowMs?: number;
  /** Selected range window in days (7 / 30 / 90 / 180). Defaults to 30. */
  rangeDays?: number;
}

function resolveRange(opts: RangeOptions | undefined): { nowMs: number; rangeDays: number; cutoff: number } {
  const nowMs = opts?.nowMs ?? Date.now();
  const rangeDays = opts?.rangeDays && opts.rangeDays > 0 ? opts.rangeDays : 30;
  return { nowMs, rangeDays, cutoff: nowMs - rangeDays * DAY_MS };
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKOUT
// ═══════════════════════════════════════════════════════════════════════════
export interface WorkoutSetLike {
  reps?: number | string | null;
  weight?: number | string | null;
  completed?: boolean;
}
export interface WorkoutExerciseLike {
  sets?: WorkoutSetLike[] | null;
}
export interface WorkoutLogLike {
  id?: string;
  name?: string | null;
  completed_at?: string | number | null;
  total_volume?: number | null;
  duration_seconds?: number | null;
  exercises?: (WorkoutExerciseLike | null)[] | null;
}

export interface WorkoutSessionSummary {
  id: string;
  name: string;
  completedAtMs: number;
  dateLabel: string;
  volumeKg: number;
  durationMin: number | null;
  setCount: number;
}

export interface WorkoutAnalytics {
  hasData: boolean;
  workoutsThisWeek: number;
  workoutsThisMonth: number;
  /** count of completed sessions falling within the selected range window */
  inRangeSessionsCount: number;
  /** distinct local training days within the selected range */
  distinctTrainingDays: number;
  /** completed sets actually stored, within range */
  totalCompletedSets: number;
  /** training volume (kg) within range; per-session total_volume is authoritative when valid */
  totalVolumeKg: number;
  /** mean session duration (min) within range, excluding zero/invalid durations; null when none valid */
  avgDurationMin: number | null;
  /** last 5 completed sessions overall (most recent first) */
  recentSessions: WorkoutSessionSummary[];
  /** per-training-day volume within range (one point per day, no zero-fill) */
  volumeTrend: DailyPoint[];
  rangeDays: number;
}

/** Count of stored sets on a session (stored == completed; explicit false excluded). */
function sessionSetCount(session: WorkoutLogLike): number {
  let n = 0;
  for (const ex of session.exercises || []) {
    for (const set of ex?.sets || []) {
      if (set && set.completed !== false) n += 1;
    }
  }
  if (n === 0 && Array.isArray((session as any).sets)) {
    for (const set of (session as any).sets) {
      if (set && set.completed !== false) n += 1;
    }
  }
  return n;
}

/** total_volume when present & valid (>0), else recomputed from stored sets. */
function sessionVolumeKg(session: WorkoutLogLike): number {
  const authoritative = finite(session.total_volume);
  if (authoritative != null && authoritative > 0) return authoritative;
  let v = 0;
  for (const ex of session.exercises || []) {
    for (const set of ex?.sets || []) {
      if (!set || set.completed === false) continue;
      const w = finite(set.weight) ?? 0;
      const r = finite(set.reps) ?? 0;
      if (w > 0 && r > 0) v += w * r;
    }
  }
  if (v === 0 && Array.isArray((session as any).sets)) {
    for (const set of (session as any).sets) {
      if (!set || set.completed === false) continue;
      const w = finite(set.weight) ?? 0;
      const r = finite(set.reps) ?? 0;
      if (w > 0 && r > 0) v += w * r;
    }
  }
  return v;
}

export function deriveWorkoutAnalytics(
  history: (WorkoutLogLike | null)[] | null | undefined,
  opts?: RangeOptions,
): WorkoutAnalytics {
  const { nowMs, rangeDays, cutoff } = resolveRange(opts);
  const empty: WorkoutAnalytics = {
    hasData: false,
    workoutsThisWeek: 0,
    workoutsThisMonth: 0,
    inRangeSessionsCount: 0,
    distinctTrainingDays: 0,
    totalCompletedSets: 0,
    totalVolumeKg: 0,
    avgDurationMin: null,
    recentSessions: [],
    volumeTrend: [],
    rangeDays,
  };
  if (!Array.isArray(history) || history.length === 0) return empty;

  const weekStart = startOfWeekMs(nowMs);
  const sessions = history
    .filter((s): s is WorkoutLogLike => !!s)
    .map((s) => ({ session: s, ms: toMs(s.completed_at) }))
    .filter((x): x is { session: WorkoutLogLike; ms: number } => x.ms != null)
    .sort((a, b) => b.ms - a.ms);

  if (sessions.length === 0) return empty;

  let workoutsThisWeek = 0;
  let workoutsThisMonth = 0;
  let inRangeSessionsCount = 0;
  const trainingDays = new Set<string>();
  let totalCompletedSets = 0;
  let totalVolumeKg = 0;
  let durationSum = 0;
  let durationCount = 0;
  const volumeEntries: Array<{ t: number; value: number }> = [];

  for (const { session, ms } of sessions) {
    if (ms >= weekStart && ms <= nowMs) workoutsThisWeek += 1;
    if (sameLocalMonth(ms, nowMs)) workoutsThisMonth += 1;

    if (ms >= cutoff && ms <= nowMs) {
      inRangeSessionsCount += 1;
      trainingDays.add(localDayKey(ms));
      totalCompletedSets += sessionSetCount(session);
      const vol = sessionVolumeKg(session);
      totalVolumeKg += vol;
      volumeEntries.push({ t: ms, value: vol });
      const dur = positive(session.duration_seconds);
      if (dur != null) {
        durationSum += dur;
        durationCount += 1;
      }
    }
  }

  const recentSessions: WorkoutSessionSummary[] = sessions.slice(0, 5).map(({ session, ms }) => ({
    id: session.id || `session_${ms}`,
    name: (session.name && session.name.trim()) || 'Workout Session',
    completedAtMs: ms,
    dateLabel: dateLabel(ms),
    volumeKg: round(sessionVolumeKg(session), 1),
    durationMin: positive(session.duration_seconds) != null ? Math.round((session.duration_seconds as number) / 60) : null,
    setCount: sessionSetCount(session),
  }));

  return {
    hasData: true,
    workoutsThisWeek,
    workoutsThisMonth,
    inRangeSessionsCount,
    distinctTrainingDays: trainingDays.size,
    totalCompletedSets,
    totalVolumeKg: round(totalVolumeKg, 1),
    avgDurationMin: durationCount > 0 ? Math.round(durationSum / durationCount / 60) : null,
    recentSessions,
    volumeTrend: buildDailySeries(volumeEntries, { rangeDays, nowMs, aggregate: 'sum' }),
    rangeDays,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// NUTRITION
// ═══════════════════════════════════════════════════════════════════════════
export interface NutritionFoodLike {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}
export interface NutritionMealLogLike {
  logged_at?: number | string | null;
  servings?: number | null;
  athlete_id?: string;
  food?: NutritionFoodLike | null;
}
export interface NutritionTargetsLike {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export interface VsTarget {
  avg: number;
  target: number;
  /** avg / target as a percentage (rounded, not clamped — over-target is real). */
  pct: number;
}

export interface NutritionAnalytics {
  hasData: boolean;
  /** distinct local days with ≥1 valid log, within range — the average denominator */
  loggedDays: number;
  /** calendar days in the selected range — the logging-consistency denominator */
  calendarDays: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFats: number;
  hasTargets: boolean;
  caloriesVsTarget: VsTarget | null;
  proteinVsTarget: VsTarget | null;
  /** loggedDays / calendarDays as a percentage, clamped to [0,100] */
  loggingConsistencyPct: number;
  calorieTrend: DailyPoint[];
  proteinTrend: DailyPoint[];
  rangeDays: number;
}

export interface NutritionOptions extends RangeOptions {
  /** When provided, only this athlete's logs count (cross-account isolation). */
  athleteId?: string;
}

export function deriveNutritionAnalytics(
  mealLogs: (NutritionMealLogLike | null)[] | null | undefined,
  targets: NutritionTargetsLike | null | undefined,
  opts?: NutritionOptions,
): NutritionAnalytics {
  const { nowMs, rangeDays, cutoff } = resolveRange(opts);
  const athleteId = opts?.athleteId;

  const targetCalories = positive(targets?.calories);
  const targetProtein = positive(targets?.protein);
  const hasTargets = targetCalories != null || targetProtein != null;

  const base: NutritionAnalytics = {
    hasData: false,
    loggedDays: 0,
    calendarDays: rangeDays,
    avgCalories: 0,
    avgProtein: 0,
    avgCarbs: 0,
    avgFats: 0,
    hasTargets,
    caloriesVsTarget: null,
    proteinVsTarget: null,
    loggingConsistencyPct: 0,
    calorieTrend: [],
    proteinTrend: [],
    rangeDays,
  };
  if (!Array.isArray(mealLogs) || mealLogs.length === 0) return base;

  const days = new Set<string>();
  let sumCal = 0;
  let sumP = 0;
  let sumC = 0;
  let sumF = 0;
  const calEntries: Array<{ t: number; value: number }> = [];
  const proteinEntries: Array<{ t: number; value: number }> = [];

  for (const log of mealLogs) {
    if (!log) continue;
    if (athleteId && log.athlete_id !== athleteId) continue;
    const ms = toMs(log.logged_at);
    if (ms == null || ms < cutoff || ms > nowMs) continue;
    const food = log.food;
    if (!food) continue;
    const servings = positive(log.servings) ?? 1;
    const cal = (finite(food.calories) ?? 0) * servings;
    const p = (finite(food.protein) ?? 0) * servings;
    const c = (finite(food.carbs) ?? 0) * servings;
    const f = (finite(food.fat) ?? 0) * servings;

    days.add(localDayKey(ms));
    sumCal += cal;
    sumP += p;
    sumC += c;
    sumF += f;
    calEntries.push({ t: ms, value: cal });
    proteinEntries.push({ t: ms, value: p });
  }

  const loggedDays = days.size;
  if (loggedDays === 0) return base;

  const avgCalories = Math.round(sumCal / loggedDays);
  const avgProtein = Math.round(sumP / loggedDays);
  const avgCarbs = Math.round(sumC / loggedDays);
  const avgFats = Math.round(sumF / loggedDays);

  return {
    hasData: true,
    loggedDays,
    calendarDays: rangeDays,
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFats,
    hasTargets,
    caloriesVsTarget:
      targetCalories != null
        ? { avg: avgCalories, target: targetCalories, pct: Math.round((avgCalories / targetCalories) * 100) }
        : null,
    proteinVsTarget:
      targetProtein != null
        ? { avg: avgProtein, target: targetProtein, pct: Math.round((avgProtein / targetProtein) * 100) }
        : null,
    loggingConsistencyPct: Math.min(100, Math.round((loggedDays / rangeDays) * 100)),
    calorieTrend: buildDailySeries(calEntries, { rangeDays, nowMs, aggregate: 'sum' }),
    proteinTrend: buildDailySeries(proteinEntries, { rangeDays, nowMs, aggregate: 'sum' }),
    rangeDays,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BODY
// ═══════════════════════════════════════════════════════════════════════════
export interface MeasurementLike {
  weight_kg?: number | null;
  body_fat_pct?: number | null;
  chest_cm?: number | null;
  waist_cm?: number | null;
  hips_cm?: number | null;
  arms_cm?: number | null;
  legs_cm?: number | null;
  logged_at?: number | string | null;
}
export interface BodyProfileLike {
  weight_kg?: number | string | null;
  height_cm?: number | string | null;
}

export interface Circumference {
  key: string;
  label: string;
  valueCm: number;
}
export interface BodyMeasurementSummary {
  loggedAtMs: number;
  dateLabel: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  circumferences: Circumference[];
}

export interface BodyAnalytics {
  hasData: boolean;
  currentWeightKg: number | null;
  /** per-day weight within range (latest weigh-in per day, ascending) */
  weightTrend: DailyPoint[];
  /** last − first weight across the in-range series; null when < 2 points */
  weightChangeKg: number | null;
  bmi: number | null;
  /** only when actually logged */
  bodyFatPct: number | null;
  /** latest logged value for each circumference actually present */
  circumferences: Circumference[];
  recentMeasurements: BodyMeasurementSummary[];
  rangeDays: number;
}

const CIRC_FIELDS: Array<{ field: keyof MeasurementLike; key: string; label: string }> = [
  { field: 'waist_cm', key: 'waist', label: 'Waist' },
  { field: 'chest_cm', key: 'chest', label: 'Chest' },
  { field: 'arms_cm', key: 'arms', label: 'Arms' },
  { field: 'hips_cm', key: 'hips', label: 'Hips' },
  { field: 'legs_cm', key: 'legs', label: 'Legs' },
];

function measurementCircumferences(m: MeasurementLike): Circumference[] {
  const out: Circumference[] = [];
  for (const { field, key, label } of CIRC_FIELDS) {
    const v = positive(m[field]);
    if (v != null) out.push({ key, label, valueCm: round(v, 1) });
  }
  return out;
}

export function deriveBodyAnalytics(
  measurements: (MeasurementLike | null)[] | null | undefined,
  profile: BodyProfileLike | null | undefined,
  opts?: RangeOptions,
): BodyAnalytics {
  const { nowMs, rangeDays, cutoff } = resolveRange(opts);
  const base: BodyAnalytics = {
    hasData: false,
    currentWeightKg: null,
    weightTrend: [],
    weightChangeKg: null,
    bmi: null,
    bodyFatPct: null,
    circumferences: [],
    recentMeasurements: [],
    rangeDays,
  };

  const rows = (Array.isArray(measurements) ? measurements : [])
    .filter((m): m is MeasurementLike => !!m)
    .map((m) => ({ m, ms: toMs(m.logged_at) }))
    .filter((x): x is { m: MeasurementLike; ms: number } => x.ms != null)
    .sort((a, b) => b.ms - a.ms); // newest first

  const profileWeight = positive(profile?.weight_kg);
  const height = positive(profile?.height_cm);

  // Current weight: latest measured weight, else profile weight.
  const latestWeighed = rows.find((r) => positive(r.m.weight_kg) != null);
  const currentWeightKg = latestWeighed ? (positive(latestWeighed.m.weight_kg) as number) : profileWeight;

  if (rows.length === 0 && currentWeightKg == null) return base;

  // Weight trend within range (one weight per day, latest weigh-in wins).
  const weightEntries = rows
    .filter((r) => positive(r.m.weight_kg) != null && r.ms >= cutoff && r.ms <= nowMs)
    .map((r) => ({ t: r.ms, value: positive(r.m.weight_kg) as number }));
  const weightTrend = buildDailySeries(weightEntries, { rangeDays, nowMs, aggregate: 'last' });
  const weightChangeKg =
    weightTrend.length >= 2 ? round(weightTrend[weightTrend.length - 1].value - weightTrend[0].value, 1) : null;

  // BMI from current weight + profile height.
  let bmi: number | null = null;
  if (currentWeightKg != null && height != null) {
    const m = height / 100;
    const raw = currentWeightKg / (m * m);
    if (Number.isFinite(raw)) bmi = round(raw, 1);
  }

  // Body fat: latest actually-logged value only.
  const latestBf = rows.find((r) => positive(r.m.body_fat_pct) != null);
  const bodyFatPct = latestBf ? round(positive(latestBf.m.body_fat_pct) as number, 1) : null;

  // Latest logged value for each circumference present anywhere.
  const circumferences: Circumference[] = [];
  for (const { field, key, label } of CIRC_FIELDS) {
    const hit = rows.find((r) => positive(r.m[field]) != null);
    if (hit) circumferences.push({ key, label, valueCm: round(positive(hit.m[field]) as number, 1) });
  }

  const recentMeasurements: BodyMeasurementSummary[] = rows.slice(0, 5).map(({ m, ms }) => ({
    loggedAtMs: ms,
    dateLabel: dateLabel(ms),
    weightKg: positive(m.weight_kg) != null ? round(positive(m.weight_kg) as number, 1) : null,
    bodyFatPct: positive(m.body_fat_pct) != null ? round(positive(m.body_fat_pct) as number, 1) : null,
    circumferences: measurementCircumferences(m),
  }));

  return {
    hasData: rows.length > 0 || currentWeightKg != null,
    currentWeightKg: currentWeightKg != null ? round(currentWeightKg, 1) : null,
    weightTrend,
    weightChangeKg,
    bmi,
    bodyFatPct,
    circumferences,
    recentMeasurements,
    rangeDays,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// STRENGTH
// ═══════════════════════════════════════════════════════════════════════════
export interface PrLike {
  id?: string;
  exercise_id?: string;
  record_type?: string;
  value?: number | null;
  achieved_at?: string | number | null;
  exercises?: {
    name?: string | null;
    category?: string | null;
    equipment?: string | null;
    muscle_group?: string | null;
  } | null;
}

export interface StrengthPrSummary {
  id?: string;
  exerciseId: string;
  exerciseName: string;
  recordType: string;
  value: number;
  unit: 'kg' | 'reps';
  achievedAtMs: number;
  dateLabel: string;
}

export interface StrengthAnalytics {
  hasData: boolean;
  /** count of current unique PRs (exercise_id + record_type) */
  currentPrCount: number;
  currentPrs: StrengthPrSummary[];
  /** current PRs whose record was set within the last 30 days */
  recentPrs: StrengthPrSummary[];
  /** exercises with ≥2 historical PR rows, records ascending */
  prHistoryByExercise: Array<{ exerciseId: string; exerciseName: string; records: StrengthPrSummary[] }>;
}

function prUnit(recordType: string): 'kg' | 'reps' {
  return recordType.toLowerCase().includes('rep') ? 'reps' : 'kg';
}

export { isPlausiblePersonalRecord } from './personalRecordPresentation';

function toPrSummary(pr: PrLike, ms: number): StrengthPrSummary {
  const recordType = String(pr.record_type || 'PR');
  return {
    id: pr.id,
    exerciseId: String(pr.exercise_id),
    exerciseName: (pr.exercises?.name && String(pr.exercises.name).trim()) || 'Exercise',
    recordType,
    value: finite(pr.value) as number,
    unit: prUnit(recordType),
    achievedAtMs: ms,
    dateLabel: dateLabel(ms),
  };
}

export function deriveStrengthAnalytics(
  prs: (PrLike | null)[] | null | undefined,
  opts?: RangeOptions,
): StrengthAnalytics {
  const nowMs = opts?.nowMs ?? Date.now();
  const base: StrengthAnalytics = {
    hasData: false,
    currentPrCount: 0,
    currentPrs: [],
    recentPrs: [],
    prHistoryByExercise: [],
  };
  if (!Array.isArray(prs) || prs.length === 0) return base;

  // Keep only well-formed rows; filter out implausible test artifacts.
  const valid = prs.filter(
    (p): p is PrLike =>
      !!p &&
      !!p.exercise_id &&
      !!p.record_type &&
      finite(p.value) != null &&
      toMs(p.achieved_at) != null &&
      isPlausiblePersonalRecord(p),
  );
  if (valid.length === 0) return base;

  // Current best per exercise + record_type (identical history counts once).
  const currents = currentPersonalRecords(
    valid.map((p) => ({ ...p, exercise_id: String(p.exercise_id), record_type: String(p.record_type), value: finite(p.value) as number, achieved_at: p.achieved_at as string | number })),
  );

  const currentPrs = currents
    .map((p) => toPrSummary(p, toMs(p.achieved_at) as number))
    .sort((a, b) => b.achievedAtMs - a.achievedAtMs);

  const thirtyDaysAgo = nowMs - 30 * DAY_MS;
  const recentPrs = currentPrs.filter((p) => p.achievedAtMs >= thirtyDaysAgo && p.achievedAtMs <= nowMs);

  // History grouped by exercise where ≥2 historical rows exist.
  const byExercise = new Map<string, StrengthPrSummary[]>();
  for (const p of valid) {
    const key = String(p.exercise_id);
    const summary = toPrSummary(p, toMs(p.achieved_at) as number);
    const list = byExercise.get(key) || [];
    list.push(summary);
    byExercise.set(key, list);
  }
  const prHistoryByExercise = Array.from(byExercise.entries())
    .filter(([, records]) => records.length >= 2)
    .map(([exerciseId, records]) => ({
      exerciseId,
      exerciseName: records[0].exerciseName,
      records: records.slice().sort((a, b) => a.achievedAtMs - b.achievedAtMs),
    }))
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));

  return {
    hasData: currentPrs.length > 0,
    currentPrCount: currentPrs.length,
    currentPrs,
    recentPrs,
    prHistoryByExercise,
  };
}
