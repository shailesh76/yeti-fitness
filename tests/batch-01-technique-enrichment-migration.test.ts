import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

describe('20260817200000_batch_01_technique_enrichment migration', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../supabase/migrations/20260817200000_batch_01_technique_enrichment.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');

  const EXPECTED_25_SLUGS = [
    'incline-barbell-bench-press',
    'incline-dumbbell-press',
    'machine-chest-press',
    'decline-dumbbell-press',
    'conventional-deadlift',
    'pendlay-row',
    'lat-pulldown',
    't-bar-row',
    'barbell-overhead-press',
    'arnold-press',
    'seated-barbell-shoulder-press',
    'front-squat',
    'goblet-squat',
    'hack-squat',
    'romanian-deadlift',
    'cable-pull-through',
    'smith-machine-hip-thrust',
    'cable-glute-kickback',
    'standing-calf-raise-machine',
    'seated-calf-raise-machine',
    'ez-bar-curl',
    'hammer-curl',
    'close-grip-bench-press',
    'ez-bar-skull-crusher',
    'hanging-leg-raise',
  ];

  const PILOT_SLUGS = [
    'barbell-bench-press',
    'barbell-bent-over-row',
    'back-squat',
    'barbell-curl',
    'ab-wheel-rollout-from-knees',
  ];

  const ALLOWED_UPDATE_FIELDS = [
    'setup_instructions',
    'execution_instructions',
    'breathing',
    'coaching_cues',
    'common_mistakes',
    'safety_notes',
  ];

  describe('Static assertions on migration file', () => {
    it('does not contain any hard-coded UUIDs', () => {
      // Should not contain explicit UUID format
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
      expect(sql).not.toMatch(uuidRegex);
      expect(sql).not.toContain('::uuid');
    });

    it('contains all 25 exact target slugs', () => {
      expect(EXPECTED_25_SLUGS).toHaveLength(25);
      for (const slug of EXPECTED_25_SLUGS) {
        expect(sql).toContain(`'${slug}'`);
      }
    });

    it('strictly restricts matching to canonical yeti_first_party exercises', () => {
      expect(sql).toContain("source_type = 'yeti_first_party'");
      // UPDATE statement must join on yeti_first_party
      const updateSection = sql.slice(sql.indexOf('UPDATE public.exercises'));
      expect(updateSection).toContain("e.source_type = 'yeti_first_party'");
    });

    it('updates exactly the six allowed technique fields and no others', () => {
      const updateMatch = sql.match(/UPDATE public\.exercises AS e\s+SET([\s\S]+?)FROM/i);
      expect(updateMatch).not.toBeNull();
      const setClause = updateMatch![1];

      // Verify each allowed field is assigned
      for (const field of ALLOWED_UPDATE_FIELDS) {
        const fieldAssignment = new RegExp(`\\b${field}\\s*=\\s*p\\.${field}\\b`);
        expect(setClause).toMatch(fieldAssignment);
      }

      // Verify no forbidden fields are updated (id, slug, name, source_type, created_at, updated_at, etc.)
      const forbiddenFields = [
        'id',
        'slug',
        'name',
        'source_type',
        'equipment',
        'primary_muscle',
        'movement_pattern',
        'media_status',
        'created_at',
        'updated_at',
      ];
      for (const forbidden of forbiddenFields) {
        const forbiddenPattern = new RegExp(`\\b${forbidden}\\s*=`);
        expect(setClause).not.toMatch(forbiddenPattern);
      }
    });

    it('retains strict preflight checks for 25/25 invariants, ambiguity, and pilot exclusion', () => {
      // Exactly 25 payload definitions
      expect(sql).toContain('v_payload_count <> 25');
      // No duplicate target slug definitions
      expect(sql).toContain('v_distinct_payload_count <> 25');
      // Pilot exercises protected
      expect(sql).toContain('pilot exercises detected in batch update list');
      for (const pilotSlug of PILOT_SLUGS) {
        expect(sql).toContain(`'${pilotSlug}'`);
      }
      // Ambiguity check
      expect(sql).toContain('match multiple canonical exercises (ambiguous)');
      // Missing check
      expect(sql).toContain('missing matching canonical exercise');
      // Exactly 25 matching canonical exercises
      expect(sql).toContain('v_match_count <> 25');
      // Postflight verification of 25 enriched exercises
      expect(sql).toContain('v_updated <> 25');
    });

    it('checks active/non-archived state if supported by the schema', () => {
      expect(sql).toContain("column_name = 'archived_at'");
      expect(sql).toContain("column_name = 'is_active'");
      expect(sql).toContain('target exercise(s) are archived');
      expect(sql).toContain('target exercise(s) are inactive');
    });
  });

  describe('Simulation of preflight and update logic', () => {
    interface ExerciseRow {
      id: string;
      slug: string;
      source_type: string;
      archived_at?: string | null;
      is_active?: boolean;
      setup_instructions?: string;
      execution_instructions?: string;
      breathing?: string;
      coaching_cues?: string[];
      common_mistakes?: string[];
      safety_notes?: string;
      name: string;
    }

    const makeCanonical25 = (): ExerciseRow[] => {
      return EXPECTED_25_SLUGS.map((slug, idx) => ({
        id: `random-uuid-${idx + 1}-${Math.random().toString(36).substring(2, 9)}`,
        slug,
        source_type: 'yeti_first_party',
        archived_at: null,
        is_active: true,
        name: `Canonical ${slug}`,
        setup_instructions: 'old setup',
        execution_instructions: 'old exec',
        breathing: 'old breathing',
        coaching_cues: ['old cue'],
        common_mistakes: ['old mistake'],
        safety_notes: 'old safety',
      }));
    };

    const runMigrationLogic = (
      payload: Array<{
        slug: string;
        setup: string;
        exec: string;
        breath: string;
        cues: string[];
        mistakes: string[];
        safety: string;
      }>,
      exercises: ExerciseRow[]
    ) => {
      // 1. Exactly 25 payload definitions
      if (payload.length !== 25) {
        throw new Error(`Aborting: expected 25 payload definitions, found ${payload.length}`);
      }

      // 2. Distinct slugs
      const distinctSlugs = new Set(payload.map((p) => p.slug));
      if (distinctSlugs.size !== 25) {
        throw new Error(`Aborting: duplicate target slug definitions found in payload`);
      }

      // 3. Pilot exercises
      const pilotFound = payload.filter((p) => PILOT_SLUGS.includes(p.slug));
      if (pilotFound.length > 0) {
        throw new Error('Aborting: pilot exercises detected in batch update list');
      }

      // 4. Ambiguous check
      for (const p of payload) {
        const matches = exercises.filter(
          (e) => e.slug === p.slug && e.source_type === 'yeti_first_party'
        );
        if (matches.length > 1) {
          throw new Error(`Aborting: target slug match multiple canonical exercises (ambiguous): ${p.slug}`);
        }
      }

      // 5. Missing check
      for (const p of payload) {
        const matches = exercises.filter(
          (e) => e.slug === p.slug && e.source_type === 'yeti_first_party'
        );
        if (matches.length === 0) {
          throw new Error(`Aborting: target slug missing matching canonical exercise: ${p.slug}`);
        }
      }

      // 6. Exactly 25 matching canonical exercises
      const matched = exercises.filter(
        (e) =>
          payload.some((p) => p.slug === e.slug) &&
          e.source_type === 'yeti_first_party'
      );
      if (matched.length !== 25) {
        throw new Error(`Aborting: expected 25 matching canonical exercises, found ${matched.length}`);
      }

      // 7. Active / non-archived state
      const archived = matched.filter((e) => e.archived_at != null || e.is_active === false);
      if (archived.length > 0) {
        throw new Error(`Aborting: target exercise(s) are archived or inactive`);
      }

      // UPDATE
      let updatedCount = 0;
      for (const e of exercises) {
        const p = payload.find((item) => item.slug === e.slug && e.source_type === 'yeti_first_party');
        if (p) {
          e.setup_instructions = p.setup;
          e.execution_instructions = p.exec;
          e.breathing = p.breath;
          e.coaching_cues = p.cues;
          e.common_mistakes = p.mistakes;
          e.safety_notes = p.safety;
          updatedCount++;
        }
      }

      // Postflight
      if (updatedCount !== 25) {
        throw new Error(`Aborting: expected 25 enriched exercises after update, verified ${updatedCount}`);
      }

      return updatedCount;
    };

    const makeValidPayload = () => {
      return EXPECTED_25_SLUGS.map((slug) => ({
        slug,
        setup: `new setup for ${slug}`,
        exec: `new exec for ${slug}`,
        breath: `new breath for ${slug}`,
        cues: [`cue 1 for ${slug}`],
        mistakes: [`mistake 1 for ${slug}`],
        safety: `safety for ${slug}`,
      }));
    };

    it('succeeds with fresh bootstrap canonical exercises with generated UUIDs', () => {
      const canonicalExercises = makeCanonical25();
      const payload = makeValidPayload();

      const updated = runMigrationLogic(payload, canonicalExercises);
      expect(updated).toBe(25);

      // Verify all 25 canonical exercises received the new instructions
      for (const e of canonicalExercises) {
        expect(e.setup_instructions).toBe(`new setup for ${e.slug}`);
        expect(e.execution_instructions).toBe(`new exec for ${e.slug}`);
        expect(e.breathing).toBe(`new breath for ${e.slug}`);
        expect(e.name).toBe(`Canonical ${e.slug}`); // name untouched
      }
    });

    it('does not touch non-target exercises or non-first-party exercises', () => {
      const canonicalExercises = makeCanonical25();
      // Add a non-target canonical exercise
      const nonTarget: ExerciseRow = {
        id: 'random-other-id',
        slug: 'barbell-bench-press',
        source_type: 'yeti_first_party',
        name: 'Barbell Bench Press',
        setup_instructions: 'original setup',
        execution_instructions: 'original exec',
      };
      // Add a third-party exercise that shares a slug with a target
      const thirdPartySameSlug: ExerciseRow = {
        id: 'random-third-party-id',
        slug: 'incline-barbell-bench-press',
        source_type: 'community',
        name: 'Community Incline Press',
        setup_instructions: 'community setup',
      };

      const allExercises = [...canonicalExercises, nonTarget, thirdPartySameSlug];
      const payload = makeValidPayload();

      const updated = runMigrationLogic(payload, allExercises);
      expect(updated).toBe(25);

      // Verify non-target was untouched
      expect(nonTarget.setup_instructions).toBe('original setup');
      // Verify third-party was untouched
      expect(thirdPartySameSlug.setup_instructions).toBe('community setup');
    });

    it('aborts if any target slug is missing from the database', () => {
      // Only 24 canonical exercises present
      const canonicalExercises = makeCanonical25().slice(1);
      const payload = makeValidPayload();

      expect(() => runMigrationLogic(payload, canonicalExercises)).toThrow(
        /missing matching canonical exercise/
      );
    });

    it('aborts if a target slug has ambiguous canonical matches', () => {
      const canonicalExercises = makeCanonical25();
      // Duplicate one canonical exercise
      canonicalExercises.push({
        ...canonicalExercises[0],
        id: 'another-generated-uuid',
      });
      const payload = makeValidPayload();

      expect(() => runMigrationLogic(payload, canonicalExercises)).toThrow(
        /match multiple canonical exercises \(ambiguous\)/
      );
    });

    it('aborts if payload contains duplicate target slug definitions', () => {
      const canonicalExercises = makeCanonical25();
      const payload = makeValidPayload();
      payload[1].slug = payload[0].slug; // Duplicate slug

      expect(() => runMigrationLogic(payload, canonicalExercises)).toThrow(
        /duplicate target slug definitions/
      );
    });

    it('aborts if payload has fewer or more than 25 definitions', () => {
      const canonicalExercises = makeCanonical25();
      const payload = makeValidPayload().slice(0, 24); // 24 items

      expect(() => runMigrationLogic(payload, canonicalExercises)).toThrow(
        /expected 25 payload definitions/
      );
    });

    it('aborts if payload includes a pilot exercise', () => {
      const canonicalExercises = makeCanonical25();
      const payload = makeValidPayload();
      payload[0].slug = 'barbell-bench-press'; // Pilot exercise

      expect(() => runMigrationLogic(payload, canonicalExercises)).toThrow(
        /pilot exercises detected/
      );
    });

    it('aborts if a matching canonical exercise is archived or inactive', () => {
      const canonicalExercises = makeCanonical25();
      canonicalExercises[0].archived_at = new Date().toISOString();
      const payload = makeValidPayload();

      expect(() => runMigrationLogic(payload, canonicalExercises)).toThrow(
        /target exercise\(s\) are archived or inactive/
      );
    });
  });
});
