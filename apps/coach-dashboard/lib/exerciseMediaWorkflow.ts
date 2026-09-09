import {
  ExerciseMediaRecord,
  ExerciseMediaType,
  R2UrlSigner,
  isPublishableExerciseMediaStatus,
  isValidExerciseMediaUrl,
} from './exerciseMedia';

// Phase C2B upload workflow: Select → Upload/Save → TO_CREATE → Preview →
// Approve → READY. The browser-side checks below exist for UX only; the C2A
// upload-to-r2 handler remains the authoritative validator.

export const MAX_UPLOAD_MEDIA_BYTES = 25 * 1024 * 1024;

// MIME values the C2A server accepts for exercise media, mapped to the
// selectable media_type values. Image MIME values are ambiguous between
// 'image' and 'thumbnail', so the UI must require an explicit choice instead
// of guessing.
export const UPLOAD_MIME_TO_MEDIA_TYPES: Record<string, ExerciseMediaType[]> = {
  'video/mp4': ['video'],
  'image/gif': ['gif'],
  'image/webp': ['image', 'thumbnail'],
  'image/jpeg': ['image', 'thumbnail'],
  'image/png': ['image', 'thumbnail'],
};

export const UPLOAD_ACCEPT_ATTRIBUTE = Object.keys(UPLOAD_MIME_TO_MEDIA_TYPES).join(',');

export function uploadMediaTypeOptions(mime: string): ExerciseMediaType[] | null {
  return UPLOAD_MIME_TO_MEDIA_TYPES[mime] ?? null;
}

export function defaultUploadMediaType(mime: string): ExerciseMediaType | null {
  const options = uploadMediaTypeOptions(mime);
  if (!options || options.length !== 1) return null;
  return options[0];
}

export interface UploadFileIssue {
  reason: 'unsupported-type' | 'too-large' | 'empty-file';
  message: string;
}

export function validateUploadFile(file: { type: string; size: number }): UploadFileIssue | null {
  if (!UPLOAD_MIME_TO_MEDIA_TYPES[file.type]) {
    return {
      reason: 'unsupported-type',
      message: 'Unsupported file type. Use MP4, GIF, WebP, JPEG, or PNG.',
    };
  }
  if (file.size <= 0) {
    return { reason: 'empty-file', message: 'The selected file is empty.' };
  }
  if (file.size > MAX_UPLOAD_MEDIA_BYTES) {
    return { reason: 'too-large', message: 'The file is too large. Maximum size is 25 MB.' };
  }
  return null;
}

// One idempotency key per intended upload operation. Retrying the same
// operation must reuse the same key; a deliberately new upload (new file or
// media type choice) must start a new operation with a fresh key.
export function createUploadIdempotencyKey(randomUUID: () => string = () => crypto.randomUUID()): string {
  return randomUUID();
}

export interface UploadExerciseMediaArgs {
  exerciseId: string;
  mediaType: ExerciseMediaType;
  contentType: string;
  fileBase64: string;
  isPrimary: boolean;
  idempotencyKey: string;
}

export function buildUploadExerciseMediaBody(args: UploadExerciseMediaArgs): Record<string, unknown> {
  return {
    action: 'upload-exercise-media',
    exerciseId: args.exerciseId,
    mediaType: args.mediaType,
    contentType: args.contentType,
    file: args.fileBase64,
    isPrimary: args.isPrimary,
    idempotencyKey: args.idempotencyKey,
  };
}

export type ExerciseMediaStatusAction = 'TO_CREATE' | 'READY';

export function buildSetExerciseMediaStatusBody(
  exerciseId: string,
  mediaId: string,
  status: ExerciseMediaStatusAction,
): Record<string, unknown> {
  return { action: 'set-exercise-media-status', exerciseId, mediaId, status };
}

export interface InvokeLikeError {
  message?: string;
  status?: number;
}

export interface InvokeLikeData {
  success?: boolean;
  error?: string;
  cleanupPending?: boolean;
  media?: { id?: string } & Partial<ExerciseMediaRecord>;
}

export type MediaActionOutcome =
  | { kind: 'success'; message: string; media?: { id?: string } & Partial<ExerciseMediaRecord> }
  | { kind: 'cleanup-pending'; message: string; media?: { id?: string } & Partial<ExerciseMediaRecord> }
  | { kind: 'error'; message: string };

const STATUS_MESSAGES: Record<number, string> = {
  400: 'The media request was rejected. Check the media type, format, and file.',
  401: 'Your session expired. Sign in again to manage media.',
  403: 'You do not have permission to manage media for this exercise.',
  409: 'This operation conflicts with an earlier request using the same idempotency key.',
  413: 'The file is too large. Maximum size is 25 MB.',
  500: 'The server could not complete the media request.',
};

export const MEDIA_CLEANUP_PENDING_MESSAGE = 'Upload saved, but a previous stored file could not be cleaned up yet. Cleanup is pending.';

export function describeMediaInvokeResult(
  data: InvokeLikeData | null | undefined,
  error: InvokeLikeError | null | undefined,
  successMessage: string,
  fallbackMessage: string,
): MediaActionOutcome {
  if (error) {
    const status = typeof error.status === 'number' ? error.status : null;
    return { kind: 'error', message: (status && STATUS_MESSAGES[status]) || error.message || fallbackMessage };
  }
  if (!data?.success) {
    const raw = typeof data?.error === 'string' ? data.error : null;
    return { kind: 'error', message: raw || fallbackMessage };
  }
  if (data.cleanupPending) {
    return { kind: 'cleanup-pending', message: MEDIA_CLEANUP_PENDING_MESSAGE, media: data.media };
  }
  return { kind: 'success', message: successMessage, media: data.media };
}

// Preview resolution for the review workflow. Unlike the C1
// resolveExerciseMediaUrl — which stays READY-gated for the quality contract —
// this resolves TO_CREATE assets so an editor can review them before approval.
export async function resolvePreviewMediaUrl(
  row: Pick<ExerciseMediaRecord, 'r2_key' | 'url'>,
  signR2?: R2UrlSigner,
): Promise<string | null> {
  const r2Key = row.r2_key?.trim();
  if (r2Key && signR2) {
    try {
      const signed = await signR2(r2Key);
      if (signed && signed.trim().length > 0) return signed.trim();
    } catch {
      // Fall through to the external URL fallback.
    }
  }
  const externalUrl = row.url?.trim();
  if (externalUrl && isValidExerciseMediaUrl(externalUrl)) return externalUrl;
  return null;
}

// Approval requires an explicit human action on a TO_CREATE asset whose
// preview actually resolved. A failed preview must never be publishable from
// the UI.
export function canApprovePreviewMedia(
  row: Pick<ExerciseMediaRecord, 'media_status' | 'r2_key' | 'url'>,
  resolvedUrl: string | null | undefined,
  previewFailed: boolean,
): boolean {
  if (isPublishableExerciseMediaStatus(row.media_status)) return false;
  if (previewFailed) return false;
  return Boolean(resolvedUrl && resolvedUrl.trim().length > 0);
}
