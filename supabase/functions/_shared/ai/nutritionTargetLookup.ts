// Deterministic "what's my target" lookup. Pure module (Deno + vitest). Reads
// only already-stored profile values (the caller queries `profiles`) and
// formats an honest answer — NEVER computes or invents a target. If nothing
// is saved yet, says so plainly and offers to calculate one, rather than
// guessing a number.

export interface StoredNutritionTargets {
  calorieTarget: number | null;
  proteinTarget: number | null;
  carbTarget: number | null;
  fatTarget: number | null;
}

export type NutritionTargetAsk = 'protein' | 'calorie' | 'carb' | 'fat' | 'macro';

const TARGET_PATTERNS: [NutritionTargetAsk, RegExp][] = [
  ['protein', /\bprotein target|protein goal|how much protein should i eat\b/],
  ['calorie', /\bcalorie target|calorie goal|how many calories should i eat\b/],
  ['carb', /\bcarb(?:ohydrate)? target|carb goal\b/],
  ['fat', /\bfat target|fat goal\b/],
  ['macro', /\bmy macros\b|macro target|what are my macros\b/],
];

/** Which specific stored target (if any) the message is asking about. Returns null for anything else — this is a narrow, single-purpose lookup, not a general nutrition-intent classifier. */
export function detectNutritionTargetAsk(message: string): NutritionTargetAsk | null {
  const m = (message || '').toLowerCase();
  for (const [ask, pattern] of TARGET_PATTERNS) {
    if (pattern.test(m)) return ask;
  }
  return null;
}

function missingFallback(label: string): string {
  return `You don't currently have a saved ${label} target. I can calculate one after confirming your goal, body weight, activity level, and dietary preferences.`;
}

/** Formats an honest answer for a stored-target question. NEVER invents a value — a null target always produces the honest fallback, never a guess. */
export function describeNutritionTarget(targets: StoredNutritionTargets, ask: NutritionTargetAsk): { hasValue: boolean; text: string } {
  if (ask === 'protein') {
    return targets.proteinTarget == null
      ? { hasValue: false, text: missingFallback('protein') }
      : { hasValue: true, text: `Your current stored protein target is ${targets.proteinTarget}g per day.` };
  }
  if (ask === 'calorie') {
    return targets.calorieTarget == null
      ? { hasValue: false, text: missingFallback('calorie') }
      : { hasValue: true, text: `Your current stored calorie target is ${targets.calorieTarget} kcal per day.` };
  }
  if (ask === 'carb') {
    return targets.carbTarget == null
      ? { hasValue: false, text: missingFallback('carb') }
      : { hasValue: true, text: `Your current stored carb target is ${targets.carbTarget}g per day.` };
  }
  if (ask === 'fat') {
    return targets.fatTarget == null
      ? { hasValue: false, text: missingFallback('fat') }
      : { hasValue: true, text: `Your current stored fat target is ${targets.fatTarget}g per day.` };
  }
  // 'macro' — report whatever IS stored, and honestly flag whatever isn't.
  const have: string[] = [];
  const missing: string[] = [];
  if (targets.calorieTarget != null) have.push(`${targets.calorieTarget} kcal`); else missing.push('calorie');
  if (targets.proteinTarget != null) have.push(`${targets.proteinTarget}g protein`); else missing.push('protein');
  if (targets.carbTarget != null) have.push(`${targets.carbTarget}g carbs`); else missing.push('carb');
  if (targets.fatTarget != null) have.push(`${targets.fatTarget}g fat`); else missing.push('fat');
  if (have.length === 0) {
    return { hasValue: false, text: "You don't currently have any saved nutrition targets. I can calculate them after confirming your goal, body weight, activity level, and dietary preferences." };
  }
  let text = `Your current stored targets: ${have.join(', ')}.`;
  if (missing.length) text += ` (No saved ${missing.join('/')} target yet.)`;
  return { hasValue: have.length === 4, text };
}
