import {
  ExerciseMediaRecord,
  ExerciseMediaType,
  formatForMediaUrl,
  isUsableExerciseMedia,
  isValidExerciseMediaUrl,
} from './exerciseMedia';

export const MAX_MEDIA_INGESTION_BATCH = 25;
export const MAX_MEDIA_MANIFEST_BYTES = 256 * 1024;
export const MAX_MEDIA_MANIFEST_ROWS = 500;

export interface MediaManifestRow {
  operationId: string;
  exerciseId?: string;
  exerciseSlug?: string;
  mediaType: ExerciseMediaType;
  url: string;
  isPrimary?: boolean;
  sourceNote?: string;
}

export interface IngestionExercise {
  id: string;
  slug: string;
  source_type?: string;
  created_by_coach_id?: string | null;
}

export interface IngestionActor { id: string; role: string }

export type IngestionOutcome = 'CREATE' | 'RETRY_PRIMARY' | 'SKIP_EXISTING' | 'CONFLICT' | 'INVALID' | 'ERROR';

export interface MediaIngestionPlanRow {
  row: MediaManifestRow | null;
  exerciseId: string | null;
  outcome: IngestionOutcome;
  reason: string;
  mediaStatus: 'TO_CREATE' | null;
  fileFormat: string | null;
  existingMediaId: string | null;
}

export interface MediaIngestionReport {
  rows: MediaIngestionPlanRow[];
  counts: Record<IngestionOutcome, number>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function emptyCounts(): Record<IngestionOutcome, number> {
  return { CREATE: 0, RETRY_PRIMARY: 0, SKIP_EXISTING: 0, CONFLICT: 0, INVALID: 0, ERROR: 0 };
}

export function parseExerciseMediaManifest(source: string): unknown[] {
  const bytes = new TextEncoder().encode(source).byteLength;
  if (bytes > MAX_MEDIA_MANIFEST_BYTES) throw new Error(`Manifest exceeds the ${MAX_MEDIA_MANIFEST_BYTES}-byte limit.`);
  const parsed: unknown = JSON.parse(source);
  if (!Array.isArray(parsed)) throw new Error('Manifest must be a JSON array.');
  if (parsed.length === 0) throw new Error('Manifest must contain at least one row.');
  if (parsed.length > MAX_MEDIA_MANIFEST_ROWS) throw new Error(`Manifest exceeds the ${MAX_MEDIA_MANIFEST_ROWS}-row limit.`);
  return parsed;
}

export function canonicalizeExerciseMediaUrl(value: string): string | null {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:' || !parsed.hostname) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function isManifestRow(value: unknown): value is MediaManifestRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.operationId === 'string'
    && (row.exerciseId === undefined || typeof row.exerciseId === 'string')
    && (row.exerciseSlug === undefined || typeof row.exerciseSlug === 'string')
    && typeof row.mediaType === 'string'
    && ['gif', 'video', 'image', 'thumbnail'].includes(row.mediaType)
    && typeof row.url === 'string'
    && (row.isPrimary === undefined || typeof row.isPrimary === 'boolean')
    && (row.sourceNote === undefined || typeof row.sourceNote === 'string');
}

export function planExerciseMediaIngestion(
  manifest: unknown[],
  exercises: IngestionExercise[],
  existingMedia: ExerciseMediaRecord[],
  actor?: IngestionActor,
): MediaIngestionReport {
  if (manifest.length > MAX_MEDIA_MANIFEST_ROWS) throw new Error(`Manifest exceeds the ${MAX_MEDIA_MANIFEST_ROWS}-row limit.`);
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const bySlug = new Map<string, IngestionExercise[]>();
  for (const exercise of exercises) bySlug.set(exercise.slug, [...(bySlug.get(exercise.slug) ?? []), exercise]);
  const operationCounts = new Map<string, number>();
  const manifestKeys = new Map<string, number>();
  const primaryCounts = new Map<string, number>();

  for (const value of manifest) {
    if (!isManifestRow(value)) continue;
    const row = value;
    operationCounts.set(row.operationId, (operationCounts.get(row.operationId) ?? 0) + 1);
    const identifier = row.exerciseId ?? `slug:${row.exerciseSlug ?? ''}`;
    const key = `${identifier}:${row.mediaType}:${canonicalizeExerciseMediaUrl(row.url) ?? row.url.trim()}`;
    manifestKeys.set(key, (manifestKeys.get(key) ?? 0) + 1);
    if (row.isPrimary) primaryCounts.set(identifier, (primaryCounts.get(identifier) ?? 0) + 1);
  }

  const rows = manifest.map((value): MediaIngestionPlanRow => {
    const invalid = (reason: string): MediaIngestionPlanRow => ({ row: isManifestRow(value) ? value : null, exerciseId: null, outcome: 'INVALID', reason, mediaStatus: null, fileFormat: null, existingMediaId: null });
    if (!isManifestRow(value)) return invalid('Manifest row has invalid field types.');
    const row = value;
    if (!UUID_PATTERN.test(row.operationId)) return invalid('Operation identity must be a UUID.');
    if ((row.exerciseId ? 1 : 0) + (row.exerciseSlug ? 1 : 0) !== 1) return invalid('Provide exactly one exercise identifier.');
    if (!isValidExerciseMediaUrl(row.url, row.mediaType)) return invalid('A compatible HTTPS media URL is required.');
    if (operationCounts.get(row.operationId)! > 1) return invalid('Duplicate operation identity.');

    const matches = row.exerciseId ? (byId.get(row.exerciseId) ? [byId.get(row.exerciseId)!] : []) : (bySlug.get(row.exerciseSlug!) ?? []);
    if (matches.length === 0) return invalid('Unknown exercise.');
    if (matches.length > 1) return invalid('Exercise slug is ambiguous.');
    const exerciseId = matches[0].id;
    const exercise = matches[0];
    if (actor && actor.role !== 'admin' && !(actor.role === 'coach' && exercise.source_type === 'custom' && exercise.created_by_coach_id === actor.id)) {
      return { row, exerciseId, outcome: 'INVALID', reason: 'Actor cannot manage media for this exercise.', mediaStatus: null, fileFormat: null, existingMediaId: null };
    }
    const identifier = row.exerciseId ?? `slug:${row.exerciseSlug}`;
    const manifestKey = `${identifier}:${row.mediaType}:${canonicalizeExerciseMediaUrl(row.url) ?? row.url.trim()}`;
    if (manifestKeys.get(manifestKey)! > 1) return { row, exerciseId, outcome: 'CONFLICT', reason: 'Duplicate manifest locator.', mediaStatus: null, fileFormat: null, existingMediaId: null };
    if ((primaryCounts.get(identifier) ?? 0) > 1) return { row, exerciseId, outcome: 'CONFLICT', reason: 'Multiple proposed primary assets.', mediaStatus: null, fileFormat: null, existingMediaId: null };

    const locator = canonicalizeExerciseMediaUrl(row.url);
    const existing = existingMedia.find((media) => media.exercise_id === exerciseId && media.url && canonicalizeExerciseMediaUrl(media.url) === locator);
    if (existing) {
      if (row.isPrimary && !existing.is_primary) {
        if (existing.id !== row.operationId) return { row, exerciseId, outcome: 'CONFLICT', reason: 'Locator exists under a different operation; primary change requires review.', mediaStatus: null, fileFormat: existing.file_format, existingMediaId: existing.id };
        return { row, exerciseId, outcome: 'RETRY_PRIMARY', reason: 'Metadata exists; retry primary selection only.', mediaStatus: existing.media_status === 'TO_CREATE' ? 'TO_CREATE' : null, fileFormat: existing.file_format, existingMediaId: existing.id };
      }
      return { row, exerciseId, outcome: 'SKIP_EXISTING', reason: existing.is_primary && row.isPrimary ? 'Operation is already fully applied.' : 'Locator already exists.', mediaStatus: null, fileFormat: existing.file_format, existingMediaId: existing.id };
    }
    if (row.isPrimary && existingMedia.some((media) => media.exercise_id === exerciseId && media.is_primary)) {
      return { row, exerciseId, outcome: 'CONFLICT', reason: 'Exercise already has primary media.', mediaStatus: null, fileFormat: null, existingMediaId: null };
    }
    return {
      row,
      exerciseId,
      outcome: 'CREATE',
      reason: 'Validated for bounded ingestion.',
      mediaStatus: 'TO_CREATE',
      fileFormat: formatForMediaUrl(row.mediaType, row.url),
      existingMediaId: null,
    };
  });

  const counts = emptyCounts();
  for (const row of rows) counts[row.outcome] += 1;
  return { rows, counts };
}

export interface MediaIngestionWriter {
  create(row: MediaIngestionPlanRow): Promise<{ mediaId: string; mediaStatus: string }>;
  setPrimary(exerciseId: string, mediaId: string): Promise<void>;
}

export async function executeExerciseMediaIngestion(
  report: MediaIngestionReport,
  writer: MediaIngestionWriter,
  limit = MAX_MEDIA_INGESTION_BATCH,
  dryRun = true,
): Promise<MediaIngestionReport> {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_MEDIA_INGESTION_BATCH) throw new Error('Invalid ingestion batch limit.');
  if (dryRun) return report;
  const result = report.rows.map((row) => ({ ...row }));
  let attempted = 0;
  for (const row of result) {
    if ((row.outcome !== 'CREATE' && row.outcome !== 'RETRY_PRIMARY') || attempted >= limit) continue;
    attempted += 1;
    try {
      if (!row.row || !row.exerciseId) throw new Error('Validated ingestion row is incomplete.');
      if (row.outcome === 'RETRY_PRIMARY') {
        if (!row.existingMediaId) throw new Error('Primary retry is missing its media identity.');
        await writer.setPrimary(row.exerciseId, row.existingMediaId);
        row.reason = 'Primary selection retry succeeded.';
      } else {
        const created = await writer.create(row);
        if (created.mediaStatus !== 'TO_CREATE') throw new Error('Ingestion finalization returned an unsafe media status.');
        if (row.row.isPrimary) await writer.setPrimary(row.exerciseId, created.mediaId);
        row.reason = row.row.isPrimary ? 'Created as TO_CREATE and selected as primary.' : 'Created as TO_CREATE.';
      }
    } catch (error) {
      row.outcome = 'ERROR';
      row.reason = error instanceof Error ? error.message : 'Ingestion failed.';
    }
  }
  const counts = emptyCounts();
  for (const row of result) counts[row.outcome] += 1;
  return { rows: result, counts };
}

export type MediaReconciliationIssue =
  | 'READY'
  | 'TO_CREATE_R2'
  | 'TO_CREATE_EXTERNAL'
  | 'BROKEN_R2'
  | 'R2_UNVERIFIED'
  | 'UNPREVIEWABLE_EXTERNAL'
  | 'MISSING_LOCATOR'
  | 'DUPLICATE_LOCATOR'
  | 'DUPLICATE_TYPE'
  | 'MULTIPLE_PRIMARY'
  | 'NO_PRIMARY';

export function reconcileExerciseMedia(
  rows: ExerciseMediaRecord[],
  r2Availability: ReadonlyMap<string, boolean> = new Map(),
): Map<string, Set<MediaReconciliationIssue>> {
  const byExercise = new Map<string, ExerciseMediaRecord[]>();
  for (const row of rows) byExercise.set(row.exercise_id, [...(byExercise.get(row.exercise_id) ?? []), row]);
  const result = new Map<string, Set<MediaReconciliationIssue>>();
  for (const [exerciseId, media] of Array.from(byExercise.entries())) {
    const issues = new Set<MediaReconciliationIssue>();
    if (media.some(isUsableExerciseMedia)) issues.add('READY');
    if (media.some((row) => row.media_status === 'TO_CREATE' && Boolean(row.r2_key?.trim()))) issues.add('TO_CREATE_R2');
    if (media.some((row) => row.media_status === 'TO_CREATE' && Boolean(row.url && isValidExerciseMediaUrl(row.url)))) issues.add('TO_CREATE_EXTERNAL');
    if (media.some((row) => Boolean(row.r2_key?.trim()) && !r2Availability.has(row.r2_key!.trim()))) issues.add('R2_UNVERIFIED');
    if (media.some((row) => Boolean(row.r2_key?.trim()) && r2Availability.get(row.r2_key!.trim()) === false)) issues.add('BROKEN_R2');
    if (media.some((row) => Boolean(row.url?.trim()) && !isValidExerciseMediaUrl(row.url!))) issues.add('UNPREVIEWABLE_EXTERNAL');
    if (media.some((row) => !row.r2_key?.trim() && !row.url?.trim())) issues.add('MISSING_LOCATOR');
    const locators = media.map((row) => row.r2_key?.trim() || row.url?.trim()).filter(Boolean);
    if (new Set(locators).size !== locators.length) issues.add('DUPLICATE_LOCATOR');
    if (new Set(media.map((row) => row.media_type)).size !== media.length) issues.add('DUPLICATE_TYPE');
    const primaryCount = media.filter((row) => row.is_primary).length;
    if (primaryCount > 1) issues.add('MULTIPLE_PRIMARY');
    if (primaryCount === 0) issues.add('NO_PRIMARY');
    result.set(exerciseId, issues);
  }
  return result;
}
