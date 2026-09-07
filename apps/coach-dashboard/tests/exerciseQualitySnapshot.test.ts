import { describe, expect, it } from 'vitest';
import {
  filterExerciseQualitySnapshot,
  loadExerciseQualitySnapshot,
  summarizeFirstPartyQuality,
  type ExerciseSnapshotFilters,
  type QualityExercise,
} from '../lib/exerciseQualitySnapshot';
import { evaluateExerciseQuality } from '../lib/exerciseQuality';

const completeExercise = (id: string, overrides: Partial<QualityExercise> = {}): QualityExercise => ({
  id,
  name: `Exercise ${id}`,
  slug: `exercise-${id}`,
  source_type: 'yeti_first_party',
  primary_muscle: 'quadriceps',
  target_muscle: 'quadriceps',
  equipment: 'barbell',
  category: 'legs',
  difficulty: 'beginner',
  movement_pattern: 'squat',
  setup_instructions: 'Set the bar securely.',
  execution_instructions: 'Squat under control.',
  breathing: 'Brace down and exhale up.',
  coaching_cues: ['Keep the chest tall'],
  common_mistakes: ['Knees collapsing inward'],
  safety_notes: 'Use suitable safety arms.',
  default_sets: 3,
  default_reps: 8,
  tempo: '3-1-1',
  recommended_rest_seconds: 90,
  ...overrides,
});

const media = (exerciseId: string, status = 'READY', url = `https://cdn.example.com/${exerciseId}.mp4`, mediaType = 'video') => ({
  id: `media-${exerciseId}-${mediaType}`,
  exercise_id: exerciseId,
  media_type: mediaType,
  file_format: mediaType === 'thumbnail' ? 'jpg' : mediaType === 'gif' ? 'gif' : 'mp4',
  url,
  r2_key: null,
  thumbnail_url: null,
  is_primary: true,
  media_status: status,
  media_notes: null,
  created_at: null,
});

function createClient(exercises: QualityExercise[]) {
  const calls: string[] = [];
  const orders: Array<{ table: string; column: string; ascending: boolean }> = [];
  const rows: Record<string, unknown[]> = {
    exercises,
    exercise_tags: exercises.map((exercise) => ({ id: `tag-${exercise.id}`, exercise_id: exercise.id })),
    exercise_muscles: exercises.map((exercise) => ({ id: `muscle-${exercise.id}`, exercise_id: exercise.id })),
    exercise_alternatives: exercises.map((exercise) => ({ id: `alternative-${exercise.id}`, exercise_id: exercise.id })),
    exercise_aliases: exercises.map((exercise) => ({ id: `alias-${exercise.id}`, exercise_id: exercise.id, alias: `Alias ${exercise.id}` })),
    exercise_progressions: exercises.slice(0, 1).map((exercise) => ({ id: `progression-${exercise.id}`, exercise_id: exercise.id })),
    exercise_regressions: exercises.slice(0, 1).map((exercise) => ({ id: `regression-${exercise.id}`, exercise_id: exercise.id })),
    exercise_media: exercises.flatMap((exercise) => [
      media(exercise.id),
      media(exercise.id, 'READY', `https://cdn.example.com/${exercise.id}.gif`, 'gif'),
      media(exercise.id, 'READY', `https://cdn.example.com/${exercise.id}.jpg`, 'thumbnail'),
    ]),
  };
  return {
    calls,
    orders,
    client: {
      from(table: string) {
        return {
          select() {
            return {
              is() { return this; },
              order(column: string, options: { ascending: boolean }) {
                orders.push({ table, column, ascending: options.ascending });
                return this;
              },
              async range(from: number, to: number) {
                calls.push(table);
                return { data: rows[table].slice(from, to + 1), error: null };
              },
            };
          },
        };
      },
    },
  };
}

const defaultFilters: ExerciseSnapshotFilters = {
  search: '',
  source: 'all',
  category: 'all',
  muscle: 'all',
  equipment: 'all',
  difficulty: 'all',
  media: 'all',
  quality: 'all',
  sort: 'az',
};

describe('exercise quality snapshot', () => {
  it('uses normalized READY HTTPS media for production readiness', async () => {
    const { client } = createClient([completeExercise('ready', { media_status: null, video_url: null })]);
    const snapshot = await loadExerciseQualitySnapshot(client);
    expect(snapshot.assessments.get('ready')?.mediaReady).toBe(true);
    expect(snapshot.assessments.get('ready')?.fullyPublished).toBe(true);
  });

  it('uses normalized READY R2-only media for production readiness', async () => {
    const setup = createClient([completeExercise('r2-ready', { media_status: null, video_url: null })]);
    const originalFrom = setup.client.from.bind(setup.client);
    setup.client.from = ((table: string) => table === 'exercise_media'
      ? {
          select: () => ({
            order() { return this; },
            range: async () => ({
              data: [{ ...media('r2-ready'), url: null, r2_key: 'exercises/r2-ready/demo.mp4' }],
              error: null,
            }),
          }),
        }
      : originalFrom(table)) as typeof setup.client.from;
    const snapshot = await loadExerciseQualitySnapshot(setup.client);
    expect(snapshot.assessments.get('r2-ready')?.mediaReady).toBe(true);
    expect(snapshot.assessments.get('r2-ready')?.fullyPublished).toBe(true);
  });

  it('rejects non-ready R2-backed media', async () => {
    const setup = createClient([completeExercise('r2-planned')]);
    const originalFrom = setup.client.from.bind(setup.client);
    setup.client.from = ((table: string) => table === 'exercise_media'
      ? {
          select: () => ({
            order() { return this; },
            range: async () => ({
              data: [{ ...media('r2-planned', 'TO_CREATE'), url: null, r2_key: 'exercises/r2-planned/demo.mp4' }],
              error: null,
            }),
          }),
        }
      : originalFrom(table)) as typeof setup.client.from;
    const snapshot = await loadExerciseQualitySnapshot(setup.client);
    expect(snapshot.assessments.get('r2-planned')?.mediaReady).toBe(false);
  });

  it('keeps direct supported READY media backward compatible', () => {
    const assessment = evaluateExerciseQuality({
      ...completeExercise('direct'),
      tags: [{ tag: 'strength' }],
      muscles: [{ muscle: 'quadriceps', role: 'primary' }],
      alternatives: [{ alternative_exercise_id: 'other' }],
      media_status: 'READY',
      video_url: 'https://cdn.example.com/direct.mp4',
    });
    expect(assessment.mediaReady).toBe(true);
  });

  it.each([
    ['TO_CREATE', 'https://cdn.example.com/planned.mp4'],
    ['READY', 'http://cdn.example.com/insecure.mp4'],
    ['READY', 'not-a-url'],
    ['READY', ''],
  ])('rejects unusable normalized media status=%s url=%s', async (status, url) => {
    const setup = createClient([completeExercise('bad')]);
    const originalFrom = setup.client.from.bind(setup.client);
    setup.client.from = ((table: string) => table === 'exercise_media'
      ? { select: () => ({ order() { return this; }, range: async () => ({ data: [media('bad', status, url)], error: null }) }) }
      : originalFrom(table)) as typeof setup.client.from;
    const snapshot = await loadExerciseQualitySnapshot(setup.client);
    expect(snapshot.assessments.get('bad')?.mediaReady).toBe(false);
  });

  it('summarizes only Yeti first-party readiness', () => {
    const firstParty = completeExercise('first');
    const legacy = completeExercise('legacy', { source_type: 'legacy_catalog' });
    const assessments = new Map([
      ['first', evaluateExerciseQuality({ ...firstParty, tags: [{}], muscles: [{}], alternatives: [{}], media_status: 'READY', video_url: 'https://cdn.example.com/a.mp4' })],
      ['legacy', evaluateExerciseQuality({ ...legacy, tags: [{}], muscles: [{}], alternatives: [{}], media_status: 'READY', video_url: 'https://cdn.example.com/b.mp4' })],
    ]);
    expect(summarizeFirstPartyQuality([firstParty, legacy], assessments)).toEqual({
      total: 1, ready: 1, incomplete: 0, readyPercentage: 100,
    });
  });

  it('filters globally before pagination and composes quality with catalog filters', async () => {
    const exercises = Array.from({ length: 20 }, (_, index) => completeExercise(String(index), {
      name: index >= 16 ? `Back Squat ${index}` : `Other ${index}`,
      equipment: index >= 16 ? 'barbell' : 'dumbbell',
    }));
    const snapshot = await loadExerciseQualitySnapshot(createClient(exercises).client);
    const result = filterExerciseQualitySnapshot(snapshot, {
      ...defaultFilters,
      search: 'Back Squat',
      muscle: 'quadriceps',
      equipment: 'barbell',
      source: 'yeti_first_party',
      quality: 'fully_published',
      media: 'complete',
    }, 1, 2);
    expect(result.totalCount).toBe(4);
    expect(result.exercises).toHaveLength(2);
    expect(result.totalPages).toBe(2);
  });

  it('preserves space and hyphen tolerant catalog search', async () => {
    const snapshot = await loadExerciseQualitySnapshot(createClient([
      completeExercise('pulldown', { name: 'Single-Arm Lat Pulldown' }),
      completeExercise('squat', { name: 'Back Squat' }),
    ]).client);
    const result = filterExerciseQualitySnapshot(snapshot, {
      ...defaultFilters,
      search: 'Single arm',
    }, 1, 50);
    expect(result.exercises.map((exercise) => exercise.id)).toEqual(['pulldown']);
  });

  it('reuses one snapshot for page, quality, and sort changes', async () => {
    const setup = createClient([completeExercise('one'), completeExercise('two')]);
    const snapshot = await loadExerciseQualitySnapshot(setup.client);
    const requestCount = setup.calls.length;
    filterExerciseQualitySnapshot(snapshot, defaultFilters, 1, 1);
    filterExerciseQualitySnapshot(snapshot, { ...defaultFilters, quality: 'fully_published' }, 1, 1);
    filterExerciseQualitySnapshot(snapshot, { ...defaultFilters, sort: 'newest' }, 2, 1);
    expect(setup.calls).toHaveLength(requestCount);
    expect(new Set(setup.calls)).toEqual(new Set([
      'exercises', 'exercise_tags', 'exercise_muscles', 'exercise_alternatives',
      'exercise_aliases', 'exercise_progressions', 'exercise_regressions', 'exercise_media',
    ]));
  });

  it('loads exercises and relations across deterministic page boundaries exactly once', async () => {
    const exercises = Array.from({ length: 1001 }, (_, index) => completeExercise(String(index).padStart(4, '0')));
    const setup = createClient(exercises);
    const snapshot = await loadExerciseQualitySnapshot(setup.client);

    expect(snapshot.exercises).toHaveLength(1001);
    expect(new Set(snapshot.exercises.map((exercise) => exercise.id)).size).toBe(1001);
    expect(snapshot.relationCounts.get('1000')).toMatchObject({
      tagsCount: 1,
      musclesCount: 1,
      alternativesCount: 1,
      aliasesCount: 1,
    });
    expect(setup.calls.filter((table) => table === 'exercises')).toHaveLength(2);
    expect(setup.calls.filter((table) => table === 'exercise_tags')).toHaveLength(2);
    expect(setup.orders.length).toBe(setup.calls.length);
    expect(setup.orders.every(({ column, ascending }) => column === 'id' && ascending)).toBe(true);
  });

  it('rejects overlapping pages instead of silently double-counting rows', async () => {
    const exercise = completeExercise('duplicate');
    let exercisePage = 0;
    const setup = createClient([exercise]);
    const originalFrom = setup.client.from.bind(setup.client);
    setup.client.from = ((table: string) => table === 'exercises'
      ? {
          select: () => ({
            is() { return this; },
            order() { return this; },
            async range() {
              exercisePage += 1;
              return {
                data: exercisePage <= 2 ? Array.from({ length: 1000 }, () => exercise) : [],
                error: null,
              };
            },
          }),
        }
      : originalFrom(table)) as typeof setup.client.from;
    await expect(loadExerciseQualitySnapshot(setup.client)).rejects.toThrow('duplicate id duplicate');
  });

  it('rejects a later-page failure without returning a partial snapshot', async () => {
    const exercises = Array.from({ length: 1000 }, (_, index) => completeExercise(String(index)));
    let exercisePage = 0;
    const setup = createClient(exercises);
    const originalFrom = setup.client.from.bind(setup.client);
    setup.client.from = ((table: string) => table === 'exercises'
      ? {
          select: () => ({
            is() { return this; },
            order() { return this; },
            async range(from: number, to: number) {
              exercisePage += 1;
              return exercisePage === 1
                ? { data: exercises.slice(from, to + 1), error: null }
                : { data: null, error: { message: 'page two failed' } };
            },
          }),
        }
      : originalFrom(table)) as typeof setup.client.from;
    await expect(loadExerciseQualitySnapshot(setup.client)).rejects.toThrow('page two failed');
  });

  it('explicit refresh creates a new snapshot request cycle', async () => {
    const setup = createClient([completeExercise('one')]);
    await loadExerciseQualitySnapshot(setup.client);
    const firstCount = setup.calls.length;
    await loadExerciseQualitySnapshot(setup.client);
    expect(setup.calls).toHaveLength(firstCount * 2);
  });

  it('keeps progression and regression counts informational and zero-weight', async () => {
    const snapshot = await loadExerciseQualitySnapshot(createClient([completeExercise('one')]).client);
    const assessment = snapshot.assessments.get('one')!;
    expect(snapshot.relationCounts.get('one')?.progressionsCount).toBe(1);
    expect(snapshot.relationCounts.get('one')?.regressionsCount).toBe(1);
    expect(assessment.dimensions.optionalEnrichment.maxScore).toBe(3);
    expect(assessment.score).toBe(100);
  });
});
