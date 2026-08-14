import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  decideCollision, findDuplicateIds, parsePrescription, buildManifestIndex,
  type ManifestEntry,
} from '../packages/database/src/importers/collisionPolicy';

const ROOT = path.resolve(__dirname, '..');
const manifestDoc = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/data/yeti_exercise_provenance.json'), 'utf8'),
);
const entries: ManifestEntry[] = manifestDoc.exercises;
const manifest = buildManifestIndex(entries);
const migration = fs.readFileSync(
  path.join(ROOT, 'supabase/migrations/20260812133000_exercise_source_taxonomy_reconciliation.sql'),
  'utf8',
);
const v2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/database/seeds/exercises/yeti_equipment_exercises_v2.json'), 'utf8'));
const v3 = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/database/seeds/exercises/yeti_exercise_expansion_v3.json'), 'utf8'));

const collisionSlugs = entries.filter((e) => e.dataset_versions.length === 2).map((e) => e.slug);

describe('canonical membership is dataset-derived, not source_type-derived', () => {
  it('420 input records reconcile to 396 canonical exercises', () => {
    expect(v2.length).toBe(220);
    expect(v3.length).toBe(200);
    expect(manifestDoc.input_records).toBe(420);
    expect(manifestDoc.canonical_exercises).toBe(396);
    expect(entries.length).toBe(396);
  });

  it('all 24 shared slugs have an explicit ["v2","v3"] resolution', () => {
    expect(collisionSlugs).toHaveLength(24);
    for (const slug of collisionSlugs) {
      const e = manifest.get(slug)!;
      expect(e.dataset_versions).toEqual(['v2', 'v3']);
    }
  });

  it('membership splits 196 v2-only / 176 v3-only / 24 merged', () => {
    const only = (v: string) => entries.filter((e) => e.dataset_versions.length === 1 && e.dataset_versions[0] === v).length;
    expect(only('v2')).toBe(196);
    expect(only('v3')).toBe(176);
    expect(only('v2') + 24).toBe(v2.length);
    expect(only('v3') + 24).toBe(v3.length);
  });
});

describe('TEST 1 — a legacy row wrongly labelled yeti_v2 does NOT become Yeti', () => {
  it('is excluded from the manifest, so reconciliation cannot claim it', () => {
    // This is the DEFAULT-inheritance case: source_type says yeti_v2 but the
    // slug was never in either dataset.
    expect(manifest.has('barbell-bench-press-legacy-import')).toBe(false);
    const decision = decideCollision(
      { slug: 'barbell-bench-press-legacy-import', exercise_id: 'legacy-1' },
      { id: 'other-row', slug: 'barbell-bench-press-legacy-import', source_type: 'yeti_v2' },
      manifest,
    );
    expect(decision.proceed).toBe(false);
  });

  it('the migration classifies by manifest membership, never by source_type', () => {
    // 3a keys on the manifest join; the legacy branch is the NOT EXISTS.
    expect(migration).toContain('FROM _yeti_canonical c');
    expect(migration).toContain('NOT EXISTS (SELECT 1 FROM _yeti_canonical c WHERE c.slug = e.slug)');
    expect(migration).not.toMatch(/WHERE\s+source_type\s*=\s*'yeti_v2'/);
  });
});

describe('TEST 2/3 — manifest-proven V2 and V3 rows become yeti_first_party', () => {
  it('every manifest entry declares the canonical source_type', () => {
    for (const e of entries) expect((e as any).source_type).toBe('yeti_first_party');
  });

  it('a V2-only and a V3-only slug are both present', () => {
    const v2only = entries.find((e) => e.dataset_versions.join() === 'v2')!;
    const v3only = entries.find((e) => e.dataset_versions.join() === 'v3')!;
    expect(manifest.has(v2only.slug)).toBe(true);
    expect(manifest.has(v3only.slug)).toBe(true);
  });
});

describe('TEST 4/5 — custom preserved, remainder becomes legacy_catalog', () => {
  it('coach-authored rows are classified custom regardless of inherited source_type', () => {
    expect(migration).toContain("SET source_type = 'custom'");
    expect(migration).toContain('WHERE created_by_coach_id IS NOT NULL');
  });

  it('a dataset import refuses to overwrite a coach-authored row', () => {
    const d = decideCollision(
      { slug: 'ab-wheel-rollout', exercise_id: 'yeti-ex-0001' },
      { id: 'coach-row', slug: 'ab-wheel-rollout', created_by_coach_id: 'coach-1' },
      manifest,
    );
    expect(d.proceed).toBe(false);
    // 'ab-wheel-rollout' IS a manifest member, so this reaches the ownership
    // gate and is refused there because the row is coach-authored.
    expect(d.kind).toBe('foreign-owner-collision');
  });

  it('non-manifest rows fall to legacy_catalog', () => {
    expect(migration).toContain("SET source_type = 'legacy_catalog'");
  });
});

describe('TEST 6 — every collision has an explicit resolution', () => {
  it('each of the 24 is a manifest-merge, never a silent overwrite', () => {
    for (const slug of collisionSlugs) {
      const d = decideCollision(
        { slug, exercise_id: 'v3-record' },
        { id: 'existing-canonical', slug, source_type: 'yeti_first_party' },
        manifest,
      );
      expect(d.kind).toBe('manifest-merge');
      expect(d.proceed).toBe(true);
      expect(d.reason).toMatch(/v2\+v3/);
    }
  });
});

describe('TEST 7/8 — unexpected collisions fail the import', () => {
  it('an unknown slug that already exists is rejected', () => {
    const d = decideCollision(
      { slug: 'totally-new-thing', exercise_id: 'x' },
      { id: 'someone-else', slug: 'totally-new-thing', source_type: 'legacy_catalog' },
      manifest,
    );
    expect(d.proceed).toBe(false);
    // Round 1D: refused at gate 0 — canonical import only writes manifest members.
    expect(d.kind).toBe('not-canonical');
  });

  it('a single-dataset manifest slug held by an unrelated row is rejected', () => {
    const v2only = entries.find((e) => e.dataset_versions.join() === 'v2')!;
    const d = decideCollision(
      { slug: v2only.slug, exercise_id: 'a-different-record' },
      { id: 'unrelated-row', slug: v2only.slug, source_type: 'yeti_first_party' },
      manifest,
    );
    expect(d.proceed).toBe(false);
    expect(d.kind).toBe('unexpected-slug-collision');
  });

  it('duplicate ids inside one batch are detected', () => {
    expect(findDuplicateIds([
      { slug: 'a', exercise_id: 'dup' },
      { slug: 'b', exercise_id: 'dup' },
      { slug: 'c', exercise_id: 'unique' },
    ])).toEqual(['dup']);
    expect(findDuplicateIds([{ slug: 'a', exercise_id: '1' }, { slug: 'b', exercise_id: '2' }])).toEqual([]);
  });

  it('a brand-new slug is refused unless it is a manifest member', () => {
    // Round 1D: canonical import writes ONLY canonical exercises. An unknown
    // slug with no existing row used to be created; that let a non-canonical
    // record enter the catalogue as first-party.
    const unknown = decideCollision({ slug: 'brand-new', exercise_id: 'n1' }, null, manifest);
    expect(unknown.proceed).toBe(false);
    expect(unknown.kind).toBe('not-canonical');

    // A manifest member with no existing row is still created.
    const known = decideCollision({ slug: entries[0].slug, exercise_id: 'n1' }, null, manifest);
    expect(known.proceed).toBe(true);
    expect(known.kind).toBe('new');
  });

  it('a matching canonical id is an ordinary update', () => {
    const d = decideCollision(
      { slug: 'ab-wheel-rollout', exercise_id: 'same-id' },
      { id: 'same-id', slug: 'ab-wheel-rollout', source_type: 'yeti_first_party' },
      manifest,
    );
    expect(d.kind).toBe('canonical-id-match');
    expect(d.proceed).toBe(true);
  });
});

describe('TEST 9 — source_type vocabulary is constrained', () => {
  it('the migration adds the CHECK only after proving no value falls outside', () => {
    const checkIdx = migration.indexOf('ADD CONSTRAINT exercises_source_type_check');
    const guardIdx = migration.indexOf('unclassified source_type value(s) remain');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(checkIdx);
    expect(migration).toContain("CHECK (source_type IN ('yeti_first_party', 'legacy_catalog', 'custom'))");
  });

  it('runs in one transaction and drops the contaminating DEFAULT', () => {
    expect(migration.trimStart().startsWith('--')).toBe(true);
    expect(migration).toContain('BEGIN;');
    expect(migration.trimEnd().endsWith('COMMIT;')).toBe(true);
    expect(migration).toContain("ALTER COLUMN source_type SET DEFAULT 'legacy_catalog'");
  });

  it('never deletes and never rewrites ids', () => {
    expect(migration).not.toMatch(/DELETE\s+FROM\s+public\.exercises/i);
    expect(migration).not.toMatch(/SET\s+id\s*=/i);
  });

  it('does not infer dataset version from id shape', () => {
    expect(migration).not.toContain("id LIKE '00000000-0000-4000-a000-%'");
  });
});

describe('TEST 10 — default_reps ranges are not truncated', () => {
  it('keeps the authored text for ranges and durations', () => {
    expect(parsePrescription('8–12').text).toBe('8–12');
    expect(parsePrescription('30–60 sec').text).toBe('30–60 sec');
    expect(parsePrescription('6–10 controlled reps').text).toBe('6–10 controlled reps');
  });

  it('flags every lossy coercion instead of writing a wrong number silently', () => {
    expect(parsePrescription('8–12').lossy).toBe(true);
    expect(parsePrescription('30–60 sec').lossy).toBe(true);
    expect(parsePrescription('12').lossy).toBe(false);
    expect(parsePrescription(12).lossy).toBe(false);
  });

  it('recognises durations, which are not repetition counts at all', () => {
    expect(parsePrescription('30–60 sec').isDuration).toBe(true);
    expect(parsePrescription('30–60 seconds').isDuration).toBe(true);
    expect(parsePrescription('8–12').isDuration).toBe(false);
  });

  it('handles hyphen, en dash and em dash ranges alike', () => {
    for (const s of ['8-12', '8–12', '8—12']) expect(parsePrescription(s).lossy).toBe(true);
  });

  it('every authored dataset prescription survives intact in the manifest', () => {
    const authored = new Set([...v2, ...v3].map((e: any) => String(e.default_reps)));
    const inManifest = new Set(entries.map((e: any) => e.default_reps));
    for (const value of inManifest) expect(authored.has(value as string)).toBe(true);
    // The four authored shapes must all still be representable.
    expect(inManifest.has('8–12' as any)).toBe(true);
    expect(inManifest.has('30–60 sec' as any)).toBe(true);
  });

  it('an empty prescription is not invented', () => {
    const p = parsePrescription('');
    expect(p.text).toBe('');
    expect(p.legacyNumeric).toBeNull();
  });
});

describe('TEST 11/12 — dataset integrity the validator must enforce', () => {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  it('V3 ids are UUIDs and V2 ids deliberately are not', () => {
    expect(v3.every((e: any) => UUID_RE.test(e.exercise_id))).toBe(true);
    expect(v2.some((e: any) => !UUID_RE.test(e.exercise_id))).toBe(true);
  });

  it('no duplicate ids, slugs or names within either file', () => {
    for (const [, arr] of [['v2', v2], ['v3', v3]] as const) {
      expect(new Set(arr.map((e: any) => e.exercise_id)).size).toBe(arr.length);
      expect(new Set(arr.map((e: any) => e.slug)).size).toBe(arr.length);
      expect(new Set(arr.map((e: any) => e.name.toLowerCase())).size).toBe(arr.length);
    }
  });

  it('no id is shared across files, so only slugs collide', () => {
    const ids2 = new Set(v2.map((e: any) => e.exercise_id));
    expect(v3.filter((e: any) => ids2.has(e.exercise_id))).toHaveLength(0);
  });

  it('all 24 shared slugs also share a name — evidence they are one exercise', () => {
    const byV2 = new Map<string, any>(v2.map((e: any) => [e.slug, e]));
    const byV3 = new Map<string, any>(v3.map((e: any) => [e.slug, e]));
    for (const slug of collisionSlugs) {
      expect(byV2.get(slug).name.trim().toLowerCase())
        .toBe(byV3.get(slug).name.trim().toLowerCase());
    }
  });
});
