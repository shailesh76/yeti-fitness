/**
 * Pure derivation of displayed remaining/consumed and fill fraction for
 * CalorieRing. Kept dependency-free (no react-native imports) so it can be
 * unit-tested directly under Node/Vitest without pulling in RN's Flow-typed
 * source, which this repo's Vite-based test transform cannot parse.
 */
export interface CalorieRingInput {
  remaining?: number;
  consumed?: number;
  total: number;
}

export interface CalorieRingState {
  remaining: number;
  consumed: number;
  pct: number;
}

export function computeCalorieRingState({ total, remaining: remainingProp, consumed: consumedProp }: CalorieRingInput): CalorieRingState {
  const safeTotal = Math.max(total, 1); // never divide by zero/negative

  let remaining: number;
  let consumed: number;
  if (consumedProp !== undefined) {
    consumed = Math.max(consumedProp, 0); // reject negative consumed
    remaining = Math.max(total - consumed, 0);
  } else {
    remaining = Math.max(remainingProp ?? total, 0); // reject negative remaining
    consumed = Math.max(total - remaining, 0);
  }
  const pct = Math.min(consumed / safeTotal, 1);
  return { remaining, consumed, pct };
}
