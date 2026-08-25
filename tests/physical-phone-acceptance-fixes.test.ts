import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildTrendLinePath, calculateTrendPoints } from '../apps/mobile/services/progressChart';

describe('physical phone acceptance fixes', () => {
  it('centers a single weight measurement', () => {
    expect(calculateTrendPoints([75], 200, 120)).toEqual([{ x: 100, y: 60 }]);
  });

  it('centers a flat two-point trend', () => {
    expect(calculateTrendPoints([75, 75], 200, 120)).toEqual([
      { x: 8, y: 60 },
      { x: 192, y: 60 },
    ]);
  });

  it('preserves increasing and decreasing scale direction', () => {
    const increasing = calculateTrendPoints([70, 75, 80], 200, 120);
    const decreasing = calculateTrendPoints([80, 75, 70], 200, 120);
    expect(increasing.map((point) => point.y)).toEqual([110, 60, 10]);
    expect(decreasing.map((point) => point.y)).toEqual([10, 60, 110]);
    expect(buildTrendLinePath(increasing)).toBe('M 8,110 L 100,60 L 192,10');
  });

  it('hydrates assigned plans at authentication and before Home derives Today’s Plan', () => {
    const hydration = readFileSync('apps/mobile/services/authenticatedHydration.ts', 'utf8');
    const home = readFileSync('apps/mobile/app/home.tsx', 'utf8');
    expect(hydration).toContain('useWorkoutStore.getState().syncWorkoutPlans(userId)');
    expect(hydration).toContain('useLogStore.getState().fetchLogsHistory(userId)');
    expect(home).toMatch(/Promise\.all\(\[\s*useWorkoutStore\.getState\(\)\.syncWorkoutPlans\(userId\)/);
  });

  it('keeps Workout and Strength as distinct section predicates', () => {
    const source = readFileSync('apps/mobile/app/analytics.tsx', 'utf8');
    expect(source).toContain("const showWorkoutCards = activeTab === 'overview' || activeTab === 'workout'");
    expect(source).toContain("const showStrengthCards = activeTab === 'overview' || activeTab === 'strength'");
    expect(source).toContain('tabsRef.current?.scrollTo');
  });

  it('shows nutrition skeletons only while loading and then offers setup', () => {
    const source = readFileSync('apps/mobile/app/home.tsx', 'utf8');
    expect(source.match(/NutritionTargetsEmptyCard/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('Set Nutrition Targets');
    expect(source.match(/nutritionCardState === 'loading'/g)?.length).toBe(2);
  });
});
