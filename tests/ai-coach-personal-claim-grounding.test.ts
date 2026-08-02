import { describe, it, expect } from 'vitest';
import {
  extractPersonalClaims, unsupportedPersonalClaims, buildPersonalClaimRetryInstruction,
  stripUnsupportedPersonalClaims, GroundingSources, CoachResponse,
} from '../supabase/functions/_shared/ai/coachSchema.ts';

// Final closed-beta gate, Blocker 3: the model can invent a non-numeric
// athlete-specific FACT (a preference, dislike, injury, schedule, dietary
// pattern, recovery pattern, adherence detail, favourite exercise, weak
// muscle group, or previous performance) with the same confident phrasing
// used for a real, grounded one. This guard is deliberately bounded — a
// curated second-person trigger phrase per category, not unrestricted
// semantic fact checking — mirroring the existing numeric-grounding guard's
// architecture but for named claims instead of digits.
describe('Non-numeric personal-claim grounding guard', () => {
  const noGroundingAtAll: GroundingSources = { userMessagesText: '', groundedSource: '' };

  describe('extractPersonalClaims — one category example each', () => {
    it('favourite_exercise', () => {
      const claims = extractPersonalClaims('Your favourite exercise is the bench press.');
      expect(claims[0]?.category).toBe('favourite_exercise');
    });
    it('weak_muscle_group', () => {
      const claims = extractPersonalClaims('Your weak point is your rear delts.');
      expect(claims[0]?.category).toBe('weak_muscle_group');
    });
    it('injury', () => {
      const claims = extractPersonalClaims('Your shoulder injury means you should avoid overhead pressing.');
      expect(claims[0]?.category).toBe('injury');
    });
    it('training_schedule', () => {
      const claims = extractPersonalClaims('You train on Monday and Thursday.');
      expect(claims[0]?.category).toBe('training_schedule');
    });
    it('dietary_pattern', () => {
      const claims = extractPersonalClaims("Since you're vegetarian, we'll focus on plant-based proteins.");
      expect(claims[0]?.category).toBe('dietary_pattern');
    });
    it('recovery_pattern', () => {
      const claims = extractPersonalClaims('You tend to recover slowly after leg day.');
      expect(claims[0]?.category).toBe('recovery_pattern');
    });
    it('adherence_behaviour', () => {
      const claims = extractPersonalClaims("You've been missing your Tuesday sessions.");
      expect(claims[0]?.category).toBe('adherence_behaviour');
    });
    it('previous_performance', () => {
      const claims = extractPersonalClaims('Last time you hit a new PR on deadlift.');
      expect(claims[0]?.category).toBe('previous_performance');
    });
    it('dislike', () => {
      const claims = extractPersonalClaims("You hate burpees, so we'll skip those.");
      expect(claims[0]?.category).toBe('dislike');
    });
    it('preference', () => {
      const claims = extractPersonalClaims('You prefer dumbbells over barbells.');
      expect(claims[0]?.category).toBe('preference');
    });
  });

  describe('unsupportedPersonalClaims — source attribution', () => {
    it('grounds a claim found in the current user message', () => {
      const sources: GroundingSources = { userMessagesText: 'My favourite exercise is the bench press.', groundedSource: '' };
      expect(unsupportedPersonalClaims('Your favourite exercise is the bench press, so we\'ll build around it.', sources)).toEqual([]);
    });

    it('grounds a claim found in groundedSource (engine/context/Coach Memory)', () => {
      // ai-coach/index.ts folds the Coach Memory Card text into groundedSource —
      // simulated here the same way.
      const sources: GroundingSources = { userMessagesText: '', groundedSource: 'Favourite Exercises: Bench Press, Barbell Row\nTraining Split: PPL' };
      expect(unsupportedPersonalClaims('Your favourite exercise is the bench press.', sources)).toEqual([]);
    });

    it('flags a claim with no grounding anywhere', () => {
      const unsupported = unsupportedPersonalClaims('Your favourite exercise is the leg press.', noGroundingAtAll);
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].category).toBe('favourite_exercise');
    });

    it('does NOT flag a claim whose captured text has no meaningful content word', () => {
      // A capture that reduces to nothing but stopwords is too weak to
      // confidently call fabricated.
      expect(unsupportedPersonalClaims('You prefer it that way.', noGroundingAtAll)).toEqual([]);
    });
  });

  describe('adversarial coverage — every user-visible field', () => {
    it('catches an invented personal claim in direct_answer-shaped prose', () => {
      const unsupported = unsupportedPersonalClaims('Given your history of shoulder injury, we\'ll avoid overhead pressing.', noGroundingAtAll);
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].category).toBe('injury');
    });
    it('catches an invented personal claim in reason-shaped prose', () => {
      const unsupported = unsupportedPersonalClaims('This works well because you tend to recover quickly from leg sessions.', noGroundingAtAll);
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].category).toBe('recovery_pattern');
    });
    it('catches an invented personal claim in recommended_action-shaped (string) prose', () => {
      const unsupported = unsupportedPersonalClaims('Swap in dumbbell presses since you dislike the barbell bench press.', noGroundingAtAll);
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].category).toBe('dislike');
    });
    it('catches an invented personal claim inside a JSON-stringified recommended_action object', () => {
      const fabricatedAction = { note: 'Since your training days are Monday, Wednesday and Friday, this fits your split.' };
      const unsupported = unsupportedPersonalClaims(JSON.stringify(fabricatedAction), noGroundingAtAll);
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].category).toBe('training_schedule');
    });
    it('catches an invented personal claim in follow_up_question-shaped prose', () => {
      const unsupported = unsupportedPersonalClaims('Since you are vegan, would you like a tofu-based option instead?', noGroundingAtAll);
      expect(unsupported).toHaveLength(1);
      expect(unsupported[0].category).toBe('dietary_pattern');
    });
  });

  describe('universal coaching advice and general fitness knowledge are preserved', () => {
    it('no personal-claim trigger at all — not flagged', () => {
      expect(unsupportedPersonalClaims('Progressive overload is the foundation of strength training.', noGroundingAtAll)).toEqual([]);
    });
    it('generic protein guidance — not flagged', () => {
      expect(unsupportedPersonalClaims('Protein intake around 1.6-2.2g per kg of bodyweight is well supported by research.', noGroundingAtAll)).toEqual([]);
    });
    it('a generic imperative recommendation ("you should...") is not a factual claim about the athlete', () => {
      expect(unsupportedPersonalClaims('You should warm up properly before heavy lifts.', noGroundingAtAll)).toEqual([]);
    });
    it('a third-person generalization about lifters in general is not a personal claim', () => {
      expect(unsupportedPersonalClaims('It is common for lifters to favour machines when starting out.', noGroundingAtAll)).toEqual([]);
    });
    it('a hedged suggestion ("you might prefer...") is not a confident factual claim', () => {
      expect(unsupportedPersonalClaims('You might prefer starting with dumbbells if you are new to lifting.', noGroundingAtAll)).toEqual([]);
    });
  });

  describe('retry instruction', () => {
    it('names the specific unsupported claim sentence(s)', () => {
      const unsupported = unsupportedPersonalClaims('Your favourite exercise is the leg press.', noGroundingAtAll);
      const instruction = buildPersonalClaimRetryInstruction(unsupported);
      expect(instruction).toContain('favourite exercise is the leg press');
      expect(instruction.toLowerCase()).toContain('invent');
      expect(instruction).toMatch(/general coaching advice.*fine/i);
    });
  });

  describe('stripUnsupportedPersonalClaims — sentence-level removal, not whole-response replacement', () => {
    const baseResp: CoachResponse = {
      direct_answer: 'Great work this week. Your favourite exercise is the leg press, so let\'s build around it.',
      reason: 'This progression fits your current programme.',
      recommended_action: 'Add an extra set of leg press next session.',
      supporting_data: null,
      missing_information: [],
      safety_flag: false,
      follow_up_question: null,
    };

    it('removes only the offending sentence, preserving the rest of direct_answer', () => {
      const cleaned = stripUnsupportedPersonalClaims(baseResp, noGroundingAtAll);
      expect(cleaned.direct_answer).toContain('Great work this week.');
      expect(cleaned.direct_answer).not.toContain('leg press');
      expect(cleaned.reason).toBe('This progression fits your current programme.');
    });

    it('leaves a fully-grounded response completely untouched', () => {
      const sources: GroundingSources = { userMessagesText: 'my favourite exercise is the leg press', groundedSource: '' };
      const cleaned = stripUnsupportedPersonalClaims(baseResp, sources);
      expect(cleaned).toEqual(baseResp);
    });

    it('nulls an object-shaped recommended_action that contains an unsupported claim', () => {
      const objResp: CoachResponse = { ...baseResp, recommended_action: { note: 'Since your training days are Tuesday and Friday, add a set here.' } };
      const cleaned = stripUnsupportedPersonalClaims(objResp, noGroundingAtAll);
      expect(cleaned.recommended_action).toBeNull();
    });

    it('falls back to an honest statement if direct_answer becomes empty after stripping', () => {
      const allClaim: CoachResponse = { ...baseResp, direct_answer: 'Your favourite exercise is the leg press.' };
      const cleaned = stripUnsupportedPersonalClaims(allClaim, noGroundingAtAll);
      expect(cleaned.direct_answer.length).toBeGreaterThan(0);
      expect(cleaned.direct_answer).not.toContain('leg press');
    });
  });
});
