import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExerciseImporter } from '../packages/database/src/importers/ExerciseImporter';
import { ExerciseRepository } from '../packages/database/src/repositories/ExerciseRepository';

describe('ExerciseImporter - CSV and JSON Import Utility', () => {
  let mockRepository: any;
  let mockSupabase: any;
  let importer: ExerciseImporter;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockRepository = {
      supabase: mockSupabase,
      upsertExercise: vi.fn().mockImplementation(async (item) => {
        if (!item.name || item.name.includes('Invalid')) throw new Error('DB Constraint Error');
        return { id: item.id || 'gen-id-1', action: 'created' };
      }),
    };
    importer = new ExerciseImporter(mockRepository as unknown as ExerciseRepository);
  });

  it('correctly parses JSON exercise payloads', () => {
    const jsonContent = JSON.stringify([
      {
        id: 'ex-json-1',
        slug: 'lat-pulldown',
        name: 'Lat Pulldown',
        category: 'strength',
        equipment: 'cable',
        primary_muscle: 'lats',
        secondary_muscles: ['biceps', 'rear_delts'],
        search_aliases: ['pulldown', 'lat pull'],
        ai_tags: ['hypertrophy', 'back'],
        unilateral: false,
        default_sets: 3,
        default_reps: 12,
      },
    ]);

    const items = importer.parseJson(jsonContent);
    expect(items.length).toBe(1);
    expect(items[0].name).toBe('Lat Pulldown');
    expect(items[0].secondary_muscles).toEqual(['biceps', 'rear_delts']);
    expect(items[0].search_aliases).toEqual(['pulldown', 'lat pull']);
  });

  it('correctly parses CSV exercise payloads', () => {
    const csvContent =
      'name,category,equipment,primary_muscle,secondary_muscles,search_aliases,unilateral,default_sets,default_reps\n' +
      '"Dumbbell Bicep Curl",strength,dumbbell,biceps,"forearms","db curl;bicep curl",false,3,10\n' +
      '"Tricep Pushdown",strength,cable,triceps,"shoulders","pushdown",false,4,12';

    const items = importer.parseCsv(csvContent);
    expect(items.length).toBe(2);
    expect(items[0].name).toBe('Dumbbell Bicep Curl');
    expect(items[0].primary_muscle).toBe('biceps');
    expect(items[0].secondary_muscles).toEqual(['forearms']);
    expect(items[0].search_aliases).toEqual(['db curl', 'bicep curl']);

    expect(items[1].name).toBe('Tricep Pushdown');
    expect(items[1].default_sets).toBe(4);
    expect(items[1].default_reps).toBe(12);
  });

  it('performs non-writing dry-run validation', () => {
    const items = [
      { name: 'Push-up', category: 'calisthenics', equipment: 'bodyweight' },
      { name: 'Pull-up', category: 'calisthenics', equipment: 'bodyweight' },
    ];

    const metrics = importer.validateDryRun(items);
    expect(metrics.rowsRead).toBe(2);
    expect(metrics.accepted).toBe(2);
    expect(metrics.rejected).toBe(0);
  });

  it('performs idempotent upsert imports and records metrics', async () => {
    const items = [
      { name: 'Push-up', category: 'calisthenics', equipment: 'bodyweight' },
      { name: 'Pull-up', category: 'calisthenics', equipment: 'bodyweight' },
    ];

    const result = await importer.importExercises(items, mockSupabase);

    expect(result.rowsRead).toBe(2);
    expect(result.exercisesInserted).toBe(2);
    expect(result.errors.length).toBe(0);
    expect(mockRepository.upsertExercise).toHaveBeenCalledTimes(2);
  });

  it('handles errors gracefully without stopping the batch', async () => {
    mockRepository.upsertExercise
      .mockResolvedValueOnce({ id: '1', action: 'created' })
      .mockRejectedValueOnce(new Error('DB Constraint Error'))
      .mockResolvedValueOnce({ id: '3', action: 'updated' });

    const items = [
      { name: 'Valid 1' },
      { name: 'Invalid 2' },
      { name: 'Valid 3' },
    ];

    const result = await importer.importExercises(items, mockSupabase);

    expect(result.rowsRead).toBe(3);
    expect(result.exercisesInserted).toBe(1);
    expect(result.exercisesUpdated).toBe(1);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].name).toBe('Invalid 2');
  });
});
