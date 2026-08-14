import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ExerciseImporter } from '../packages/database/src/importers/ExerciseImporter';
import { isMergeWinner, type ManifestEntry } from '../packages/database/src/importers/collisionPolicy';

const ROOT = path.resolve(__dirname, '..');
const manifestDoc = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/data/yeti_exercise_provenance.json'), 'utf8'),
);
const entries: ManifestEntry[] = manifestDoc.exercises;
const collisions = entries.filter((e) => e.dataset_versions.length === 2);

/**
 * Mock repository that records every mutation. The point of these tests is not
 * that the policy helper returns the right verdict — Round 1B proved that while
 * the production path ignored it entirely — but that the REAL importer loop
 * consults it and performs zero writes when it says no.
 */
function makeRepo(existingRows: Array<{ id: string; slug: string; source_type?: string | null; created_by_coach_id?: string | null }> = []) {
  const upserts: Array<{ payload: any; opts: any }> = [];
  const lookups: Array<{ id: any; slug: string }> = [];
  return {
    upserts,
    lookups,
    async findCanonicalRow(id: string | null | undefined, slug: string) {
      lookups.push({ id, slug });
      return existingRows.find((r) => (id && r.id === id) || r.slug === slug) ?? null;
    },
    async upsertExercise(payload: any, opts?: any) {
      upserts.push({ payload, opts });
      return { id: opts?.existingId ?? payload.exercise_id ?? 'new-id', action: opts?.existingId ? 'updated' : 'created' };
    },
  };
}

const item = (over: Partial<any> = {}) => ({
  name: over.name ?? 'Ab Wheel Rollout',
  slug: over.slug ?? 'ab-wheel-rollout',
  exercise_id: over.exercise_id ?? 'yeti-ex-0001',
  source_type: over.source_type,
  default_reps: over.default_reps ?? '8–12',
  ...over,
});

let importer: ExerciseImporter;
let repo: ReturnType<typeof makeRepo>;

function setup(rows: Parameters<typeof makeRepo>[0] = [], dataset?: 'v2' | 'v3') {
  repo = makeRepo(rows);
  importer = new ExerciseImporter(repo as any);
  importer.useCanonicalManifest(entries, dataset);
}

describe('TEST 1/2 — merge winner drives the write, on the existing UUID', () => {
  it('the V3 record writes a merged slug, updating the existing canonical row', async () => {
    const slug = collisions[0].slug;
    setup([{ id: 'live-uuid-1', slug, source_type: 'yeti_first_party' }], 'v3');
    await importer.importExercises([item({ slug, exercise_id: 'v3-record', name: 'X' })], {} as any);

    expect(repo.upserts).toHaveLength(1);
    // Updates in place — the live UUID is preserved, no second row created.
    expect(repo.upserts[0].opts).toMatchObject({ canonical: true, existingId: 'live-uuid-1' });
  });

  it('the V2 record for the same merged slug performs NO write', async () => {
    const slug = collisions[0].slug;
    setup([{ id: 'live-uuid-1', slug, source_type: 'yeti_first_party' }], 'v2');
    const metrics = await importer.importExercises([item({ slug, exercise_id: 'v2-record', name: 'X' })], {} as any);

    expect(repo.upserts).toHaveLength(0);
    expect(importer.conflicts[0].kind).toBe('manifest-merge-skipped');
    expect(metrics.rejected).toBe(0); // expected, not an error
  });

  it('all 24 merges resolve to V3 and V3 alone', () => {
    expect(collisions).toHaveLength(24);
    for (const e of collisions) {
      expect(e.merge_winner).toBe('v3');
      expect(isMergeWinner(e, 'v3')).toBe(true);
      expect(isMergeWinner(e, 'v2')).toBe(false);
    }
  });
});

describe('TEST 3/4/6/7 — rejected collisions never mutate', () => {
  it('an unexpected slug collision rejects before any repository write', async () => {
    setup([{ id: 'unrelated', slug: 'ab-wheel-rollout', source_type: 'yeti_first_party' }], 'v2');
    const metrics = await importer.importExercises([item({ exercise_id: 'a-different-record' })], {} as any);

    expect(repo.upserts).toHaveLength(0);
    expect(metrics.rejected).toBeGreaterThan(0);
    expect(importer.conflicts[0].kind).toBe('unexpected-slug-collision');
  });

  it('a legacy row collision rejects with zero writes', async () => {
    setup([{ id: 'legacy-1', slug: 'some-legacy-thing', source_type: 'legacy_catalog' }], 'v2');
    await importer.importExercises([item({ slug: 'some-legacy-thing', exercise_id: 'x' })], {} as any);

    expect(repo.upserts).toHaveLength(0);
    // Round 1D: a non-manifest slug is now refused at gate 0, before ownership
    // is even consulted. Either way the write count is what matters: zero.
    expect(importer.conflicts[0].proceed).toBe(false);
  });

  it('a coach-authored row collision rejects with zero writes', async () => {
    setup([{ id: 'coach-row', slug: 'ab-wheel-rollout', created_by_coach_id: 'coach-9' }], 'v2');
    await importer.importExercises([item()], {} as any);

    expect(repo.upserts).toHaveLength(0);
    expect(importer.conflicts[0].kind).toBe('foreign-owner-collision');
  });

  it('a duplicate id inside the batch is rejected and not written', async () => {
    setup([], 'v2');
    const metrics = await importer.importExercises(
      [item({ slug: 'a-slug', exercise_id: 'dup' }), item({ slug: 'b-slug', exercise_id: 'dup', name: 'B' })],
      {} as any,
    );
    expect(metrics.errors.some((e) => /Duplicate ID/.test(e.error))).toBe(true);
  });
});

describe('TEST 5 — name is never canonical identity', () => {
  it('a same-name different-slug row is treated as new, not an update', async () => {
    // The old path resolved id -> slug -> NAME, so this would have overwritten
    // the unrelated row that merely shares a name.
    setup([{ id: 'other-uuid', slug: 'completely-different-slug', source_type: 'yeti_first_party' }], 'v2');
    await importer.importExercises([item({ slug: 'ab-wheel-rollout', name: 'Ab Wheel Rollout' })], {} as any);

    expect(repo.upserts).toHaveLength(1);
    expect(repo.upserts[0].opts.existingId).toBeNull(); // created, not an overwrite
    // Lookups are by id and slug only.
    for (const l of repo.lookups) expect(l.slug).toBe('ab-wheel-rollout');
  });

  it('canonical upserts always pass canonical:true so the repo skips name matching', async () => {
    setup([], 'v3');
    await importer.importExercises([item({ slug: 'ab-wheel-rollout' })], {} as any);
    expect(repo.upserts[0].opts.canonical).toBe(true);
  });
});

describe('TEST 8/9 — source_type is never silently promoted to Yeti', () => {
  beforeEach(() => setup([], 'v2'));

  it('a missing source_type becomes legacy_catalog, never yeti_first_party', () => {
    expect(importer.normalizeSourceType(undefined)).toBe('legacy_catalog');
    expect(importer.normalizeSourceType('')).toBe('legacy_catalog');
    expect(importer.normalizeSourceType(undefined)).not.toBe('yeti_first_party');
  });

  it('canonical V2/V3 values normalize explicitly to yeti_first_party', () => {
    expect(importer.normalizeSourceType('yeti_v2')).toBe('yeti_first_party');
    expect(importer.normalizeSourceType('yeti_v3')).toBe('yeti_first_party');
    expect(importer.normalizeSourceType('yeti_first_party')).toBe('yeti_first_party');
  });

  it('legacy and custom are preserved, not promoted', () => {
    expect(importer.normalizeSourceType('custom')).toBe('custom');
    expect(importer.normalizeSourceType('legacy_catalog')).toBe('legacy_catalog');
    expect(importer.normalizeSourceType('free-exercise-db')).toBe('legacy_catalog');
  });

  it('the repository fallback is legacy_catalog, not Yeti', () => {
    const src = fs.readFileSync(path.join(ROOT, 'packages/database/src/repositories/ExerciseRepository.ts'), 'utf8');
    expect(src).not.toContain("payload.source_type || 'yeti_first_party'");
    expect(src).toContain("payload.source_type || 'legacy_catalog'");
  });
});

describe('TEST 15/16 — authored prescription survives the real importer', () => {
  it('metadata carries the exact authored text, including durations', async () => {
    setup([], 'v3');
    const parsed = importer.parseJson(JSON.stringify([
      { name: 'Sled Push', slug: 'sled-push', exercise_id: 'x', default_reps: '30–60 sec', default_sets: 3 },
    ]));
    expect(parsed[0].metadata!.default_reps_authored).toBe('30–60 sec');
    expect(parsed[0].metadata!.default_reps_lossy).toBe(true);
    // The legacy integer column is still lossy until the TEXT migration lands.
    expect(parsed[0].default_reps).toBe(30);
  });

  it('a range is preserved verbatim and flagged, not silently truncated', async () => {
    setup([], 'v3');
    const parsed = importer.parseJson(JSON.stringify([
      { name: 'Ab Wheel Rollout', slug: 'ab-wheel-rollout', exercise_id: 'y', default_reps: '8–12' },
    ]));
    expect(parsed[0].metadata!.default_reps_authored).toBe('8–12');
    expect(parsed[0].metadata!.default_reps_lossy).toBe(true);
  });
});

describe('TEST 11 — every collision carries an explicit reviewed winner', () => {
  it('24/24 have merge_winner and it is never inferred', () => {
    expect(collisions.filter((e) => e.merge_winner === 'v3')).toHaveLength(24);
    for (const e of entries) {
      expect(['v2', 'v3']).toContain(e.merge_winner);
      if (e.dataset_versions.length === 1) expect(e.merge_winner).toBe(e.dataset_versions[0]);
    }
  });
});
