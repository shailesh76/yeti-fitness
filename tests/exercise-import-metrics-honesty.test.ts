import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ExerciseImporter } from '../packages/database/src/importers/ExerciseImporter';
import type { ManifestEntry } from '../packages/database/src/importers/collisionPolicy';

const ROOT = path.resolve(__dirname, '..');
const entries: ManifestEntry[] = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/data/yeti_exercise_provenance.json'), 'utf8'),
).exercises;
const CANARY = 'cable-glute-kickback';

/**
 * Repository stub returning controllable child-write outcomes, so the exact
 * live canary discrepancy can be reproduced: the parser saw 9 media records
 * while the database created 0.
 */
function repoWith(children: any[], opts: { existingId?: string | null } = {}) {
  const calls: any[] = [];
  return {
    calls,
    async findCanonicalRow() {
      return opts.existingId ? { id: opts.existingId, slug: CANARY, source_type: 'yeti_first_party' } : null;
    },
    async upsertExercise(payload: any, o?: any) {
      calls.push({ payload, opts: o });
      return { id: o?.existingId ?? 'new-id', action: o?.existingId ? 'updated' : 'created', children };
    },
  };
}

function itemFor(slug: string) {
  return {
    name: 'Cable Glute Kickback', slug, exercise_id: 'v3-rec',
    search_aliases: ['Glute Kickback'], ai_tags: ['a', 'b', 'c'], default_reps: '8–12',
    // Media URLs make the normalizer emit media records, which is what produced
    // the live "Media Records Inserted 9" against 0 rows actually created.
    video_url: 'https://example/v.mp4', gif_url: 'https://example/p.gif', thumbnail_url: 'https://example/t.webp',
  };
}

async function runImport(children: any[], existingId: string | null = 'live-uuid') {
  const repo = repoWith(children, { existingId });
  const importer = new ExerciseImporter(repo as any);
  importer.useCanonicalManifest(entries, 'v3');
  const items = importer.parseJson(JSON.stringify([itemFor(CANARY)]));
  const metrics = await importer.importExercises(items, {} as any);
  return { repo, importer, metrics };
}

describe('1/5/6 — parsed counts are never reported as database writes', () => {
  it('reproduces the live canary discrepancy: 9 media parsed, 0 created', async () => {
    const { metrics } = await runImport([
      { stage: 'media upsert', attempted: 9, upserted: 0, error: null },
    ]);
    expect(metrics.mediaRecordsInserted).toBeGreaterThan(0); // parser count
    expect(metrics.mediaUpserted).toBe(0);                   // database truth
    expect(metrics.mediaRecordsInserted).not.toBe(metrics.mediaUpserted);
  });

  it('tag parser count may differ from the confirmed count', async () => {
    const { metrics } = await runImport([
      { stage: 'tag upsert', attempted: 18, upserted: 6, error: null },
    ]);
    expect(metrics.tagsInserted).toBe(3);   // parsed from this item
    expect(metrics.tagsUpserted).toBe(6);   // what the DB confirmed
  });

  it('database buckets start at zero and only the DB can raise them', async () => {
    const { metrics } = await runImport([]);
    expect(metrics.aliasesUpserted).toBe(0);
    expect(metrics.tagsUpserted).toBe(0);
    expect(metrics.musclesUpserted).toBe(0);
    expect(metrics.mediaUpserted).toBe(0);
  });
});

describe('2/3 — confirmed writes and deduplication', () => {
  it('a successful child write increments the confirmed count', async () => {
    const { metrics } = await runImport([
      { stage: 'alias upsert', attempted: 3, upserted: 3, error: null },
      { stage: 'muscle upsert', attempted: 9, upserted: 9, error: null },
    ]);
    expect(metrics.aliasesUpserted).toBe(3);
    expect(metrics.musclesUpserted).toBe(9);
    expect(metrics.childWritesFailed).toBe(0);
  });

  it('a deduplicated write reports fewer confirmed than attempted, and no error', async () => {
    const { metrics } = await runImport([
      { stage: 'tag upsert', attempted: 18, upserted: 6, error: null },
    ]);
    expect(metrics.tagsUpserted).toBe(6);
    expect(metrics.childWritesFailed).toBe(0);
    expect(metrics.errors).toHaveLength(0);
  });
});

describe('4/7/8 — errors are surfaced with their stage, never swallowed', () => {
  it('a returned { error } is recorded and not counted as written', async () => {
    const { metrics } = await runImport([
      { stage: 'media upsert', attempted: 9, upserted: 0, error: 'media upsert: Invalid API key' },
    ]);
    expect(metrics.mediaUpserted).toBe(0);
    expect(metrics.childWritesFailed).toBe(9);
    expect(metrics.errors.some((e) => /media upsert/.test(e.error))).toBe(true);
  });

  it('7. the message identifies the exact stage', async () => {
    const stages = ['alias upsert', 'tag upsert', 'muscle upsert', 'media upsert'] as const;
    for (const stage of stages) {
      const { metrics } = await runImport([{ stage, attempted: 2, upserted: 0, error: `${stage}: boom` }]);
      expect(metrics.errors[0].error).toContain(stage);
    }
  });

  it('8. parent success + child failure cannot read as full success', async () => {
    const { metrics } = await runImport([
      { stage: 'alias upsert', attempted: 3, upserted: 3, error: null },
      { stage: 'media upsert', attempted: 9, upserted: 0, error: 'media upsert: permission denied' },
    ]);
    expect(metrics.exercisesUpdated).toBe(1);        // parent succeeded
    expect(metrics.childWritesFailed).toBeGreaterThan(0);
    expect(metrics.errors.length).toBeGreaterThan(0); // and it is visible
  });

  it('the parent upsert error names its own stage', () => {
    const src = fs.readFileSync(path.join(ROOT, 'packages/database/src/repositories/ExerciseRepository.ts'), 'utf8');
    expect(src).toContain('exercise parent upsert failed for');
    expect(src).not.toContain('Failed to upsert exercise ${payload.name}');
  });
});

describe('9/10 — no duplicate child rows, parent UUID preserved', () => {
  it('9. every child write uses an onConflict target, so re-running cannot duplicate', () => {
    const src = fs.readFileSync(path.join(ROOT, 'packages/database/src/repositories/ExerciseRepository.ts'), 'utf8');
    for (const target of ['exercise_id,alias', 'exercise_id,tag', 'exercise_id,muscle,role', 'exercise_id,r2_key']) {
      expect(src).toContain(target);
    }
    // and no child write is a bare await that ignores its result
    expect(src).not.toMatch(/await this\.supabase\.from\('exercise_(aliases|tags|muscles|media)'\)\.upsert\([^)]*\);/);
  });

  it('10. the canonical parent UUID is still preserved', async () => {
    const { repo } = await runImport([], 'live-uuid');
    expect(repo.calls).toHaveLength(1);
    expect(repo.calls[0].opts).toMatchObject({ canonical: true, existingId: 'live-uuid' });
  });

  it('child results are optional — an older repository shape does not crash', async () => {
    const repo = {
      async findCanonicalRow() { return { id: 'u', slug: CANARY, source_type: 'yeti_first_party' }; },
      async upsertExercise() { return { id: 'u', action: 'updated' as const }; },
    };
    const importer = new ExerciseImporter(repo as any);
    importer.useCanonicalManifest(entries, 'v3');
    const items = importer.parseJson(JSON.stringify([itemFor(CANARY)]));
    const metrics = await importer.importExercises(items, {} as any);
    expect(metrics.exercisesUpdated).toBe(1);
    expect(metrics.childWritesFailed).toBe(0);
  });
});

describe('CLI output separates parsed from database result', () => {
  const cli = fs.readFileSync(path.join(ROOT, 'scripts/import_exercises.ts'), 'utf8');

  it('no longer labels parser counts as "Inserted"', () => {
    expect(cli).not.toContain('Aliases Inserted:');
    expect(cli).not.toContain('Tags Inserted:');
    expect(cli).not.toContain('Media Records Inserted:');
  });

  it('prints both sections and flags partial success', () => {
    expect(cli).toContain('PARSED / ATTEMPTED');
    expect(cli).toContain('DATABASE RESULT');
    expect(cli).toContain('metrics.aliasesUpserted');
    expect(cli).toContain('metrics.mediaUpserted');
    expect(cli).toContain('Child rows FAILED');
    expect(cli).toContain('PARTIAL SUCCESS, not a success');
  });
});
