import { describe, it, expect } from 'vitest';
import { classifyIntent, classifyIntentWithHistory, CoachIntent } from '../supabase/functions/_shared/ai/intent.ts';
import { normalizeExerciseInput, resolveExerciseAlias, searchCatalogExercise } from '../supabase/functions/_shared/ai/exerciseResolver.ts';
import { parsePlanEdit } from '../supabase/functions/_shared/ai/planEdit.ts';
import { responseViolatesIntent } from '../supabase/functions/_shared/ai/coachSchema.ts';

describe('AI Coach Intent Routing & History Isolation Regression Suite', () => {
  describe('1. Cross-Domain Multi-Turn History Isolation', () => {
    it('exact historic bug: "What are my macros?" -> "and add high to low fly" -> workout_plan_edit (NOT nutrition_target_lookup)', () => {
      const history = ['What are my macros?'];
      const current = 'and add high to low fly';
      const intent = classifyIntentWithHistory(current, history);
      expect(intent).toBe('workout_plan_edit');
    });

    it('"What are my macros?" -> "add lateral raises to push day" -> workout_plan_edit', () => {
      const history = ['What are my macros?'];
      const current = 'add lateral raises to push day';
      const intent = classifyIntentWithHistory(current, history);
      expect(intent).toBe('workout_plan_edit');
    });

    it('"What should I eat today?" -> "replace barbell row with another back exercise" -> exercise_substitution or workout_plan_edit', () => {
      const history = ['What should I eat today?'];
      const current = 'replace barbell row with another back exercise';
      const intent = classifyIntentWithHistory(current, history);
      expect(['exercise_substitution', 'workout_plan_edit']).toContain(intent);
    });

    it('"How many calories should I eat?" -> "is high to low cable fly good for lower chest?" -> exercise_inquiry (NOT nutrition)', () => {
      const history = ['How many calories should I eat?'];
      const current = 'is high to low cable fly good for lower chest?';
      const intent = classifyIntentWithHistory(current, history);
      expect(['exercise_inquiry', 'workout_explanation']).toContain(intent);
      expect(intent).not.toBe('nutrition_target_lookup');
      expect(intent).not.toBe('nutrition_advice');
    });

    it('"add high to low fly" -> "What are my macros?" -> nutrition_target_lookup (reclassifies cleanly)', () => {
      const history = ['add high to low fly'];
      const current = 'What are my macros?';
      const intent = classifyIntentWithHistory(current, history);
      expect(intent).toBe('nutrition_target_lookup');
    });

    it('genuine ambiguous follow-up: "create a 4 day split" -> "what about tomorrow?" inherits workout_program_generate', () => {
      const history = ['create a 4 day PPL split'];
      const current = 'what about tomorrow?';
      const intent = classifyIntentWithHistory(current, history);
      expect(intent).toBe('workout_program_generate');
    });

    it('genuine ambiguous nutrition follow-up: "how much protein should I eat" -> "and how much?" inherits nutrition_target_lookup', () => {
      const history = ['how much protein should I eat'];
      const current = 'and how much?';
      const intent = classifyIntentWithHistory(current, history);
      expect(['nutrition_target_lookup', 'nutrition_advice']).toContain(intent);
    });
  });

  describe('2. Exercise Inquiry Intent Routing', () => {
    it('"Is high to low cable fly good for lower chest?" routes to exercise_inquiry / workout_explanation', () => {
      const intent = classifyIntent('Is high to low cable fly good for lower chest?');
      expect(['exercise_inquiry', 'workout_explanation']).toContain(intent);
    });

    it('"Which exercise is better for lower lats?" routes to exercise_inquiry / workout_explanation', () => {
      const intent = classifyIntent('Which exercise is better for lower lats?');
      expect(['exercise_inquiry', 'workout_explanation']).toContain(intent);
    });

    it('"How do I do a Pendlay row?" routes to exercise_inquiry / workout_explanation', () => {
      const intent = classifyIntent('How do I do a Pendlay row?');
      expect(['exercise_inquiry', 'workout_explanation']).toContain(intent);
    });

    it('"What muscles does Romanian deadlift work?" routes to exercise_inquiry / workout_explanation', () => {
      const intent = classifyIntent('What muscles does Romanian deadlift work?');
      expect(['exercise_inquiry', 'workout_explanation']).toContain(intent);
    });
  });

  describe('3. Exercise Name Normalization & Aliases', () => {
    it('normalizes punctuation, case, and whitespace', () => {
      expect(normalizeExerciseInput('  High-To-Low  FLY!! ')).toBe('high-to-low fly');
      expect(normalizeExerciseInput('  high to low cable fly  ')).toBe('high to low cable fly');
    });

    it('resolves abbreviations, slang, and hyphenated variants via alias resolver', () => {
      expect(resolveExerciseAlias('incline db press')).toContain('incline');
      expect(resolveExerciseAlias('rdl')).toBe('romanian deadlift');
      expect(resolveExerciseAlias('high-to-low fly')).toBe('high to low cable fly');
      expect(resolveExerciseAlias('high to low fly')).toBe('high to low cable fly');
      expect(resolveExerciseAlias('High-To-Low Cable Fly')).toBe('high to low cable fly');
    });
  });

  describe('4. Test Current AI 10 Standard Examples', () => {
    it('1. "Add high to low cable fly to my push day." -> workout_plan_edit', () => {
      expect(classifyIntent('Add high to low cable fly to my push day.')).toBe('workout_plan_edit');
    });

    it('2. "How many calories should I eat?" -> nutrition_target_lookup / nutrition_advice', () => {
      expect(['nutrition_target_lookup', 'nutrition_advice']).toContain(classifyIntent('How many calories should I eat?'));
    });

    it('3. "Replace barbell row with another back exercise." -> exercise_substitution / workout_plan_edit', () => {
      expect(['exercise_substitution', 'workout_plan_edit']).toContain(classifyIntent('Replace barbell row with another back exercise.'));
    });

    it('4. "How much protein did I eat today?" -> nutrition_status', () => {
      expect(classifyIntent('How much protein did I eat today?')).toBe('nutrition_status');
    });

    it('5. "What did I lift last time on incline dumbbell press?" -> workout_progression / workout_explanation', () => {
      expect(['workout_progression', 'workout_explanation', 'exercise_inquiry']).toContain(
        classifyIntent('What did I lift last time on incline dumbbell press?')
      );
    });

    it('6. "Which exercise is better for lower lats?" -> exercise_inquiry / workout_explanation', () => {
      expect(['exercise_inquiry', 'workout_explanation']).toContain(classifyIntent('Which exercise is better for lower lats?'));
    });

    it('7. "Change my calorie target to 2700." -> goal_adjustment / nutrition_plan_edit / nutrition_advice', () => {
      expect(['goal_adjustment', 'nutrition_plan_edit', 'nutrition_advice']).toContain(
        classifyIntent('Change my calorie target to 2700.')
      );
    });

    it('8. "Add 2 sets of lateral raises." -> workout_plan_edit / exercise_logging', () => {
      expect(['workout_plan_edit', 'exercise_logging']).toContain(classifyIntent('Add 2 sets of lateral raises.'));
    });

    it('9. "What are my macros?" -> nutrition_target_lookup', () => {
      expect(classifyIntent('What are my macros?')).toBe('nutrition_target_lookup');
    });

    it('10. "How is my training progressing?" -> weekly_review / adaptive_coaching', () => {
      expect(['weekly_review', 'adaptive_coaching']).toContain(classifyIntent('How is my training progressing?'));
    });
  });

  describe('5. Database & Mock Catalog Resolution', () => {
    const mockDb = {
      from: (table: string) => {
        if (table === 'exercises') {
          return {
            select: () => ({
              eq: (_f: string, _v: string) => ({
                or: (query: string) => ({
                  maybeSingle: async () => {
                    if (query.includes('high-to-low-cable-fly') || query.includes('high to low cable fly')) {
                      return { data: { id: 'ex_1', name: 'High-to-Low Cable Fly', slug: 'high-to-low-cable-fly', source_type: 'yeti_first_party' } };
                    }
                    return { data: null };
                  },
                  limit: async (n: number) => {
                    if (query.includes('high to low cable fly') || query.includes('high-to-low-cable-fly')) {
                      return { data: [{ id: 'ex_1', name: 'High-to-Low Cable Fly', slug: 'high-to-low-cable-fly', source_type: 'yeti_first_party' }] };
                    }
                    return { data: [] };
                  },
                }),
                ilike: (_f: string, pattern: string) => ({
                  limit: async () => {
                    if (pattern.includes('high to low') || pattern.includes('cable fly')) {
                      return { data: [{ id: 'ex_1', name: 'High-to-Low Cable Fly', slug: 'high-to-low-cable-fly', source_type: 'yeti_first_party' }] };
                    }
                    return { data: [] };
                  },
                }),
              }),
            }),
          };
        }
        if (table === 'exercise_aliases') {
          return {
            select: () => ({
              or: (query: string) => ({
                eq: () => ({
                  limit: async () => {
                    if (query.includes('high to low fly')) {
                      return { data: [{ exercise_id: 'ex_1', alias: 'high to low fly', exercises: { id: 'ex_1', name: 'High-to-Low Cable Fly', slug: 'high-to-low-cable-fly', source_type: 'yeti_first_party' } }] };
                    }
                    return { data: [] };
                  },
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ limit: async () => ({ data: [] }) }) }) };
      },
    };

    it('resolves hyphenated database exercise from space-separated input', async () => {
      const res = await searchCatalogExercise(mockDb, 'high to low cable fly');
      expect(res).not.toBeNull();
      expect(res.name).toBe('High-to-Low Cable Fly');
    });

    it('resolves database alias match', async () => {
      const res = await searchCatalogExercise(mockDb, 'high to low fly');
      expect(res).not.toBeNull();
      expect(res.name).toBe('High-to-Low Cable Fly');
    });

    it('fails honestly on completely unknown exercise', async () => {
      const res = await searchCatalogExercise(mockDb, 'quantum levitation press');
      expect(res).toBeNull();
    });
  });
});
