/**
 * Deterministic provenance manifest generator.
 *
 * Reads the two checked-in canonical datasets and emits a manifest that states,
 * for every canonical Yeti exercise, which dataset(s) it came from. Nothing here
 * inspects the live database and nothing infers provenance from `source_type`
 * or from ID shape — both are untrusted:
 *
 *  - `exercises.source_type` carries DEFAULT 'yeti_v2', so any row inserted
 *    without an explicit value silently looks Yeti-owned.
 *  - V2 dataset ids are not UUIDs at all ("yeti-ex-0001"), so the importer had
 *    to mint UUIDs for them. 365 live rows carry the "V3-looking"
 *    00000000-0000-4000-a000-* shape while V3 only has 200 records, which is
 *    proof that ID shape says nothing about dataset membership.
 *
 * The slug is the join key: it is stable, unique within each dataset, and
 * already matches the live catalogue 1:1. Live UUIDs are never restated here
 * precisely so that reconciliation preserves them and FK references
 * (plan_exercises, session_sets, exercise history) keep resolving.
 *
 * Usage:
 *   npx tsx scripts/generate_exercise_provenance.ts          # write manifest
 *   npx tsx scripts/generate_exercise_provenance.ts --check  # verify in sync
 */
import fs from 'fs';
import path from 'path';

/**
 * Repo root, resolved without __dirname or import.meta.
 *
 * This file is loaded three different ways: `npx tsx` and vitest treat it as
 * CommonJS (so __dirname exists), while bare `node scripts/...ts` strips the
 * types and reparses it as an ES module (where __dirname is a ReferenceError).
 * Walking up from cwd for the repo's marker files works identically in all
 * three, so the documented command runs whichever loader picks it up.
 */
function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    if (
      fs.existsSync(path.join(dir, 'package.json')) &&
      fs.existsSync(path.join(dir, 'packages/database/seeds/exercises'))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not locate the repository root from ${process.cwd()}`);
}

const ROOT = findRepoRoot();
const V2_PATH = path.resolve(ROOT, 'packages/database/seeds/exercises/yeti_equipment_exercises_v2.json');
const V3_PATH = path.resolve(ROOT, 'packages/database/seeds/exercises/yeti_exercise_expansion_v3.json');
const OUT_JSON = path.resolve(ROOT, 'scripts/data/yeti_exercise_provenance.json');
const OUT_SQL = path.resolve(ROOT, 'scripts/data/yeti_exercise_provenance.sql');
const OUT_REPS_SQL = path.resolve(ROOT, 'scripts/data/yeti_exercise_prescriptions.sql');
const OUT_MIGRATION_BLOCK = path.resolve(ROOT, 'scripts/data/yeti_exercise_manifest_block.sql');
const MIGRATION_PATH = path.resolve(ROOT, 'supabase/migrations/20260812133000_exercise_source_taxonomy_reconciliation.sql');

export interface ProvenanceEntry {
  slug: string;
  name: string;
  dataset_versions: Array<'v2' | 'v3'>;
  source_type: 'yeti_first_party';
  v2_dataset_id: string | null;
  v3_dataset_id: string | null;
  /**
   * The prescription EXACTLY as authored — "8–12", "30–60 sec",
   * "6–10 controlled reps". Never parsed down to a leading integer: the live
   * integer column turned "30–60 sec" into the number 30, which reads as
   * 30 repetitions of a sled push rather than a 30-second effort.
   */
  default_reps: string;
  default_sets: number | null;
  /**
   * Which dataset supplies the CONTENT for this canonical exercise.
   *
   * Single-dataset entries trivially name their own dataset. For the 24 slugs
   * present in both, the reviewed decision is V3 for all of them, on evidence:
   *
   *  - V2's execution_instructions are boilerplate — only 2 distinct strings
   *    across 220 records, one reused 208 times — while V3 has 200 distinct
   *    strings for 200 records.
   *  - V2's primary_muscle is frequently a category default rather than the
   *    working muscle: "Quadriceps" is recorded for both Cable Glute Kickback
   *    and Cable Pull-Through, and for Smith Machine Hip Thrust.
   *  - V3 is the later, taxonomy-normalised pass and corrects those values.
   *
   * This is recorded explicitly so the winner never depends on file processing
   * order. Import order previously decided it, and it decided WRONG: 22 of the
   * 24 live rows currently hold V2 content and none hold V3.
   */
  merge_winner: 'v2' | 'v3';
}

export function buildManifest(v2: any[], v3: any[]): ProvenanceEntry[] {
  const byV2 = new Map<string, any>(v2.map((e) => [e.slug, e]));
  const byV3 = new Map<string, any>(v3.map((e) => [e.slug, e]));
  const slugs = [...new Set([...byV2.keys(), ...byV3.keys()])].sort();

  return slugs.map((slug) => {
    const a = byV2.get(slug);
    const b = byV3.get(slug);
    const versions: Array<'v2' | 'v3'> = [];
    if (a) versions.push('v2');
    if (b) versions.push('v3');
    // Reviewed decision: V3 wins every shared slug (see merge_winner docs).
    const merge_winner: 'v2' | 'v3' = b ? 'v3' : 'v2';
    const winner = merge_winner === 'v3' ? b : a;
    return {
      slug,
      name: winner.name,
      dataset_versions: versions,
      source_type: 'yeti_first_party' as const,
      v2_dataset_id: a ? a.exercise_id : null,
      v3_dataset_id: b ? b.exercise_id : null,
      default_reps: String(winner.default_reps ?? ''),
      default_sets: typeof winner.default_sets === 'number' ? winner.default_sets : null,
      merge_winner,
    };
  });
}

/**
 * The migration's manifest block, generated from the same in-memory manifest so
 * the embedded copy can never drift from the JSON. Previously this block was
 * produced by a throwaway script, leaving 396 hand-maintained SQL rows that
 * nothing could regenerate or verify.
 */
export function toMigrationManifestBlock(manifest: ProvenanceEntry[]): string {
  const esc = (s: string) => s.replace(/'/g, "''");
  const rows = manifest.map(
    (e) => `  ('${esc(e.slug)}', '${e.dataset_versions.join(',')}', '${e.merge_winner}')`,
  );
  return `INSERT INTO _yeti_canonical (slug, dataset_versions, merge_winner) VALUES\n${rows.join(',\n')};`;
}

/** Extracts the manifest block from a migration file, for drift checking. */
export function extractMigrationManifestBlock(sql: string): string | null {
  const start = sql.indexOf('INSERT INTO _yeti_canonical');
  if (start === -1) return null;
  const end = sql.indexOf(';', start);
  if (end === -1) return null;
  return sql.slice(start, end + 1);
}

/** VALUES list for the lossless default_reps backfill. */
export function toRepsSqlValues(manifest: ProvenanceEntry[]): string {
  const esc = (s: string) => s.replace(/'/g, "''");
  return manifest
    .map((e) => `  ('${esc(e.slug)}', '${esc(e.default_reps)}', ${e.default_sets ?? 'NULL'})`)
    .join(',\n');
}

/** SQL VALUES list, generated from the same manifest so the two cannot drift. */
export function toSqlValues(manifest: ProvenanceEntry[]): string {
  const esc = (s: string) => s.replace(/'/g, "''");
  const rows = manifest.map(
    (e) => `  ('${esc(e.slug)}', '${e.dataset_versions.join(',')}')`,
  );
  return rows.join(',\n');
}

function main() {
  const check = process.argv.includes('--check');
  const v2 = JSON.parse(fs.readFileSync(V2_PATH, 'utf8'));
  const v3 = JSON.parse(fs.readFileSync(V3_PATH, 'utf8'));
  const manifest = buildManifest(v2, v3);

  const collisions = manifest.filter((e) => e.dataset_versions.length === 2);
  const json = JSON.stringify(
    {
      generated_from: {
        v2: 'packages/database/seeds/exercises/yeti_equipment_exercises_v2.json',
        v3: 'packages/database/seeds/exercises/yeti_exercise_expansion_v3.json',
      },
      input_records: v2.length + v3.length,
      canonical_exercises: manifest.length,
      shared_slug_merges: collisions.length,
      exercises: manifest,
    },
    null,
    2,
  );

  const sql = `-- GENERATED by scripts/generate_exercise_provenance.ts — do not edit by hand.
-- ${manifest.length} canonical Yeti exercises from ${v2.length + v3.length} input records
-- (${collisions.length} slugs appear in both datasets and merge to one row).
${toSqlValues(manifest)}
`;

  const repsSql = `-- GENERATED by scripts/generate_exercise_provenance.ts — do not edit by hand.
-- Lossless default_reps/default_sets prescriptions for the ${manifest.length} canonical
-- Yeti exercises, exactly as authored in the datasets.
${toRepsSqlValues(manifest)}
`;
  const expectedBlock = toMigrationManifestBlock(manifest);

  if (check) {
    const problems: string[] = [];
    if (!fs.existsSync(OUT_JSON) || fs.readFileSync(OUT_JSON, 'utf8') !== json) {
      problems.push(`${path.basename(OUT_JSON)} differs from generated output`);
    }
    if (!fs.existsSync(OUT_SQL) || fs.readFileSync(OUT_SQL, 'utf8') !== sql) {
      problems.push(`${path.basename(OUT_SQL)} differs from generated output`);
    }
    if (!fs.existsSync(OUT_REPS_SQL) || fs.readFileSync(OUT_REPS_SQL, 'utf8') !== repsSql) {
      problems.push(`${path.basename(OUT_REPS_SQL)} differs from generated output`);
    }

    // The migration carries its own copy of the manifest. Compare it exactly:
    // a missing row, a reordering, or a changed slug/version/winner all fail.
    if (!fs.existsSync(MIGRATION_PATH)) {
      problems.push('taxonomy migration is missing');
    } else {
      const actualBlock = extractMigrationManifestBlock(fs.readFileSync(MIGRATION_PATH, 'utf8'));
      if (actualBlock === null) {
        problems.push('taxonomy migration has no _yeti_canonical manifest block');
      } else if (actualBlock !== expectedBlock) {
        const a = actualBlock.split('\n');
        const b = expectedBlock.split('\n');
        problems.push(`migration manifest block drifted (${a.length} lines vs ${b.length} generated)`);
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
          if (a[i] !== b[i]) {
            problems.push(`  first difference at line ${i + 1}:`);
            problems.push(`    migration: ${a[i] ?? '<missing>'}`);
            problems.push(`    generated: ${b[i] ?? '<missing>'}`);
            break;
          }
        }
      }
    }

    if (problems.length) {
      console.error('Provenance artefacts are out of date:');
      for (const p of problems) console.error(`  - ${p}`);
      console.error('Re-run without --check to regenerate.');
      process.exit(1);
    }
    console.log(`Manifest in sync: ${manifest.length} canonical exercises, migration block matches.`);
    return;
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, json);
  fs.writeFileSync(OUT_SQL, sql);
  fs.writeFileSync(OUT_REPS_SQL, repsSql);
  fs.writeFileSync(OUT_MIGRATION_BLOCK, `${expectedBlock}\n`);

  // Rewrite the migration's manifest block in place so the checked-in
  // migration is always regenerable rather than hand-maintained.
  if (fs.existsSync(MIGRATION_PATH)) {
    const current = fs.readFileSync(MIGRATION_PATH, 'utf8');
    const actualBlock = extractMigrationManifestBlock(current);
    if (actualBlock && actualBlock !== expectedBlock) {
      fs.writeFileSync(MIGRATION_PATH, current.replace(actualBlock, expectedBlock));
      console.log(`updated manifest block in ${path.basename(MIGRATION_PATH)}`);
    }
  }

  const winners = manifest.filter((e) => e.dataset_versions.length === 2);
  console.log(`input records        : ${v2.length + v3.length} (v2=${v2.length}, v3=${v3.length})`);
  console.log(`canonical exercises  : ${manifest.length}`);
  console.log(`shared-slug merges   : ${collisions.length} (winner v3=${winners.filter((e) => e.merge_winner === 'v3').length}, v2=${winners.filter((e) => e.merge_winner === 'v2').length})`);
  console.log(`wrote ${path.relative(process.cwd(), OUT_JSON)}`);
  console.log(`wrote ${path.relative(process.cwd(), OUT_SQL)}`);
  console.log(`wrote ${path.relative(process.cwd(), OUT_REPS_SQL)}`);
  console.log(`wrote ${path.relative(process.cwd(), OUT_MIGRATION_BLOCK)}`);
}

// Entry guard that works under CommonJS (tsx/vitest) and native ESM alike:
// `require` does not exist in ESM scope, and `import.meta` cannot be parsed in
// CJS, so neither can be used. Comparing the process entry path can.
const invokedDirectly = (() => {
  const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
  return /generate_exercise_provenance\.(ts|js|mjs|cjs)$/.test(entry);
})();
if (invokedDirectly) main();
