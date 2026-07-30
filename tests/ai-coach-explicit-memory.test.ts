import { describe, it, expect } from 'vitest';
import { detectExplicitMemoryCommand } from '../supabase/functions/_shared/ai/explicitMemory.ts';

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
