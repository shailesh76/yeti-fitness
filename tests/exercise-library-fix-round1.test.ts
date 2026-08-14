import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ExerciseImporter } from '../packages/database/src/importers/ExerciseImporter';
import { ExerciseRepository } from '../packages/database/src/repositories/ExerciseRepository';

describe('Exercise Library Fix Round 1 Verification Tests', () => {
  it('normalizes explicit Yeti values to yeti_first_party, but never an absent one', () => {
    // Round 1C correction: this test previously asserted that an ABSENT
    // source_type became 'yeti_first_party'. That was the app-layer twin of the
    // `source_type DEFAULT 'yeti_v2'` column default — together they minted
    // first-party provenance for anything imported without an explicit value,
    // which would silently undo the taxonomy reconciliation.
    const importer = new ExerciseImporter(null as any);
    expect(importer.normalizeSourceType('yeti_v2')).toBe('yeti_first_party');
    expect(importer.normalizeSourceType('yeti_v3')).toBe('yeti_first_party');
    expect(importer.normalizeSourceType('yeti_first_party')).toBe('yeti_first_party');
    expect(importer.normalizeSourceType(undefined)).toBe('legacy_catalog');
    expect(importer.normalizeSourceType('')).toBe('legacy_catalog');
    expect(importer.normalizeSourceType('custom')).toBe('custom');
    expect(importer.normalizeSourceType('legacy_catalog')).toBe('legacy_catalog');
  });

  it('validates dataset files: V2 has 220 items, V3 has 200 items, 420 total unique IDs', () => {
    const v2Path = path.resolve(__dirname, '../packages/database/seeds/exercises/yeti_equipment_exercises_v2.json');
    const v3Path = path.resolve(__dirname, '../packages/database/seeds/exercises/yeti_exercise_expansion_v3.json');

    expect(fs.existsSync(v2Path)).toBe(true);
    expect(fs.existsSync(v3Path)).toBe(true);

    const v2 = JSON.parse(fs.readFileSync(v2Path, 'utf-8'));
    const v3 = JSON.parse(fs.readFileSync(v3Path, 'utf-8'));

    expect(v2.length).toBe(220);
    expect(v3.length).toBe(200);

    const v2Ids = new Set(v2.map((e: any) => e.exercise_id || e.id));
    const v3Ids = new Set(v3.map((e: any) => e.exercise_id || e.id));

    expect(v2Ids.size).toBe(220);
    expect(v3Ids.size).toBe(200);

    // Verify 0 ID overlap
    const idOverlap = [...v2Ids].filter(id => v3Ids.has(id));
    expect(idOverlap.length).toBe(0);

    // Combined total unique IDs
    const combinedIds = new Set([...v2Ids, ...v3Ids]);
    expect(combinedIds.size).toBe(420);
  });

  it('verifies 24 slug overlaps between V2 and V3 datasets (known upsert behavior)', () => {
    const v2Path = path.resolve(__dirname, '../packages/database/seeds/exercises/yeti_equipment_exercises_v2.json');
    const v3Path = path.resolve(__dirname, '../packages/database/seeds/exercises/yeti_exercise_expansion_v3.json');

    const v2 = JSON.parse(fs.readFileSync(v2Path, 'utf-8'));
    const v3 = JSON.parse(fs.readFileSync(v3Path, 'utf-8'));

    const v2Slugs = new Set(v2.map((e: any) => e.slug));
    const v3Slugs = new Set(v3.map((e: any) => e.slug));

    const slugOverlap = [...v2Slugs].filter(s => v3Slugs.has(s));
    expect(slugOverlap.length).toBe(24);
  });

  it('verifies import_exercises.ts script contains no embedded credentials', () => {
    const scriptPath = path.resolve(__dirname, '../scripts/import_exercises.ts');
    const content = fs.readFileSync(scriptPath, 'utf-8');

    expect(content).not.toContain('coach-a@dude.com');
    expect(content).not.toContain('password123');
    expect(content).not.toContain('anon-key-placeholder');
    expect(content).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('verifies ExerciseRepository never defaults an unknown source to Yeti', () => {
    // Round 1C correction: the fallback is legacy_catalog. Defaulting to
    // yeti_first_party gave every source_type-less payload false first-party
    // provenance.
    const repoPath = path.resolve(__dirname, '../packages/database/src/repositories/ExerciseRepository.ts');
    const content = fs.readFileSync(repoPath, 'utf-8');

    expect(content).not.toContain("source_type: payload.source_type || 'yeti_v2'");
    expect(content).not.toContain("source_type: payload.source_type || 'yeti_first_party'");
    expect(content).toContain("source_type: payload.source_type || 'legacy_catalog'");
  });

  it('verifies AI Coach resolver queries yeti_first_party', () => {
    const resolverPath = path.resolve(__dirname, '../supabase/functions/_shared/ai/exerciseResolver.ts');
    const content = fs.readFileSync(resolverPath, 'utf-8');

    expect(content).not.toContain(".eq('source_type', 'yeti_v2')");
    expect(content).toContain(".eq('source_type', 'yeti_first_party')");
  });

  it('verifies Dashboard page uses yeti_first_party and has no hardcoded 220 state default', () => {
    const dashPath = path.resolve(__dirname, '../apps/coach-dashboard/app/exercises/page.tsx');
    const content = fs.readFileSync(dashPath, 'utf-8');

    expect(content).not.toContain("setYetiCount] = useState<number>(220)");
    expect(content).toContain("setYetiCount] = useState<number>(0)");
    expect(content).not.toContain(".eq('source_type', 'yeti_v2')");
    expect(content).toContain(".eq('source_type', 'yeti_first_party')");
  });
});
