"use client";

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, ExternalLink, Film, Image as ImageIcon, Loader2, Pencil, Plus, Trash2, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  ExerciseMediaRecord,
  ExerciseMediaType,
  hasDuplicateExerciseMediaUrl,
  isUsableExerciseMedia,
  isValidExerciseMediaUrl,
  orderExerciseMedia,
  previewErrorKey,
} from '@/lib/exerciseMedia';
import {
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
} from '@/lib/exerciseMediaWorkflow';

type EditableMediaType = Exclude<ExerciseMediaType, 'thumbnail'>;

interface ExerciseMediaManagerProps {
  exerciseId: string;
  exerciseName: string;
  media: ExerciseMediaRecord[];
  loading: boolean;
  canManage: boolean;
  manageBlockedReason?: string | null;
  onChanged: () => Promise<void>;
}

interface MediaFormState {
  mode: 'add' | 'edit';
  type: ExerciseMediaType;
  url: string;
  // Media always enters the library as TO_CREATE; approval happens through
  // the explicit preview → Approve & Publish action. Kept as a literal field
  // so the form state documents the lifecycle it participates in.
  status: 'TO_CREATE';
  primary: boolean;
  row: ExerciseMediaRecord | null;
}

interface UploadFormState {
  file: File | null;
  mediaType: ExerciseMediaType | '';
  primary: boolean;
  idempotencyKey: string;
  fileIssue: string | null;
}

type BannerKind = 'error' | 'success';

const EMPTY_URLS: Record<string, string> = {};

function typeLabel(type: ExerciseMediaType) {
  if (type === 'gif') return 'GIF';
  if (type === 'video') return 'Video';
  if (type === 'thumbnail') return 'Thumbnail';
  return 'Image';
}

function mediaStatusLabel(media: ExerciseMediaRecord[]) {
  if (media.length === 0) return 'Missing media';
  const publishable = media.filter(isUsableExerciseMedia);
  if (publishable.length === 0) return 'Planned / unavailable';
  const types = new Set(publishable.map((item) => item.media_type));
  if (types.has('gif') && types.has('video') && (types.has('image') || types.has('thumbnail'))) return 'Complete';
  return `${publishable.length} published asset${publishable.length === 1 ? '' : 's'}`;
}

function invokeErrorShape(error: unknown): { message?: string; status?: number } | null {
  if (!error) return null;
  const shaped = error as { message?: string; context?: { status?: number } };
  return { message: shaped.message, status: shaped.context?.status };
}

function encodeFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result.split('base64,')[1] ?? '' : '';
      if (result) resolve(result);
      else reject(new Error('The selected file could not be read.'));
    };
    reader.onerror = () => reject(new Error('The selected file could not be read.'));
    reader.readAsDataURL(file);
  });
}

export function ExerciseMediaManager({ exerciseId, exerciseName, media, loading, canManage, manageBlockedReason, onChanged }: ExerciseMediaManagerProps) {
  const orderedMedia = useMemo(() => orderExerciseMedia(media), [media]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>(EMPTY_URLS);
  const [previewErrors, setPreviewErrors] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<MediaFormState | null>(null);
  const [uploadForm, setUploadForm] = useState<UploadFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [transitioningId, setTransitioningId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: BannerKind; text: string } | null>(null);

  useEffect(() => {
    setSelectedId(null);
    setForm(null);
    setUploadForm(null);
    setMessage(null);
  }, [exerciseId]);

  useEffect(() => {
    let cancelled = false;
    async function resolveUrls() {
      const next: Record<string, string> = {};
      await Promise.all(orderedMedia.map(async (item) => {
        // Preview resolution includes TO_CREATE assets so they can be
        // reviewed before approval; publishability still comes from the
        // READY-gated C1 helpers.
        const resolved = await resolvePreviewMediaUrl(item, async (key) => {
          const { data, error } = await supabase.functions.invoke('get-r2-signed-url', {
            body: { key, expiresIn: 3600 },
          });
          if (!error && data?.success && typeof data.url === 'string') {
            return data.url;
          }
          return null;
        });
        if (resolved) next[item.id] = resolved;
      }));
      if (!cancelled) setResolvedUrls(next);
    }
    resolveUrls();
    return () => { cancelled = true; };
  }, [orderedMedia]);

  const selected = orderedMedia.find((item) => item.id === selectedId) ?? orderedMedia[0] ?? null;
  const selectedIsPublishable = selected ? isUsableExerciseMedia(selected) : false;
  const selectedUrl = selected ? resolvedUrls[selected.id] : null;
  const selectedPreviewErrorKey = selected ? previewErrorKey(selected, selectedUrl) : null;

  function startAdd(type: EditableMediaType) {
    setMessage(null);
    setUploadForm(null);
    setForm({ mode: 'add', type, url: '', status: 'TO_CREATE', primary: media.length === 0, row: null });
  }

  function startUpload() {
    setMessage(null);
    setForm(null);
    setUploadForm({ file: null, mediaType: '', primary: media.length === 0, idempotencyKey: createUploadIdempotencyKey(), fileIssue: null });
  }

  function pickUploadFile(file: File | null) {
    setUploadForm((current) => {
      if (!current) return current;
      if (!file) return { ...current, file: null, mediaType: '', fileIssue: null };
      const issue = validateUploadFile(file);
      // A different file is a new intended operation, so it starts a new
      // idempotency key; retrying the same file reuses the current one.
      return {
        ...current,
        file,
        fileIssue: issue?.message ?? null,
        mediaType: issue ? '' : defaultUploadMediaType(file.type) ?? '',
        idempotencyKey: createUploadIdempotencyKey(),
      };
    });
  }

  function pickUploadMediaType(type: ExerciseMediaType | '') {
    setUploadForm((current) => {
      if (!current) return current;
      // Changing the media type changes the operation fingerprint, so the
      // retry must not reuse the previous key.
      return { ...current, mediaType: type, idempotencyKey: createUploadIdempotencyKey() };
    });
  }

  async function submitUpload() {
    if (!uploadForm?.file || !uploadForm.mediaType || uploadForm.fileIssue) return;
    const { file, mediaType, primary, idempotencyKey } = uploadForm;
    setUploading(true);
    setMessage(null);
    try {
      const fileBase64 = await encodeFileAsBase64(file);
      const { data, error } = await supabase.functions.invoke('upload-to-r2', {
        body: buildUploadExerciseMediaBody({
          exerciseId,
          mediaType,
          contentType: file.type,
          fileBase64,
          isPrimary: primary,
          idempotencyKey,
        }),
      });
      const outcome = describeMediaInvokeResult(data, invokeErrorShape(error), 'Uploaded — awaiting approval.', 'Could not upload media.');
      if (outcome.kind === 'error') {
        setMessage({ kind: 'error', text: outcome.message });
        return;
      }
      await onChanged();
      if (typeof outcome.media?.id === 'string') setSelectedId(outcome.media.id);
      setUploadForm(null);
      setMessage(outcome.kind === 'cleanup-pending'
        ? { kind: 'error', text: `${outcome.message} The uploaded media is saved and awaiting approval.` }
        : { kind: 'success', text: outcome.message });
    } catch (encodeError) {
      setMessage({ kind: 'error', text: encodeError instanceof Error ? encodeError.message : 'Could not read the selected file.' });
    } finally {
      setUploading(false);
    }
  }

  function startEdit(row: ExerciseMediaRecord) {
    setMessage(null);
    setUploadForm(null);
    setForm({
      mode: 'edit',
      type: row.media_type,
      url: row.url ?? '',
      status: 'TO_CREATE',
      primary: row.is_primary,
      row,
    });
  }

  async function saveMedia() {
    if (!form || !isValidExerciseMediaUrl(form.url.trim(), form.type)) {
      setMessage({ kind: 'error', text: 'Enter a complete HTTPS URL without spaces.' });
      return;
    }

    if (form.row && isUsableExerciseMedia(form.row)
      && !window.confirm('Saving a replacement will mark this published asset as awaiting approval again. Continue?')) {
      return;
    }

    setSaving(true);
    setMessage(null);
    const url = form.url.trim();
    const duplicate = hasDuplicateExerciseMediaUrl(media, url, form.row?.id);
    if (duplicate) {
      setMessage({ kind: 'error', text: 'This exercise already uses that media URL.' });
      setSaving(false);
      return;
    }
    const { data, error } = await supabase.functions.invoke('upload-to-r2', {
      body: {
        action: 'save-external-media',
        exerciseId,
        mediaId: form.row?.id,
        idempotencyKey: form.mode === 'add' ? createUploadIdempotencyKey() : undefined,
        mediaType: form.type,
        url,
        isPrimary: form.primary,
      },
    });

    const outcome = describeMediaInvokeResult(data, invokeErrorShape(error), 'Media saved — awaiting approval.', 'Could not save media.');
    if (outcome.kind === 'error') {
      setMessage({ kind: 'error', text: outcome.message });
      setSaving(false);
      return;
    }

    await onChanged();
    if (typeof outcome.media?.id === 'string') setSelectedId(outcome.media.id);
    setForm(null);
    setSaving(false);
    setMessage({ kind: 'success', text: outcome.message });
  }

  async function setMediaStatus(row: ExerciseMediaRecord, status: 'TO_CREATE' | 'READY') {
    setTransitioningId(row.id);
    setMessage(null);
    const { data, error } = await supabase.functions.invoke('upload-to-r2', {
      body: buildSetExerciseMediaStatusBody(exerciseId, row.id, status),
    });
    const outcome = describeMediaInvokeResult(
      data,
      invokeErrorShape(error),
      status === 'READY' ? 'Media approved and published.' : 'Media unpublished for review.',
      'Could not update the media status.',
    );
    await onChanged();
    setTransitioningId(null);
    if (outcome.kind === 'error' || outcome.kind === 'cleanup-pending') {
      setMessage({ kind: 'error', text: outcome.message });
      return;
    }
    setMessage({ kind: 'success', text: outcome.message });
  }

  function approveMedia(row: ExerciseMediaRecord) {
    void setMediaStatus(row, 'READY');
  }

  function unpublishMedia(row: ExerciseMediaRecord) {
    if (!window.confirm('Unpublish this media for re-review? It will no longer count toward exercise quality.')) return;
    void setMediaStatus(row, 'TO_CREATE');
  }

  async function removeMedia(row: ExerciseMediaRecord) {
    const description = row.r2_key ? 'stored media file' : `${typeLabel(row.media_type).toLowerCase()} URL`;
    if (!window.confirm(`Remove this ${description} from ${exerciseName}?`)) return;
    setRemovingId(row.id);
    setMessage(null);
    const { data, error } = await supabase.functions.invoke('upload-to-r2', {
      body: { action: 'delete-exercise-media', exerciseId, mediaId: row.id },
    });
    if (error || !data?.success) {
      const outcome = describeMediaInvokeResult(data, invokeErrorShape(error), '', 'Could not remove media.');
      setMessage({ kind: 'error', text: outcome.kind === 'error' ? outcome.message : 'Could not remove media.' });
    } else if (data.cleanupPending) {
      await onChanged();
      setMessage({ kind: 'error', text: 'Media record removed, but stored file cleanup is still pending.' });
    } else {
      await onChanged();
      setMessage({ kind: 'success', text: 'Media removed.' });
    }
    setRemovingId(null);
  }

  const uploadTypeOptions = uploadForm?.file ? uploadMediaTypeOptions(uploadForm.file.type) : null;

  return (
    <section className="space-y-3" aria-label="Exercise media">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase text-gray-500">Media</p>
          <p className="text-xs font-bold text-white">{mediaStatusLabel(orderedMedia)}</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={startUpload} className="rounded-md border border-white/10 p-1.5 text-gray-300 hover:bg-white/5" title="Upload media file"><Upload className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => startAdd('gif')} className="rounded-md border border-white/10 p-1.5 text-gray-300 hover:bg-white/5" title="Add GIF URL"><Plus className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => startAdd('video')} className="rounded-md border border-white/10 p-1.5 text-gray-300 hover:bg-white/5" title="Add video URL"><Film className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => startAdd('image')} className="rounded-md border border-white/10 p-1.5 text-gray-300 hover:bg-white/5" title="Add image URL"><ImageIcon className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>

      {!canManage && manageBlockedReason && (
        <p className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-[10px] text-gray-400">{manageBlockedReason}</p>
      )}

      <div className="relative flex h-52 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/30">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        ) : selected && selectedUrl && selectedPreviewErrorKey && !previewErrors.has(selectedPreviewErrorKey) ? (
          selected.media_type === 'video' ? (
            <video key={selectedUrl} src={selectedUrl} poster={selected.thumbnail_url ?? undefined} controls preload="metadata" className="h-full w-full object-contain" onError={() => setPreviewErrors((current) => new Set(current).add(selectedPreviewErrorKey))} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedUrl} alt={`${exerciseName} ${typeLabel(selected.media_type)} preview`} className="h-full w-full object-contain" onError={() => setPreviewErrors((current) => new Set(current).add(selectedPreviewErrorKey))} />
          )
        ) : (
          <div className="px-6 text-center">
            <ImageIcon className="mx-auto mb-2 h-8 w-8 text-gray-600" />
            <p className="text-xs font-bold text-gray-300">{selected ? selectedIsPublishable ? 'Media unavailable' : 'Preview unavailable' : 'No media available'}</p>
            <p className="mt-1 text-[10px] text-gray-500">{selected ? selectedIsPublishable ? 'The published media URL could not be loaded.' : 'This unpublished asset could not be previewed. It stays awaiting approval.' : 'Upload a file or add an HTTPS GIF, video, or image URL.'}</p>
            {selected?.url && (
              <a href={selected.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-blue-300 hover:text-blue-200">Open media link <ExternalLink className="h-3 w-3" /></a>
            )}
          </div>
        )}
        {selected && (
          <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[9px] font-bold text-white">
            {typeLabel(selected.media_type)} · {selectedIsPublishable ? `Published / READY · ${selected.r2_key ? 'R2' : 'URL'}` : `Awaiting approval · ${selected.media_status ?? 'TO_CREATE'}`}
          </span>
        )}
      </div>

      {orderedMedia.length > 0 && (
        <div className="space-y-1.5">
          {orderedMedia.map((item) => {
            const itemUrl = resolvedUrls[item.id];
            const itemPreviewFailed = previewErrors.has(previewErrorKey(item, itemUrl));
            const itemIsPublishable = isUsableExerciseMedia(item);
            const approvable = canApprovePreviewMedia(item, itemUrl, itemPreviewFailed);
            return (
              <div key={item.id} className={`flex items-center gap-2 rounded-md border px-2.5 py-2 ${selected?.id === item.id ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/5 bg-white/[0.02]'}`}>
                <button type="button" onClick={() => setSelectedId(item.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[11px] font-bold text-white">{typeLabel(item.media_type)}{item.is_primary ? ' · Primary' : ''}</span>
                  <span className="block truncate text-[9px] text-gray-500">{item.r2_key ?? item.url ?? 'Missing locator'}</span>
                </button>
                <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${itemIsPublishable ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                  {itemIsPublishable ? 'Published / READY' : 'Awaiting approval'}
                </span>
                {itemUrl && <a href={itemUrl} target="_blank" rel="noreferrer" className="p-1 text-gray-400 hover:text-white" title="Open media"><ExternalLink className="h-3.5 w-3.5" /></a>}
                {canManage && approvable && (
                  <button type="button" disabled={transitioningId === item.id} onClick={() => approveMedia(item)} className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[9px] font-bold text-white hover:bg-emerald-500 disabled:opacity-40" title="Approve & Publish">{transitioningId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Approve &amp; Publish</button>
                )}
                {canManage && itemIsPublishable && (
                  <button type="button" disabled={transitioningId === item.id} onClick={() => unpublishMedia(item)} className="p-1 text-gray-400 hover:text-amber-300 disabled:opacity-40" title="Unpublish for review"><AlertCircle className="h-3.5 w-3.5" /></button>
                )}
                {canManage && <button type="button" onClick={() => startEdit(item)} className="p-1 text-gray-400 hover:text-blue-300" title={item.r2_key ? 'Replace R2 media with URL' : 'Edit URL'}><Pencil className="h-3.5 w-3.5" /></button>}
                {canManage && <button type="button" disabled={removingId === item.id} onClick={() => removeMedia(item)} className="p-1 text-gray-400 hover:text-rose-400 disabled:opacity-40" title="Remove media"><Trash2 className="h-3.5 w-3.5" /></button>}
              </div>
            );
          })}
        </div>
      )}

      {uploadForm && canManage && (
        <div className="space-y-3 rounded-md border border-blue-500/30 bg-blue-500/[0.06] p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-white">Upload media file</p>
            <button type="button" onClick={() => setUploadForm(null)} className="p-1 text-gray-400 hover:text-white" title="Close"><X className="h-4 w-4" /></button>
          </div>
          <input
            type="file"
            accept={UPLOAD_ACCEPT_ATTRIBUTE}
            disabled={uploading}
            onChange={(event) => pickUploadFile(event.target.files?.[0] ?? null)}
            className="w-full rounded-md border border-white/10 bg-[#161C28] px-3 py-2 text-xs text-white file:mr-3 file:rounded file:border-0 file:bg-white/10 file:px-2 file:py-1 file:text-[10px] file:font-bold file:text-white"
          />
          {uploadForm.fileIssue && <p className="text-[10px] text-rose-300">{uploadForm.fileIssue}</p>}
          {uploadForm.file && !uploadForm.fileIssue && (
            <>
              <select
                value={uploadForm.mediaType}
                disabled={uploading}
                onChange={(event) => pickUploadMediaType(event.target.value as ExerciseMediaType | '')}
                className="w-full rounded-md border border-white/10 bg-[#161C28] px-2 py-2 text-xs text-white"
              >
                <option value="" disabled>{uploadTypeOptions && uploadTypeOptions.length > 1 ? 'Choose media type…' : 'Select…'}</option>
                {(uploadTypeOptions ?? []).map((option) => <option key={option} value={option}>{typeLabel(option)}</option>)}
              </select>
              <label className="flex items-center gap-2 text-[10px] text-gray-400">
                <input type="checkbox" checked={uploadForm.primary} disabled={uploading} onChange={(event) => setUploadForm({ ...uploadForm, primary: event.target.checked })} />
                Primary media
              </label>
            </>
          )}
          <p className="text-[10px] text-gray-500">MP4, GIF, WebP, JPEG, or PNG · max 25 MB · saved as awaiting approval, then Approve &amp; Publish after preview.</p>
          <button
            type="button"
            disabled={uploading || !uploadForm.file || !uploadForm.mediaType || Boolean(uploadForm.fileIssue)}
            onClick={submitUpload}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      )}

      {form && canManage && (
        <div className="space-y-3 rounded-md border border-blue-500/30 bg-blue-500/[0.06] p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-white">{form.mode === 'add' ? `Add ${typeLabel(form.type)} URL` : form.row?.r2_key ? 'Replace R2 media with URL' : 'Edit media URL'}</p>
            <button type="button" onClick={() => setForm(null)} className="p-1 text-gray-400 hover:text-white" title="Close"><X className="h-4 w-4" /></button>
          </div>
          {form.row?.r2_key && <p className="text-[10px] text-amber-300">The database row will use this URL. The existing R2 object will not be deleted.</p>}
          <div className="grid grid-cols-[96px_1fr] gap-2">
            <select disabled={form.mode === 'edit'} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ExerciseMediaType })} className="rounded-md border border-white/10 bg-[#161C28] px-2 py-2 text-xs text-white disabled:opacity-60">
              <option value="gif">GIF</option><option value="video">Video</option><option value="image">Image</option>{form.type === 'thumbnail' && <option value="thumbnail">Thumbnail</option>}
            </select>
            <input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://..." className="min-w-0 rounded-md border border-white/10 bg-[#161C28] px-3 py-2 text-xs text-white placeholder:text-gray-600" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] text-gray-400">{form.primary ? 'Primary media' : 'Alternate media'} · saved as awaiting approval</span>
            <button type="button" disabled={saving} onClick={saveMedia} className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-blue-500 disabled:opacity-50">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save</button>
          </div>
        </div>
      )}

      {message && <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[10px] ${message.kind === 'error' ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>{message.kind === 'error' && <AlertCircle className="h-3.5 w-3.5" />}{message.text}</div>}
    </section>
  );
}
