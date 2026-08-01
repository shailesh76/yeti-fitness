import { describe, it, expect } from 'vitest';
import {
  classifyProseNumbers, unsupportedProseNumbers, buildProseGroundingRetryInstruction,
  ungroundedNumberFallbackResponse, APPROVED_STATIC_FACTS, GroundingSources,
} from '../supabase/functions/_shared/ai/coachSchema.ts';

// Regression for a real, live-observed defect (pre-beta blocker pass,
// 2026-08-01): asked "Give me a 4-week plan to increase my bench press" with
// NO logged set history for that exercise (engineResult was undefined — the
// deterministic progression engine never ran), and the model answered with
// "I estimate your current 1RM at around 93-95kg" — a specific, invented
// number stated directly in prose. The EXISTING hallucination guard
// (ungroundedNumbers) only ever inspected supporting_data, never
// direct_answer/reason/recommended_action/follow_up_question, so this
// shipped straight to the athlete.
describe('Prose-level numeric grounding guard', () => {
  const noGroundingAtAll: GroundingSources = { userMessagesText: '', groundedSource: '' };

  describe('reproduces the exact live-observed bench-press leak', () => {
    it('the fabricated "93-95kg" 1RM estimate is classified unsupported with no logged history', () => {
      const text =
        "Your ability to perform 80kg for 5 reps allows us to estimate your current 1-rep max (1RM) at around 93-95kg. " +
        "This 4-week plan uses percentages of that estimated 1RM to guide your working weights.";
      // No engineResult existed (undefined) and the user's OWN message is what
      // supplied 80kg/5 — simulate that as the only grounded source.
      const sources: GroundingSources = { userMessagesText: 'I can do 80kg for 5 reps on bench press right now.', groundedSource: '' };
      const unsupported = unsupportedProseNumbers(text, sources);
      expect(unsupported).toContain('93');
      expect(unsupported).toContain('95');
      // 80 and 5 came from the athlete's own message — correctly NOT flagged.
      expect(unsupported).not.toContain('80');
      // "1RM"/"1-rep max" contain no personally-claimed value — not flagged.
      expect(unsupported).not.toContain('1');
      // "4-week" — plan duration is the athlete's own request, not a fabricated number.
    });
  });

  describe('classifyProseNumbers — source attribution', () => {
    it('attributes a number found in the current user message', () => {
      const sources: GroundingSources = { userMessagesText: 'I weigh 80kg and did 5 reps.', groundedSource: '' };
      const claims = classifyProseNumbers('You lifted 80kg for 5 reps.', sources);
      expect(claims.find((c) => c.value === '80')?.source).toBe('user_message');
      expect(claims.find((c) => c.value === '5')?.source).toBe('user_message');
    });

    it('attributes a number found in the engine result / context corpus', () => {
      const sources: GroundingSources = { userMessagesText: '', groundedSource: JSON.stringify({ recoveryScore: 85, adherence: 92 }) };
      const claims = classifyProseNumbers('Your recovery score is 85 and adherence is 92%.', sources);
      expect(claims.find((c) => c.value === '85')?.source).toBe('grounded_source');
      expect(claims.find((c) => c.value === '92%')?.source).toBe('grounded_source');
    });

    it('attributes an approved static-knowledge fact (creatine dosing)', () => {
      const claims = classifyProseNumbers('Creatine is well-studied — 3-5g per day is the standard maintenance dose.', noGroundingAtAll);
      expect(claims.find((c) => c.value === '3')?.source).toBe('static_knowledge');
      expect(claims.find((c) => c.value === '5')?.source).toBe('static_knowledge');
    });

    it('does NOT wave through a personalized claim that happens to reuse the same digits as the static fact', () => {
      // Same numbers (3, 5) but phrased as THIS athlete's specific prescription, not universal dosing guidance.
      const claims = classifyProseNumbers('Your creatine split is 3 scoops across 5 different meals today.', noGroundingAtAll);
      expect(claims.find((c) => c.value === '3')?.source).toBe('unsupported');
      expect(claims.find((c) => c.value === '5')?.source).toBe('unsupported');
    });

    it('marks a genuinely unsupported number with no source at all', () => {
      const claims = classifyProseNumbers('Your one-rep max is 150kg.', noGroundingAtAll);
      expect(claims.find((c) => c.value === '150')?.source).toBe('unsupported');
    });
  });

  describe('adversarial coverage — every user-visible field', () => {
    it('catches an unsupported number in direct_answer-shaped prose', () => {
      expect(unsupportedProseNumbers('Great news — your new max is 220kg!', noGroundingAtAll)).toContain('220');
    });
    it('catches an unsupported number in reason-shaped prose', () => {
      expect(unsupportedProseNumbers('This works because you can already deadlift 180kg for reps.', noGroundingAtAll)).toContain('180');
    });
    it('catches an unsupported number in recommended_action-shaped prose', () => {
      expect(unsupportedProseNumbers('Try 4 sets of 6 reps at 102kg on your next session.', noGroundingAtAll)).toEqual(
        expect.arrayContaining(['4', '6', '102']),
      );
    });
    it('catches an unsupported number in follow_up_question-shaped prose', () => {
      expect(unsupportedProseNumbers('Does 88kg for your next attempt sound reasonable?', noGroundingAtAll)).toContain('88');
    });
    it('catches unsupported numbers spread across compound multi-sentence prose', () => {
      const text = 'Nice work this week. Based on your trend, your squat 1RM should now be near 145kg, up from 130kg last month.';
      const unsupported = unsupportedProseNumbers(text, noGroundingAtAll);
      expect(unsupported).toContain('145');
      expect(unsupported).toContain('130');
    });
    it('catches a formatted range using a hyphen ("93-95 kg")', () => {
      const unsupported = unsupportedProseNumbers('Your estimated 1RM is 93-95 kg.', noGroundingAtAll);
      expect(unsupported).toEqual(expect.arrayContaining(['93', '95']));
    });
    it('catches a formatted range using an en-dash ("93–95kg")', () => {
      const unsupported = unsupportedProseNumbers('Your estimated 1RM is 93–95kg.', noGroundingAtAll);
      expect(unsupported).toEqual(expect.arrayContaining(['93', '95']));
    });
    it('catches an unsupported percentage', () => {
      expect(unsupportedProseNumbers('Aim for 82% of your max on the top set.', noGroundingAtAll)).toContain('82%');
    });
    it('catches unsupported macro/calorie values', () => {
      const unsupported = unsupportedProseNumbers('You should eat 3200 calories and 210g of protein daily.', noGroundingAtAll);
      expect(unsupported).toEqual(expect.arrayContaining(['3200', '210']));
    });
  });

  describe('static-knowledge allowlist is explicit, not an ad-hoc regex escape hatch', () => {
    it('is a named, auditable list of facts, not a bare exception in the extraction regex', () => {
      expect(Array.isArray(APPROVED_STATIC_FACTS)).toBe(true);
      expect(APPROVED_STATIC_FACTS.length).toBeGreaterThan(0);
      for (const fact of APPROVED_STATIC_FACTS) {
        expect(typeof fact.id).toBe('string');
        expect(typeof fact.description).toBe('string');
        expect(fact.sentencePattern).toBeInstanceOf(RegExp);
      }
    });

    it('preserves general rep-range explanations when clearly NOT the athlete\'s personal prescription', () => {
      // "8-12 reps is a common hypertrophy range" is generic education; still
      // flagged as unsupported by this guard alone (rep-range general
      // education is not in the allowlist), which is the deliberately
      // conservative, safe default — general claims should avoid citing
      // specific numbers as someone's personal prescription in the first
      // place. Confirms the guard does NOT special-case this away silently.
      const unsupported = unsupportedProseNumbers('Generally, 8-12 reps is considered a good range for hypertrophy.', noGroundingAtAll);
      expect(unsupported).toEqual(expect.arrayContaining(['8', '12']));
    });
  });

  describe('retry instruction + deterministic fallback', () => {
    it('the retry instruction names the specific unsupported numbers', () => {
      const instruction = buildProseGroundingRetryInstruction(['93', '95']);
      expect(instruction).toContain('93');
      expect(instruction).toContain('95');
      expect(instruction.toLowerCase()).toContain('invent');
    });

    it('the fallback response is honest, grounded, and offers no fabricated number', () => {
      const fallback = ungroundedNumberFallbackResponse(['a recent completed set for this lift']);
      expect(unsupportedProseNumbers(
        `${fallback.direct_answer} ${fallback.reason} ${fallback.follow_up_question}`,
        noGroundingAtAll,
      )).toEqual([]);
      expect(fallback.missing_information).toContain('a recent completed set for this lift');
      expect(fallback.supporting_data).toBeNull();
      expect(fallback.recommended_action).toBeNull();
    });

    it('the fallback response still works with no missing-information hint at all', () => {
      const fallback = ungroundedNumberFallbackResponse([]);
      expect(fallback.missing_information.length).toBeGreaterThan(0);
      expect(fallback.direct_answer.length).toBeGreaterThan(0);
    });
  });

  describe('false-positive guards', () => {
    it('does not flag ordinary exercise names or acronyms with no numbers at all', () => {
      expect(unsupportedProseNumbers('Try the Barbell Bench Press with a controlled tempo.', noGroundingAtAll)).toEqual([]);
    });
    it('does not flag "1RM" itself as an unsupported claim of "1"', () => {
      expect(unsupportedProseNumbers('Let\'s work toward a new 1RM safely.', noGroundingAtAll)).toEqual([]);
    });
    it('does not flag "3RM" itself either', () => {
      expect(unsupportedProseNumbers('A 3RM test can estimate your max.', noGroundingAtAll)).toEqual([]);
    });
    it('grounds a number that appears in EITHER the user message or the engine/context corpus', () => {
      const sources: GroundingSources = { userMessagesText: 'my goal is 4 days a week', groundedSource: 'recoveryScore: 85' };
      expect(unsupportedProseNumbers('Great, 4 days a week works, and your recovery score of 85 supports that.', sources)).toEqual([]);
    });
  });

  // Live-observed (same pre-beta pass, second incident): with intent
  // continuity broken by an unrelated false medical-safety match, the model
  // fell back to fully ungrounded generation and put an ENTIRE fabricated
  // workout plan (specific sets/reps numbers included) into an OBJECT-shaped
  // recommended_action rather than prose. The edge function's own
  // textForGroundingCheck() serializes recommended_action via
  // JSON.stringify() before running it through this same classifier —
  // this proves that underlying mechanism actually catches numbers arriving
  // that way, not just from plain prose strings.
  describe('object-shaped recommended_action (serialized before classification)', () => {
    it('catches fabricated sets/reps numbers inside a JSON-stringified recommended_action object', () => {
      const fabricatedPlan = {
        'Day 1 (Chest)': 'Barbell Bench Press (3 sets of 8-12 reps), Incline Dumbbell Press (3 sets of 10-15 reps)',
        'Day 2 (Back)': 'Pull-ups (3 sets of 8-12 reps), Barbell Rows (3 sets of 8-12 reps)',
      };
      const serialized = JSON.stringify(fabricatedPlan);
      const unsupported = unsupportedProseNumbers(serialized, noGroundingAtAll);
      expect(unsupported).toEqual(expect.arrayContaining(['3', '8', '12', '10', '15']));
    });

    it('a grounded object (numbers actually present in the engine result) is not flagged', () => {
      // Deliberately no digit in the key ("pushDay", not "Day 1") — isolates
      // the check to the VALUE's numbers, which are the ones actually
      // grounded here; a numbered key is exercised separately above.
      const groundedPlan = { pushDay: '4 sets of 8 reps' };
      const sources: GroundingSources = { userMessagesText: '', groundedSource: JSON.stringify({ sets: 4, reps: 8 }) };
      expect(unsupportedProseNumbers(JSON.stringify(groundedPlan), sources)).toEqual([]);
    });
  });
});
