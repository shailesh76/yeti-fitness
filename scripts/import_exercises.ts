import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { ExerciseRepository } from '../packages/database/src/repositories/ExerciseRepository';
import { ExerciseImporter } from '../packages/database/src/importers/ExerciseImporter';

import { loadEnvFile, resolveSlugFilter, applySlugFilter } from './lib/importCliOptions';

// Loads .env from the repo root. Explicit environment variables win over the
// file, so `VAR=... npx tsx scripts/import_exercises.ts` still overrides it.
loadEnvFile(path.resolve(process.cwd(), '.env'));

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const fileArg = process.argv.find(arg => !arg.startsWith('--') && (arg.endsWith('.json') || arg.endsWith('.csv')));

  const filePath = fileArg || 'packages/database/seeds/exercises/yeti_equipment_exercises_v2.json';
  const absolutePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error('EXPO_PUBLIC_SUPABASE_URL or SUPABASE_URL must be set.');
    process.exit(1);
  }

  if (!serviceKey) {
    if (isDryRun) {
      console.log('Note: SUPABASE_SERVICE_ROLE_KEY not set. Dry-run validation will proceed without DB connection.');
    } else {
      console.error('SUPABASE_SERVICE_ROLE_KEY must be set for live imports. Anon/user keys are not permitted.');
      process.exit(1);
    }
  }

  const supabase = serviceKey ? createClient(supabaseUrl, serviceKey) : null;

  const repository = new ExerciseRepository(null as any, supabase as any);

  const importer = new ExerciseImporter(repository);

  // Canonical dataset imports run under the provenance manifest: every record
  // is checked against it before any write, identity never falls back to name,
  // and the 24 V2/V3 merges are arbitrated by the manifest's reviewed winner
  // rather than by whichever file happens to be imported last.
  const manifestPath = path.resolve(__dirname, 'data/yeti_exercise_provenance.json');
  const datasetArg = process.argv.includes('--dataset=v2')
    ? 'v2'
    : process.argv.includes('--dataset=v3')
      ? 'v3'
      : undefined;
  const canonical = process.argv.includes('--canonical') || datasetArg !== undefined;
  if (canonical) {
    if (!fs.existsSync(manifestPath)) {
      console.error(`Canonical import requires ${manifestPath}. Run: npx tsx scripts/generate_exercise_provenance.ts`);
      process.exit(1);
    }
    const manifestDoc = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    importer.useCanonicalManifest(manifestDoc.exercises, datasetArg);
    console.log(`Canonical mode: ${manifestDoc.exercises.length} manifest entries${datasetArg ? `, dataset=${datasetArg}` : ''}`);
  }

  const fileContent = fs.readFileSync(absolutePath, 'utf-8');
  const isJson = absolutePath.endsWith('.json');
  // Resolved below, after the dataset is parsed, so the filter can be verified
  // against the real dataset contents before anything is imported.
  let canaryFilter: string[] = [];

  console.log(`\n======================================================`);
  console.log(`  YETI EXERCISE IMPORTER CLI - ${isDryRun ? 'DRY RUN MODE' : 'LIVE IMPORT MODE'}`);
  console.log(`======================================================`);
  console.log(`File: ${absolutePath}`);

  const allItems = isJson ? importer.parseJson(fileContent) : importer.parseCsv(fileContent);

  // ---- canary filtering, BEFORE any mutation ------------------------------
  // Exact slugs only, each proven present in both the selected dataset and the
  // provenance manifest. Any unknown slug aborts the run rather than silently
  // importing a wider set than the operator asked for.
  if (process.argv.some((a) => a.startsWith('--slug='))) {
    if (!canonical) {
      console.error('--slug requires canonical mode (--canonical or --dataset=v2|v3).');
      process.exit(1);
    }
    const manifestDoc = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const { slugs, errors } = resolveSlugFilter(
      process.argv,
      new Set(allItems.map((i) => i.slug).filter(Boolean) as string[]),
      new Set(manifestDoc.exercises.map((e: any) => e.slug)),
    );
    if (errors.length > 0) {
      console.error('\n--- Canary slug filter rejected ---');
      errors.forEach((e) => console.error(`  ${e}`));
      process.exit(1);
    }
    if (slugs.length === 0) {
      console.error('--slug was given but resolved to no records.');
      process.exit(1);
    }
    canaryFilter = slugs;
  }

  const items = applySlugFilter(allItems, canaryFilter);
  if (canaryFilter.length > 0) {
    console.log(`\nCanary filter active: ${canaryFilter.join(', ')}`);
    console.log(`selected source records:       ${items.length} (of ${allItems.length} in file)`);
  }

  if (isDryRun) {
    console.log(`\n--- Running Validation Dry Run on ${items.length} records ---`);
    const metrics = importer.validateDryRun(items);

    console.log(`Rows Read:                     ${metrics.rowsRead}`);
    console.log(`Rows Accepted:                 ${metrics.accepted}`);
    console.log(`Rows Rejected:                 ${metrics.rejected}`);
    console.log(`Duplicates Prevented:          ${metrics.duplicatesPrevented}`);
    console.log(`Aliases Parsed:                ${metrics.aliasesInserted}`);
    console.log(`Tags Parsed:                   ${metrics.tagsInserted}`);
    console.log(`Muscle Relationships Parsed:   ${metrics.musclesInserted}`);
    console.log(`Media Records Parsed:          ${metrics.mediaRecordsInserted}`);
    console.log(`Warnings Count:                ${metrics.warnings.length}`);
    console.log(`Critical Errors Count:         ${metrics.errors.length}`);

    if (metrics.errors.length > 0) {
      console.error('\n--- Critical Errors ---');
      console.error(JSON.stringify(metrics.errors, null, 2));
    }
    return;
  }

  console.log(`\n--- Executing Live Import on ${items.length} records ---`);
  const metrics = await importer.importExercises(items, supabase!);

  if (canonical) {
    const skipped = importer.conflicts.filter((c) => !c.proceed).length;
    console.log('\n--- Canonical Import Summary ---');
    console.log(`selected source records:       ${items.length}`);
    console.log(`processed:                     ${items.length}`);
    console.log(`updated:                       ${metrics.exercisesUpdated}`);
    console.log(`created:                       ${metrics.exercisesInserted}`);
    console.log(`skipped:                       ${skipped}`);
    console.log(`rejected:                      ${metrics.rejected}`);
    console.log('\n--- Collision Report ---');
    console.log(importer.conflictReport());
  }

  console.log('\n======================================================');
  console.log('  IMPORT METRICS REPORT');
  console.log('======================================================');
  console.log(`Rows Read:                     ${metrics.rowsRead}`);
  console.log(`Rows Accepted:                 ${metrics.accepted}`);
  console.log(`Rows Rejected:                 ${metrics.rejected}`);
  console.log(`Exercises Inserted:            ${metrics.exercisesInserted}`);
  console.log(`Exercises Updated:             ${metrics.exercisesUpdated}`);
  // PARSED and DATABASE RESULT are reported separately and never conflated.
  // The old output printed the parser counts under "Inserted", so a canary that
  // wrote 6 tags and 0 media rows reported "Tags Inserted 18 / Media Records
  // Inserted 9". Only the DATABASE RESULT block reflects confirmed writes.
  console.log('\n--- PARSED / ATTEMPTED (from the dataset, not the database) ---');
  console.log(`Aliases parsed:                ${metrics.aliasesInserted}`);
  console.log(`Tags parsed:                   ${metrics.tagsInserted}`);
  console.log(`Muscle relationships parsed:   ${metrics.musclesInserted}`);
  console.log(`Media records parsed:          ${metrics.mediaRecordsInserted}`);

  console.log('\n--- DATABASE RESULT (rows the database confirmed) ---');
  console.log(`Aliases upserted:              ${metrics.aliasesUpserted}`);
  console.log(`Tags upserted:                 ${metrics.tagsUpserted}`);
  console.log(`Muscles upserted:              ${metrics.musclesUpserted}`);
  console.log(`Media upserted:                ${metrics.mediaUpserted}`);
  console.log(`Child rows FAILED:             ${metrics.childWritesFailed}`);
  if (metrics.childWritesFailed > 0) {
    console.error('\n!! Child-table writes failed. This import is a PARTIAL SUCCESS, not a success.');
  }

  console.log('');
  console.log(`Alternatives Resolved:         ${metrics.alternativesResolved}`);
  console.log(`Alternatives Unresolved:       ${metrics.alternativesUnresolved}`);
  console.log(`Alternatives Self-References:  ${metrics.alternativesSelfReferences}`);
  console.log(`Duplicates Prevented:          ${metrics.duplicatesPrevented}`);
  console.log(`Warnings Count:                ${metrics.warnings.length}`);
  console.log(`Critical Errors Count:         ${metrics.errors.length}`);

  if (metrics.errors.length > 0) {
    console.error('\n--- Sample Errors (first 5) ---');
    console.error(JSON.stringify(metrics.errors.slice(0, 5), null, 2));
  }
}

main().catch(err => {
  console.error('Fatal error during import CLI:', err);
  process.exit(1);
});
