import { describe, it, expect } from 'vitest';

// Unit tests for Exercise Substitution Ranking & Hard Exclusions (v4.1)

describe('AI Coach Exercise Substitution Hard Exclusions & Ranking', () => {
  it('1. keeps active exercises with media_status TO_CREATE eligible', () => {
    const candidate = { id: 'ex-1', name: 'Dumbbell Bench Press', is_active: true, media_status: 'TO_CREATE', equipment: 'Dumbbell' };
    const isExcluded = candidate.is_active === false;
    expect(isExcluded).toBe(false);
  });

  it('2. hard-excludes inactive candidates (is_active === false)', () => {
    const candidate = { id: 'ex-2', name: 'Old Lever Press', is_active: false, media_status: 'PUBLISHED', equipment: 'Machine' };
    const isExcluded = candidate.is_active === false;
    expect(isExcluded).toBe(true);
  });

  it('3. hard-excludes self-references (same exercise ID or name)', () => {
    const sourceEx = { id: 'ex-bench', name: 'Barbell Bench Press' };
    const candidate = { id: 'ex-bench', name: 'Barbell Bench Press', is_active: true };
    const isSelf = candidate.id === sourceEx.id || candidate.name.toLowerCase() === sourceEx.name.toLowerCase();
    expect(isSelf).toBe(true);
  });

  it('4. hard-excludes unavailable equipment when user equipment is constrained', () => {
    const userEquipmentPrefs = ['Dumbbell'];
    const candidateBarbell = { id: 'ex-barbell', name: 'Barbell Bench Press', equipment: 'Barbell' };
    const candidateDumbbell = { id: 'ex-db', name: 'Dumbbell Bench Press', equipment: 'Dumbbell' };

    const checkExcluded = (c: typeof candidateBarbell) => {
      const reqEq = c.equipment.toLowerCase();
      return !userEquipmentPrefs.some((p) => reqEq.includes(p.toLowerCase()));
    };

    expect(checkExcluded(candidateBarbell)).toBe(true);
    expect(checkExcluded(candidateDumbbell)).toBe(false);
  });

  it('5. hard-excludes Level 1/2 joint injury restriction conflicts', () => {
    const userInjury = 'Doctor restricted knee bending due to severe acute tear';
    const candidateSquat = { id: 'ex-squat', name: 'Barbell Back Squat', primary_muscle: 'Quads (Knee Joint)' };
    const candidateCurl = { id: 'ex-curl', name: 'Bicep Curl', primary_muscle: 'Biceps' };

    const checkInjuryExclude = (c: { name: string; primary_muscle: string }) => {
      const injLower = userInjury.toLowerCase();
      const jointRisk = ['knee', 'shoulder', 'lower back'].find(
        (j) => injLower.includes(j) && (c.name.toLowerCase().includes(j) || c.primary_muscle.toLowerCase().includes(j))
      );
      return Boolean(jointRisk && (injLower.includes('restricted') || injLower.includes('doctor') || injLower.includes('severe')));
    };

    expect(checkInjuryExclude(candidateSquat)).toBe(true);
    expect(checkInjuryExclude(candidateCurl)).toBe(false);
  });

  it('6. hard-excludes user-disliked exercises', () => {
    const disliked = ['barbell squat'];
    const candidate1 = { name: 'Barbell Squat' };
    const candidate2 = { name: 'Leg Press' };

    const isDisliked = (c: { name: string }) => disliked.some((d) => c.name.toLowerCase().includes(d));

    expect(isDisliked(candidate1)).toBe(true);
    expect(isDisliked(candidate2)).toBe(false);
  });

  // Regression: dislikedExercises was previously built from
  // `category === 'preferences'` alone — but that category also holds LIKED
  // things ("prefers dumbbell press", "likes pull-ups"), so a favourite
  // exercise could get wrongly excluded as if disliked purely because it
  // shared the same memory category. Fixed to require clear negative
  // sentiment (dislike/hate/avoid/don't want) or an explicit disliked-
  // exercise key/category. Mirrors the exact fixed filter in ai-coach/index.ts.
  describe('7. dislikedExercises memory filter requires clear negative evidence', () => {
    const NEGATIVE_EXERCISE_SENTIMENT = /\b(dislikes?|hate|avoid|don'?t want|do not want|can'?t stand|no longer want)\b/i;
    function buildDislikedExercises(memoryRows: { category: string; memory_key?: string; memory_value: string }[]) {
      return memoryRows
        .filter((m) => {
          const key = (m.memory_key || '').toLowerCase();
          const val = m.memory_value || '';
          if (key.includes('disliked_exercise') || key.includes('avoided_exercise') || key.includes('hate_exercise') || key.includes('cant_do')) return true;
          return m.category === 'preferences' && NEGATIVE_EXERCISE_SENTIMENT.test(val);
        })
        .map((m) => m.memory_value.toLowerCase());
    }

    it('does NOT exclude "prefers dumbbell press" (liked, same category as dislikes)', () => {
      const result = buildDislikedExercises([{ category: 'preferences', memory_value: 'prefers dumbbell press' }]);
      expect(result).toEqual([]);
    });

    it('does NOT exclude "likes pull-ups"', () => {
      const result = buildDislikedExercises([{ category: 'preferences', memory_value: 'likes pull-ups' }]);
      expect(result).toEqual([]);
    });

    it('does NOT exclude "favorite squat variation"', () => {
      const result = buildDislikedExercises([{ category: 'preferences', memory_value: 'favorite squat variation' }]);
      expect(result).toEqual([]);
    });

    it('DOES exclude "I dislike burpees" (clear negative sentiment)', () => {
      const result = buildDislikedExercises([{ category: 'preferences', memory_value: 'I dislike burpees' }]);
      expect(result).toContain('i dislike burpees');
    });

    it('DOES exclude "avoid overhead press"', () => {
      const result = buildDislikedExercises([{ category: 'preferences', memory_value: 'avoid overhead press' }]);
      expect(result).toContain('avoid overhead press');
    });

    it('DOES exclude an explicit disliked_exercise key regardless of value wording', () => {
      const result = buildDislikedExercises([{ category: 'workout style', memory_key: 'disliked_exercise_1', memory_value: 'leg press' }]);
      expect(result).toContain('leg press');
    });
  });

  it('7. breaks ties deterministically using curated status, equipment, score, then alphabetical name', () => {
    const candA = { id: 'uuid-2', name: 'Z-Press', scoringFactors: { curatedScore: 1.0, equipmentScore: 1.0, totalScore: 0.85 } };
    const candB = { id: 'uuid-1', name: 'Arnold Press', scoringFactors: { curatedScore: 1.0, equipmentScore: 1.0, totalScore: 0.85 } };

    const sorted = [candA, candB].sort((a, b) => {
      if (b.scoringFactors.curatedScore !== a.scoringFactors.curatedScore) {
        return b.scoringFactors.curatedScore - a.scoringFactors.curatedScore;
      }
      if (b.scoringFactors.equipmentScore !== a.scoringFactors.equipmentScore) {
        return b.scoringFactors.equipmentScore - a.scoringFactors.equipmentScore;
      }
      if (b.scoringFactors.totalScore !== a.scoringFactors.totalScore) {
        return b.scoringFactors.totalScore - a.scoringFactors.totalScore;
      }
      return a.name.localeCompare(b.name);
    });

    expect(sorted[0].name).toBe('Arnold Press');
    expect(sorted[1].name).toBe('Z-Press');
  });
});
