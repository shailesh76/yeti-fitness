import { describe, it, expect } from 'vitest';
import { buildCoachMemoryCard, foldMemoryRows, mergeCoachMemory } from '../supabase/functions/_shared/ai/coachMemory.ts';
import { buildCoachSystemPrompt, COACH_PROMPT_VERSION } from '../supabase/functions/_shared/ai/coachPrompt.ts';
import { parseCoachResponse } from '../supabase/functions/_shared/ai/coachSchema.ts';

describe('Coach Memory — card building', () => {
  it('formats known fields and omits unknown ones (never fabricated)', () => {
    const card = buildCoachMemoryCard({
      goal: 'Lean Bulk', trainingSplit: 'Push / Pull / Legs',
      currentWeightKg: 71, targetWeightKg: 80,
      favouriteExercises: ['Incline Dumbbell Press', 'Barbell Row'],
      weakMuscleGroups: ['Upper Chest'], currentPlateau: 'Incline Press',
      currentInjury: 'Left Shoulder Irritation', nutrition: 'Vegetarian', recentMood: 'Motivated',
    });
    expect(card).toContain('Current Goal: Lean Bulk');
    expect(card).toContain('Training Split: Push / Pull / Legs');
    expect(card).toContain('Current Weight: 71 kg');
    expect(card).toContain('Target Weight: 80 kg');
    expect(card).toContain('Favourite Exercises: Incline Dumbbell Press, Barbell Row');
    expect(card).toContain('Current Injury: Left Shoulder Irritation');
    expect(card).toContain('Nutrition: Vegetarian');
  });

  it('omits fields we do not have', () => {
    const card = buildCoachMemoryCard({ goal: 'Lose Fat' });
    expect(card).toContain('Current Goal: Lose Fat');
    expect(card).not.toContain('Target Weight');
    expect(card).not.toContain('Injury');
  });

  it('returns a placeholder when nothing is known', () => {
    expect(buildCoachMemoryCard({})).toContain('No stored coach memory');
  });
});

describe('Coach Memory — folding ai_memory rows', () => {
  it('categorises injuries, nutrition, split, plateau, mood, prefs, weak points', () => {
    const m = foldMemoryRows([
      { category: 'injuries', memory_key: 'shoulder', memory_value: 'Left shoulder irritation' },
      { category: 'nutrition preferences', memory_key: 'diet', memory_value: 'Vegetarian' },
      { category: 'preferences', memory_key: 'training_split', memory_value: 'PPL' },
      { category: 'preferences', memory_key: 'plateau', memory_value: 'Incline Press' },
      { category: 'preferences', memory_key: 'mood', memory_value: 'Motivated' },
      { category: 'workout style', memory_key: 'favourite_lift', memory_value: 'Incline DB Press' },
      { category: 'preferences', memory_key: 'weak_point', memory_value: 'Upper chest' },
    ]);
    expect(m.currentInjury).toBe('Left shoulder irritation');
    expect(m.nutrition).toBe('Vegetarian');
    expect(m.trainingSplit).toBe('PPL');
    expect(m.currentPlateau).toBe('Incline Press');
    expect(m.recentMood).toBe('Motivated');
    expect(m.favouriteExercises).toContain('Incline DB Press');
    expect(m.weakMuscleGroups).toContain('Upper chest');
  });

  it('deterministic profile facts override folded memory', () => {
    const merged = mergeCoachMemory({ goal: 'old' }, { goal: 'Lean Bulk', currentWeightKg: 71 });
    expect(merged.goal).toBe('Lean Bulk');
    expect(merged.currentWeightKg).toBe(71);
  });
});

describe('Conversational prompt (coach-v3)', () => {
  it('is versioned v3 and carries the coaching persona + memory + flow rules', () => {
    const prompt = buildCoachSystemPrompt({
      intent: 'general_chat',
      context: 'CONTEXT',
      memoryCard: 'Current Injury: Left Shoulder Irritation',
      safetyTriggered: false,
    });
    expect(COACH_PROMPT_VERSION).toBe('coach-v3');
    expect(prompt).toContain('COACH MEMORY');
    expect(prompt).toContain('Left Shoulder Irritation');
    expect(prompt).toMatch(/not a chatbot|NOT a chatbot/i);
    expect(prompt).toMatch(/NOT bullet lists/i);
    expect(prompt).toMatch(/follow-up/i);
    expect(prompt).toMatch(/NEVER invent/i);
  });
});

describe('Response contract — optional memory_updates', () => {
  const base = {
    direct_answer: 'Nice work staying consistent.',
    reason: 'You logged all sessions this week.',
    recommended_action: null, supporting_data: null,
    missing_information: [], safety_flag: false, follow_up_question: 'How did that last set feel?',
  };

  it('validates with no memory_updates (backward compatible)', () => {
    const r = parseCoachResponse(JSON.stringify(base));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.memory_updates).toBeUndefined();
  });

  it('parses memory_updates when present', () => {
    const r = parseCoachResponse(JSON.stringify({
      ...base,
      memory_updates: [{ category: 'injuries', memory_key: 'shoulder', memory_value: 'left shoulder pain' }],
    }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.memory_updates?.[0].memory_key).toBe('shoulder');
  });
});
