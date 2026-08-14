import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  parseEnvFile, loadEnvFile, resolveSlugFilter, applySlugFilter,
} from '../scripts/lib/importCliOptions';
import { ExerciseImporter } from '../packages/database/src/importers/ExerciseImporter';
import type { ManifestEntry } from '../packages/database/src/importers/collisionPolicy';

const ROOT = path.resolve(__dirname, '..');
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/data/yeti_exercise_provenance.json'), 'utf8'));
const entries: ManifestEntry[] = doc.exercises;
const manifestSlugs = new Set(entries.map((e) => e.slug));
const v3 = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/database/seeds/exercises/yeti_exercise_expansion_v3.json'), 'utf8'));
const v2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'packages/database/seeds/exercises/yeti_equipment_exercises_v2.json'), 'utf8'));
const v3Slugs = new Set<string>(v3.map((e: any) => e.slug));
const v2Slugs = new Set<string>(v2.map((e: any) => e.slug));

const CANARIES = ['cable-glute-kickback', 'cable-pull-through', 'smith-machine-hip-thrust'];

function tmpEnv(contents: string): string {
  const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'yeti-env-')), '.env');
  fs.writeFileSync(p, contents);
  return p;
}

describe('STEP 1 — env loading', () => {
  it('parses CRLF files, which the old loader could not', () => {
    // The real defect: split('\n') left a trailing '\r'; '.' never matches '\r'
    // and '$' (no 'm' flag) demands end-of-string, so EVERY line failed.
    const crlf = 'EXPO_PUBLIC_SUPABASE_URL=https://example.supabase.co\r\nOTHER=abc\r\n';
    const parsed = parseEnvFile(crlf);
    expect(parsed.EXPO_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    expect(parsed.OTHER).toBe('abc');
  });

  it('reproduces the old failure to prove the root cause', () => {
    const line = 'EXPO_PUBLIC_SUPABASE_URL=https://example.supabase.co\r';
    expect(line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/)).toBeNull(); // old regex
    expect(parseEnvFile(line).EXPO_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
  });

  it('loads the URL from the repository .env when run from repo root', () => {
    const env = {} as NodeJS.ProcessEnv;
    loadEnvFile(path.join(ROOT, '.env'), env);
    const url = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
    expect(url).toBeTruthy();
    expect(url).toMatch(/^https:\/\//);
  });

  it('an explicit environment variable overrides the file value', () => {
    const p = tmpEnv('EXPO_PUBLIC_SUPABASE_URL=https://from-file.example\n');
    const env = { EXPO_PUBLIC_SUPABASE_URL: 'https://explicit.example' } as unknown as NodeJS.ProcessEnv;
    loadEnvFile(p, env);
    expect(env.EXPO_PUBLIC_SUPABASE_URL).toBe('https://explicit.example');
  });

  it('handles quotes, comments, blank lines and BOM', () => {
    const parsed = parseEnvFile('﻿# comment\n\nA="quoted"\nB=\'single\'\nC=plain\n');
    expect(parsed).toEqual({ A: 'quoted', B: 'single', C: 'plain' });
  });

  it('never hardcodes a URL, service key, anon fallback or password login', () => {
    const cli = fs.readFileSync(path.join(ROOT, 'scripts/import_exercises.ts'), 'utf8');
    expect(cli).toContain('SUPABASE_SERVICE_ROLE_KEY must be set for live imports');
    expect(cli).not.toMatch(/signInWithPassword/);
    expect(cli).not.toMatch(/ANON_KEY/);
    expect(cli).not.toMatch(/https:\/\/[a-z0-9]+\.supabase\.co/);
    // Dry-run stays possible without privileged credentials.
    expect(cli).toContain('Dry-run validation will proceed without DB connection');
  });
});

describe('STEP 4 — canary slug filter', () => {
  it('1. one exact slug selects exactly one record', () => {
    const { slugs, errors } = resolveSlugFilter(['--slug=cable-glute-kickback'], v3Slugs, manifestSlugs);
    expect(errors).toEqual([]);
    expect(slugs).toEqual(['cable-glute-kickback']);
    expect(applySlugFilter(v3, slugs)).toHaveLength(1);
  });

  it('2. three exact slugs select only those three', () => {
    const { slugs, errors } = resolveSlugFilter(CANARIES.map((s) => `--slug=${s}`), v3Slugs, manifestSlugs);
    expect(errors).toEqual([]);
    expect(slugs).toEqual(CANARIES);
    const selected = applySlugFilter(v3, slugs);
    expect(selected).toHaveLength(3);
    expect(selected.map((e: any) => e.slug).sort()).toEqual([...CANARIES].sort());
  });

  it('comma-separated form is equivalent', () => {
    const { slugs } = resolveSlugFilter([`--slug=${CANARIES.join(',')}`], v3Slugs, manifestSlugs);
    expect(slugs).toEqual(CANARIES);
  });

  it('3. an unknown slug fails, selecting nothing', () => {
    const { slugs, errors } = resolveSlugFilter(['--slug=not-a-real-exercise'], v3Slugs, manifestSlugs);
    expect(slugs).toEqual([]);
    expect(errors[0]).toMatch(/not in the provenance manifest/);
  });

  it('4. a slug from the wrong dataset fails', () => {
    // A V2-only manifest slug is not in the V3 file.
    const v2Only = entries.find((e) => e.dataset_versions.join() === 'v2')!.slug;
    const { slugs, errors } = resolveSlugFilter([`--slug=${v2Only}`], v3Slugs, manifestSlugs);
    expect(slugs).toEqual([]);
    expect(errors[0]).toMatch(/not present in the selected dataset/);
  });

  it('5. a non-manifest slug fails even if it were in a file', () => {
    const { errors } = resolveSlugFilter(['--slug=made-up'], new Set(['made-up']), manifestSlugs);
    expect(errors[0]).toMatch(/not in the provenance manifest/);
  });

  it('6. duplicate --slug arguments do not duplicate the selection', () => {
    const { slugs } = resolveSlugFilter(
      ['--slug=cable-glute-kickback', '--slug=cable-glute-kickback'],
      v3Slugs, manifestSlugs,
    );
    expect(slugs).toEqual(['cable-glute-kickback']);
    expect(applySlugFilter(v3, slugs)).toHaveLength(1);
  });

  it('no fuzzy, prefix or name matching', () => {
    for (const bad of ['cable-glute', 'CABLE-GLUTE-KICKBACK', 'Cable Glute Kickback', 'cable_glute_kickback']) {
      const { slugs, errors } = resolveSlugFilter([`--slug=${bad}`], v3Slugs, manifestSlugs);
      expect(slugs).toEqual([]);
      expect(errors).toHaveLength(1);
    }
  });

  it('9. no filter keeps full-dataset behaviour', () => {
    expect(applySlugFilter(v3, [])).toHaveLength(200);
    expect(applySlugFilter(v2, [])).toHaveLength(220);
  });
});

describe('STEP 4 — filtered import still runs the ownership/collision policy', () => {
  function makeRepo(rows: any[] = []) {
    const upserts: any[] = [];
    return {
      upserts,
      async findCanonicalRow(id: any, slug: string) {
        return rows.find((r) => (id && r.id === id) || r.slug === slug) ?? null;
      },
      async upsertExercise(payload: any, opts?: any) {
        upserts.push({ payload, opts });
        return { id: opts?.existingId ?? 'new', action: opts?.existingId ? 'updated' : 'created' };
      },
    };
  }

  it('7. a filtered canary still refuses a foreign-owned row', async () => {
    const repo = makeRepo([{ id: 'legacy-uuid', slug: CANARIES[0], source_type: 'legacy_catalog' }]);
    const importer = new ExerciseImporter(repo as any);
    importer.useCanonicalManifest(entries, 'v3');
    const selected = applySlugFilter(v3, [CANARIES[0]]).map((e: any) => ({ ...e, name: e.name }));
    await importer.importExercises(importer.parseJson(JSON.stringify(selected)), {} as any);

    expect(repo.upserts).toHaveLength(0);
    expect(importer.conflicts[0].kind).toBe('foreign-owner-collision');
  });

  it('7b. a filtered canary updates a Yeti-owned row in place', async () => {
    const repo = makeRepo([{ id: 'live-uuid', slug: CANARIES[0], source_type: 'yeti_first_party' }]);
    const importer = new ExerciseImporter(repo as any);
    importer.useCanonicalManifest(entries, 'v3');
    const selected = applySlugFilter(v3, [CANARIES[0]]);
    await importer.importExercises(importer.parseJson(JSON.stringify(selected)), {} as any);

    expect(repo.upserts).toHaveLength(1);
    expect(repo.upserts[0].opts.existingId).toBe('live-uuid');
  });

  it('8. the V2 loser cannot overwrite the V3 winner, even when filtered', async () => {
    const repo = makeRepo([{ id: 'live-uuid', slug: CANARIES[0], source_type: 'yeti_first_party' }]);
    const importer = new ExerciseImporter(repo as any);
    importer.useCanonicalManifest(entries, 'v2');
    const selected = applySlugFilter(v2, [CANARIES[0]]);
    await importer.importExercises(importer.parseJson(JSON.stringify(selected)), {} as any);

    expect(repo.upserts).toHaveLength(0);
    expect(importer.conflicts[0].kind).toBe('manifest-merge-skipped');
  });

  it('10. dry-run validation performs zero writes', () => {
    const repo = makeRepo();
    const importer = new ExerciseImporter(repo as any);
    importer.useCanonicalManifest(entries, 'v3');
    const selected = applySlugFilter(v3, CANARIES);
    const metrics = importer.validateDryRun(importer.parseJson(JSON.stringify(selected)));

    expect(metrics.rowsRead).toBe(3);
    expect(metrics.accepted).toBe(3);
    expect(metrics.rejected).toBe(0);
    expect(repo.upserts).toHaveLength(0);
  });

  it('all three canaries are manifest-approved V3 winners', () => {
    for (const slug of CANARIES) {
      const e = entries.find((x) => x.slug === slug)!;
      expect(e.merge_winner).toBe('v3');
      expect(e.dataset_versions).toEqual(['v2', 'v3']);
      expect(v3Slugs.has(slug)).toBe(true);
    }
  });
});
