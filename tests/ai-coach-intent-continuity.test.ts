import { describe, it, expect } from 'vitest';
import { classifyIntent, classifyIntentWithHistory } from '../supabase/functions/_shared/ai/intent.ts';

// Regression for a real incident found during live mobile QA: the coach asks
// "Give me a 4-week plan..." -> workout_progression -> clarification (needs
// exercise + current strength). The athlete answers "Let's use barbell bench
// press, I can currently do 60kg for 5 reps" — classifyIntent() on THAT
// message alone returns general_chat (no plan/program/increase keywords),
// so engine: llm_only ran, no real progression engine ever computed
// anything, and the model free-improvised a "55kg Week 1" program in prose
// with nothing behind it. classifyIntentWithHistory() fixes this by
// inheriting the prior turn's engine-backed intent when the current message
// alone is ambiguous.
describe('classifyIntentWithHistory — conversational continuity', () => {
  it('reproduces the exact live-observed bug: classifyIntent() alone loses the thread', () => {
    // Confirms the bug is real and this test would have caught it.
    expect(classifyIntent("Let's use barbell bench press, I can currently do 60kg for 5 reps")).toBe('general_chat');
  });

  it('the exact live incident: follow-up answer inherits workout_progression from the prior turn', () => {
    const prior = ['Give me a 4-week plan to increase my bench press'];
    expect(classifyIntent(prior[0])).toBe('workout_progression'); // sanity: prior turn IS engine-backed
    expect(classifyIntentWithHistory("Let's use barbell bench press, I can currently do 60kg for 5 reps", prior)).toBe('workout_progression');
  });

  it('inherits workout_program_generate for a follow-up answering a program clarification', () => {
    const prior = ['Create a 4-day PPL workout plan for me'];
    expect(classifyIntentWithHistory('I have a home gym with dumbbells and bands, intermediate level', prior)).toBe('workout_program_generate');
  });

  it('does NOT override when the current message has its own clear intent', () => {
    const prior = ['Give me a 4-week plan to increase my bench press'];
    // A genuinely new, unrelated request with its OWN direct classification
    // (not general_chat) must win outright — inheritance only ever applies
    // when the current message is ambiguous on its own.
    expect(classifyIntent('Create a grocery list for this week')).toBe('grocery_list'); // sanity: has its own direct match
    expect(classifyIntentWithHistory('Create a grocery list for this week', prior)).toBe('grocery_list');
  });

  // NOTE: a message like "What foods do I avoid?" is ALSO general_chat under
  // classifyIntent() alone (it has no engine-backed pattern of its own), so
  // in isolation it WOULD inherit the prior turn's intent here — but in the
  // real handler this exact phrasing is intercepted earlier by the separate,
  // independent detectExplicitMemoryRetrieval() short-circuit (Step 4) and
  // never reaches intent-based dispatch at all. That's covered in
  // tests/ai-coach-deterministic-memory.test.ts, not here.

  it('does NOT inherit a non-engine-backed intent (e.g. workout_explanation) — those are fine as free LLM answers', () => {
    const prior = ['How do I do a proper bench press?']; // -> workout_explanation, not engine-backed
    expect(classifyIntent(prior[0])).toBe('workout_explanation');
    expect(classifyIntentWithHistory('ok thanks', prior)).toBe('general_chat'); // no inheritance — stays general_chat
  });

  it('falls back to general_chat with no prior messages at all', () => {
    expect(classifyIntentWithHistory('60kg for 5 reps', [])).toBe('general_chat');
  });

  // A genuine topic change to a DEFINITE (non-general_chat) but non-engine-backed
  // intent must still block reaching back further to an older engine-backed one
  // — the walk stops at the nearest definite classification, it doesn't skip
  // past every non-engine-backed intent looking for an engine-backed match.
  it('a genuine topic change to a non-engine-backed intent blocks inheriting an OLDER engine-backed one', () => {
    const prior = [
      'Give me a 4-week plan to increase my bench press', // workout_progression (engine-backed)
      'How do I breathe during a lift?', // workout_explanation — a DEFINITE, real topic change, not engine-backed
    ];
    expect(classifyIntent(prior[0])).toBe('workout_progression'); // sanity
    expect(classifyIntent(prior[1])).toBe('workout_explanation'); // sanity: definite, not general_chat
    const result = classifyIntentWithHistory('60kg for 5 reps', prior);
    expect(result).not.toBe('workout_progression');
    expect(result).toBe('general_chat');
  });

  it('a genuinely ambiguous message with NO engine-backed prior stays general_chat (no false inheritance)', () => {
    const prior = ['hey there'];
    expect(classifyIntentWithHistory('how are you', prior)).toBe('general_chat');
  });

  // ─── Multi-hop backward walk (runtime-hardening pass, 2026-08-01) ──────────
  // Live-reproduced through the real mobile UI: a natural 3-turn slot-filling
  // conversation broke intent continuity on the SECOND ambiguous reply, not
  // the first. The single-hop version of classifyIntentWithHistory only
  // re-classified the immediately-prior message from scratch; since that
  // message was ALSO ambiguous alone, the chain silently fell back to
  // general_chat mid-conversation, disabling the deterministic program
  // generator right when it had every field it needed.
  describe('multi-hop chain (walks back past consecutive ambiguous replies)', () => {
    it('reproduces the exact live-observed chain break at the SECOND ambiguous hop', () => {
      const turn1 = 'Create a 4-day PPL workout plan for me.';
      const turn2 = "I'm intermediate, I have full gym access, and I want to train Monday, Tuesday, Thursday, Friday.";
      const turn3 = '4 days per week total.';

      expect(classifyIntent(turn1)).toBe('workout_program_generate'); // sanity: direct match
      expect(classifyIntent(turn2)).toBe('general_chat'); // sanity: ambiguous alone (no plan/program keywords)
      expect(classifyIntent(turn3)).toBe('general_chat'); // sanity: ambiguous alone

      // Turn 2 correctly inherits via single-hop (already worked before this fix).
      expect(classifyIntentWithHistory(turn2, [turn1])).toBe('workout_program_generate');

      // Turn 3 is the actual live bug: a single-hop lookback re-classifies ONLY
      // turn2 in isolation (general_chat -> not engine-backed -> no inheritance),
      // losing the thread even though the conversation is unambiguous to a human.
      expect(classifyIntentWithHistory(turn3, [turn1, turn2])).toBe('workout_program_generate');
    });

    it('keeps walking back across THREE consecutive ambiguous replies', () => {
      const prior = [
        'Create a 4-day PPL workout plan for me.', // workout_program_generate
        "I'm intermediate.", // ambiguous alone
        'Full gym access.', // ambiguous alone
      ];
      expect(classifyIntent(prior[1])).toBe('general_chat');
      expect(classifyIntent(prior[2])).toBe('general_chat');
      expect(classifyIntentWithHistory('Monday, Tuesday, Thursday, Friday please.', prior)).toBe('workout_program_generate');
    });

    it('still never overrides a direct match on the current message, even mid-chain', () => {
      const prior = ['Create a 4-day PPL workout plan for me.', "I'm intermediate, full gym."];
      // A genuinely new request with its own direct classification wins outright.
      expect(classifyIntentWithHistory('Create a grocery list for this week', prior)).toBe('grocery_list');
    });
  });

  // ─── Bounded inheritance (runtime-hardening pass, 2026-08-01) ──────────────
  // An unbounded backward walk would let intent inheritance drift arbitrarily
  // far into the past — effectively never "timing out". A prior message that
  // confirms/saves or cancels an in-progress engine-backed flow must close
  // that episode, and a hard lookback cap stands in for a time-based cutoff
  // (no wall-clock timestamp is available to a pure text classifier).
  describe('bounded inheritance — closing signals and lookback cap', () => {
    it('a save-confirmation closes the episode: a later ambiguous message does not re-trigger the old engine', () => {
      const prior = [
        'Create a 4-day PPL workout plan for me.', // workout_program_generate
        "I'm intermediate, full gym, Monday, Tuesday, Thursday, Friday.", // inherits, ambiguous alone
        'Yes, save it.', // CLOSES the episode — plan is now saved
      ];
      // Without the boundary this would incorrectly walk past "Yes, save it."
      // all the way back to the original request and re-run program generation.
      expect(classifyIntentWithHistory('Thanks!', prior)).toBe('general_chat');
      expect(classifyIntentWithHistory('cool, appreciate it', prior)).toBe('general_chat');
    });

    it('a cancellation closes the episode the same way', () => {
      const prior = [
        'Create a 4-day PPL workout plan for me.',
        "I'm intermediate, full gym, Monday, Tuesday, Thursday, Friday.",
        'never mind, forget it',
      ];
      expect(classifyIntentWithHistory('ok', prior)).toBe('general_chat');
    });

    it('a closing signal does not block a genuinely new direct request afterward', () => {
      const prior = ['Create a 4-day PPL workout plan for me.', 'Yes, save it.'];
      // Direct matches always win regardless of any closing signal in history.
      expect(classifyIntentWithHistory('Create a grocery list for this week', prior)).toBe('grocery_list');
    });

    it('the save-confirmation message itself still resolves correctly when it IS the current message', () => {
      // Sanity: the closing-signal boundary only applies to messages already
      // in history — it must never block the save-confirmation turn itself
      // from inheriting the intent it needs to actually trigger the save.
      const prior = ['Create a 4-day PPL workout plan for me.', "I'm intermediate, full gym, Mon/Tue/Thu/Fri."];
      expect(classifyIntentWithHistory('Yes, save it.', prior)).toBe('workout_program_generate');
    });

    it('caps the backward walk — inheritance does not reach past MAX_INTENT_LOOKBACK messages', () => {
      // 9 filler ambiguous messages between the original request and "now" —
      // one more than the lookback cap allows.
      const filler = Array.from({ length: 9 }, (_, i) => `ok filler message ${i}`);
      const prior = ['Create a 4-day PPL workout plan for me.', ...filler];
      expect(classifyIntentWithHistory('sure', prior)).toBe('general_chat');
    });

    it('stays within the cap for a realistic, slightly-longer slot-filling conversation', () => {
      const prior = [
        'Create a 4-day PPL workout plan for me.',
        "I'm intermediate.",
        'Full gym access.',
        'Monday, Tuesday, Thursday, Friday.',
      ]; // 4 prior messages — comfortably inside the cap
      expect(classifyIntentWithHistory('sounds good to me', prior)).toBe('workout_program_generate');
    });

    // Explicit check for "old workout intent cannot capture later nutrition or
    // general questions": a genuine topic change to nutrition (its own direct
    // match) always wins, and — per the closing-signal test above — even a
    // purely ambiguous later question stays general_chat once the workout
    // episode has been closed out.
    it('an old workout intent cannot capture a later, unrelated nutrition question', () => {
      const prior = ['Create a 4-day PPL workout plan for me.', "I'm intermediate, full gym, Mon/Tue/Thu/Fri."];
      expect(classifyIntentWithHistory('I am vegetarian and have a low food budget, make me a muscle-gain meal plan', prior))
        .toBe('nutrition_plan_generate');
    });
  });
});
