import fs from 'fs';
import path from 'path';

/**
 * Repo root without __dirname or import.meta: this script runs under tsx and
 * vitest (CommonJS) and under bare `node` (which strips types and reparses as
 * ESM, where __dirname is a ReferenceError). Validation is purely local — it
 * reads the two checked-in datasets and the manifest, and never touches
 * Supabase or the network.
 */
function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(dir, 'package.json')) && fs.existsSync(path.join(dir, 'packages/database/seeds/exercises'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Could not locate the repository root from ${process.cwd()}`);
}
const ROOT = findRepoRoot();


interface ValidationIssue {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  dataset: 'v2' | 'v3' | 'cross-dataset';
  id?: string;
  name?: string;
  message: string;
}

function validateDatasets() {
  const isDryRun = process.argv.includes('--dry-run');

  const v2Path = path.resolve(ROOT, 'packages/database/seeds/exercises/yeti_equipment_exercises_v2.json');
  const v3Path = path.resolve(ROOT, 'packages/database/seeds/exercises/yeti_exercise_expansion_v3.json');

  console.log(`\n======================================================`);
  console.log(`  YETI EXERCISE DATASET VALIDATOR ${isDryRun ? '(DRY RUN)' : ''}`);
  console.log(`======================================================`);

  if (!fs.existsSync(v2Path)) {
    console.error(`V2 dataset missing: ${v2Path}`);
    process.exit(1);
  }
  if (!fs.existsSync(v3Path)) {
    console.error(`V3 dataset missing: ${v3Path}`);
    process.exit(1);
  }

  const v2Data = JSON.parse(fs.readFileSync(v2Path, 'utf-8'));
  const v3Data = JSON.parse(fs.readFileSync(v3Path, 'utf-8'));

  const issues: ValidationIssue[] = [];

  console.log(`V2 File: ${v2Path} (${v2Data.length} records)`);
  console.log(`V3 File: ${v3Path} (${v3Data.length} records)`);

  const validMediaStatuses = new Set(['TO_CREATE', 'IN_PROGRESS', 'READY', 'REJECTED']);

  // Validate V2 records
  const v2Ids = new Set<string>();
  const v2Slugs = new Set<string>();
  v2Data.forEach((item: any, idx: number) => {
    const id = item.exercise_id || item.id;
    if (!id) {
      issues.push({ severity: 'CRITICAL', dataset: 'v2', message: `Row ${idx + 1} missing exercise_id` });
    } else {
      if (v2Ids.has(id)) issues.push({ severity: 'CRITICAL', dataset: 'v2', id, message: `Duplicate ID within V2: ${id}` });
      v2Ids.add(id);
    }

    if (!item.slug) {
      issues.push({ severity: 'CRITICAL', dataset: 'v2', id, message: `Missing slug` });
    } else {
      if (v2Slugs.has(item.slug)) issues.push({ severity: 'CRITICAL', dataset: 'v2', id, message: `Duplicate slug within V2: ${item.slug}` });
      v2Slugs.add(item.slug);
    }

    if (!item.name) issues.push({ severity: 'CRITICAL', dataset: 'v2', id, message: `Missing name` });

    if (item.default_reps && typeof item.default_reps === 'string') {
      issues.push({
        severity: 'WARNING', dataset: 'v2', id, name: item.name,
        message: `default_reps is string range ("${item.default_reps}"), DB column is INTEGER. Range text lost on import.`
      });
    }

    if (item.media_status && !validMediaStatuses.has(item.media_status)) {
      issues.push({ severity: 'WARNING', dataset: 'v2', id, message: `Invalid media_status: ${item.media_status}` });
    }
  });

  // Validate V3 records
  const v3Ids = new Set<string>();
  const v3Slugs = new Set<string>();
  v3Data.forEach((item: any, idx: number) => {
    const id = item.exercise_id || item.id;
    if (!id) {
      issues.push({ severity: 'CRITICAL', dataset: 'v3', message: `Row ${idx + 1} missing exercise_id` });
    } else {
      if (v3Ids.has(id)) issues.push({ severity: 'CRITICAL', dataset: 'v3', id, message: `Duplicate ID within V3: ${id}` });
      v3Ids.add(id);
    }

    if (!item.slug) {
      issues.push({ severity: 'CRITICAL', dataset: 'v3', id, message: `Missing slug` });
    } else {
      if (v3Slugs.has(item.slug)) issues.push({ severity: 'CRITICAL', dataset: 'v3', id, message: `Duplicate slug within V3: ${item.slug}` });
      v3Slugs.add(item.slug);
    }

    if (!item.name) issues.push({ severity: 'CRITICAL', dataset: 'v3', id, message: `Missing name` });

    if (item.default_reps && typeof item.default_reps === 'string') {
      issues.push({
        severity: 'WARNING', dataset: 'v3', id, name: item.name,
        message: `default_reps is string range ("${item.default_reps}"), DB column is INTEGER. Range text lost on import.`
      });
    }

    if (item.media_status && !validMediaStatuses.has(item.media_status)) {
      issues.push({ severity: 'WARNING', dataset: 'v3', id, message: `Invalid media_status: ${item.media_status}` });
    }
  });

  // Cross-dataset validation
  const idOverlap = [...v2Ids].filter(id => v3Ids.has(id));
  if (idOverlap.length > 0) {
    issues.push({ severity: 'CRITICAL', dataset: 'cross-dataset', message: `Cross-dataset ID overlap found (${idOverlap.length} IDs)` });
  }

  const slugOverlap = [...v2Slugs].filter(slug => v3Slugs.has(slug));
  const EXPECTED_COLLISIONS = 24;
  const canonicalCount = new Set([...v2Slugs, ...v3Slugs]).size;

  if (slugOverlap.length !== EXPECTED_COLLISIONS) {
    issues.push({
      severity: 'CRITICAL', dataset: 'cross-dataset',
      message: `Expected exactly ${EXPECTED_COLLISIONS} reviewed V2/V3 slug merges, found ${slugOverlap.length}. Re-review before importing.`
    });
  }

  // ---- Expected counts -----------------------------------------------------
  if (v2Data.length !== 220) {
    issues.push({ severity: 'CRITICAL', dataset: 'v2', message: `Expected 220 V2 records, found ${v2Data.length}` });
  }
  if (v3Data.length !== 200) {
    issues.push({ severity: 'CRITICAL', dataset: 'v3', message: `Expected 200 V3 records, found ${v3Data.length}` });
  }
  if (v2Data.length + v3Data.length !== 420) {
    issues.push({ severity: 'CRITICAL', dataset: 'cross-dataset', message: `Expected 420 input records, found ${v2Data.length + v3Data.length}` });
  }
  if (canonicalCount !== 396) {
    issues.push({ severity: 'CRITICAL', dataset: 'cross-dataset', message: `Expected 396 canonical exercises, computed ${canonicalCount}` });
  }

  // ---- UUID syntax ---------------------------------------------------------
  // V3 ids are UUIDs. V2 ids are deliberately NOT ("yeti-ex-0001"): they are a
  // legacy dataset key, which is exactly why ID shape can never imply dataset
  // membership. Both facts are asserted so neither can silently change.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  v3Data.forEach((item: any) => {
    if (item.exercise_id && !UUID_RE.test(item.exercise_id)) {
      issues.push({ severity: 'CRITICAL', dataset: 'v3', id: item.exercise_id, message: `V3 exercise_id is not a valid UUID` });
    }
  });
  const v2Uuids = v2Data.filter((i: any) => UUID_RE.test(i.exercise_id || '')).length;
  issues.push({
    severity: 'INFO', dataset: 'v2',
    message: `V2 uses non-UUID legacy dataset ids by design (${v2Data.length - v2Uuids}/${v2Data.length} non-UUID); ID shape must never imply dataset membership.`
  });

  // ---- Duplicate names -----------------------------------------------------
  const nameKey = (n: string) => (n || '').trim().toLowerCase();
  for (const [tag, data] of [['v2', v2Data], ['v3', v3Data]] as const) {
    const seen = new Set<string>();
    data.forEach((item: any) => {
      const k = nameKey(item.name);
      if (seen.has(k)) issues.push({ severity: 'CRITICAL', dataset: tag, name: item.name, message: `Duplicate name within ${tag.toUpperCase()}` });
      seen.add(k);
    });
  }
  const v2Names = new Set(v2Data.map((i: any) => nameKey(i.name)));
  const crossNames = v3Data.filter((i: any) => v2Names.has(nameKey(i.name)));
  if (crossNames.length !== slugOverlap.length) {
    issues.push({
      severity: 'WARNING', dataset: 'cross-dataset',
      message: `${crossNames.length} names shared across datasets but ${slugOverlap.length} slugs — a name/slug mismatch means a merge is unaccounted for.`
    });
  }

  // ---- Provenance manifest coverage ---------------------------------------
  const manifestPath = path.resolve(ROOT, 'scripts/data/yeti_exercise_provenance.json');
  let manifest: any[] = [];
  if (!fs.existsSync(manifestPath)) {
    issues.push({ severity: 'CRITICAL', dataset: 'cross-dataset', message: `Provenance manifest missing: ${manifestPath}` });
  } else {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')).exercises || [];
    if (manifest.length !== canonicalCount) {
      issues.push({ severity: 'CRITICAL', dataset: 'cross-dataset', message: `Manifest has ${manifest.length} entries, expected ${canonicalCount}` });
    }
    const v2Members = manifest.filter((e) => e.dataset_versions.includes('v2')).length;
    const v3Members = manifest.filter((e) => e.dataset_versions.includes('v3')).length;
    if (v2Members !== v2Data.length) {
      issues.push({ severity: 'CRITICAL', dataset: 'cross-dataset', message: `Manifest records ${v2Members} V2 memberships, dataset has ${v2Data.length}` });
    }
    if (v3Members !== v3Data.length) {
      issues.push({ severity: 'CRITICAL', dataset: 'cross-dataset', message: `Manifest records ${v3Members} V3 memberships, dataset has ${v3Data.length}` });
    }
    // Every collision must carry an explicit reviewed winner.
    for (const e of manifest) {
      if (e.merge_winner !== 'v2' && e.merge_winner !== 'v3') {
        issues.push({ severity: 'CRITICAL', dataset: 'cross-dataset', message: `${e.slug}: missing/invalid merge_winner` });
      } else if (e.dataset_versions.length === 1 && e.merge_winner !== e.dataset_versions[0]) {
        issues.push({ severity: 'CRITICAL', dataset: 'cross-dataset', message: `${e.slug}: single-dataset entry has merge_winner ${e.merge_winner}` });
      }
      if (e.source_type !== 'yeti_first_party') {
        issues.push({ severity: 'CRITICAL', dataset: 'cross-dataset', message: `${e.slug}: manifest source_type must be yeti_first_party` });
      }
    }
  }

  // ---- Lossless default_reps ----------------------------------------------
  // Every authored prescription must survive into the manifest byte-for-byte.
  const manifestReps = new Map(manifest.map((e: any) => [e.slug, e.default_reps]));
  const byV3 = new Map<string, any>(v3Data.map((i: any) => [i.slug, i]));
  const byV2 = new Map<string, any>(v2Data.map((i: any) => [i.slug, i]));
  for (const e of manifest) {
    const winner = e.merge_winner === 'v3' ? byV3.get(e.slug) : byV2.get(e.slug);
    if (!winner) continue;
    const authored = String(winner.default_reps ?? '');
    if (manifestReps.get(e.slug) !== authored) {
      issues.push({ severity: 'CRITICAL', dataset: 'cross-dataset', message: `${e.slug}: manifest default_reps "${manifestReps.get(e.slug)}" != authored "${authored}"` });
    }
    if (/^\d+$/.test(String(manifestReps.get(e.slug))) && /[-–—a-z]/i.test(authored)) {
      issues.push({ severity: 'CRITICAL', dataset: 'cross-dataset', message: `${e.slug}: default_reps truncated to a leading integer` });
    }
  }

  // ---- Collision table -----------------------------------------------------
  const collisionRows = slugOverlap.sort().map((slug) => {
    const entry = manifest.find((e: any) => e.slug === slug);
    return { slug, v2_id: byV2.get(slug)?.exercise_id, v3_id: byV3.get(slug)?.exercise_id, winner: entry?.merge_winner ?? '<none>' };
  });

  // Reporting
  const criticals = issues.filter(i => i.severity === 'CRITICAL');
  const warnings = issues.filter(i => i.severity === 'WARNING');
  const infos = issues.filter(i => i.severity === 'INFO');

  console.log(`\n======================================================`);
  console.log(`  VALIDATION SUMMARY REPORT`);
  console.log(`======================================================`);
  console.log(`V2 Items Count:                ${v2Data.length}`);
  console.log(`V3 Items Count:                ${v3Data.length}`);
  console.log(`Unique Combined IDs:           ${new Set([...v2Ids, ...v3Ids]).size}`);
  console.log(`Total Input Records:           ${v2Data.length + v3Data.length}`);
  console.log(`Reviewed V2/V3 Merges:         ${slugOverlap.length}`);
  console.log(`CANONICAL EXERCISE COUNT:      ${canonicalCount}`);
  console.log(`Manifest Entries:              ${manifest.length}`);
  console.log(`Critical Errors:               ${criticals.length}`);
  console.log(`Warnings:                      ${warnings.length}`);
  console.log(`Info Items:                    ${infos.length}`);

  if (criticals.length > 0) {
    console.error('\n--- Critical Errors ---');
    criticals.forEach(c => console.error(` [CRITICAL] [${c.dataset}] ${c.id ? c.id + ': ' : ''}${c.message}`));
  }

  if (warnings.length > 0) {
    console.warn(`\n--- Warnings Sample (first 5 of ${warnings.length}) ---`);
    warnings.slice(0, 5).forEach(w => console.warn(` [WARNING] [${w.dataset}] ${w.name ? w.name + ': ' : ''}${w.message}`));
  }

  if (infos.length > 0) {
    console.log('\n--- Info Notices ---');
    infos.forEach(i => console.log(` [INFO] [${i.dataset}] ${i.message}`));
  }

  console.log(`\n--- V2/V3 Merge Collision Table (${collisionRows.length}) ---`);
  console.log(`${'slug'.padEnd(38)} ${'V2 id'.padEnd(15)} ${'V3 id'.padEnd(38)} winner`);
  collisionRows.forEach((r) => {
    console.log(`${r.slug.padEnd(38)} ${String(r.v2_id).padEnd(15)} ${String(r.v3_id).padEnd(38)} ${r.winner}`);
  });

  if (criticals.length > 0) {
    console.error('\nResult: VALIDATION FAILED (Critical errors present)');
    process.exit(1);
  } else {
    console.log('\nResult: VALIDATION PASSED (0 Critical errors)');
  }
}

const invokedDirectly = (() => {
  const entry = process.argv[1] ? path.resolve(process.argv[1]) : '';
  return /validate_exercise_datasets.(ts|js|mjs|cjs)$/.test(entry);
})();
if (invokedDirectly) validateDatasets();
export { validateDatasets };
