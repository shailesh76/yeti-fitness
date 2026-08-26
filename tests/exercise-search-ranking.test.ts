import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  buildExerciseSearchIndexEntry,
  scoreExerciseRelevance,
  rankExercisesByRelevance,
  matchesExerciseSearch,
  EXERCISE_RELEVANCE,
  FIRST_PARTY_SOURCE_TYPE,
  isExerciseCacheSearchComplete,
} from '../packages/database/src/repositories/ExerciseRepository';

const FP = FIRST_PARTY_SOURCE_TYPE;
const score = (ex: any, q: string) => scoreExerciseRelevance(buildExerciseSearchIndexEntry(ex), q);
const rankedIds = (list: any[], q: string) => rankExercisesByRelevance(list, q).map(e => e.id);

// ── Tier scoring (deterministic relevance ladder) ───────────────────────────

describe('scoreExerciseRelevance — deterministic tiers', () => {
  const q = 'bench press';

  it('assigns each tier its documented score (highest → lowest), non-first-party', () => {
    // exact normalized name
    expect(score({ name: 'Bench Press' }, q)).toBe(EXERCISE_RELEVANCE.EXACT_NAME);
    // normalized name starts with the query
    expect(score({ name: 'Bench Press Wide Grip' }, q)).toBe(EXERCISE_RELEVANCE.NAME_PREFIX);
    // all query tokens in the name, but not a prefix
    expect(score({ name: 'Wide Grip Bench Press Variation X' }, q)).toBe(EXERCISE_RELEVANCE.NAME_ALL_TOKENS);
    // canonical/alias match (tokens live in an alias, not the name)
    expect(score({ name: 'Chest Fly', search_aliases: ['bench press'] }, q)).toBe(EXERCISE_RELEVANCE.ALIAS);
    // equipment/muscle/category metadata match only
    expect(score({ name: 'Chest Machine', equipment: 'bench press station' }, q)).toBe(EXERCISE_RELEVANCE.METADATA);
    // instructions match only = lowest positive tier
    expect(score({ name: 'Chest Machine', equipment: 'machine', instructions: 'a machine version of the bench press' }, q))
      .toBe(EXERCISE_RELEVANCE.INSTRUCTIONS);
    // no match anywhere
    expect(score({ name: 'Back Squat' }, q)).toBe(EXERCISE_RELEVANCE.NONE);
  });

  it('orders the tiers strictly EXACT > PREFIX > NAME_TOKENS > ALIAS > METADATA > INSTRUCTIONS > NONE', () => {
    const r = EXERCISE_RELEVANCE;
    expect(r.EXACT_NAME).toBeGreaterThan(r.NAME_PREFIX);
    expect(r.NAME_PREFIX).toBeGreaterThan(r.NAME_ALL_TOKENS);
    expect(r.NAME_ALL_TOKENS).toBeGreaterThan(r.ALIAS);
    expect(r.ALIAS).toBeGreaterThan(r.METADATA);
    expect(r.METADATA).toBeGreaterThan(r.INSTRUCTIONS);
    expect(r.INSTRUCTIONS).toBeGreaterThan(r.NONE);
  });

  it('returns NONE for an empty/whitespace query (no ranking signal)', () => {
    expect(score({ name: 'Bench Press' }, '')).toBe(EXERCISE_RELEVANCE.NONE);
    expect(score({ name: 'Bench Press' }, '   ')).toBe(EXERCISE_RELEVANCE.NONE);
  });
});

describe('first-party preference vs. relevance priority', () => {
  const q = 'bench press';

  it('breaks ties within a tier toward the first-party row (exactly FIRST_PARTY_BONUS)', () => {
    const fp = score({ name: 'Bench Press', source_type: FP }, q);
    const legacy = score({ name: 'Bench Press', source_type: 'legacy_catalog' }, q);
    expect(fp).toBeGreaterThan(legacy);
    expect(fp - legacy).toBe(EXERCISE_RELEVANCE.FIRST_PARTY_BONUS);
  });

  it('lets relevance dominate: a legacy NAME match still outranks a first-party METADATA-only match', () => {
    const legacyNameMatch = score({ name: 'Bench Press', source_type: 'legacy_catalog' }, q);
    const firstPartyMetaMatch = score({ name: 'Chest Machine', equipment: 'bench press station', source_type: FP }, q);
    expect(legacyNameMatch).toBeGreaterThan(firstPartyMetaMatch);
  });
});

// ── End-to-end ranking of the required production queries ────────────────────

describe('rankExercisesByRelevance — required production queries', () => {
  // Mixed first-party (canonical) + weak legacy variations, in a legacy-heavy order
  // to prove ranking (not array order) decides what surfaces first.
  const catalog = [
    { id: 'leg-instr', name: 'Leg Press', source_type: 'legacy_catalog', instructions: 'a machine alternative to the hack squat' },
    { id: 'leg-hack-barbell', name: 'Barbell Hack Squat', source_type: 'legacy_catalog', primary_muscle: 'quadriceps' },
    { id: 'leg-hack-smith', name: 'Smith Machine Hack Squat', source_type: 'legacy_catalog', primary_muscle: 'quadriceps' },
    { id: 'fp-linear-hack', name: 'Linear Hack Squat', source_type: FP, equipment: 'plate-loaded machine', primary_muscle: 'quadriceps' },
    { id: 'fp-hack', name: 'Hack Squat', source_type: FP, equipment: 'selectorized / plate-loaded machine', primary_muscle: 'quadriceps' },
    { id: 'smith-inc-row', name: 'Smith Machine Incline Row', source_type: 'legacy_catalog', primary_muscle: 'back' },
    { id: 'smith-inc', name: 'Smith Machine Incline Press', source_type: FP, equipment: 'smith machine', primary_muscle: 'pectoralis major' },
    { id: 'seal-row', name: 'Seal Row', source_type: 'legacy_catalog', instructions: 'a chest supported row done lying down' },
    { id: 'chest-tbar', name: 'Chest-Supported T-Bar Row', source_type: FP, primary_muscle: 'latissimus dorsi' },
    { id: 'chest-db', name: 'Chest-Supported Dumbbell Row', source_type: FP, primary_muscle: 'latissimus dorsi' },
    { id: 'single-lat', name: 'Single-Arm Lat Pulldown', source_type: FP, equipment: 'cable machine', primary_muscle: 'latissimus dorsi' },
    { id: 'wide-lat', name: 'Wide-Grip Lat Pulldown', source_type: 'legacy_catalog', primary_muscle: 'latissimus dorsi' },
    { id: 'preacher', name: 'Preacher Curl', source_type: FP, primary_muscle: 'biceps brachii' },
    { id: 'machine-preacher', name: 'Machine Preacher Curl', source_type: FP, primary_muscle: 'biceps brachii' },
    { id: 'pendulum', name: 'Pendulum Squat', source_type: FP, equipment: 'pendulum squat machine', primary_muscle: 'quadriceps' },
    { id: 'db-curl', name: 'Dumbbell Curl', source_type: 'legacy_catalog', primary_muscle: 'biceps brachii' },
  ];

  const indexOf = (list: string[], id: string) => list.indexOf(id);

  it('"Hack squat" → canonical first-party Hack Squat ranks first, ahead of weak legacy variations', () => {
    const r = rankedIds(catalog, 'Hack squat');
    expect(r[0]).toBe('fp-hack'); // exact-name first-party
    // Both first-party canonicals rank above every same-tier legacy hack-squat variation
    // (relevance tier is equal → the first-party bonus is the deciding tie-break).
    expect(indexOf(r, 'fp-linear-hack')).toBeLessThan(indexOf(r, 'leg-hack-barbell'));
    expect(indexOf(r, 'fp-linear-hack')).toBeLessThan(indexOf(r, 'leg-hack-smith'));
    // A row that only matches via instructions ranks below every name match.
    expect(indexOf(r, 'leg-instr')).toBeGreaterThan(indexOf(r, 'leg-hack-barbell'));
    expect(indexOf(r, 'leg-instr')).toBe(r.length - 1);
  });

  it('"Incline smith ma" → Smith Machine Incline Press is first (partial-token "ma" → machine)', () => {
    const r = rankedIds(catalog, 'Incline smith ma');
    expect(r[0]).toBe('smith-inc');
    expect(indexOf(r, 'smith-inc')).toBeLessThan(indexOf(r, 'smith-inc-row'));
  });

  it('"Chest supported row" → both chest-supported variants rank above an instructions-only match', () => {
    const r = rankedIds(catalog, 'Chest supported row');
    expect(r.slice(0, 2).sort()).toEqual(['chest-db', 'chest-tbar']);
    expect(indexOf(r, 'chest-tbar')).toBeLessThan(indexOf(r, 'seal-row'));
    expect(indexOf(r, 'chest-db')).toBeLessThan(indexOf(r, 'seal-row'));
  });

  it('"Single arm lat" → Single-Arm Lat Pulldown is first (name-prefix tier)', () => {
    const r = rankedIds(catalog, 'Single arm lat');
    expect(r[0]).toBe('single-lat');
  });

  it('"Preacher curl" → exact Preacher Curl ranks ahead of Machine Preacher Curl', () => {
    const r = rankedIds(catalog, 'Preacher curl');
    expect(r[0]).toBe('preacher');
    expect(indexOf(r, 'preacher')).toBeLessThan(indexOf(r, 'machine-preacher'));
  });

  it('"Pendulum squat" → Pendulum Squat is first', () => {
    const r = rankedIds(catalog, 'Pendulum squat');
    expect(r[0]).toBe('pendulum');
  });

  it('"Pendulum" → Pendulum Squat is first', () => {
    expect(rankedIds(catalog, 'Pendulum')[0]).toBe('pendulum');
  });

  // ── Matching parity + stability ────────────────────────────────────────────

  it('ranking preserves matching membership (same set as matchesExerciseSearch, only reordered)', () => {
    for (const q of ['Hack squat', 'lat', 'row', 'squat', 'curl']) {
      const ranked = new Set(rankedIds(catalog, q));
      const matched = new Set(catalog.filter(ex => matchesExerciseSearch(ex, q)).map(e => e.id));
      expect(ranked).toEqual(matched);
    }
  });

  it('empty query returns the full catalog in its original (first-party-first) order, no drops', () => {
    expect(rankedIds(catalog, '')).toEqual(catalog.map(e => e.id));
    expect(rankedIds(catalog, '   ')).toEqual(catalog.map(e => e.id));
  });

  it('is a pure, stable transform — repeated calls yield identical ordering', () => {
    expect(rankedIds(catalog, 'squat')).toEqual(rankedIds(catalog, 'squat'));
  });
});

describe('Exercise Library first-input responsiveness contract', () => {
  const screen = readFileSync('apps/mobile/app/exercises/index.tsx', 'utf8');
  const store = readFileSync('apps/mobile/store/useWorkoutStore.ts', 'utf8');

  it('keeps visible input state immediate and result state debounced separately', () => {
    expect(screen).toContain('value={searchQuery}');
    expect(screen).toContain('onChangeText={setSearchQuery}');
    expect(screen).toContain('const deferredQuery = useDebouncedValue(searchQuery, 120)');
    expect(screen).toContain('normalizeSearchToken(deferredQuery)');
  });

  it('does not reconstruct the search index when searchQuery changes', () => {
    expect(screen).not.toContain('buildExerciseSearchIndexEntry');
    expect(screen).toContain('exerciseSearchIndex.filter');
    expect(store).toContain('entry: buildExerciseSearchIndexEntry(ex)');
  });

  it('does not fetch the catalog for the first or subsequent queries', () => {
    expect(screen).toMatch(/useEffect\(\(\) => \{\s*fetchExercises\(\);\s*\}, \[userId\]\);/);
    expect(screen).not.toMatch(/useEffect\([\s\S]{0,160}fetchExercises\(\)[\s\S]{0,80}\[searchQuery/);
  });

  it('virtualizes the catalog instead of rerendering every exercise card', () => {
    expect(screen).toContain('<FlatList');
    expect(screen).toContain('initialNumToRender={12}');
    expect(screen).toContain('maxToRenderPerBatch={12}');
    expect(screen).not.toContain('{filteredExercises.map(');
  });

  it('treats a legacy-only local cache as incomplete for canonical search', () => {
    expect(isExerciseCacheSearchComplete([
      { name: 'Barbell Hack Squat', source_type: 'legacy_catalog' },
    ])).toBe(false);
    expect(isExerciseCacheSearchComplete([
      { name: 'Hack Squat', source_type: FIRST_PARTY_SOURCE_TYPE },
    ])).toBe(true);
  });
});
