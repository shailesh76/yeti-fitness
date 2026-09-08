import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createUploadToR2Handler,
  MAX_EXERCISE_MEDIA_BYTES,
  type Actor,
  type ExerciseMediaServices,
  type ExerciseScope,
  type MediaRow,
} from '../supabase/functions/upload-to-r2/handler';

const migration = readFileSync('supabase/migrations/20260908120000_exercise_media_security_lifecycle.sql', 'utf8');
const manager = readFileSync('apps/coach-dashboard/components/ExerciseMediaManager.tsx', 'utf8');
const EXERCISE = '00000000-0000-4000-a000-000000000001';
const MEDIA = '10000000-0000-4000-a000-000000000001';
const REQUEST = '20000000-0000-4000-a000-000000000001';

function request(body: Record<string, unknown>): Request {
  return new Request('https://example.test/upload-to-r2', {
    method: 'POST',
    headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function upload(overrides: Record<string, unknown> = {}) {
  const mp4Header = String.fromCharCode(0, 0, 0, 16) + 'ftypisom';
  return request({
    action: 'upload-exercise-media',
    exerciseId: EXERCISE,
    idempotencyKey: REQUEST,
    mediaType: 'video',
    contentType: 'video/mp4',
    file: btoa(mp4Header),
    ...overrides,
  });
}

function setup(actor: Actor | null, exercise: ExerciseScope = {
  id: EXERCISE,
  source_type: 'custom',
  created_by_coach_id: 'coach-a',
}) {
  const rows = new Map<string, MediaRow>();
  const puts: string[] = [];
  const deletedObjects: string[] = [];
  let insertError: Error | null = null;
  let concurrentRow: MediaRow | null = null;
  let deleteObjectError: Error | null = null;
  let currentActor = actor;
  let uuidCounter = 0;
  const services: ExerciseMediaServices = {
    authenticate: async () => currentActor,
    getExercise: async (id) => id === exercise.id ? exercise : null,
    getMedia: async (id) => rows.get(id) ?? null,
    putObject: async (key) => { puts.push(key); },
    deleteObject: async (key) => {
      if (deleteObjectError) throw deleteObjectError;
      deletedObjects.push(key);
    },
    insertMedia: async (row) => {
      if (insertError) {
        if (concurrentRow) rows.set(concurrentRow.id, concurrentRow);
        throw insertError;
      }
      rows.set(row.id, row);
      return row;
    },
    updateMedia: async (id, values) => {
      const current = rows.get(id);
      if (!current) throw new Error('missing');
      const updated = { ...current, ...values };
      rows.set(id, updated);
      return updated;
    },
    deleteMedia: async (id) => { rows.delete(id); },
    publicUrl: (key) => `https://cdn.example.com/${key}`,
    bucketName: 'dude-media',
    randomUUID: () => `30000000-0000-4000-a000-${String(++uuidCounter).padStart(12, '0')}`,
  };
  return {
    handler: createUploadToR2Handler(services), rows, puts, deletedObjects,
    failInsert(error: Error, winner?: MediaRow) { insertError = error; concurrentRow = winner ?? null; },
    failObjectCleanup(error: Error) { deleteObjectError = error; },
    setActor(nextActor: Actor | null) { currentActor = nextActor; },
  };
}

async function body(response: Response) {
  return response.json() as Promise<Record<string, any>>;
}

describe('Phase C2A exercise media authorization', () => {
  it('denies unauthenticated and athlete uploads', async () => {
    expect((await setup(null).handler(upload())).status).toBe(401);
    expect((await setup({ id: 'athlete', role: 'athlete' }).handler(upload())).status).toBe(403);
  });

  it('allows a Coach to upload only to their own custom exercise', async () => {
    expect((await setup({ id: 'coach-a', role: 'coach' }).handler(upload())).status).toBe(200);
    expect((await setup({ id: 'coach-b', role: 'coach' }).handler(upload())).status).toBe(403);
  });

  it('denies Coach uploads to Yeti and legacy exercises', async () => {
    const coach = { id: 'coach-a', role: 'coach' };
    expect((await setup(coach, { id: EXERCISE, source_type: 'yeti_first_party', created_by_coach_id: null }).handler(upload())).status).toBe(403);
    expect((await setup(coach, { id: EXERCISE, source_type: 'legacy_catalog', created_by_coach_id: null }).handler(upload())).status).toBe(403);
  });

  it('allows an Admin to upload to canonical exercises', async () => {
    const admin = setup({ id: 'admin', role: 'admin' }, { id: EXERCISE, source_type: 'yeti_first_party', created_by_coach_id: null });
    expect((await admin.handler(upload())).status).toBe(200);
  });
});

describe('Phase C2A upload validation and finalization', () => {
  it('accepts valid MIME pairs and writes TO_CREATE metadata after upload', async () => {
    const state = setup({ id: 'coach-a', role: 'coach' });
    const response = await state.handler(upload());
    const result = await body(response);
    expect(response.status).toBe(200);
    expect(result.media.media_status).toBe('TO_CREATE');
    expect(state.puts[0]).toMatch(new RegExp(`^exercises/${EXERCISE}/[0-9a-f-]+\\.mp4$`, 'i'));
    expect(state.puts[0]).not.toContain(REQUEST);
  });

  it('rejects invalid MIME pairs and oversized input', async () => {
    const state = setup({ id: 'coach-a', role: 'coach' });
    expect((await state.handler(upload({ contentType: 'text/html' }))).status).toBe(400);
    const oversized = 'A'.repeat(Math.ceil(MAX_EXERCISE_MEDIA_BYTES / 3) * 4 + 5);
    expect((await state.handler(upload({ file: oversized }))).status).toBe(413);
    expect(state.puts).toHaveLength(0);
  });

  it('rejects files whose bytes do not match the declared MIME type', async () => {
    const state = setup({ id: 'coach-a', role: 'coach' });
    expect((await state.handler(upload({ file: btoa('<html>') }))).status).toBe(400);
    expect(state.puts).toHaveLength(0);
  });

  it('rejects caller-controlled paths and generates collision-resistant keys', async () => {
    const state = setup({ id: 'coach-a', role: 'coach' });
    const unsafe = request({ filePath: 'exercises/other/overwrite.mp4', folder: 'progress-photos', file: btoa('x'), contentType: 'image/png' });
    expect((await state.handler(unsafe)).status).toBe(400);
    await state.handler(upload());
    await state.handler(upload({ idempotencyKey: '20000000-0000-4000-a000-000000000002' }));
    expect(new Set(state.puts).size).toBe(2);
  });

  it('replays a finalized request without duplicating metadata or objects', async () => {
    const state = setup({ id: 'coach-a', role: 'coach' });
    expect((await body(await state.handler(upload()))).replayed).toBeUndefined();
    expect((await body(await state.handler(upload()))).replayed).toBe(true);
    expect(state.rows.size).toBe(1);
    expect(state.puts).toHaveLength(1);
  });

  it('removes an uploaded object when metadata finalization fails and creates no READY row', async () => {
    const state = setup({ id: 'coach-a', role: 'coach' });
    state.failInsert(new Error('database unavailable'));
    const response = await state.handler(upload());
    expect(response.status).toBe(500);
    expect(state.rows.size).toBe(0);
    expect(state.deletedObjects).toEqual(state.puts);
  });

  it('cleans up the losing object when concurrent idempotent requests reconcile', async () => {
    const completed = setup({ id: 'coach-a', role: 'coach' });
    await completed.handler(upload());
    const completedRow = completed.rows.get(REQUEST)!;
    const state = setup({ id: 'coach-a', role: 'coach' });
    const winner: MediaRow = {
      ...completedRow,
      r2_key: `exercises/${EXERCISE}/winner.mp4`,
    };
    state.failInsert(new Error('duplicate key'), winner);
    const response = await state.handler(upload());
    expect(response.status).toBe(200);
    expect((await body(response)).replayed).toBe(true);
    expect(state.deletedObjects).toEqual(state.puts);
    expect(state.rows.get(REQUEST)?.r2_key).toBe(winner.r2_key);
  });

  it('surfaces cleanup pending when the concurrent losing object cannot be removed', async () => {
    const completed = setup({ id: 'coach-a', role: 'coach' });
    await completed.handler(upload());
    const winner = { ...completed.rows.get(REQUEST)!, r2_key: `exercises/${EXERCISE}/winner.mp4` };
    const state = setup({ id: 'coach-a', role: 'coach' });
    state.failInsert(new Error('duplicate key'), winner);
    state.failObjectCleanup(new Error('R2 unavailable'));
    const response = await state.handler(upload());
    const result = await body(response);
    expect(response.status).toBe(200);
    expect(result.replayed).toBe(true);
    expect(result.cleanupPending).toBe(true);
    expect(result.cleanupKey).toBe(state.puts[0]);
    expect(result.media.media_status).toBe('TO_CREATE');
  });

  it('surfaces cleanup pending when DB finalization and object cleanup both fail', async () => {
    const state = setup({ id: 'coach-a', role: 'coach' });
    state.failInsert(new Error('database unavailable'));
    state.failObjectCleanup(new Error('R2 unavailable'));
    const response = await state.handler(upload());
    const result = await body(response);
    expect(response.status).toBe(500);
    expect(result.cleanupPending).toBe(true);
    expect(result.cleanupKey).toBe(state.puts[0]);
    expect(state.rows.size).toBe(0);
  });

  it('rejects idempotency-key reuse for different binary parameters before another upload', async () => {
    const state = setup({ id: 'coach-a', role: 'coach' });
    await state.handler(upload());
    const originalPuts = state.puts.length;
    expect((await state.handler(upload({ file: btoa(String.fromCharCode(0, 0, 0, 16) + 'ftypiso2') }))).status).toBe(409);
    expect((await state.handler(upload({ mediaType: 'gif', contentType: 'image/gif', file: btoa('GIF89a-content') }))).status).toBe(409);
    expect(state.puts).toHaveLength(originalPuts);
  });

  it('rejects idempotency-key reuse by another actor or exercise', async () => {
    const state = setup({ id: 'coach-a', role: 'coach' });
    await state.handler(upload());
    state.setActor({ id: 'admin-b', role: 'admin' });
    expect((await state.handler(upload())).status).toBe(409);
    state.rows.set(REQUEST, { ...state.rows.get(REQUEST)!, exercise_id: '00000000-0000-4000-a000-000000000099' });
    expect((await state.handler(upload())).status).toBe(409);
    expect(state.puts).toHaveLength(1);
  });

  it('rejects idempotency-key reuse for a different external URL', async () => {
    const state = setup({ id: 'coach-a', role: 'coach' });
    const create = (url: string) => request({
      action: 'save-external-media', exerciseId: EXERCISE, idempotencyKey: REQUEST,
      mediaType: 'video', url,
    });
    expect((await state.handler(create('https://cdn.example.com/one.mp4'))).status).toBe(200);
    expect((await state.handler(create('https://cdn.example.com/one.mp4'))).status).toBe(200);
    expect((await state.handler(create('https://cdn.example.com/two.mp4'))).status).toBe(409);
    expect(state.rows.size).toBe(1);
  });
});

describe('Phase C2A lifecycle transitions', () => {
  it('accepts READY for valid R2 and HTTPS locators and rejects missing locators', async () => {
    const state = setup({ id: 'coach-a', role: 'coach' });
    const base: MediaRow = {
      id: MEDIA, exercise_id: EXERCISE, media_type: 'video', file_format: 'mp4', r2_bucket: 'dude-media',
      r2_key: 'exercises/demo.mp4', url: null, is_primary: false, media_status: 'TO_CREATE',
    };
    state.rows.set(MEDIA, base);
    const ready = request({ action: 'set-exercise-media-status', exerciseId: EXERCISE, mediaId: MEDIA, status: 'READY' });
    expect((await state.handler(ready)).status).toBe(200);
    state.rows.set(MEDIA, { ...base, r2_key: null, url: 'https://cdn.example.com/demo.mp4' });
    expect((await state.handler(request({ action: 'set-exercise-media-status', exerciseId: EXERCISE, mediaId: MEDIA, status: 'READY' }))).status).toBe(200);
    state.rows.set(MEDIA, { ...base, r2_key: null, url: null });
    expect((await state.handler(request({ action: 'set-exercise-media-status', exerciseId: EXERCISE, mediaId: MEDIA, status: 'READY' }))).status).toBe(400);
  });

  it('rejects arbitrary status values', async () => {
    const state = setup({ id: 'coach-a', role: 'coach' });
    state.rows.set(MEDIA, { id: MEDIA, exercise_id: EXERCISE, media_type: 'video', file_format: 'mp4', r2_bucket: 'dude-media', r2_key: 'key', url: null, is_primary: false, media_status: 'TO_CREATE' });
    expect((await state.handler(request({ action: 'set-exercise-media-status', exerciseId: EXERCISE, mediaId: MEDIA, status: 'PUBLISHED' }))).status).toBe(400);
    expect((await state.handler(request({ action: 'save-external-media', exerciseId: EXERCISE, idempotencyKey: REQUEST, mediaType: 'video', url: 'https://cdn.example.com/demo.mp4', status: 'PUBLISHED' }))).status).toBe(400);
    expect((await state.handler(request({ action: 'save-external-media', exerciseId: EXERCISE, idempotencyKey: REQUEST, mediaType: 'video', url: 'https://cdn.example.com/demo.mp4', status: 'READY' }))).status).toBe(400);
  });

  it('derives external media format server-side and rejects recognized mismatches', async () => {
    const state = setup({ id: 'coach-a', role: 'coach' });
    const accepted = await state.handler(request({
      action: 'save-external-media', exerciseId: EXERCISE, idempotencyKey: REQUEST,
      mediaType: 'video', fileFormat: 'gif', url: 'https://cdn.example.com/demo.mp4',
    }));
    expect(accepted.status).toBe(200);
    expect(state.rows.get(REQUEST)?.file_format).toBe('mp4');
    expect(state.rows.get(REQUEST)?.media_status).toBe('TO_CREATE');

    const rejected = await state.handler(request({
      action: 'save-external-media', exerciseId: EXERCISE,
      idempotencyKey: '20000000-0000-4000-a000-000000000003',
      mediaType: 'video', url: 'https://cdn.example.com/demo.gif',
    }));
    expect(rejected.status).toBe(400);
  });

  it('allows Admin update/delete of canonical media and rejects Coach', async () => {
    const canonical = { id: EXERCISE, source_type: 'yeti_first_party', created_by_coach_id: null };
    const admin = setup({ id: 'admin', role: 'admin' }, canonical);
    const coach = setup({ id: 'coach-a', role: 'coach' }, canonical);
    const row: MediaRow = { id: MEDIA, exercise_id: EXERCISE, media_type: 'video', file_format: 'mp4', r2_bucket: 'dude-media', r2_key: 'key', url: null, is_primary: false, media_status: 'TO_CREATE' };
    admin.rows.set(MEDIA, row);
    coach.rows.set(MEDIA, row);
    expect((await admin.handler(request({ action: 'set-exercise-media-status', exerciseId: EXERCISE, mediaId: MEDIA, status: 'READY' }))).status).toBe(200);
    expect((await coach.handler(request({ action: 'set-exercise-media-status', exerciseId: EXERCISE, mediaId: MEDIA, status: 'READY' }))).status).toBe(403);
    expect((await admin.handler(request({ action: 'delete-exercise-media', exerciseId: EXERCISE, mediaId: MEDIA }))).status).toBe(200);
  });

  it('does not let a Coach move owned media onto a canonical exercise', async () => {
    const canonical = { id: EXERCISE, source_type: 'yeti_first_party', created_by_coach_id: null };
    const coach = setup({ id: 'coach-a', role: 'coach' }, canonical);
    coach.rows.set(MEDIA, {
      id: MEDIA, exercise_id: '00000000-0000-4000-a000-000000000099', media_type: 'video',
      file_format: 'mp4', r2_bucket: 'dude-media', r2_key: null,
      url: 'https://cdn.example.com/original.mp4', is_primary: false, media_status: 'TO_CREATE',
    });
    const response = await coach.handler(request({
      action: 'save-external-media', exerciseId: EXERCISE, mediaId: MEDIA,
      mediaType: 'video', url: 'https://cdn.example.com/replacement.mp4',
    }));
    expect(response.status).toBe(403);
    expect(coach.rows.get(MEDIA)?.exercise_id).toBe('00000000-0000-4000-a000-000000000099');
    expect(coach.rows.get(MEDIA)?.url).toBe('https://cdn.example.com/original.mp4');
  });

  it('surfaces pending R2 cleanup after metadata deletion', async () => {
    const state = setup({ id: 'coach-a', role: 'coach' });
    state.rows.set(MEDIA, {
      id: MEDIA, exercise_id: EXERCISE, media_type: 'video', file_format: 'mp4',
      r2_bucket: 'dude-media', r2_key: `exercises/${EXERCISE}/stored.mp4`, url: null,
      is_primary: false, media_status: 'TO_CREATE',
    });
    state.failObjectCleanup(new Error('R2 unavailable'));
    const response = await state.handler(request({ action: 'delete-exercise-media', exerciseId: EXERCISE, mediaId: MEDIA }));
    const result = await body(response);
    expect(response.status).toBe(200);
    expect(result.metadataRemoved).toBe(true);
    expect(result.cleanupPending).toBe(true);
    expect(result.cleanupKey).toBe(`exercises/${EXERCISE}/stored.mp4`);
    expect(state.rows.has(MEDIA)).toBe(false);
  });
});

describe('Phase C2A migration and browser boundary', () => {
  it('normalizes unsupported live status values explicitly before enforcing two valid statuses', () => {
    expect(migration).toContain("media_status NOT IN ('TO_CREATE', 'READY')");
    expect(migration).toContain("SET media_status = 'TO_CREATE'");
    expect(migration).toContain('ALTER COLUMN media_status SET NOT NULL');
    expect(migration).toContain("CHECK (media_status IN ('TO_CREATE', 'READY'))");
    expect(migration).toContain("media_status <> 'READY'");
    expect(migration).toContain("NULLIF(btrim(r2_key), '') IS NOT NULL");
  });

  it('applies the established Admin and Coach-owned-custom authorization model to every mutation', () => {
    expect(migration.match(/p\.role = 'admin'/g)).toHaveLength(4);
    expect(migration.match(/p\.role = 'coach'/g)).toHaveLength(4);
    expect(migration.match(/e\.source_type = 'custom'/g)).toHaveLength(4);
    expect(migration.match(/e\.created_by_coach_id = auth\.uid\(\)/g)).toHaveLength(4);
    expect(migration.match(/WITH CHECK/g)).toHaveLength(2);
    expect(migration).toContain('JOIN public.exercises e ON e.id = exercise_media.exercise_id');
    expect(migration).toContain('REVOKE INSERT, UPDATE, DELETE ON public.exercise_media FROM authenticated');
    expect(migration).toContain('GRANT SELECT ON public.exercise_media TO authenticated');
  });

  it('removes direct browser table writes and arbitrary status choices', () => {
    expect(manager).not.toContain("supabase.from('exercise_media').insert");
    expect(manager).not.toContain("supabase.from('exercise_media').update");
    expect(manager).not.toContain("supabase.from('exercise_media').delete");
    expect(manager).not.toContain('<option value="REVIEW">');
    expect(manager).toContain("functions.invoke('upload-to-r2'");
    expect(manager).toContain("status: 'TO_CREATE'");
    expect(manager).toContain('Media record removed, but stored file cleanup is still pending.');
  });
});
