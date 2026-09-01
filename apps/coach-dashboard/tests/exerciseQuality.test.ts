import { describe, it, expect } from 'vitest';
import {
  evaluateExerciseQuality,
  matchesQualityFilter,
  ExerciseQualityInput,
  getQualityStatusBadgeConfig,
  getQualityStatusLabel,
} from '../lib/exerciseQuality';

describe('Phase C Step 2: Catalog Quality Classification Model', () => {
  // Representative fixture 1: Incline Dumbbell Triceps Extension (Production-Ready with verified READY Media)
  const fixtureInclineDbTricepsExt: ExerciseQualityInput = {
    id: '00000000-0000-4000-a000-000000000358',
    name: 'Incline Dumbbell Triceps Extension',
    slug: 'incline-dumbbell-triceps-extension',
    source_type: 'yeti_first_party',
    primary_muscle: 'triceps brachii',
    target_muscle: 'triceps brachii',
    secondary_muscles: ['anterior deltoid'],
    equipment: 'dumbbells',
    category: 'triceps',
    difficulty: 'intermediate',
    movement_pattern: 'elbow extension',
    unilateral: false,
    setup_instructions: 'Set an incline bench to 45-60 degrees. Sit back with a dumbbell in each hand pressed overhead.',
    execution_instructions: 'Keeping upper arms fixed vertically, lower dumbbells behind head until triceps are fully stretched, then extend elbows.',
    breathing: 'Inhale on way down into deep stretch, exhale as you extend elbows to lockout.',
    coaching_cues: ['Keep elbows tucked in', 'Control eccentric stretch', 'Lock out triceps at apex'],
    common_mistakes: ['Flaring elbows out', 'Moving upper arms', 'Using momentum from torso'],
    safety_notes: 'Do not drop dumbbells behind head. Use spotter or drop to sides safely if fatigued.',
    default_sets: 3,
    default_reps: 12,
    default_reps_prescription: '10-12 reps with controlled tempo',
    tempo: '3-0-1-0',
    recommended_rest_seconds: 90,
    default_rest_period_sec: 90,
    media_status: 'READY',
    video_url: 'https://pub-668e851487db4bcd805e8291a2598217.r2.dev/exercises/incline-dumbbell-triceps-extension/demo.mp4',
    media: [
      {
        id: 'med-01',
        media_status: 'READY',
        url: 'https://pub-668e851487db4bcd805e8291a2598217.r2.dev/exercises/incline-dumbbell-triceps-extension/demo.mp4',
      },
    ],
    tags: [{ id: 'tag-1', tag: 'isolation', tag_type: 'category' }],
    muscles: [
      { id: 'mus-1', muscle: 'triceps brachii', role: 'primary' },
      { id: 'mus-2', muscle: 'anterior deltoid', role: 'secondary' },
    ],
    alternatives: [
      { id: 'alt-1', alternative_exercise_id: '00000000-0000-4000-a000-000000000359', reason: 'Cable Overhead Triceps Extension' },
      { id: 'alt-2', alternative_exercise_id: '00000000-0000-4000-a000-000000000360', reason: 'Skull Crushers' },
    ],
  };

  // Representative fixture 2: Cuffed Cable Lateral Raise (One of the 4 Yeti exercises missing alternatives)
  const fixtureCuffedCableLateralRaise: ExerciseQualityInput = {
    id: '00000000-0000-4000-a000-000000000267',
    name: 'Cuffed Cable Lateral Raise',
    slug: 'cuffed-cable-lateral-raise',
    source_type: 'yeti_first_party',
    primary_muscle: 'deltoids',
    target_muscle: 'lateral deltoid',
    secondary_muscles: ['trapezius', 'supraspinatus'],
    equipment: 'cable machine',
    category: 'shoulders',
    difficulty: 'intermediate',
    movement_pattern: 'shoulder abduction',
    unilateral: true,
    setup_instructions: 'Attach wrist cuff to low cable pulley behind your back or across body.',
    execution_instructions: 'Raise arm in scapular plane to shoulder height, keeping wrist neutral and leading with elbow.',
    breathing: 'Exhale as you raise arm, inhale on controlled descent.',
    coaching_cues: ['Lead with elbow', 'Slight forward lean', 'Maintain constant tension'],
    common_mistakes: ['Shrugging traps to initiate movement', 'Swinging torso for momentum'],
    safety_notes: 'Do not raise above parallel if experiencing shoulder impingement.',
    default_sets: 3,
    default_reps: 15,
    default_reps_prescription: '12-15 reps with pause at top',
    tempo: '2-1-1-1',
    recommended_rest_seconds: 60,
    default_rest_period_sec: 60,
    media_status: 'TO_CREATE',
    video_url: null,
    gif_url: null,
    media: [
      {
        id: 'med-02',
        media_status: 'TO_CREATE',
        url: null,
      },
    ],
    tags: [{ id: 'tag-1', tag: 'isolation', tag_type: 'category' }],
    muscles: [
      { id: 'mus-1', muscle: 'deltoids', role: 'primary' },
      { id: 'mus-2', muscle: 'trapezius', role: 'secondary' },
    ],
    alternatives: [], // Intentionally empty - missing alternatives
  };

  // Representative fixture 3: Legacy Catalog Skeleton
  const fixtureLegacySkeleton: ExerciseQualityInput = {
    id: 'a67fc4e4-ab25-4e30-8dd0-e9b4f9b37aa8',
    name: 'Adductor (Legacy a67f)',
    slug: 'adductor-legacy-a67f',
    source_type: 'legacy_catalog',
    primary_muscle: 'adductors',
    target_muscle: 'adductors',
    secondary_muscles: [],
    muscle_group: 'Legs',
    equipment: 'machine',
    category: 'strength',
    difficulty: 'beginner',
    movement_pattern: null,
    unilateral: false,
    setup_instructions: null,
    execution_instructions: null,
    breathing: null,
    coaching_cues: null,
    common_mistakes: null,
    safety_notes: null,
    default_sets: 3,
    default_reps: 10,
    default_reps_prescription: '3 sets of 10 reps',
    tempo: 'Controlled',
    recommended_rest_seconds: null,
    default_rest_period_sec: 60,
    media_status: null,
    video_url: null,
    gif_url: null,
    tags: [],
    muscles: [],
    alternatives: [],
  };

  describe('1. Classification Status Requirements & Precedence', () => {
    it('complete Yeti + READY media resolves to fully_published', () => {
      const res = evaluateExerciseQuality(fixtureInclineDbTricepsExt);
      expect(res.status).toBe('fully_published');
      expect(res.contentReady).toBe(true);
      expect(res.relationReady).toBe(true);
      expect(res.mediaReady).toBe(true);
      expect(res.fullyPublished).toBe(true);
      expect(res.score).toBe(100);
    });

    it('complete Yeti + TO_CREATE media resolves to content_ready (Ready — Needs Media)', () => {
      const awaitingMediaYeti: ExerciseQualityInput = {
        ...fixtureInclineDbTricepsExt,
        media_status: 'TO_CREATE',
        video_url: null,
        media: [{ id: 'med-01', media_status: 'TO_CREATE', url: null }],
      };
      const res = evaluateExerciseQuality(awaitingMediaYeti);
      expect(res.status).toBe('content_ready');
      expect(res.contentReady).toBe(true);
      expect(res.relationReady).toBe(true);
      expect(res.mediaReady).toBe(false);
      expect(res.fullyPublished).toBe(false);
      expect(res.score).toBe(90);
    });

    it('complete Yeti missing alternatives resolves to needs_relations', () => {
      const res = evaluateExerciseQuality(fixtureCuffedCableLateralRaise);
      expect(res.status).toBe('needs_relations');
      expect(res.contentReady).toBe(true);
      expect(res.relationReady).toBe(false);
      expect(res.missingRelations).toContain('exercise_alternatives');
    });

    it('legacy skeleton resolves to reference_only', () => {
      const res = evaluateExerciseQuality(fixtureLegacySkeleton);
      expect(res.status).toBe('reference_only');
      expect(res.contentReady).toBe(false);
      expect(res.relationReady).toBe(false);
      expect(res.mediaReady).toBe(false);
    });

    it('legacy exercise with perfect content, relations, and READY media remains reference_only (Legacy Boundary Rule)', () => {
      const perfectLegacy: ExerciseQualityInput = {
        ...fixtureInclineDbTricepsExt,
        id: 'leg-perfect-01',
        source_type: 'legacy_catalog',
      };
      const res = evaluateExerciseQuality(perfectLegacy);
      expect(res.status).toBe('reference_only');
      expect(res.fullyPublished).toBe(false);
      expect(res.taxonomyReady).toBe(true);
      expect(res.coachingReady).toBe(true);
      expect(res.rxReady).toBe(true);
      expect(res.relationReady).toBe(true);
      expect(res.mediaReady).toBe(true);
    });

    it('fully_published is strictly gate-derived (taxonomy + coaching + rx + relations + READY media + curated source)', () => {
      const res = evaluateExerciseQuality(fixtureInclineDbTricepsExt);
      expect(res.taxonomyReady).toBe(true);
      expect(res.coachingReady).toBe(true);
      expect(res.rxReady).toBe(true);
      expect(res.contentReady).toBe(true);
      expect(res.relationReady).toBe(true);
      expect(res.mediaReady).toBe(true);
      expect(res.fullyPublished).toBe(true);
      expect(res.status).toBe('fully_published');
    });

    it('proves mutually exclusive classification across representative overlapping states', () => {
      const candidate1: ExerciseQualityInput = {
        ...fixtureInclineDbTricepsExt,
        source_type: 'legacy_catalog', // Legacy takes precedence -> reference_only
      };
      expect(evaluateExerciseQuality(candidate1).status).toBe('reference_only');

      const candidate2: ExerciseQualityInput = {
        id: 'draft-tax-only',
        source_type: 'custom',
        primary_muscle: 'chest',
        equipment: 'barbell',
        category: 'chest',
        difficulty: 'beginner',
        movement_pattern: 'horizontal push',
        // coaching missing
      };
      expect(evaluateExerciseQuality(candidate2).status).toBe('needs_content');

      const candidate3: ExerciseQualityInput = {
        id: 'draft-coaching-only',
        source_type: 'custom',
        setup_instructions: 'Set up bench',
        execution_instructions: 'Press bar up',
        coaching_cues: ['Keep wrists straight'],
        common_mistakes: ['Bouncing bar'],
        safety_notes: 'Use collars',
        breathing: 'Inhale down, exhale up',
        // taxonomy missing
      };
      expect(evaluateExerciseQuality(candidate3).status).toBe('needs_taxonomy');

      const candidate4: ExerciseQualityInput = {
        id: 'draft-no-tax-no-coach',
        source_type: 'custom',
      };
      expect(evaluateExerciseQuality(candidate4).status).toBe('reference_only');

      const candidate5: ExerciseQualityInput = {
        ...fixtureInclineDbTricepsExt,
        media_status: 'TO_CREATE',
        video_url: 'https://cdn.example.com/placeholder.mp4', // TO_CREATE with URL is still unpublished
        media: [{ id: 'm1', media_status: 'TO_CREATE', url: 'https://cdn.example.com/placeholder.mp4' }],
      };
      const res5 = evaluateExerciseQuality(candidate5);
      expect(res5.mediaReady).toBe(false);
      expect(res5.status).toBe('content_ready');
    });
  });

  describe('2. Meaningful Presence Validation', () => {
    it('treats whitespace-only and placeholder strings as missing', () => {
      const ex: ExerciseQualityInput = {
        ...fixtureInclineDbTricepsExt,
        setup_instructions: '   ',
        execution_instructions: 'N/A',
        breathing: 'none',
        safety_notes: '-',
      };
      const res = evaluateExerciseQuality(ex);
      expect(res.hasCoaching).toBe(false);
      expect(res.missingFields).toContain('setup_instructions');
      expect(res.missingFields).toContain('execution_instructions');
      expect(res.missingFields).toContain('breathing');
      expect(res.missingFields).toContain('safety_notes');
    });

    it('treats empty arrays as missing', () => {
      const ex: ExerciseQualityInput = {
        ...fixtureInclineDbTricepsExt,
        coaching_cues: [],
        common_mistakes: ['   ', 'N/A'],
      };
      const res = evaluateExerciseQuality(ex);
      expect(res.missingFields).toContain('coaching_cues');
      expect(res.missingFields).toContain('common_mistakes');
    });

    it('treats non-positive sets, invalid reps, and zero rest period as missing', () => {
      const ex: ExerciseQualityInput = {
        ...fixtureInclineDbTricepsExt,
        default_sets: 0,
        default_reps: -5,
        default_reps_prescription: '   ',
        recommended_rest_seconds: 0,
        default_rest_period_sec: null,
      };
      const res = evaluateExerciseQuality(ex);
      expect(res.hasPrescription).toBe(false);
      expect(res.missingFields).toContain('default_sets');
      expect(res.missingFields).toContain('default_reps');
      expect(res.missingFields).toContain('rest_period');
    });

    it('respects prescription fallback precedence: default_reps > default_reps_prescription, rest_seconds > default_rest_period_sec', () => {
      const exWithTextReps: ExerciseQualityInput = {
        ...fixtureInclineDbTricepsExt,
        default_reps: null,
        default_reps_prescription: '3 sets of 8-12 reps',
        recommended_rest_seconds: null,
        default_rest_period_sec: 90,
      };
      const res = evaluateExerciseQuality(exWithTextReps);
      expect(res.hasPrescription).toBe(true);
      expect(res.dimensions.prescription.complete).toBe(true);
    });
  });

  describe('3. Media Readiness Strict Rules', () => {
    it('proves the 100-point scoring formula: 25 tax + 35 coach + 15 rx + 15 rel + 10 media = 100', () => {
      const res = evaluateExerciseQuality(fixtureInclineDbTricepsExt);
      expect(res.dimensions.taxonomy.maxScore).toBe(25);
      expect(res.dimensions.coaching.maxScore).toBe(35);
      expect(res.dimensions.prescription.maxScore).toBe(15);
      expect(res.dimensions.requiredRelations.maxScore).toBe(15);
      expect(res.dimensions.media.maxScore).toBe(10);
      expect(
        res.dimensions.taxonomy.maxScore +
        res.dimensions.coaching.maxScore +
        res.dimensions.prescription.maxScore +
        res.dimensions.requiredRelations.maxScore +
        res.dimensions.media.maxScore
      ).toBe(100);
      expect(res.score).toBe(100);
    });

    it('TO_CREATE media status never counts as mediaReady', () => {
      const toCreateExercise: ExerciseQualityInput = {
        ...fixtureInclineDbTricepsExt,
        media_status: 'TO_CREATE',
        video_url: null,
        media: [{ id: 'm1', media_status: 'TO_CREATE', url: 'https://cdn.example.com/placeholder.mp4' }],
      };
      const res = evaluateExerciseQuality(toCreateExercise);
      expect(res.mediaReady).toBe(false);
      expect(res.status).not.toBe('fully_published');
    });

    it('malformed or non-HTTPS locator never counts as mediaReady', () => {
      const malformedExercise: ExerciseQualityInput = {
        ...fixtureInclineDbTricepsExt,
        media_status: 'READY',
        video_url: 'ftp://not-https-url',
        media: [{ id: 'm1', media_status: 'READY', url: 'invalid-url' }],
      };
      const res = evaluateExerciseQuality(malformedExercise);
      expect(res.mediaReady).toBe(false);
      expect(res.status).not.toBe('fully_published');
    });

    it('score 100 strictly requires verified READY HTTPS media (max score without READY media <= 90)', () => {
      const nonReadyExercise: ExerciseQualityInput = {
        ...fixtureInclineDbTricepsExt,
        media_status: 'TO_CREATE',
        video_url: null,
        media: [{ id: 'med-01', media_status: 'TO_CREATE', url: null }],
      };
      const res = evaluateExerciseQuality(nonReadyExercise);
      expect(res.score).toBe(90);
      expect(res.score).toBeLessThan(100);
    });
  });

  describe('4. Relation Readiness Contract', () => {
    it('absence of aliases does NOT fail relationReady', () => {
      const noAliasesExercise: ExerciseQualityInput = {
        ...fixtureInclineDbTricepsExt,
        aliases: [],
      };
      const res = evaluateExerciseQuality(noAliasesExercise);
      expect(res.relationReady).toBe(true);
      expect(res.status).toBe('fully_published');
    });

    it('missing normalized tags fails relationReady and triggers needs_relations', () => {
      const noTagsExercise: ExerciseQualityInput = {
        ...fixtureInclineDbTricepsExt,
        tags: [],
      };
      const res = evaluateExerciseQuality(noTagsExercise);
      expect(res.relationReady).toBe(false);
      expect(res.status).toBe('needs_relations');
      expect(res.missingRelations).toContain('exercise_tags');
    });

    it('missing normalized muscles fails relationReady and triggers needs_relations', () => {
      const noMusclesExercise: ExerciseQualityInput = {
        ...fixtureInclineDbTricepsExt,
        muscles: [],
      };
      const res = evaluateExerciseQuality(noMusclesExercise);
      expect(res.relationReady).toBe(false);
      expect(res.status).toBe('needs_relations');
      expect(res.missingRelations).toContain('exercise_muscles');
    });
  });

  describe('5. Global Quality Filtering & Pagination Invariant', () => {
    it('returns matching quality rows even when raw page 1 contains 0 matching rows', () => {
      // Simulate a dataset where rows 0..15 are content_ready, and rows 16..17 are needs_relations
      const simulatedCatalog: ExerciseQualityInput[] = [];
      for (let i = 0; i < 20; i++) {
        if (i >= 16 && i < 18) {
          // Items 16 and 17 need relations (like Cuffed Cable Lateral Raise)
          simulatedCatalog.push({
            ...fixtureCuffedCableLateralRaise,
            id: `cable-raise-${i}`,
            name: `Cable Lateral Raise ${i}`,
          });
        } else {
          // Items 0..15 and 18..19 are content_ready
          simulatedCatalog.push({
            ...fixtureInclineDbTricepsExt,
            id: `triceps-ext-${i}`,
            name: `Triceps Extension ${i}`,
            media_status: 'TO_CREATE',
            media: [{ id: `m-${i}`, media_status: 'TO_CREATE', url: null }],
          });
        }
      }

      // 1. Raw page 1 (slice 0..16) has 0 needs_relations exercises:
      const rawPage1 = simulatedCatalog.slice(0, 16);
      const rawPage1NeedsRel = rawPage1.filter(ex => matchesQualityFilter(ex, 'needs_relations'));
      expect(rawPage1NeedsRel.length).toBe(0);

      // 2. Global quality filter applied across the catalog:
      const globalFiltered = simulatedCatalog.filter(ex => matchesQualityFilter(ex, 'needs_relations'));
      expect(globalFiltered.length).toBe(2);
      expect(globalFiltered.map(e => e.id)).toEqual(['cable-raise-16', 'cable-raise-17']);

      // 3. Paginated quality-filtered page 1:
      const pageSize = 16;
      const pageNumber = 1;
      const filteredPage1 = globalFiltered.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
      expect(filteredPage1.length).toBe(2);
      expect(filteredPage1[0].id).toBe('cable-raise-16');
      expect(filteredPage1[1].id).toBe('cable-raise-17');
    });
  });

  describe('6. UI Badge and Label Configs', () => {
    it('provides distinct badge styling and readable labels for all quality statuses', () => {
      const statuses = [
        'fully_published',
        'content_ready',
        'needs_relations',
        'needs_content',
        'needs_taxonomy',
        'reference_only',
      ] as const;

      for (const status of statuses) {
        const badge = getQualityStatusBadgeConfig(status);
        expect(badge.label).toBeTruthy();
        expect(badge.bgClass).toBeTruthy();
        expect(badge.textClass).toBeTruthy();
        expect(badge.borderClass).toBeTruthy();

        const label = getQualityStatusLabel(status);
        expect(label).toBeTruthy();
      }
    });
  });
});
