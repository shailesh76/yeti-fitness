import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ExerciseImporter } from '../packages/database/src/importers/ExerciseImporter';
import { ExerciseRepository } from '../packages/database/src/repositories/ExerciseRepository';
import {
  classifyExistingOwnership, decideCollision, buildManifestIndex, type ManifestEntry,
} from '../packages/database/src/importers/collisionPolicy';

const ROOT = path.resolve(__dirname, '..');
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/yeti_exercise_provenance.json'), 'utf8'));
const entries: ManifestEntry[] = doc.exercises;
const manifest = buildManifestIndex(entries);
const CANON = entries.find((e) => e.dataset_versions.length === 1 && e.dataset_versions[0] === 'v2')!.slug;
const MERGED = entries.filter((e) => e.dataset_versions.length === 2)[0].slug;

/** Mock repository recording every mutation and metadata merge. */
function makeRepo(rows: any[] = []) {
  const upserts: Array<{ payload: any; opts: any }> = [];
  return {
    upserts,
    async findCanonicalRow(id: any, slug: string) {
      return rows.find((r) => (id && r.id === id) || r.slug === slug) ?? null;
    },
    async upsertExercise(payload: any, opts?: any) {
      upserts.push({ payload, opts });
      return { id: opts?.existingId ?? 'new-id', action: opts?.existingId ? 'updated' : 'created' };
    },
  };
}

function run(rows: any[], item: any, dataset: 'v2' | 'v3' = 'v3') {
  const repo = makeRepo(rows);
  const importer = new ExerciseImporter(repo as any);
  importer.useCanonicalManifest(entries, dataset);
  return { repo, importer, done: importer.importExercises([item], {} as any) };
}

const rec = (slug: string, over: any = {}) => ({
  name: over.name ?? 'Rec', slug, exercise_id: over.exercise_id ?? 'incoming-id', default_reps: '8–12', ...over,
});

describe('TESTS 1–6 — ownership is proven before any mutation', () => {
  it('1. manifest slug + legacy_catalog existing row → reject, zero writes', async () => {
    const { repo, importer, done } = run([{ id: 'legacy-uuid', slug: CANON, source_type: 'legacy_catalog' }], rec(CANON));
    await done;
    expect(repo.upserts).toHaveLength(0);
    expect(importer.conflicts[0].kind).toBe('foreign-owner-collision');
  });

  it('2. manifest slug + custom existing row → reject, zero writes', async () => {
    const { repo, importer, done } = run([{ id: 'custom-uuid', slug: CANON, source_type: 'custom' }], rec(CANON));
    await done;
    expect(repo.upserts).toHaveLength(0);
    expect(importer.conflicts[0].kind).toBe('foreign-owner-collision');
  });

  it('3. canonical incoming ID + legacy row → reject, zero writes', async () => {
    // ID equality must NOT confer permission.
    const { repo, done } = run([{ id: 'shared-id', slug: CANON, source_type: 'legacy_catalog' }], rec(CANON, { exercise_id: 'shared-id' }));
    await done;
    expect(repo.upserts).toHaveLength(0);
  });

  it('4. canonical incoming ID + custom row → reject, zero writes', async () => {
    const { repo, done } = run([{ id: 'shared-id', slug: CANON, source_type: 'custom' }], rec(CANON, { exercise_id: 'shared-id' }));
    await done;
    expect(repo.upserts).toHaveLength(0);
  });

  it('5. canonical ID + proven Yeti row → update permitted', async () => {
    const { repo, done } = run([{ id: 'shared-id', slug: CANON, source_type: 'yeti_first_party' }], rec(CANON, { exercise_id: 'shared-id' }));
    await done;
    expect(repo.upserts).toHaveLength(1);
    expect(repo.upserts[0].opts.existingId).toBe('shared-id');
  });

  it('6. created_by_coach_id blocks the overwrite even when everything else matches', async () => {
    const { repo, importer, done } = run(
      [{ id: 'shared-id', slug: CANON, source_type: 'yeti_first_party', created_by_coach_id: 'coach-1' }],
      rec(CANON, { exercise_id: 'shared-id' }),
    );
    await done;
    expect(repo.upserts).toHaveLength(0);
    expect(importer.conflicts[0].reason).toMatch(/coach-authored/i);
  });

  it('ownership classifier: only proven Yeti provenance passes', () => {
    expect(classifyExistingOwnership(null, manifest)).toBe('absent');
    expect(classifyExistingOwnership({ slug: CANON, source_type: 'yeti_first_party' }, manifest)).toBe('yeti_owned');
    expect(classifyExistingOwnership({ slug: CANON, source_type: 'yeti_v2' }, manifest)).toBe('yeti_owned');
    // yeti_v2 is transitional and only valid for a manifest-proven slug.
    expect(classifyExistingOwnership({ slug: 'not-canonical-slug', source_type: 'yeti_v2' }, manifest)).toBe('foreign');
    expect(classifyExistingOwnership({ slug: CANON, source_type: 'legacy_catalog' }, manifest)).toBe('foreign');
    expect(classifyExistingOwnership({ slug: CANON, source_type: 'custom' }, manifest)).toBe('foreign');
    expect(classifyExistingOwnership({ slug: CANON, source_type: null }, manifest)).toBe('foreign');
    expect(classifyExistingOwnership({ slug: CANON, source_type: 'yeti_first_party', created_by_coach_id: 'c' }, manifest)).toBe('coach_authored');
  });

  it('a non-manifest incoming slug is refused outright', () => {
    const d = decideCollision({ slug: 'totally-unknown', exercise_id: 'x' }, null, manifest);
    expect(d.proceed).toBe(false);
    expect(d.kind).toBe('not-canonical');
  });
});

describe('TESTS 7–8 — merge winner across the transition', () => {
  it('7. V3 winner updates a historical yeti_v2 row in place', async () => {
    const { repo, done } = run([{ id: 'live-uuid', slug: MERGED, source_type: 'yeti_v2' }], rec(MERGED), 'v3');
    await done;
    expect(repo.upserts).toHaveLength(1);
    expect(repo.upserts[0].opts.existingId).toBe('live-uuid'); // UUID preserved
  });

  it('8. the V2 loser cannot downgrade the canonical row', async () => {
    const { repo, importer, done } = run([{ id: 'live-uuid', slug: MERGED, source_type: 'yeti_first_party' }], rec(MERGED), 'v2');
    await done;
    expect(repo.upserts).toHaveLength(0);
    expect(importer.conflicts[0].kind).toBe('manifest-merge-skipped');
  });
});

describe('TESTS 9–10 — provenance metadata survives a canonical update', () => {
  const merge = (a: any, b: any) => ExerciseRepository.mergeMetadata(a, b);

  it('9/10. migration provenance and unrelated keys both survive', () => {
    const existing = {
      dataset_version: ['v2', 'v3'],
      content_source: 'v3',
      unrelated_key: 'keep-me',
    };
    const incoming = { default_reps_authored: '8–12', default_reps_lossy: true };
    const result = merge(existing, incoming);

    expect(result.dataset_version).toEqual(['v2', 'v3']);
    expect(result.content_source).toBe('v3');
    expect(result.unrelated_key).toBe('keep-me');
    expect(result.default_reps_authored).toBe('8–12');
    expect(result.default_reps_lossy).toBe(true);
  });

  it('incoming keys win for their own fields without erasing others', () => {
    const result = merge({ a: 1, default_reps_authored: 'old' }, { default_reps_authored: '30–60 sec' });
    expect(result.a).toBe(1);
    expect(result.default_reps_authored).toBe('30–60 sec');
  });

  it('the repository merges rather than replacing metadata', () => {
    const src = fs.readFileSync(path.join(ROOT, 'packages/database/src/repositories/ExerciseRepository.ts'), 'utf8');
    expect(src).not.toContain('metadata: payload.metadata || {}');
    expect(src).toContain('ExerciseRepository.mergeMetadata(existingMetadata, payload.metadata)');
  });
});

describe('TESTS 11–12 — exactly one canonical mutation path', () => {
  it('11. canonical mode without a collision-aware repository fails closed', async () => {
    const importer = new ExerciseImporter({} as any); // no findCanonicalRow/upsertExercise
    importer.useCanonicalManifest(entries, 'v3');
    const clientUpserts: any[] = [];
    const fakeClient = { from: () => ({ upsert: (v: any) => { clientUpserts.push(v); return { error: null }; } }) };

    await expect(importer.importExercises([rec(CANON)], fakeClient as any)).rejects.toThrow(/Canonical import requires an ExerciseRepository/);
    expect(clientUpserts).toHaveLength(0); // 12. no direct client upsert happened
  });

  it('the generic (non-canonical) path still works without the canonical contract', async () => {
    const importer = new ExerciseImporter({} as any);
    const clientUpserts: any[] = [];
    const fakeClient = { from: () => ({ upsert: (v: any) => { clientUpserts.push(v); return { error: null }; } }) };
    await importer.importExercises([rec(CANON)], fakeClient as any);
    expect(clientUpserts.length).toBeGreaterThan(0);
  });
});

describe('TESTS 13–15 — V3 field mapping', () => {
  const v3 = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/database/seeds/exercises/yeti_exercise_expansion_v3.json'), 'utf8'));

  it('13. stabilizer_muscles survives normalization', () => {
    const importer = new ExerciseImporter({} as any);
    const withStab = v3.find((e: any) => Array.isArray(e.stabilizer_muscles) && e.stabilizer_muscles.length > 0);
    expect(withStab).toBeTruthy();
    const [norm] = importer.parseJson(JSON.stringify([withStab]));
    expect(norm.metadata!.stabilizers.length).toBe(withStab.stabilizer_muscles.length);
    expect(norm.metadata!.stabilizers).toEqual(withStab.stabilizer_muscles.map((s: string) => s.toLowerCase().trim()));
  });

  it('14. deferred V3 fields survive losslessly in metadata', () => {
    const importer = new ExerciseImporter({} as any);
    const sample = v3.find((e: any) => e.progressions !== undefined || e.regressions !== undefined) ?? v3[0];
    const [norm] = importer.parseJson(JSON.stringify([sample]));
    if (sample.progressions !== undefined) expect(norm.metadata!.deferred_progressions).toEqual(sample.progressions);
    if (sample.regressions !== undefined) expect(norm.metadata!.deferred_regressions).toEqual(sample.regressions);
    if (sample.quality_status !== undefined) expect(norm.metadata!.deferred_quality_status).toEqual(sample.quality_status);
    if (sample.voice_script !== undefined) expect(norm.metadata!.deferred_voice_script).toEqual(sample.voice_script);
  });

  it('15. the three corrected muscles come from V3, not V2', () => {
    const byV3 = new Map(v3.map((e: any) => [e.slug, e]));
    expect((byV3.get('cable-glute-kickback') as any).primary_muscle).toBe('Gluteus Maximus');
    expect((byV3.get('cable-pull-through') as any).primary_muscle).toBe('Hamstrings');
    expect((byV3.get('smith-machine-hip-thrust') as any).primary_muscle).toMatch(/glute/i);
    // and all three are V3-won merges, so re-import corrects them
    for (const s of ['cable-glute-kickback', 'cable-pull-through', 'smith-machine-hip-thrust']) {
      expect(manifest.get(s)!.merge_winner).toBe('v3');
    }
  });
});

describe('TESTS 16–17 — documented commands actually execute', () => {
  it('16. generator --check exits 0', () => {
    const out = execFileSync('node', ['scripts/generate_exercise_provenance.ts', '--check'], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toMatch(/Manifest in sync: 396 canonical exercises/);
  });

  it('17. validator exits 0 with the expected counts', () => {
    const out = execFileSync('node', ['scripts/validate_exercise_datasets.ts'], { cwd: ROOT, encoding: 'utf8' });
    expect(out).toMatch(/V2 Items Count:\s+220/);
    expect(out).toMatch(/V3 Items Count:\s+200/);
    expect(out).toMatch(/Total Input Records:\s+420/);
    expect(out).toMatch(/Reviewed V2\/V3 Merges:\s+24/);
    expect(out).toMatch(/CANONICAL EXERCISE COUNT:\s+396/);
    expect(out).toMatch(/Critical Errors:\s+0/);
    expect(out).toMatch(/VALIDATION PASSED/);
  });
});
