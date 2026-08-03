import { describe, it, expect } from 'vitest';
import { buildCoachSystemPrompt } from '../supabase/functions/_shared/ai/coachPrompt.ts';

describe('AI Coach Context Selection Matrix Isolation', () => {
  it('1. app_navigation context contains zero private profile/injury/nutrition data', () => {
    const routeInfo = 'YETI APP NAVIGATION ALLOWLIST DIRECTORY:\n- Screen: Rest Timer (Route: /workouts/rest-timer) — Rest timer settings';
    const prompt = buildCoachSystemPrompt({
      intent: 'app_navigation',
      context: routeInfo,
      memoryCard: '(No stored coach memory yet.)',
    });

    expect(prompt).toContain('/workouts/rest-timer');
    expect(prompt).not.toContain('weight_kg');
    expect(prompt).not.toContain('daily_calorie_target');
    expect(prompt).not.toContain('KNOWN INJURIES');
  });

  it('2. general_chat context contains zero private profile/injury/nutrition data', () => {
    const prompt = buildCoachSystemPrompt({
      intent: 'general_chat',
      context: '(no private context loaded)',
      memoryCard: '(No stored coach memory yet.)',
    });

    expect(prompt).toContain('(no private context loaded)');
    expect(prompt).not.toContain('daily_calorie_target');
    expect(prompt).not.toContain('daily_protein_target');
    expect(prompt).not.toContain('KNOWN INJURIES');
  });

  it('3. exercise_substitution context contains only target exercise, available equipment, and relevant joint restrictions', () => {
    const subContext = 'SOURCE EXERCISE: Barbell Bench Press\nUSER AVAILABLE EQUIPMENT: Dumbbell\nACTIVE INJURY CONSIDERATION: Wrist sprain';
    const prompt = buildCoachSystemPrompt({
      intent: 'exercise_substitution',
      context: subContext,
    });

    expect(prompt).toContain('SOURCE EXERCISE: Barbell Bench Press');
    expect(prompt).toContain('USER AVAILABLE EQUIPMENT: Dumbbell');
    expect(prompt).toContain('ACTIVE INJURY CONSIDERATION: Wrist sprain');
    expect(prompt).not.toContain('daily_calorie_target');
  });
});
