import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('workout sync live schema contract', () => {
  it('does not push aspirational workout columns', () => {
    const source = fs.readFileSync('supabase/functions/sync-push/index.ts', 'utf8');
    const workoutBlock = source.slice(source.indexOf('// 1. Workout Sessions'), source.indexOf('// 3. Meal Logs'));
    expect(workoutBlock).not.toMatch(/progression_suggestion\s*:/);
    expect(workoutBlock).not.toMatch(/weight_kg\s*:/);
    expect(workoutBlock).not.toMatch(/exercise_name\s*:/);
    expect(workoutBlock).toMatch(/weight:/);
    expect(workoutBlock).toMatch(/plan_exercise_id:/);
  });
});
