export const MAX_EXERCISE_MEDIA_BYTES = 25 * 1024 * 1024;

export type MediaStatus = 'TO_CREATE' | 'READY';
export type MediaType = 'gif' | 'video' | 'image' | 'thumbnail';

export interface Actor {
  id: string;
  role: string;
}

export interface ExerciseScope {
  id: string;
  source_type: string;
  created_by_coach_id: string | null;
}

export interface MediaRow {
  id: string;
  exercise_id: string;
  media_type: MediaType;
  file_format: string;
  r2_bucket: string;
  r2_key: string | null;
  url: string | null;
  is_primary: boolean;
  media_status: MediaStatus;
  idempotency_actor_id?: string | null;
  idempotency_fingerprint?: string | null;
}

export interface ExerciseMediaServices {
  authenticate(req: Request): Promise<Actor | null>;
  getExercise(exerciseId: string): Promise<ExerciseScope | null>;
  getMedia(mediaId: string): Promise<MediaRow | null>;
  putObject(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
  insertMedia(row: MediaRow): Promise<MediaRow>;
  updateMedia(mediaId: string, values: Partial<MediaRow>): Promise<MediaRow>;
  deleteMedia(mediaId: string): Promise<void>;
  publicUrl(key: string): string | null;
  bucketName: string;
  randomUUID(): string;
}

const MIME_RULES: Record<MediaType, Record<string, string>> = {
  gif: { 'image/gif': 'gif' },
  video: { 'video/mp4': 'mp4' },
  image: { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' },
  thumbnail: { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' },
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value || /\s/.test(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function formatForExternalUrl(mediaType: unknown, url: string): string | null {
  if (typeof mediaType !== 'string' || !(mediaType in MIME_RULES)) return null;
  const pathname = new URL(url).pathname.toLowerCase();
  const extension = pathname.match(/\.([a-z0-9]+)$/)?.[1] ?? null;
  const recognized = new Set(['gif', 'mp4', 'webm', 'webp', 'jpg', 'jpeg', 'png']);
  if (extension && recognized.has(extension)) {
    if (mediaType === 'gif') return extension === 'gif' ? 'gif' : null;
    if (mediaType === 'video') return extension === 'mp4' ? 'mp4' : null;
    return ['webp', 'jpg', 'jpeg', 'png'].includes(extension) ? (extension === 'jpeg' ? 'jpg' : extension) : null;
  }
  if (mediaType === 'gif') return 'gif';
  if (mediaType === 'video') return 'mp4';
  return 'webp';
}

function canManageExercise(actor: Actor, exercise: ExerciseScope): boolean {
  if (actor.role === 'admin') return true;
  return actor.role === 'coach'
    && exercise.source_type === 'custom'
    && exercise.created_by_coach_id === actor.id;
}

function decodeBase64(value: unknown): Uint8Array | null {
  if (typeof value !== 'string') return null;
  const encoded = value.includes('base64,') ? value.slice(value.indexOf('base64,') + 7) : value;
  const compact = encoded.replace(/\s/g, '');
  if (!compact || compact.length > Math.ceil(MAX_EXERCISE_MEDIA_BYTES / 3) * 4 + 4) return null;
  try {
    const bytes = Uint8Array.from(atob(compact), (character) => character.charCodeAt(0));
    return bytes.length <= MAX_EXERCISE_MEDIA_BYTES ? bytes : null;
  } catch {
    return null;
  }
}

function hasExpectedSignature(bytes: Uint8Array, contentType: string): boolean {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (contentType === 'video/mp4') return bytes.length >= 8 && ascii(4, 8) === 'ftyp';
  if (contentType === 'image/gif') return bytes.length >= 6 && ['GIF87a', 'GIF89a'].includes(ascii(0, 6));
  if (contentType === 'image/png') return bytes.length >= 8
    && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  if (contentType === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === 'image/webp') return bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
  return false;
}

async function sha256Hex(value: Uint8Array | string): Promise<string> {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value;
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function operationFingerprint(fields: Record<string, unknown>): Promise<string> {
  return sha256Hex(JSON.stringify(fields));
}

function matchesOperation(media: MediaRow, actor: Actor, fingerprint: string): boolean {
  return media.idempotency_actor_id === actor.id
    && media.idempotency_fingerprint === fingerprint;
}

async function cleanupObject(key: string, services: ExerciseMediaServices): Promise<boolean> {
  try {
    await services.deleteObject(key);
    return false;
  } catch {
    return true;
  }
}

async function authorizedExercise(
  actor: Actor,
  exerciseId: unknown,
  services: ExerciseMediaServices,
): Promise<ExerciseScope | Response> {
  if (!isUuid(exerciseId)) return json(400, { error: 'A valid exercise identifier is required.' });
  const exercise = await services.getExercise(exerciseId);
  if (!exercise) return json(404, { error: 'Exercise not found.' });
  if (!canManageExercise(actor, exercise)) return json(403, { error: 'You cannot manage media for this exercise.' });
  return exercise;
}

async function ownedMedia(
  actor: Actor,
  exerciseId: unknown,
  mediaId: unknown,
  services: ExerciseMediaServices,
): Promise<{ exercise: ExerciseScope; media: MediaRow } | Response> {
  const exercise = await authorizedExercise(actor, exerciseId, services);
  if (exercise instanceof Response) return exercise;
  if (!isUuid(mediaId)) return json(400, { error: 'A valid media identifier is required.' });
  const media = await services.getMedia(mediaId);
  if (!media || media.exercise_id !== exercise.id) return json(404, { error: 'Media not found.' });
  return { exercise, media };
}

export function createUploadToR2Handler(services: ExerciseMediaServices) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response('ok');
    if (req.method !== 'POST') return json(405, { error: 'Method not allowed.' });

    const actor = await services.authenticate(req);
    if (!actor) return json(401, { error: 'Authentication required.' });

    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch {
      return json(400, { error: 'Invalid JSON payload.' });
    }

    const action = payload.action;
    if (action === 'upload-exercise-media') {
      const exercise = await authorizedExercise(actor, payload.exerciseId, services);
      if (exercise instanceof Response) return exercise;
      if (!isUuid(payload.idempotencyKey)) return json(400, { error: 'A valid idempotency key is required.' });
      const mediaType = payload.mediaType as MediaType;
      const contentType = typeof payload.contentType === 'string' ? payload.contentType.toLowerCase() : '';
      const extension = MIME_RULES[mediaType]?.[contentType];
      if (!extension) return json(400, { error: 'Unsupported media type or MIME combination.' });
      const bytes = decodeBase64(payload.file);
      if (!bytes) return json(413, { error: 'Media is invalid or exceeds the 25 MB limit.' });
      if (!hasExpectedSignature(bytes, contentType)) return json(400, { error: 'Media content does not match its declared MIME type.' });
      const fingerprint = await operationFingerprint({
        action,
        exerciseId: exercise.id,
        mediaType,
        contentType,
        contentSha256: await sha256Hex(bytes),
        isPrimary: payload.isPrimary === true,
      });

      const existing = await services.getMedia(payload.idempotencyKey);
      if (existing) {
        if (existing.exercise_id !== exercise.id) return json(409, { error: 'Idempotency key is already in use.' });
        if (!matchesOperation(existing, actor, fingerprint)) return json(409, { error: 'Idempotency key does not match this operation.' });
        return json(200, { success: true, media: existing, replayed: true });
      }

      const key = `exercises/${exercise.id}/${services.randomUUID()}.${extension}`;
      await services.putObject(key, bytes, contentType);
      const row: MediaRow = {
        id: payload.idempotencyKey,
        exercise_id: exercise.id,
        media_type: mediaType,
        file_format: extension,
        r2_bucket: services.bucketName,
        r2_key: key,
        url: services.publicUrl(key),
        is_primary: payload.isPrimary === true,
        media_status: 'TO_CREATE',
        idempotency_actor_id: actor.id,
        idempotency_fingerprint: fingerprint,
      };
      try {
        const media = await services.insertMedia(row);
        return json(200, { success: true, media });
      } catch {
        const reconciled = await services.getMedia(row.id);
        if (reconciled?.exercise_id === exercise.id) {
          if (!matchesOperation(reconciled, actor, fingerprint)) {
            const cleanupPending = await cleanupObject(key, services);
            return json(409, {
              error: 'Idempotency key does not match this operation.',
              cleanupPending,
              ...(cleanupPending ? { cleanupKey: key } : {}),
            });
          }
          let cleanupPending = false;
          if (reconciled.r2_key !== key) {
            cleanupPending = await cleanupObject(key, services);
          }
          return json(200, {
            success: true,
            media: reconciled,
            replayed: true,
            cleanupPending,
            ...(cleanupPending ? { cleanupKey: key } : {}),
          });
        }
        const cleanupPending = await cleanupObject(key, services);
        return json(500, {
          error: 'Media finalization failed.',
          cleanupPending,
          ...(cleanupPending ? { cleanupKey: key } : {}),
        });
      }
    }

    if (action === 'save-external-media') {
      const exercise = await authorizedExercise(actor, payload.exerciseId, services);
      if (exercise instanceof Response) return exercise;
      const mediaType = payload.mediaType as MediaType;
      const url = typeof payload.url === 'string' ? payload.url.trim() : '';
      if (!isHttpsUrl(url)) return json(400, { error: 'A valid HTTPS media URL is required.' });
      const extension = formatForExternalUrl(mediaType, url);
      if (!extension) return json(400, { error: 'Media type and URL format do not match.' });
      if (payload.status !== undefined) return json(400, { error: 'Media status must be changed through the publication action.' });
      const fingerprint = await operationFingerprint({
        action,
        exerciseId: exercise.id,
        mediaType,
        fileFormat: extension,
        url,
        isPrimary: payload.isPrimary === true,
      });

      if (payload.mediaId) {
        const target = await ownedMedia(actor, exercise.id, payload.mediaId, services);
        if (target instanceof Response) return target;
        const media = await services.updateMedia(target.media.id, {
          media_type: mediaType,
          file_format: extension,
          r2_key: null,
          url,
          is_primary: payload.isPrimary === true,
          media_status: 'TO_CREATE',
        });
        return json(200, { success: true, media });
      }

      if (!isUuid(payload.idempotencyKey)) return json(400, { error: 'A valid idempotency key is required.' });
      const existing = await services.getMedia(payload.idempotencyKey);
      if (existing) {
        if (existing.exercise_id !== exercise.id) return json(409, { error: 'Idempotency key is already in use.' });
        if (!matchesOperation(existing, actor, fingerprint)) return json(409, { error: 'Idempotency key does not match this operation.' });
        return json(200, { success: true, media: existing, replayed: true });
      }
      const media = await services.insertMedia({
        id: payload.idempotencyKey,
        exercise_id: exercise.id,
        media_type: mediaType,
        file_format: extension,
        r2_bucket: services.bucketName,
        r2_key: null,
        url,
        is_primary: payload.isPrimary === true,
        media_status: 'TO_CREATE',
        idempotency_actor_id: actor.id,
        idempotency_fingerprint: fingerprint,
      });
      return json(200, { success: true, media });
    }

    if (action === 'set-exercise-media-status') {
      const target = await ownedMedia(actor, payload.exerciseId, payload.mediaId, services);
      if (target instanceof Response) return target;
      if (payload.status !== 'TO_CREATE' && payload.status !== 'READY') return json(400, { error: 'Unsupported media status.' });
      if (payload.status === 'READY' && !target.media.r2_key?.trim() && !isHttpsUrl(target.media.url)) {
        return json(400, { error: 'READY media requires a usable locator.' });
      }
      const media = await services.updateMedia(target.media.id, { media_status: payload.status });
      return json(200, { success: true, media });
    }

    if (action === 'delete-exercise-media') {
      const target = await ownedMedia(actor, payload.exerciseId, payload.mediaId, services);
      if (target instanceof Response) return target;
      await services.deleteMedia(target.media.id);
      let cleanupPending = false;
      if (target.media.r2_key) {
        cleanupPending = await cleanupObject(target.media.r2_key, services);
      }
      return json(200, {
        success: true,
        metadataRemoved: true,
        cleanupPending,
        ...(cleanupPending ? { cleanupKey: target.media.r2_key } : {}),
      });
    }

    // Preserve the existing private progress-photo/food-scan contract while
    // removing caller-controlled object paths and filenames.
    if (!action && (payload.folder === 'progress-photos' || payload.folder === 'food-scans')) {
      if (payload.filePath) return json(400, { error: 'Caller-controlled object paths are not allowed.' });
      const contentType = typeof payload.contentType === 'string' ? payload.contentType.toLowerCase() : '';
      const extension = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[contentType];
      if (!extension) return json(400, { error: 'Unsupported private image MIME type.' });
      const bytes = decodeBase64(payload.file);
      if (!bytes) return json(413, { error: 'Image is invalid or exceeds the 25 MB limit.' });
      if (!hasExpectedSignature(bytes, contentType)) return json(400, { error: 'Image content does not match its declared MIME type.' });
      const key = `${payload.folder}/${actor.id}/${services.randomUUID()}.${extension}`;
      await services.putObject(key, bytes, contentType);
      return json(200, { success: true, key, url: key });
    }

    return json(400, { error: 'Unsupported action.' });
  };
}
