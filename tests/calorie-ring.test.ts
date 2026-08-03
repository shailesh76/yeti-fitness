import { describe, it, expect } from 'vitest';
import { computeCalorieRingState } from '../apps/mobile/components/calorieRingMath';

describe('CalorieRing contract — computeCalorieRingState', () => {
  describe('primary contract: consumed + total (food-diary.tsx usage)', () => {
    it('0 / target — nothing consumed yet', () => {
      expect(computeCalorieRingState({ consumed: 0, total: 2400 })).toEqual({
        consumed: 0,
        remaining: 2400,
        pct: 0,
      });
    });

    it('partial progress — halfway to target', () => {
      expect(computeCalorieRingState({ consumed: 1200, total: 2400 })).toEqual({
        consumed: 1200,
        remaining: 1200,
        pct: 0.5,
      });
    });

    it('target reached exactly', () => {
      expect(computeCalorieRingState({ consumed: 2400, total: 2400 })).toEqual({
        consumed: 2400,
        remaining: 0,
        pct: 1,
      });
    });

    it('over target — ring caps at full, remaining floors at 0, consumed stays truthful', () => {
      const result = computeCalorieRingState({ consumed: 3000, total: 2400 });
      expect(result.pct).toBe(1);
      expect(result.remaining).toBe(0);
      expect(result.consumed).toBe(3000); // not silently clamped down — still accurate for callers that show it
    });

    it('invalid/zero total — no divide-by-zero, no NaN, no throw', () => {
      const result = computeCalorieRingState({ consumed: 500, total: 0 });
      expect(Number.isFinite(result.pct)).toBe(true);
      expect(result.pct).toBe(1);
      expect(result.remaining).toBe(0);
    });

    it('negative total — treated as zero-total (no crash, ring reads full)', () => {
      const result = computeCalorieRingState({ consumed: 500, total: -100 });
      expect(Number.isFinite(result.pct)).toBe(true);
      expect(result.pct).toBe(1);
    });

    it('negative consumed is clamped to 0, not displayed as a negative number', () => {
      expect(computeCalorieRingState({ consumed: -50, total: 2400 })).toEqual({
        consumed: 0,
        remaining: 2400,
        pct: 0,
      });
    });
  });

  describe('legacy contract: remaining + total (preserved for back-compat)', () => {
    it('derives consumed and pct from remaining exactly as before', () => {
      expect(computeCalorieRingState({ remaining: 900, total: 2400 })).toEqual({
        consumed: 1500,
        remaining: 900,
        pct: 0.625,
      });
    });

    it('negative remaining is clamped to 0, not displayed as a negative number', () => {
      const result = computeCalorieRingState({ remaining: -50, total: 2400 });
      expect(result.remaining).toBe(0);
      expect(result.consumed).toBe(2400);
      expect(result.pct).toBe(1);
    });
  });

  describe('neither consumed nor remaining provided', () => {
    it('defaults to an empty ring (0 consumed, full remaining) rather than crashing', () => {
      expect(computeCalorieRingState({ total: 2400 })).toEqual({
        consumed: 0,
        remaining: 2400,
        pct: 0,
      });
    });
  });
});
