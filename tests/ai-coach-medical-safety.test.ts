import { describe, it, expect } from 'vitest';
import { classifySafetySignal, classifyIntent } from '../supabase/functions/_shared/ai/intent.ts';

describe('AI Coach 5-Way Medical Safety Classification', () => {
  it('1. classifies current first-person emergency ("I have severe chest pain and feel faint")', () => {
    expect(classifySafetySignal('I have severe chest pain and feel faint')).toBe('current_first_person_emergency');
  });

  it('2. classifies current third-person emergency ("My friend fainted during training")', () => {
    expect(classifySafetySignal('My friend fainted during training')).toBe('current_third_person_emergency');
  });

  it('3. classifies negated event ("I do not have chest pain")', () => {
    expect(classifySafetySignal('I do not have chest pain; I am asking what it means.')).toBe('negated_event');
  });

  it('4. classifies hypothetical general question ("What causes shortness of breath during cardio?")', () => {
    expect(classifySafetySignal('What causes shortness of breath during cardio?')).toBe('hypothetical_general');
  });

  it('5. classifies historical resolved event ("I had knee pain last month but it is gone now")', () => {
    expect(classifySafetySignal('I had knee pain last month but it is gone now')).toBe('historical_resolved_event');
  });
});

// Regression for a live-reproduced critical bug (final closed-beta repair
// pass): classifySafetySignal collapsed ordinary pain ("my shoulder hurts")
// into the exact same 'current_first_person_emergency' value as a genuine
// emergency ("I have severe chest pain and feel faint"). ai-coach/index.ts's
// pre-generation escalation short-circuit keyed off that single value, so
// ordinary training soreness would have triggered a hardcoded "seek emergency
// medical attention" response and completely bypassed normal coaching for a
// huge fraction of everyday conversations. Fixed by splitting emergency
// red-flag mentions from ordinary MEDICAL_SAFETY_PATTERN-only mentions into
// two distinct SafetyClassification values.
describe('Emergency vs. ordinary pain — the critical fix', () => {
  describe('true emergencies -> current_first_person_emergency (may short-circuit)', () => {
    const emergencies = [
      'I have severe chest pain and feel faint',
      'I am having severe trouble breathing',
      'I think I am having stroke-like symptoms',
      'I lost consciousness for a moment',
      'I have sudden numbness down one side and slurred speech',
    ];
    for (const msg of emergencies) {
      it(`"${msg}" -> current_first_person_emergency`, () => {
        expect(classifySafetySignal(msg)).toBe('current_first_person_emergency');
      });
    }
  });

  describe('ordinary pain -> current_first_person_concern (must NOT short-circuit)', () => {
    const ordinary = [
      'My shoulder hurts when I press',
      'my shoulder hurts',
      'I have knee pain',
      'I have back pain',
      'pressing hurts',
    ];
    for (const msg of ordinary) {
      it(`"${msg}" -> current_first_person_concern, not emergency`, () => {
        const sig = classifySafetySignal(msg);
        expect(sig).toBe('current_first_person_concern');
        expect(sig).not.toBe('current_first_person_emergency');
      });
    }
  });

  describe('both emergency and ordinary concern still route to the medical_safety intent', () => {
    it('"I have severe chest pain and feel faint" -> medical_safety', () => {
      expect(classifyIntent('I have severe chest pain and feel faint')).toBe('medical_safety');
    });
    it('"My shoulder hurts when I press" -> medical_safety (cautious injury-aware coaching, not emergency escalation)', () => {
      expect(classifyIntent('My shoulder hurts when I press')).toBe('medical_safety');
    });
  });

  it('"My shoulder does not hurt" -> not medical_safety', () => {
    expect(classifySafetySignal('My shoulder does not hurt')).toBe('none');
    expect(classifyIntent('My shoulder does not hurt')).not.toBe('medical_safety');
  });

  it('"I had shoulder pain last week but it is gone" -> historical, not a current emergency or concern', () => {
    const sig = classifySafetySignal('I had shoulder pain last week but it is gone');
    expect(sig).toBe('historical_resolved_event');
    expect(sig).not.toBe('current_first_person_emergency');
    expect(sig).not.toBe('current_first_person_concern');
  });

  it('soreness alone (no MEDICAL_SAFETY_PATTERN match) is "none", not a concern', () => {
    expect(classifySafetySignal('soreness')).toBe('none');
  });
});
