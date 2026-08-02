import { describe, it, expect } from 'vitest';
import {
  detectExplicitMemoryCommand,
  detectExplicitMemoryRetrieval,
  buildSaveAcknowledgment,
  buildDeleteAcknowledgment,
  buildRetrievalAnswer,
  extractFactSubject,
  toSecondPerson,
} from '../supabase/functions/_shared/ai/explicitMemory.ts';

// Objective 2 — deterministic explicit-memory command detection. Covers every
// required test case exactly, plus the trigger-overlap bug found while
// building this ("don't forget that" being misread as "forget that").

describe('Required test cases — exact wording', () => {
  it('"Remember that I don\'t like mushrooms." -> upsert, nutrition preferences, high confidence', () => {
    const r = detectExplicitMemoryCommand("Remember that I don't like mushrooms.");
    expect(r.detected).toBe(true);
    expect(r.operation).toBe('upsert');
    expect(r.category).toBe('nutrition preferences');
    expect(r.confidence).toBe('high');
    expect(r.memoryValue).toBe("I don't like mushrooms");
  });

  it('"Remember that I am vegetarian." -> upsert, nutrition preferences, high confidence', () => {
    const r = detectExplicitMemoryCommand('Remember that I am vegetarian.');
    expect(r.detected).toBe(true);
    expect(r.operation).toBe('upsert');
    expect(r.category).toBe('nutrition preferences');
    expect(r.confidence).toBe('high');
  });

  it('"Don\'t forget that I prefer dumbbells." -> upsert (NOT delete), equipment preferences', () => {
    const r = detectExplicitMemoryCommand("Don't forget that I prefer dumbbells.");
    expect(r.detected).toBe(true);
    expect(r.operation).toBe('upsert');
    expect(r.category).toBe('equipment preferences');
    expect(r.confidence).toBe('high');
  });

  it('"From now on, keep my workouts under 60 minutes." -> upsert, workout style', () => {
    const r = detectExplicitMemoryCommand('From now on, keep my workouts under 60 minutes.');
    expect(r.detected).toBe(true);
    expect(r.operation).toBe('upsert');
    expect(r.category).toBe('workout style');
    expect(r.confidence).toBe('high');
  });

  it('"Forget that I don\'t like mushrooms." -> delete, with the SAME key as the save', () => {
    const saved = detectExplicitMemoryCommand("Remember that I don't like mushrooms.");
    const forgot = detectExplicitMemoryCommand("Forget that I don't like mushrooms.");
    expect(forgot.detected).toBe(true);
    expect(forgot.operation).toBe('delete');
    expect(forgot.memoryKey).toBe(saved.memoryKey); // must match, or the delete can't find the row
  });

  it('"What foods do I avoid?" -> not detected (retrieval question, not a write command)', () => {
    expect(detectExplicitMemoryCommand('What foods do I avoid?').detected).toBe(false);
  });

  it('"What equipment do I prefer?" -> not detected (retrieval question)', () => {
    expect(detectExplicitMemoryCommand('What equipment do I prefer?').detected).toBe(false);
  });

  it('"Remember that I trained badly today." -> not detected (transient despite explicit trigger)', () => {
    expect(detectExplicitMemoryCommand('Remember that I trained badly today.').detected).toBe(false);
  });

  it('"I am tired today." -> not detected (no trigger phrase at all)', () => {
    expect(detectExplicitMemoryCommand('I am tired today.').detected).toBe(false);
  });

  it('"Maybe I prefer machines." -> detected but low confidence, requires clarification, NOT auto-save', () => {
    const r = detectExplicitMemoryCommand('Maybe I prefer machines.');
    expect(r.detected).toBe(true);
    expect(r.confidence).toBe('low');
    expect(r.requiresClarification).toBe(true);
  });
});

describe('Trigger-overlap regression ("don\'t forget" vs bare "forget")', () => {
  const dontForgetVariants = [
    "Don't forget that I prefer dumbbells.",
    'Dont forget that I train in the evening.',
    "Don't forget that I am allergic to peanuts.",
  ];
  for (const p of dontForgetVariants) {
    it(`"${p}" resolves to upsert, not delete`, () => {
      expect(detectExplicitMemoryCommand(p).operation).toBe('upsert');
    });
  }

  it('a bare "forget that" (no "don\'t") still resolves to delete', () => {
    expect(detectExplicitMemoryCommand('Forget that I train in the evening.').operation).toBe('delete');
  });
});

describe('Other trigger phrases', () => {
  it('"Save that I train at 6am." -> upsert', () => {
    const r = detectExplicitMemoryCommand('Save that I train at 6am.');
    expect(r.detected).toBe(true);
    expect(r.operation).toBe('upsert');
  });

  it('"I am allergic to peanuts." -> upsert, nutrition preferences, high confidence', () => {
    const r = detectExplicitMemoryCommand('I am allergic to peanuts.');
    expect(r.detected).toBe(true);
    expect(r.category).toBe('nutrition preferences');
    expect(r.confidence).toBe('high');
  });

  it('"I don\'t eat pork." -> upsert, nutrition preferences', () => {
    const r = detectExplicitMemoryCommand("I don't eat pork.");
    expect(r.detected).toBe(true);
    expect(r.operation).toBe('upsert');
    expect(r.category).toBe('nutrition preferences');
  });

  it('"My usual split is push pull legs." -> upsert, workout style', () => {
    const r = detectExplicitMemoryCommand('My usual split is push pull legs.');
    expect(r.detected).toBe(true);
    expect(r.operation).toBe('upsert');
  });
});

describe('Hedge-word conservatism (medium/low confidence never auto-saves)', () => {
  const hedged = [
    'Perhaps I prefer barbells over dumbbells.',
    'I think I am allergic to shellfish.',
    "I'm not sure, but maybe I don't eat dairy.",
    'I guess I prefer training in the evening.',
  ];
  for (const p of hedged) {
    it(`"${p}" is not high-confidence`, () => {
      const r = detectExplicitMemoryCommand(p);
      if (r.detected) {
        expect(r.confidence).not.toBe('high');
        expect(r.requiresClarification).toBe(true);
      }
    });
  }
});

describe('Category keyword ordering avoids the "like/dislike" cross-domain risk', () => {
  it('a workout-context statement is not miscategorised as a food preference', () => {
    const r = detectExplicitMemoryCommand("Remember that I don't like leg day.");
    expect(r.detected).toBe(true);
    expect(r.category).toBe('workout style');
  });

  it('an injury statement is categorised as injuries even if phrased with "prefer"', () => {
    const r = detectExplicitMemoryCommand('Remember that I prefer to avoid exercises that hurt my shoulder.');
    expect(r.detected).toBe(true);
    expect(r.category).toBe('injuries');
  });
});

// Step 4 — deterministic retrieval-question detection. Narrow and
// question-anchored ("what ... do/did I ...") so it can never hijack an
// ordinary nutrition/workout request into a memory-only answer.
describe('detectExplicitMemoryRetrieval', () => {
  it('"What foods did I tell you I avoid?" -> disliked_foods', () => {
    expect(detectExplicitMemoryRetrieval('What foods did I tell you I avoid?')).toEqual({ detected: true, retrievalType: 'disliked_foods' });
  });

  it('"What foods do I avoid?" -> disliked_foods', () => {
    expect(detectExplicitMemoryRetrieval('What foods do I avoid?')).toEqual({ detected: true, retrievalType: 'disliked_foods' });
  });

  // Regression: the negation ("don't") and the verb ("like") are separated by
  // "I" here, unlike "What foods do I avoid?" where the disliking word sits
  // right after "do I". A naive gap-match for the LIKED-foods pattern
  // (.{0,20}\b(like)\b) would find "like" regardless of the negation right
  // before it and misclassify this as asking about LIKED foods — the exact
  // opposite of what's being asked.
  it('"What foods don\'t I like?" -> disliked_foods (not liked_foods — the type name in the old test was aspirational, not actually checked)', () => {
    expect(detectExplicitMemoryRetrieval("What foods don't I like?")).toEqual({ detected: true, retrievalType: 'disliked_foods' });
  });

  it('"What foods do I not like?" -> disliked_foods (negation before "like", different word order)', () => {
    expect(detectExplicitMemoryRetrieval('What foods do I not like?').retrievalType).toBe('disliked_foods');
  });

  it('"What foods can\'t I eat?" -> disliked_foods', () => {
    expect(detectExplicitMemoryRetrieval("What foods can't I eat?").retrievalType).toBe('disliked_foods');
  });

  it('"What foods doesn\'t the athlete like?" -> disliked_foods (third person negation)', () => {
    expect(detectExplicitMemoryRetrieval("What foods doesn't the athlete like?").retrievalType).toBe('disliked_foods');
  });

  it('"What equipment do I prefer?" -> equipment_preferences', () => {
    expect(detectExplicitMemoryRetrieval('What equipment do I prefer?')).toEqual({ detected: true, retrievalType: 'equipment_preferences' });
  });

  it('"What equipment do I have?" -> equipment_preferences', () => {
    expect(detectExplicitMemoryRetrieval('What equipment do I have?').detected).toBe(true);
  });

  it('"What foods do I like?" -> liked_foods', () => {
    expect(detectExplicitMemoryRetrieval('What foods do I like?')).toEqual({ detected: true, retrievalType: 'liked_foods' });
  });

  it('an ordinary meal-plan request is not detected as a retrieval question', () => {
    expect(detectExplicitMemoryRetrieval('I am vegetarian and have a low food budget. Make me a muscle-gain meal plan.').detected).toBe(false);
  });

  it('an ordinary workout request is not detected', () => {
    expect(detectExplicitMemoryRetrieval('Create a 4-day PPL workout plan for me.').detected).toBe(false);
  });

  it('a save command is not detected as a retrieval question', () => {
    expect(detectExplicitMemoryRetrieval("Remember that I don't like mushrooms.").detected).toBe(false);
  });
});

describe('extractFactSubject — strips the lead-in phrase, keeps the subject', () => {
  it.each([
    ["I don't like mushrooms", 'mushrooms'],
    ['I hate mushrooms', 'mushrooms'],
    ['I am allergic to peanuts', 'peanuts'],
    ['I prefer dumbbells', 'dumbbells'],
    ['I love chicken', 'chicken'],
  ])('%s -> %s', (input, expected) => {
    expect(extractFactSubject(input)).toBe(expected);
  });

  it('falls back to the full fact when no lead-in phrase matches', () => {
    expect(extractFactSubject('push pull legs')).toBe('push pull legs');
  });
});

describe('toSecondPerson — first-person fact to second-person acknowledgment', () => {
  it("I don't like mushrooms -> you don't like mushrooms", () => {
    expect(toSecondPerson("I don't like mushrooms")).toBe("you don't like mushrooms");
  });

  it('I prefer dumbbells -> you prefer dumbbells', () => {
    expect(toSecondPerson('I prefer dumbbells')).toBe('you prefer dumbbells');
  });

  it('I am allergic to peanuts -> you are allergic to peanuts', () => {
    expect(toSecondPerson('I am allergic to peanuts')).toBe('you are allergic to peanuts');
  });

  it('My usual split is push pull legs -> your usual split is push pull legs (lowercase — always used after "Remembered — ")', () => {
    expect(toSecondPerson('My usual split is push pull legs')).toBe('your usual split is push pull legs');
  });
});

describe('buildSaveAcknowledgment — exact required wording', () => {
  it('"Remembered — you don\'t like mushrooms."', () => {
    expect(buildSaveAcknowledgment("I don't like mushrooms")).toBe("Remembered — you don't like mushrooms.");
  });

  it('"Remembered — you prefer dumbbells."', () => {
    expect(buildSaveAcknowledgment('I prefer dumbbells')).toBe('Remembered — you prefer dumbbells.');
  });
});

describe('buildDeleteAcknowledgment — exact required wording', () => {
  it('"Removed — mushrooms are no longer saved as a disliked food."', () => {
    expect(buildDeleteAcknowledgment("I don't like mushrooms", 'nutrition preferences')).toBe('Removed — mushrooms are no longer saved as a disliked food.');
  });

  it('equipment preference uses "an" (vowel-initial category label)', () => {
    expect(buildDeleteAcknowledgment('I prefer dumbbells', 'equipment preferences')).toBe('Removed — dumbbells are no longer saved as an equipment preference.');
  });

  it('falls back to a generic "preference" label for an unrecognised category', () => {
    expect(buildDeleteAcknowledgment('I prefer mornings', undefined)).toMatch(/no longer saved as a preference\.$/);
  });
});

describe('buildRetrievalAnswer — exact required wording + honest empty state', () => {
  it('"You\'ve told me you avoid mushrooms and pickles."', () => {
    expect(buildRetrievalAnswer('disliked_foods', ["I don't like mushrooms", "I don't like pickles"]))
      .toBe("You've told me you avoid mushrooms and pickles.");
  });

  it('dedupes the same underlying subject stored under two different keys/phrasings', () => {
    expect(buildRetrievalAnswer('disliked_foods', ['I hate mushrooms', "I don't like mushrooms"]))
      .toBe("You've told me you avoid mushrooms.");
  });

  it('"You prefer dumbbells."', () => {
    expect(buildRetrievalAnswer('equipment_preferences', ['I prefer dumbbells'])).toBe('You prefer dumbbells.');
  });

  it('three or more items use an Oxford-comma list', () => {
    expect(buildRetrievalAnswer('disliked_foods', ['I hate mushrooms', "I don't like pickles", 'I dislike olives']))
      .toBe("You've told me you avoid mushrooms, pickles, and olives.");
  });

  it('never fabricates a fact — honest empty state when nothing is stored', () => {
    expect(buildRetrievalAnswer('disliked_foods', [])).toBe("You haven't told me about any foods to avoid yet.");
    expect(buildRetrievalAnswer('equipment_preferences', [])).toBe("You haven't told me about any equipment preferences yet.");
  });
});
