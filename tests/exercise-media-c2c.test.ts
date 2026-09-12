import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createUploadToR2Handler, type Actor, type ExerciseMediaServices, type MediaRow } from '../supabase/functions/upload-to-r2/handler';
import {
  MAX_MEDIA_MANIFEST_BYTES,
  MAX_MEDIA_MANIFEST_ROWS,
  canonicalizeExerciseMediaUrl,
  executeExerciseMediaIngestion,
  parseExerciseMediaManifest,
  planExerciseMediaIngestion,
  reconcileExerciseMedia,
  type MediaManifestRow,
} from '../apps/coach-dashboard/lib/exerciseMediaIngestion';
import type { ExerciseMediaRecord } from '../apps/coach-dashboard/lib/exerciseMedia';

const migration = readFileSync('supabase/migrations/20260910120000_exercise_media_primary.sql', 'utf8');
const manager = readFileSync('apps/coach-dashboard/components/ExerciseMediaManager.tsx', 'utf8');
const workflow = readFileSync('apps/coach-dashboard/lib/exerciseMediaWorkflow.ts', 'utf8');
const EXERCISE = '00000000-0000-4000-a000-000000000001';
const OTHER = '00000000-0000-4000-a000-000000000002';
const M1 = '10000000-0000-4000-a000-000000000001';
const M2 = '10000000-0000-4000-a000-000000000002';

function media(overrides: Partial<ExerciseMediaRecord> = {}): ExerciseMediaRecord {
  return { id: M1, exercise_id: EXERCISE, media_type: 'video', file_format: 'mp4', r2_key: null,
    url: 'https://cdn.example.com/demo.mp4', thumbnail_url: null, is_primary: false,
    media_status: 'TO_CREATE', media_notes: null, created_at: null, ...overrides };
}

function manifest(overrides: Partial<MediaManifestRow> = {}): MediaManifestRow {
  return { operationId: '20000000-0000-4000-a000-000000000001', exerciseId: EXERCISE,
    mediaType: 'video', url: 'https://cdn.example.com/new.mp4', ...overrides };
}

function primaryHandler(actor: Actor | null, sourceType = 'custom', owner: string | null = 'coach-a') {
  const rows = new Map<string, MediaRow>([
    [M1, { ...media(), r2_bucket: 'bucket' } as MediaRow],
    [M2, { ...media({ id: M2, is_primary: true }), r2_bucket: 'bucket' } as MediaRow],
  ]);
  const services: ExerciseMediaServices = {
    authenticate: async () => actor,
    getExercise: async () => ({ id: EXERCISE, source_type: sourceType, created_by_coach_id: owner }),
    getMedia: async (id) => rows.get(id) ?? null,
    putObject: async () => {}, deleteObject: async () => {}, insertMedia: async (row) => row,
    updateMedia: async (id, values) => ({ ...rows.get(id)!, ...values }), deleteMedia: async (id) => { rows.delete(id); },
    setPrimary: async (exerciseId, mediaId) => {
      for (const [id, row] of rows) if (row.exercise_id === exerciseId) rows.set(id, { ...row, is_primary: id === mediaId });
      return rows.get(mediaId)!;
    },
    publicUrl: () => null, bucketName: 'bucket', randomUUID: () => crypto.randomUUID(),
  };
  return { handler: createUploadToR2Handler(services), rows };
}

function primaryRequest(mediaId = M1) {
  return new Request('https://test.invalid', { method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'set-exercise-media-primary', exerciseId: EXERCISE, mediaId }) });
}

describe('C2C primary-media correctness', () => {
  it('enforces zero-or-one primary with a partial unique index and service-only RPC', () => {
    expect(migration).toContain('WHERE is_primary IS TRUE');
    expect(migration).toContain('HAVING count(*) > 1');
    expect(migration).toContain('REVOKE ALL ON FUNCTION public.set_exercise_media_primary(uuid, uuid) FROM authenticated');
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.set_exercise_media_primary(uuid, uuid) TO service_role');
  });
  it('atomically clears the old primary and sets a TO_CREATE target', async () => {
    const state = primaryHandler({ id: 'coach-a', role: 'coach' });
    expect((await state.handler(primaryRequest())).status).toBe(200);
    expect(state.rows.get(M1)).toMatchObject({ is_primary: true, media_status: 'TO_CREATE' });
    expect(state.rows.get(M2)?.is_primary).toBe(false);
  });
  it('applies the frozen Admin/Coach/athlete ownership gate', async () => {
    expect((await primaryHandler({ id: 'admin', role: 'admin' }, 'yeti_first_party', null).handler(primaryRequest())).status).toBe(200);
    expect((await primaryHandler({ id: 'coach-a', role: 'coach' }, 'yeti_first_party', null).handler(primaryRequest())).status).toBe(403);
    expect((await primaryHandler({ id: 'coach-b', role: 'coach' }).handler(primaryRequest())).status).toBe(403);
    expect((await primaryHandler({ id: 'athlete', role: 'athlete' }).handler(primaryRequest())).status).toBe(403);
  });
  it('keeps browser DML absent and exposes the server-backed control', () => {
    expect(workflow).toContain("action: 'set-exercise-media-primary'");
    expect(manager).not.toMatch(/from\(['"]exercise_media['"]\)\.(update|insert|delete)/);
    expect(manager).toContain('Set primary');
    expect(manager).toContain('no primary media selected');
  });
  it('allows deleting the primary without silently promoting another row', async () => {
    const state = primaryHandler({ id: 'coach-a', role: 'coach' });
    const response = await state.handler(new Request('https://test.invalid', { method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete-exercise-media', exerciseId: EXERCISE, mediaId: M2 }) }));
    expect(response.status).toBe(200);
    expect(state.rows.has(M2)).toBe(false);
    expect([...state.rows.values()].some((row) => row.is_primary)).toBe(false);
  });
});

describe('C2C controlled ingestion', () => {
  const exercises = [{ id: EXERCISE, slug: 'back-squat' }, { id: OTHER, slug: 'hack-squat' }];
  const writer = () => ({
    create: vi.fn(async (row: { row: MediaManifestRow | null }) => ({ mediaId: row.row!.operationId, mediaStatus: 'TO_CREATE' })),
    setPrimary: vi.fn(async () => {}),
  });
  it('plans TO_CREATE and dry-run performs zero writes', async () => {
    const report = planExerciseMediaIngestion([manifest()], exercises, []);
    expect(report.rows[0]).toMatchObject({ outcome: 'CREATE', mediaStatus: 'TO_CREATE', fileFormat: 'mp4' });
    const actions = writer();
    await executeExerciseMediaIngestion(report, actions, 25, true);
    expect(actions.create).not.toHaveBeenCalled();
    expect(actions.setPrimary).not.toHaveBeenCalled();
  });
  it('rejects unknown exercises, HTTP, incompatible media, and duplicate operations', () => {
    expect(planExerciseMediaIngestion([manifest({ exerciseId: '00000000-0000-4000-a000-000000000099' })], exercises, []).rows[0].outcome).toBe('INVALID');
    expect(planExerciseMediaIngestion([manifest({ url: 'http://cdn.example.com/a.mp4' })], exercises, []).rows[0].outcome).toBe('INVALID');
    expect(planExerciseMediaIngestion([manifest({ mediaType: 'gif', url: 'https://cdn.example.com/a.mp4' })], exercises, []).rows[0].outcome).toBe('INVALID');
    expect(planExerciseMediaIngestion([manifest(), manifest()], exercises, []).rows.every((row) => row.outcome === 'INVALID')).toBe(true);
  });
  it('skips an existing locator and rejects duplicate manifest locators', () => {
    expect(planExerciseMediaIngestion([manifest()], exercises, [media({ url: manifest().url })]).rows[0].outcome).toBe('SKIP_EXISTING');
    const second = manifest({ operationId: '20000000-0000-4000-a000-000000000002' });
    expect(planExerciseMediaIngestion([manifest(), second], exercises, []).rows.every((row) => row.outcome === 'CONFLICT')).toBe(true);
  });
  it('rejects proposed-primary conflicts', () => {
    const second = manifest({ operationId: '20000000-0000-4000-a000-000000000002', url: 'https://cdn.example.com/two.mp4', isPrimary: true });
    expect(planExerciseMediaIngestion([manifest({ isPrimary: true }), second], exercises, []).rows.every((row) => row.outcome === 'CONFLICT')).toBe(true);
    expect(planExerciseMediaIngestion([manifest({ isPrimary: true })], exercises, [media({ is_primary: true })]).rows[0].outcome).toBe('CONFLICT');
  });
  it('bounds writes and reports partial failures per row', async () => {
    const rows = [manifest(), manifest({ operationId: '20000000-0000-4000-a000-000000000002', exerciseId: OTHER, url: 'https://cdn.example.com/two.mp4' })];
    const report = planExerciseMediaIngestion(rows, exercises, []);
    const actions = writer();
    actions.create.mockImplementation(async (row) => {
      if (row.exerciseId === EXERCISE) throw new Error('row failed');
      return { mediaId: row.row!.operationId, mediaStatus: 'TO_CREATE' };
    });
    const result = await executeExerciseMediaIngestion(report, actions, 2, false);
    expect(actions.create).toHaveBeenCalledTimes(2);
    expect(result.counts.ERROR).toBe(1);
    expect(result.rows[1].mediaStatus).toBe('TO_CREATE');
  });
  it('enforces the batch ceiling', async () => {
    const report = planExerciseMediaIngestion([], exercises, []);
    await expect(executeExerciseMediaIngestion(report, writer(), 26, false)).rejects.toThrow('Invalid ingestion batch limit');
  });
  it('executes exactly 25 rows sequentially and leaves later rows planned', async () => {
    const rows = Array.from({ length: 26 }, (_, index) => manifest({
      operationId: `20000000-0000-4000-a000-${String(index + 1).padStart(12, '0')}`,
      url: `https://cdn.example.com/${index}.mp4`,
    }));
    const report = planExerciseMediaIngestion(rows, exercises, []);
    const actions = writer();
    await executeExerciseMediaIngestion(report, actions, 25, false);
    expect(actions.create).toHaveBeenCalledTimes(25);
  });
  it('recovers create-success/primary-failure by retrying primary only', async () => {
    const row = manifest({ isPrimary: true });
    const actions = writer();
    actions.setPrimary.mockRejectedValueOnce(new Error('network response lost'));
    const first = await executeExerciseMediaIngestion(planExerciseMediaIngestion([row], exercises, []), actions, 25, false);
    expect(first.rows[0]).toMatchObject({ outcome: 'ERROR' });
    const persisted = media({ id: row.operationId, url: row.url, media_status: 'TO_CREATE', is_primary: false });
    const retryPlan = planExerciseMediaIngestion([row], exercises, [persisted]);
    expect(retryPlan.rows[0]).toMatchObject({ outcome: 'RETRY_PRIMARY', existingMediaId: row.operationId, mediaStatus: 'TO_CREATE' });
    const retryActions = writer();
    const retry = await executeExerciseMediaIngestion(retryPlan, retryActions, 25, false);
    expect(retryActions.create).not.toHaveBeenCalled();
    expect(retryActions.setPrimary).toHaveBeenCalledWith(EXERCISE, row.operationId);
    expect(retry.rows[0].reason).toBe('Primary selection retry succeeded.');
  });
  it('recovers an ambiguous create response without creating duplicate metadata', async () => {
    const row = manifest({ isPrimary: true });
    const actions = writer();
    actions.create.mockRejectedValueOnce(new Error('network response lost after commit'));
    const first = await executeExerciseMediaIngestion(planExerciseMediaIngestion([row], exercises, []), actions, 25, false);
    expect(first.rows[0]).toMatchObject({ outcome: 'ERROR' });

    const authoritative = media({ id: row.operationId, url: row.url, media_status: 'TO_CREATE', is_primary: false });
    const retryActions = writer();
    const retry = await executeExerciseMediaIngestion(
      planExerciseMediaIngestion([row], exercises, [authoritative]),
      retryActions,
      25,
      false,
    );
    expect(retryActions.create).not.toHaveBeenCalled();
    expect(retryActions.setPrimary).toHaveBeenCalledWith(EXERCISE, row.operationId);
    expect(retry.rows[0]).toMatchObject({ outcome: 'RETRY_PRIMARY', mediaStatus: 'TO_CREATE' });
  });
  it('reports repeated primary retry failure and treats already-primary replay as applied', async () => {
    const row = manifest({ isPrimary: true });
    const pending = media({ id: row.operationId, url: row.url, media_status: 'TO_CREATE', is_primary: false });
    const actions = writer();
    actions.setPrimary.mockRejectedValue(new Error('still unavailable'));
    const failed = await executeExerciseMediaIngestion(planExerciseMediaIngestion([row], exercises, [pending]), actions, 25, false);
    expect(failed.rows[0]).toMatchObject({ outcome: 'ERROR', reason: 'still unavailable' });
    const applied = planExerciseMediaIngestion([row], exercises, [{ ...pending, is_primary: true }]);
    expect(applied.rows[0]).toMatchObject({ outcome: 'SKIP_EXISTING', reason: 'Operation is already fully applied.' });
  });
  it('rejects malformed row shapes independently without throwing or writing', async () => {
    const malformed: unknown[] = [null, 'bad-row', { url: null }, { ...manifest(), url: 123 }, { ...manifest(), exerciseId: undefined, exerciseSlug: [] }];
    const report = planExerciseMediaIngestion(malformed, exercises, []);
    expect(report.rows).toHaveLength(5);
    expect(report.rows.every((row) => row.outcome === 'INVALID')).toBe(true);
    const actions = writer();
    await executeExerciseMediaIngestion(report, actions, 25, false);
    expect(actions.create).not.toHaveBeenCalled();
  });
  it('enforces manifest byte and row limits without truncation', () => {
    const exactlyMaxBytes = `[${' '.repeat(MAX_MEDIA_MANIFEST_BYTES - 4)}{}]`;
    expect(new TextEncoder().encode(exactlyMaxBytes)).toHaveLength(MAX_MEDIA_MANIFEST_BYTES);
    expect(parseExerciseMediaManifest(exactlyMaxBytes)).toHaveLength(1);
    expect(() => parseExerciseMediaManifest(' '.repeat(MAX_MEDIA_MANIFEST_BYTES + 1))).toThrow('byte limit');
    expect(() => parseExerciseMediaManifest('[]')).toThrow('at least one row');
    expect(() => parseExerciseMediaManifest(JSON.stringify(Array.from({ length: MAX_MEDIA_MANIFEST_ROWS + 1 }, () => ({}))))).toThrow('row limit');
    expect(parseExerciseMediaManifest(JSON.stringify(Array.from({ length: MAX_MEDIA_MANIFEST_ROWS }, () => ({}))))).toHaveLength(MAX_MEDIA_MANIFEST_ROWS);
  });
  it('canonicalizes only conservative URL components for duplicate detection', () => {
    expect(canonicalizeExerciseMediaUrl('HTTPS://MEDIA.EXAMPLE.COM:443/a.mp4')).toBe('https://media.example.com/a.mp4');
    expect(canonicalizeExerciseMediaUrl('https://media.example.com/a.mp4?token=one')).not.toBe(canonicalizeExerciseMediaUrl('https://media.example.com/a.mp4?token=two'));
    const existing = media({ url: 'https://media.example.com/a.mp4' });
    expect(planExerciseMediaIngestion([manifest({ url: 'HTTPS://MEDIA.EXAMPLE.COM:443/a.mp4' })], exercises, [existing]).rows[0].outcome).toBe('SKIP_EXISTING');
  });
  it('classifies review states without promoting rows', () => {
    const rows = [media({ r2_key: 'exercises/e/a.mp4', url: null }), media({ id: M2, media_type: 'image', url: 'https://cdn.example.com/a.webp' })];
    const issues = reconcileExerciseMedia(rows).get(EXERCISE)!;
    expect([...issues]).toEqual(expect.arrayContaining(['TO_CREATE_R2', 'TO_CREATE_EXTERNAL', 'NO_PRIMARY']));
    expect(issues.has('READY')).toBe(false);
    expect(issues.has('R2_UNVERIFIED')).toBe(true);
    expect(issues.has('BROKEN_R2')).toBe(false);
  });
  it('classifies known broken R2 objects and malformed external URLs', () => {
    const badUrl = media({ id: M2, r2_key: null, url: 'http://invalid.example/a.mp4' });
    const r2 = media({ r2_key: 'exercises/e/missing.mp4', url: null });
    const issues = reconcileExerciseMedia([badUrl, r2], new Map([[r2.r2_key!, false]])).get(EXERCISE)!;
    expect([...issues]).toEqual(expect.arrayContaining(['BROKEN_R2', 'UNPREVIEWABLE_EXTERNAL']));
  });
});
