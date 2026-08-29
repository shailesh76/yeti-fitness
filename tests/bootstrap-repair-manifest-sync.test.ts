import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const manifestDoc = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/data/yeti_exercise_provenance.json'), 'utf8'),
);
const manifestEntries: Array<{ slug: string; name: string }> = manifestDoc.exercises;

const seedMigrationSql = fs.readFileSync(
  path.join(ROOT, 'supabase/migrations/20260812132900_seed_canonical_manifest_exercises.sql'),
  'utf8',
);

describe('Bootstrap Repair — Canonical Manifest Seed Sync', () => {
  it('provenance manifest contains exactly 396 canonical entries', () => {
    expect(manifestEntries.length).toBe(396);
    const uniqueSlugs = new Set(manifestEntries.map((e) => e.slug));
    expect(uniqueSlugs.size).toBe(396);
  });

  it('20260812132900 seeds exactly 396 canonical slugs matching manifest 1:1', () => {
    const regex = /\(\s*'([^']+)',\s*'([^']+)',/g;
    let match: RegExpExecArray | null;
    const migrationSlugs: string[] = [];
    const migrationNames: string[] = [];

    while ((match = regex.exec(seedMigrationSql)) !== null) {
      migrationSlugs.push(match[1]);
      migrationNames.push(match[2]);
    }

    expect(migrationSlugs.length).toBe(396);
    const uniqueMigrationSlugs = new Set(migrationSlugs);
    expect(uniqueMigrationSlugs.size).toBe(396);

    const manifestSlugSet = new Set(manifestEntries.map((e) => e.slug));
    for (const slug of migrationSlugs) {
      expect(manifestSlugSet.has(slug)).toBe(true);
    }
    for (const slug of manifestSlugSet) {
      expect(uniqueMigrationSlugs.has(slug)).toBe(true);
    }
  });

  it('every manifest entry has a non-empty name and zero duplicate names in manifest', () => {
    const names = manifestEntries.map((e) => e.name);
    for (const name of names) {
      expect(name).toBeDefined();
      expect(name.trim().length).toBeGreaterThan(0);
    }
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(396);
  });
});

describe('Bootstrap Repair — Legacy Migration Portability & Policy Syntax', () => {
  it('zero executable occurrences of uuid_generate_v4() across active migrations', () => {
    const migrationsDir = path.join(ROOT, 'supabase/migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const hasLegacyUuid = /uuid_generate_v4\s*\(\s*\)/i.test(content);
      expect(hasLegacyUuid, `Found uuid_generate_v4() in ${file}`).toBe(false);
    }
  });

  it('20240629020000_workout_logs_rls_fix.sql contains valid DROP/CREATE policy syntax', () => {
    const rlsFixSql = fs.readFileSync(
      path.join(ROOT, 'supabase/migrations/20240629020000_workout_logs_rls_fix.sql'),
      'utf8',
    );
    expect(rlsFixSql).not.toMatch(/CREATE\s+POLICY\s+IF\s+NOT\s+EXISTS/i);
    expect(rlsFixSql).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+"Users can delete their own workout logs\."/i);
    expect(rlsFixSql).toMatch(/CREATE\s+POLICY\s+"Users can delete their own workout logs\."/i);
    expect(rlsFixSql).toMatch(/DROP\s+POLICY\s+IF\s+EXISTS\s+"Authenticated users can view all workout logs\."/i);
    expect(rlsFixSql).toMatch(/CREATE\s+POLICY\s+"Authenticated users can view all workout logs\."/i);
  });

  it('20260722_exercise_relations.sql uses dynamic set-based generation without static UUID tuples', () => {
    const relationsSql = fs.readFileSync(
      path.join(ROOT, 'supabase/migrations/20260722_exercise_relations.sql'),
      'utf8',
    );
    expect(relationsSql).toMatch(/WITH\s+ranked_relations\s+AS/i);
    expect(relationsSql).toMatch(/ROW_NUMBER\(\)\s+OVER/i);
    expect(relationsSql).not.toMatch(/VALUES\s*\(\s*'536fafdb/i);
  });
});
