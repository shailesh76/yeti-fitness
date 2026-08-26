import { describe, it, expect, vi } from 'vitest';
import {
  ExerciseRepository,
  normalizeExerciseList,
  toPlainExercise,
  exerciseHasResolvableMedia,
  canonicalExerciseName,
  FIRST_PARTY_SOURCE_TYPE,
} from '../packages/database/src/repositories/ExerciseRepository';

// ── Pure normalisation logic ────────────────────────────────────────────────

describe('normalizeExerciseList — source prioritisation + dedupe', () => {
  it('sorts first-party rows ahead of legacy rows', () => {
    const out = normalizeExerciseList([
      { id: 'l1', name: 'Leg Extension', source_type: 'legacy_catalog' },
      { id: 'f1', name: 'Hack Squat', source_type: FIRST_PARTY_SOURCE_TYPE },
      { id: 'l2', name: 'Leg Curl', source_type: 'legacy_catalog' },
      { id: 'f2', name: 'Pendulum Squat', source_type: FIRST_PARTY_SOURCE_TYPE },
    ]);
    expect(out.map(e => e.id)).toEqual(['f1', 'f2', 'l1', 'l2']);
  });

  it('preserves relative order within each tier (stable partition)', () => {
    const out = normalizeExerciseList([
      { id: 'f1', name: 'A', source_type: FIRST_PARTY_SOURCE_TYPE },
      { id: 'l1', name: 'B', source_type: 'legacy_catalog' },
      { id: 'f2', name: 'C', source_type: FIRST_PARTY_SOURCE_TYPE },
      { id: 'l2', name: 'D', source_type: 'legacy_catalog' },
    ]);
    expect(out.map(e => e.id)).toEqual(['f1', 'f2', 'l1', 'l2']);
  });

  it('de-duplicates by canonical name, preferring the first-party row', () => {
    const out = normalizeExerciseList([
      { id: 'leg', name: 'Bench Press (Legacy a1b2)', source_type: 'legacy_catalog', gif_url: 'https://real.example/x.gif' },
      { id: 'fp', name: 'Bench Press', source_type: FIRST_PARTY_SOURCE_TYPE },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('fp');
    // First-party wins even though the legacy row is the one with real media.
    expect(out[0].name).toBe('Bench Press');
  });

  it('matches names case-insensitively when de-duplicating', () => {
    const out = normalizeExerciseList([
      { id: 'a', name: 'Lat Pulldown', source_type: 'legacy_catalog' },
      { id: 'b', name: 'lat pulldown', source_type: FIRST_PARTY_SOURCE_TYPE },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('b');
  });

  it('within the same tier, prefers a row with resolvable media over a placeholder', () => {
    const out = normalizeExerciseList([
      { id: 'noimg', name: 'Cable Row', source_type: 'legacy_catalog', gif_url: 'https://cdn.yeti.fit/placeholder.gif' },
      { id: 'img', name: 'Cable Row', source_type: 'legacy_catalog', gif_url: 'https://real.example/cable-row.gif' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('img');
  });

  it('strips legacy collision suffixes from the display name', () => {
    const out = normalizeExerciseList([
      { id: 'x', name: 'Incline Dumbbell Press (Legacy 30ee)', source_type: 'legacy_catalog' },
    ]);
    expect(out[0].name).toBe('Incline Dumbbell Press');
  });

  it('drops rows with no name and tolerates null/empty input', () => {
    expect(normalizeExerciseList([{ id: 'x', name: '' } as any])).toEqual([]);
    expect(normalizeExerciseList(null as any)).toEqual([]);
    expect(normalizeExerciseList(undefined as any)).toEqual([]);
  });

  it('maps model-like and raw rows identically (snake_case field parity)', () => {
    const plain = toPlainExercise({
      id: 'e1',
      name: 'Hip Thrust',
      primary_muscle: 'Glutes',
      muscle_group: null,
      equipment: 'Barbell',
      source_type: FIRST_PARTY_SOURCE_TYPE,
    });
    expect(plain.id).toBe('e1');
    expect(plain.name).toBe('Hip Thrust');
    expect(plain.primary_muscle).toBe('Glutes');
    expect(plain.source_type).toBe(FIRST_PARTY_SOURCE_TYPE);
    // Absent fields are normalised to null, never undefined.
    expect(plain.video_url).toBeNull();
  });
});

describe('exerciseHasResolvableMedia', () => {
  it('accepts real http(s) media', () => {
    expect(exerciseHasResolvableMedia({ gif_url: 'https://x.example/a.gif' })).toBe(true);
    expect(exerciseHasResolvableMedia({ video_url: 'http://x.example/a.mp4' })).toBe(true);
    expect(exerciseHasResolvableMedia({ thumbnail_url: 'https://x.example/a.png' })).toBe(true);
  });

  it('rejects seed placeholder CDNs and missing/relative media', () => {
    expect(exerciseHasResolvableMedia({ gif_url: 'https://cdn.yeti.fit/x.gif' })).toBe(false);
    expect(exerciseHasResolvableMedia({ gif_url: 'https://cdn.yetifitness.app/x.gif' })).toBe(false);
    expect(exerciseHasResolvableMedia({ gif_url: '/local/x.gif' })).toBe(false);
    expect(exerciseHasResolvableMedia({})).toBe(false);
  });
});

describe('canonicalExerciseName (regression guard)', () => {
  it('strips the technical legacy suffix but keeps legitimate "Legacy" names', () => {
    expect(canonicalExerciseName('Squat (Legacy a45e)', 'a45e-1111')).toBe('Squat');
    expect(canonicalExerciseName('Legacy Strength Press')).toBe('Legacy Strength Press');
  });
});

// ── getExercises control flow ───────────────────────────────────────────────

function makeCollection(localRows: any[]) {
  const created: any[] = [];
  const destroy = vi.fn(() => Promise.resolve());
  const collection = {
    created,
    destroy,
    query: vi.fn(() => ({
      fetch: vi.fn(() => Promise.resolve(localRows)),
      destroyAllPermanently: destroy,
    })),
    create: vi.fn((cb: any) => {
      const r: any = { _raw: {} };
      cb(r);
      created.push(r);
      return Promise.resolve(r);
    }),
  };
  return collection;
}

function makeDb(localRows: any[]) {
  const collection = makeCollection(localRows);
  const db = {
    collection,
    get: vi.fn(() => collection),
    write: vi.fn((fn: any) => Promise.resolve(fn())),
  };
  return db;
}

function makeSupabase(remoteRows: any[]) {
  const chain: any = {};
  chain.from = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  let served = false;
  chain.range = vi.fn(() => {
    if (served) return Promise.resolve({ data: [], error: null });
    served = true;
    return Promise.resolve({ data: remoteRows, error: null });
  });
  return chain;
}

const flush = () => new Promise(res => setTimeout(res, 0));

describe('ExerciseRepository.getExercises — visibility control flow', () => {
  it('serves the local cache (normalised) when it already carries source_type, without hitting remote', async () => {
    const db = makeDb([
      { id: 'l1', name: 'Leg Curl', source_type: 'legacy_catalog' },
      { id: 'f1', name: 'Hack Squat', source_type: FIRST_PARTY_SOURCE_TYPE },
    ]);
    const supabase = makeSupabase([{ id: 'zzz', name: 'Should Not Appear', source_type: FIRST_PARTY_SOURCE_TYPE }]);
    const repo = new ExerciseRepository(db as any, supabase);

    const out = await repo.getExercises();

    expect(supabase.from).not.toHaveBeenCalled();
    expect(out.map((e: any) => e.id)).toEqual(['f1', 'l1']); // first-party first
  });

  it('falls through to remote and returns the normalised remote catalog on an empty cache', async () => {
    const db = makeDb([]);
    const supabase = makeSupabase([
      { id: 'l1', name: 'Bench Press (Legacy a1b2)', source_type: 'legacy_catalog', updated_at: 1 },
      { id: 'f1', name: 'Bench Press', source_type: FIRST_PARTY_SOURCE_TYPE, updated_at: 2 },
      { id: 'f2', name: 'Pendulum Squat', source_type: FIRST_PARTY_SOURCE_TYPE, updated_at: 3 },
    ]);
    const repo = new ExerciseRepository(db as any, supabase);

    const out = await repo.getExercises();

    expect(supabase.from).toHaveBeenCalledWith('exercises');
    // Deduped (Bench Press collision → first-party) and first-party sorted first.
    expect(out.map((e: any) => e.id)).toEqual(['f1', 'f2']);
    expect(out.find((e: any) => e.id === 'f1').name).toBe('Bench Press');
  });

  it('rebuilds a pre-source_type cache from remote so prioritisation takes effect', async () => {
    // Existing beta install: cache populated before source_type existed (all null).
    const db = makeDb([
      { id: 'old1', name: 'Old Cached Row', source_type: null },
      { id: 'old2', name: 'Another Old Row', source_type: null },
    ]);
    const supabase = makeSupabase([
      { id: 'f1', name: 'Hack Squat', source_type: FIRST_PARTY_SOURCE_TYPE, updated_at: 2 },
      { id: 'l1', name: 'Leg Curl', source_type: 'legacy_catalog', updated_at: 1 },
    ]);
    const repo = new ExerciseRepository(db as any, supabase);

    const out = await repo.getExercises();

    // Returned the fresh remote catalog, first-party first.
    expect(out.map((e: any) => e.id)).toEqual(['f1', 'l1']);
    await flush(); // let the fire-and-forget cache rebuild run
    expect(db.collection.destroy).toHaveBeenCalled(); // stale cache cleared
    expect(db.collection.created.length).toBe(2); // and repopulated with source_type
    expect(db.collection.created.every((r: any) => r.source_type != null)).toBe(true);
  });

  it('falls back to the stale local cache if remote yields nothing (offline safety)', async () => {
    const db = makeDb([{ id: 'old1', name: 'Cached Bench Press', source_type: null }]);
    const supabase = makeSupabase([]); // remote returns no rows
    const repo = new ExerciseRepository(db as any, supabase);

    const out = await repo.getExercises();

    expect(out.map((e: any) => e.id)).toEqual(['old1']);
    expect(out[0].name).toBe('Cached Bench Press');
  });
});
