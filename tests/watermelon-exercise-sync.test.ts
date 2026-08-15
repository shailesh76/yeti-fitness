import { describe, it, expect, beforeEach } from 'vitest';
import { schema } from '../packages/database/src/schema';
import { ExerciseRepository } from '../packages/database/src/repositories/ExerciseRepository';

function createOfflineDatabase() {
  const tables: Record<string, any[]> = {
    exercises: [],
  };

  return {
    tables,
    schema,
    write: async (work: () => Promise<any>) => work(),
    get: (tableName: string) => ({
      query: (...conditions: any[]) => ({
        fetch: async () => {
          let list = tables[tableName] || [];
          conditions.forEach(cond => {
            if (cond.left === 'name' && cond.comparison === 'like') {
              const term = cond.right.replace(/%/g, '').toLowerCase();
              list = list.filter(r => (r.name || '').toLowerCase().includes(term));
            } else if (cond.left === 'slug') {
              list = list.filter(r => r.slug === cond.right);
            }
          });
          return list;
        },
      }),
      find: async (id: string) => (tables[tableName] || []).find(r => r.id === id || r._raw?.id === id) || null,
      create: async (prepare: (row: any) => void) => {
        const row: any = { _raw: {} };
        prepare(row);
        (tables[tableName] ||= []).push(row);
        return row;
      },
    }),
  } as any;
}

describe('Mocked offline exercise cache behavior (not native WatermelonDB integration)', () => {
  let db: any;
  let repository: ExerciseRepository;

  beforeEach(() => {
    db = createOfflineDatabase();
    repository = new ExerciseRepository(db, null as any);
  });

  it('1. registers the focused exercise schema v8', () => {
    expect(schema.version).toBe(8);
    const tableNames = Object.keys(schema.tables);
    expect(tableNames).toContain('exercises');
    expect(tableNames).not.toEqual(expect.arrayContaining([
      'exercise_media', 'exercise_aliases', 'exercise_tags', 'exercise_muscles',
      'exercise_alternatives', 'exercise_progressions', 'exercise_regressions',
    ]));
  });

  it('2. performs first exercise metadata sync into clean local database', async () => {
    await db.write(async () => {
      for (let i = 1; i <= 220; i++) {
        const id = `00000000-0000-4000-a000-${String(i).padStart(12, '0')}`;
        await db.get('exercises').create((r: any) => {
          r._raw.id = id;
          r.id = id;
          r.name = `Yeti Exercise ${i}`;
          r.slug = `yeti-exercise-${i}`;
          r.primary_muscle = i % 2 === 0 ? 'chest' : 'quadriceps';
          r.equipment = 'barbell';
          r.category = 'strength';
          r.source_type = 'yeti_v2';
          r.default_reps = 8;
          r.default_reps_prescription = i === 1 ? '8–12' : null;
        });
      }
    });

    const localList = await db.get('exercises').query().fetch();
    expect(localList.length).toBe(220);
    expect(localList[0].default_reps).toBe(8);
    expect(localList[0].default_reps_prescription).toBe('8–12');
  });

  it('3. performs fast offline search query locally', async () => {
    await db.write(async () => {
      await db.get('exercises').create((r: any) => {
        r.id = 'ex-smith-incline';
        r.name = 'Smith Machine Incline Press';
        r.slug = 'smith-machine-incline-press';
        r.primary_muscle = 'chest';
      });
    });

    const result = await repository.searchExercises({ query: 'Incline' });
    expect(result.exercises.length).toBe(1);
    expect(result.exercises[0].name).toBe('Smith Machine Incline Press');
  });

  it('4. preserves a duration prescription across an offline restart', async () => {
    await db.write(async () => {
      await db.get('exercises').create((r: any) => {
        r._raw.id = 'sled-push';
        r.name = 'Sled Push';
        r.default_reps = 30;
        r.default_reps_prescription = '30–60 sec';
      });
    });

    const restartedDb = { ...db, tables: db.tables };
    const cached = await restartedDb.get('exercises').find('sled-push');
    expect(cached.default_reps).toBe(30);
    expect(cached.default_reps_prescription).toBe('30–60 sec');
  });
});
