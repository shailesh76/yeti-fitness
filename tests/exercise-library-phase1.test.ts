import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExerciseRepository, mapExerciseRowToDTO } from '../packages/database/src/repositories/ExerciseRepository';
import { R2MediaService } from '../packages/database/src/services/R2MediaService';
import { searchCatalogExercise, buildExerciseGroundingPrompt } from '../supabase/functions/_shared/ai/exerciseResolver';

describe('Yeti Exercise Library Phase 1 - Repository & Search', () => {
  let mockSupabase: any;
  let repository: ExerciseRepository;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      upsert: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };

    repository = new ExerciseRepository(null as any, mockSupabase);
  });

  it('performs indexed search across exercises with filter criteria', async () => {
    const mockExercises = [
      { id: 'ex-1', name: 'Barbell Bench Press', slug: 'barbell-bench-press', category: 'strength', equipment: 'barbell', primary_muscle: 'chest' },
      { id: 'ex-2', name: 'Incline Dumbbell Bench Press', slug: 'incline-dumbbell-bench-press', category: 'strength', equipment: 'dumbbell', primary_muscle: 'chest' },
    ];

    mockSupabase.range.mockResolvedValueOnce({
      data: mockExercises,
      count: 2,
      error: null,
    });

    const result = await repository.searchExercises({
      query: 'bench',
      category: 'strength',
      equipment: 'barbell',
      limit: 10,
      offset: 0,
    });

    expect(result.exercises.length).toBe(2);
    expect(result.total).toBe(2);
    expect(result.exercises[0].name).toBe('Barbell Bench Press');
  });

  it('fetches exercise by slug accurately', async () => {
    const mockExercise = {
      id: 'ex-100',
      slug: 'barbell-squat',
      name: 'Barbell Squat',
      primary_muscle: 'quads',
      movement_pattern: 'squat',
    };

    mockSupabase.maybeSingle.mockResolvedValueOnce({
      data: mockExercise,
      error: null,
    });

    const result = await repository.getExerciseBySlug('barbell-squat');
    expect(result).not.toBeNull();
    expect(result?.name).toBe('Barbell Squat');
  });
});

describe('ExerciseRepository search contract — WatermelonDB row vs @yeti/types DTO', () => {
  it('parses JSON-encoded array fields from a local WatermelonDB-shaped row', () => {
    const localRow = {
      id: 'ex-1',
      slug: 'barbell-row',
      name: 'Barbell Row',
      secondary_muscles: JSON.stringify(['lats', 'biceps']),
      coaching_cues: JSON.stringify(['Brace core', 'Pull to sternum']),
      common_mistakes: JSON.stringify(['Rounding back']),
    };

    const dto = mapExerciseRowToDTO(localRow);

    expect(dto.secondary_muscles).toEqual(['lats', 'biceps']);
    expect(dto.coaching_cues).toEqual(['Brace core', 'Pull to sternum']);
    expect(dto.common_mistakes).toEqual(['Rounding back']);
  });

  it('accepts already-parsed array fields from a remote Supabase row without double-parsing', () => {
    const remoteRow = {
      id: 'ex-2',
      slug: 'goblet-squat',
      name: 'Goblet Squat',
      secondary_muscles: ['quads', 'core'],
      coaching_cues: ['Chest up', 'Knees track toes'],
      common_mistakes: null,
    };

    const dto = mapExerciseRowToDTO(remoteRow);

    expect(dto.secondary_muscles).toEqual(['quads', 'core']);
    expect(dto.coaching_cues).toEqual(['Chest up', 'Knees track toes']);
    expect(dto.common_mistakes).toBeNull();
  });

  it('derives a slug from the name when the row has none, matching the upsertExercise convention', () => {
    const dto = mapExerciseRowToDTO({ id: 'ex-3', name: 'Zercher Squat' });
    expect(dto.slug).toBe('zercher-squat');
  });

  it('never throws on a malformed JSON-encoded array field', () => {
    const dto = mapExerciseRowToDTO({ id: 'ex-4', slug: 'x', name: 'X', secondary_muscles: '{not json' });
    expect(dto.secondary_muscles).toBeNull();
  });

  it('searchExercises local path returns DTOs with real arrays, not JSON strings', async () => {
    const localDb = {
      get: () => ({
        query: () => ({
          fetch: async () => ([
            {
              id: 'local-1',
              name: 'Incline Bench Press',
              slug: 'incline-bench-press',
              secondary_muscles: JSON.stringify(['triceps', 'shoulders']),
            },
          ]),
        }),
      }),
    };

    const repo = new ExerciseRepository(localDb as any, null as any);
    const result = await repo.searchExercises({ query: 'incline' });

    expect(result.exercises.length).toBe(1);
    expect(Array.isArray(result.exercises[0].secondary_muscles)).toBe(true);
    expect(result.exercises[0].secondary_muscles).toEqual(['triceps', 'shoulders']);
  });

  it('searchExercises remote path returns DTOs with required slug/name populated', async () => {
    const remoteMockSupabase: any = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [{ id: 'remote-1', name: 'Face Pull', slug: 'face-pull', secondary_muscles: ['rear_delts'] }],
        count: 1,
        error: null,
      }),
    };

    const repo = new ExerciseRepository(null as any, remoteMockSupabase);
    const result = await repo.searchExercises({ query: 'face pull' });

    expect(result.exercises[0].slug).toBe('face-pull');
    expect(result.exercises[0].secondary_muscles).toEqual(['rear_delts']);
  });
});

describe('Cloudflare R2 Media Storage Integration', () => {
  const r2Service = new R2MediaService({
    bucketName: 'dude-media',
    publicUrl: 'https://media.yetifitness.app',
  });

  it('builds canonical R2 keys for exercise videos and thumbnails', () => {
    const key = r2Service.buildR2Key('barbell-bench-press', 'video', 'mp4');
    expect(key).toMatch(/^exercises\/barbell-bench-press\/video_\d+\.mp4$/);
  });

  it('resolves public CDN URLs correctly from R2 keys', () => {
    const url = r2Service.getPublicUrl('exercises/barbell-squat/thumbnail_12345.webp');
    expect(url).toBe('https://media.yetifitness.app/exercises/barbell-squat/thumbnail_12345.webp');
  });

  it('enriches exercise media items with full URLs', () => {
    const rawMedia: any = {
      id: 'med-1',
      exercise_id: 'ex-1',
      media_type: 'video',
      file_format: 'mp4',
      r2_bucket: 'dude-media',
      r2_key: 'exercises/barbell-squat/video_1.mp4',
    };

    const resolved = r2Service.resolveMediaUrls(rawMedia);
    expect(resolved.url).toBe('https://media.yetifitness.app/exercises/barbell-squat/video_1.mp4');
    expect(resolved.r2_bucket).toBe('dude-media');
  });
});

describe('AI Coach Database Grounding & Resolution', () => {
  it('searches catalog exercise before generating AI responses', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'ex-55', name: 'Romanian Deadlift', slug: 'romanian-deadlift', primary_muscle: 'hamstrings' },
        error: null,
      }),
    };

    const exercise = await searchCatalogExercise(mockSupabase, 'rdl');
    expect(exercise).not.toBeNull();
    expect(exercise.name).toBe('Romanian Deadlift');
  });

  it('constructs grounded DB exercise context for LLM coaching', () => {
    const mockDbRecord = {
      name: 'Overhead Press',
      slug: 'overhead-press',
      primary_muscle: 'shoulders',
      category: 'strength',
      equipment: 'barbell',
      setup_instructions: 'Stand feet shoulder-width apart.',
      coaching_cues: ['Press vertically', 'Brace core'],
    };

    const prompt = buildExerciseGroundingPrompt(mockDbRecord);
    expect(prompt).toContain('GROUNDED DATABASE EXERCISE RECORD');
    expect(prompt).toContain('Overhead Press');
    expect(prompt).toContain('Press vertically; Brace core');
    expect(prompt).toContain('NEVER invent exercises not present in the database');
  });
});
