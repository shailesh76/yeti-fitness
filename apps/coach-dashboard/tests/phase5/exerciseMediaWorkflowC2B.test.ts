import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  isUsableExerciseMedia,
  isValidExerciseMediaUrl,
  resolveExerciseMediaUrl,
  classifyExerciseMedia,
  type ExerciseMediaRecord,
} from '../../lib/exerciseMedia';
import {
  MAX_UPLOAD_MEDIA_BYTES,
  UPLOAD_ACCEPT_ATTRIBUTE,
  buildSetExerciseMediaStatusBody,
  buildUploadExerciseMediaBody,
  canApprovePreviewMedia,
  createUploadIdempotencyKey,
  defaultUploadMediaType,
  describeMediaInvokeResult,
  resolvePreviewMediaUrl,
  uploadMediaTypeOptions,
  validateUploadFile,
} from '../../lib/exerciseMediaWorkflow';

const managerSource = readFileSync('components/ExerciseMediaManager.tsx', 'utf8');
const pageSource = readFileSync('app/exercises/page.tsx', 'utf8');

function media(overrides: Partial<ExerciseMediaRecord>): ExerciseMediaRecord {
  return {
    id: 'm1',
    exercise_id: 'e1',
    media_type: 'video',
    file_format: 'mp4',
    r2_key: null,
    url: null,
    thumbnail_url: null,
    is_primary: false,
    media_status: 'TO_CREATE',
    media_notes: null,
    created_at: null,
    ...overrides,
  };
}

describe('C2B upload client validation (UX only; server stays authoritative)', () => {
  it('accepts each supported MIME type below the limit', () => {
    for (const type of ['video/mp4', 'image/gif', 'image/webp', 'image/jpeg', 'image/png']) {
      expect(validateUploadFile({ type, size: 1024 })).toBeNull();
    }
  });

  it('rejects unsupported MIME types', () => {
    expect(validateUploadFile({ type: 'text/html', size: 10 })?.reason).toBe('unsupported-type');
    expect(validateUploadFile({ type: 'video/webm', size: 10 })?.reason).toBe('unsupported-type');
    expect(validateUploadFile({ type: '', size: 10 })?.reason).toBe('unsupported-type');
  });

  it('rejects files above 25 MB and accepts exactly 25 MB', () => {
    expect(validateUploadFile({ type: 'video/mp4', size: MAX_UPLOAD_MEDIA_BYTES + 1 })?.reason).toBe('too-large');
    expect(validateUploadFile({ type: 'video/mp4', size: MAX_UPLOAD_MEDIA_BYTES })).toBeNull();
  });

  it('rejects empty files', () => {
    expect(validateUploadFile({ type: 'image/png', size: 0 })?.reason).toBe('empty-file');
  });

  it('offers only the five approved MIME values to the file picker', () => {
    expect(UPLOAD_ACCEPT_ATTRIBUTE.split(',').sort()).toEqual(
      ['image/gif', 'image/jpeg', 'image/png', 'image/webp', 'video/mp4'].sort(),
    );
  });
});

describe('C2B media type selection', () => {
  it('maps unambiguous MIME values to a single media type', () => {
    expect(uploadMediaTypeOptions('video/mp4')).toEqual(['video']);
    expect(uploadMediaTypeOptions('image/gif')).toEqual(['gif']);
    expect(defaultUploadMediaType('video/mp4')).toBe('video');
    expect(defaultUploadMediaType('image/gif')).toBe('gif');
  });

  it('requires an explicit choice for ambiguous image MIME values', () => {
    expect(uploadMediaTypeOptions('image/png')).toEqual(['image', 'thumbnail']);
    expect(uploadMediaTypeOptions('image/webp')).toEqual(['image', 'thumbnail']);
    expect(defaultUploadMediaType('image/png')).toBeNull();
    expect(defaultUploadMediaType('image/jpeg')).toBeNull();
  });

  it('returns null options for unsupported MIME values', () => {
    expect(uploadMediaTypeOptions('text/html')).toBeNull();
  });
});

describe('C2B idempotency keys', () => {
  it('creates a fresh key per intended upload operation', () => {
    const first = createUploadIdempotencyKey(() => 'key-a');
    const second = createUploadIdempotencyKey(() => 'key-b');
    expect(first).toBe('key-a');
    expect(second).toBe('key-b');
    expect(new Set([first, second]).size).toBe(2);
  });
});

describe('C2B Edge Function request bodies', () => {
  it('builds the upload-exercise-media body with the idempotency key and no status field', () => {
    const body = buildUploadExerciseMediaBody({
      exerciseId: 'e1',
      mediaType: 'gif',
      contentType: 'image/gif',
      fileBase64: 'R0lGODlh',
      isPrimary: false,
      idempotencyKey: 'k1',
    });
    expect(body).toEqual({
      action: 'upload-exercise-media',
      exerciseId: 'e1',
      mediaType: 'gif',
      contentType: 'image/gif',
      file: 'R0lGODlh',
      isPrimary: false,
      idempotencyKey: 'k1',
    });
    expect('status' in body).toBe(false);
  });

  it('builds set-exercise-media-status bodies limited to TO_CREATE and READY', () => {
    expect(buildSetExerciseMediaStatusBody('e1', 'm1', 'READY')).toEqual({
      action: 'set-exercise-media-status',
      exerciseId: 'e1',
      mediaId: 'm1',
      status: 'READY',
    });
    expect(buildSetExerciseMediaStatusBody('e1', 'm1', 'TO_CREATE')).toEqual({
      action: 'set-exercise-media-status',
      exerciseId: 'e1',
      mediaId: 'm1',
      status: 'TO_CREATE',
    });
  });
});

describe('C2B outcome and error mapping', () => {
  it('classifies a clean success', () => {
    const outcome = describeMediaInvokeResult({ success: true, media: { id: 'm9' } }, null, 'Saved.', 'Failed.');
    expect(outcome.kind).toBe('success');
    if (outcome.kind === 'success') {
      expect(outcome.message).toBe('Saved.');
      expect(outcome.media?.id).toBe('m9');
    }
  });

  it('never claims success when cleanup is pending', () => {
    const outcome = describeMediaInvokeResult({ success: true, cleanupPending: true, media: { id: 'm9' } }, null, 'Saved.', 'Failed.');
    expect(outcome.kind).toBe('cleanup-pending');
    expect(outcome.message).toContain('Cleanup is pending');
  });

  it('surfaces server error strings', () => {
    const outcome = describeMediaInvokeResult({ success: false, error: 'Idempotency key does not match this operation.' }, null, 'Saved.', 'Failed.');
    expect(outcome.kind).toBe('error');
    expect(outcome.message).toBe('Idempotency key does not match this operation.');
  });

  it('maps HTTP statuses to actionable messages', () => {
    expect(describeMediaInvokeResult(null, { status: 400 }, '', 'x').message).toContain('rejected');
    expect(describeMediaInvokeResult(null, { status: 401 }, '', 'x').message).toContain('session');
    expect(describeMediaInvokeResult(null, { status: 403 }, '', 'x').message).toContain('permission');
    expect(describeMediaInvokeResult(null, { status: 409 }, '', 'x').message).toContain('idempotency');
    expect(describeMediaInvokeResult(null, { status: 413 }, '', 'x').message).toContain('25 MB');
    expect(describeMediaInvokeResult(null, { status: 500 }, '', 'x').message).toContain('server');
  });

  it('falls back through the error message when no status is available', () => {
    expect(describeMediaInvokeResult(null, { message: 'Network failure.' }, '', 'Fallback.').message).toBe('Network failure.');
    expect(describeMediaInvokeResult(null, {}, '', 'Fallback.').message).toBe('Fallback.');
    expect(describeMediaInvokeResult({ success: false }, null, '', 'Fallback.').message).toBe('Fallback.');
  });
});

describe('C2B preview resolution for review', () => {
  it('resolves TO_CREATE R2 assets through the signer', async () => {
    const row = media({ r2_key: 'exercises/e1/a.mp4', media_status: 'TO_CREATE' });
    await expect(resolvePreviewMediaUrl(row, async () => 'https://signed.example.com/a.mp4')).resolves.toBe('https://signed.example.com/a.mp4');
  });

  it('resolves TO_CREATE external HTTPS URLs directly', async () => {
    const row = media({ url: 'https://cdn.example.com/a.gif', media_status: 'TO_CREATE' });
    await expect(resolvePreviewMediaUrl(row)).resolves.toBe('https://cdn.example.com/a.gif');
  });

  it('falls back to the external URL when signing fails', async () => {
    const row = media({ r2_key: 'exercises/e1/a.mp4', url: 'https://cdn.example.com/a.mp4', media_status: 'TO_CREATE' });
    await expect(resolvePreviewMediaUrl(row, async () => { throw new Error('signing down'); })).resolves.toBe('https://cdn.example.com/a.mp4');
  });

  it('returns null when no usable locator exists', async () => {
    await expect(resolvePreviewMediaUrl(media({}), async () => 'https://signed.example.com/x')).resolves.toBeNull();
    await expect(resolvePreviewMediaUrl(media({ url: 'http://insecure.example.com/a.gif' }))).resolves.toBeNull();
  });

  it('keeps the C1 READY gate untouched for quality resolution', async () => {
    await expect(resolveExerciseMediaUrl(media({ r2_key: 'exercises/e1/a.mp4', media_status: 'TO_CREATE' }), async () => 'https://signed.example.com/a.mp4')).resolves.toBeNull();
    await expect(resolveExerciseMediaUrl(media({ r2_key: 'exercises/e1/a.mp4', media_status: 'READY' }), async () => 'https://signed.example.com/a.mp4')).resolves.toBe('https://signed.example.com/a.mp4');
  });
});

describe('C2B approval gating', () => {
  it('allows approval only for previewable TO_CREATE assets', () => {
    expect(canApprovePreviewMedia(media({ media_status: 'TO_CREATE', url: 'https://cdn.example.com/a.gif' }), 'https://cdn.example.com/a.gif', false)).toBe(true);
  });

  it('refuses approval for READY assets, missing previews, and failed previews', () => {
    expect(canApprovePreviewMedia(media({ media_status: 'READY', url: 'https://cdn.example.com/a.gif' }), 'https://cdn.example.com/a.gif', false)).toBe(false);
    expect(canApprovePreviewMedia(media({ media_status: 'TO_CREATE', url: 'https://cdn.example.com/a.gif' }), null, false)).toBe(false);
    expect(canApprovePreviewMedia(media({ media_status: 'TO_CREATE', url: 'https://cdn.example.com/a.gif' }), 'https://cdn.example.com/a.gif', true)).toBe(false);
  });
});

describe('C2B external URL workflow gates', () => {
  it('accepts only HTTPS URLs without spaces', () => {
    expect(isValidExerciseMediaUrl('https://cdn.example.com/a.gif')).toBe(true);
    expect(isValidExerciseMediaUrl('http://cdn.example.com/a.gif')).toBe(false);
    expect(isValidExerciseMediaUrl('https://cdn.example.com/a.gif bad')).toBe(false);
    expect(isValidExerciseMediaUrl('not-a-url')).toBe(false);
  });
});

describe('C1 quality contract regression', () => {
  it('still treats TO_CREATE media as unusable even with an R2 key', () => {
    expect(isUsableExerciseMedia(media({ r2_key: 'exercises/e1/a.mp4', media_status: 'TO_CREATE' }))).toBe(false);
    expect(isUsableExerciseMedia(media({ r2_key: 'exercises/e1/a.mp4', media_status: 'READY' }))).toBe(true);
    expect(isUsableExerciseMedia(media({ url: 'http://insecure.example.com/a.gif', media_status: 'READY' }))).toBe(false);
  });

  it('still classifies preview-only uploads as missing media', () => {
    const rows = [
      media({ media_type: 'gif', url: 'https://cdn.example.com/a.gif', media_status: 'TO_CREATE' }),
      media({ media_type: 'video', url: 'https://cdn.example.com/a.mp4', media_status: 'TO_CREATE' }),
    ];
    const completeness = classifyExerciseMedia(rows);
    expect(completeness.complete).toBe(false);
    expect(completeness.missingGif).toBe(true);
    expect(completeness.missingVideo).toBe(true);
    expect(completeness.missingThumbnail).toBe(true);
  });
});

// The dashboard suites verify component wiring through source inspection;
// this repo has no DOM-rendering test harness. Server behavior is covered
// behaviorally by tests/exercise-media-c2a.test.ts against the real handler.
describe('C2B component wiring (source inspection)', () => {
  it('routes every mutation through the upload-to-r2 Edge Function', () => {
    expect(managerSource).toContain("functions.invoke('upload-to-r2'");
    expect(managerSource).toContain('buildUploadExerciseMediaBody(');
    expect(managerSource).toContain('buildSetExerciseMediaStatusBody(');
    expect(managerSource).toContain("action: 'save-external-media'");
    expect(managerSource).toContain("action: 'delete-exercise-media'");
    expect(managerSource).not.toContain("supabase.from('exercise_media').insert");
    expect(managerSource).not.toContain("supabase.from('exercise_media').update");
    expect(managerSource).not.toContain("supabase.from('exercise_media').delete");
  });

  it('never publishes from the upload or save path', () => {
    expect(managerSource).not.toContain('<option value="READY">');
    expect(managerSource).not.toContain('<option value="REVIEW">');
    expect(managerSource).toContain("status: 'TO_CREATE'");
    expect(managerSource).toContain('Uploaded — awaiting approval.');
    expect(managerSource).toContain('Media saved — awaiting approval.');
    const submitUpload = managerSource.slice(managerSource.indexOf('async function submitUpload'), managerSource.indexOf('function startEdit'));
    expect(submitUpload).not.toContain('set-exercise-media-status');
    expect(submitUpload).not.toContain("'READY'");
  });

  it('renders explicit approval and READY states', () => {
    expect(managerSource).toContain('Approve &amp; Publish');
    expect(managerSource).toContain('Published / READY');
    expect(managerSource).toContain('Awaiting approval');
    expect(managerSource).toContain("setMediaStatus(row, 'READY')");
  });

  it('preserves the delete cleanup warning and pending signaling', () => {
    expect(managerSource).toContain('Media record removed, but stored file cleanup is still pending.');
    expect(managerSource).toContain('describeMediaInvokeResult(');
    expect(managerSource).toContain('cleanupPending');
  });

  it('prevents duplicate submissions while an operation runs', () => {
    expect(managerSource).toContain('disabled={uploading');
    expect(managerSource).toContain('Uploading…');
    expect(managerSource).toContain('disabled={saving}');
    expect(managerSource).toContain('disabled={removingId === item.id}');
    expect(managerSource).toContain('disabled={transitioningId === item.id}');
  });

  it('uses the shared accept list and client validation for UX only', () => {
    expect(managerSource).toContain('accept={UPLOAD_ACCEPT_ATTRIBUTE}');
    expect(managerSource).toContain('validateUploadFile(');
  });

  it('gates mutation controls on manager authorization', () => {
    expect(managerSource).toContain('canManage && approvable');
    expect(managerSource).toContain('{canManage && (');
    expect(managerSource).toContain('manageBlockedReason');
  });

  it('restricts media management to admins and owning coaches per exercise', () => {
    expect(pageSource).toContain('editorIdentity?.role === \'admin\'');
    expect(pageSource).toContain('selectedExercise.source_type === \'custom\'');
    expect(pageSource).toContain('selectedExercise.created_by_coach_id === editorIdentity.userId');
    expect(pageSource).toContain('manageBlockedReason=');
    expect(pageSource).toContain('Canonical and legacy exercise media can only be managed by an admin.');
    expect(pageSource).toContain('its media can only be managed by an admin');
  });
});
