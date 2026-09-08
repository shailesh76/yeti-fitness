"use client";

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, ExternalLink, Film, Image as ImageIcon, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  ExerciseMediaRecord,
  ExerciseMediaType,
  hasDuplicateExerciseMediaUrl,
  isExternalMedia,
  isUsableExerciseMedia,
  isValidExerciseMediaUrl,
  orderExerciseMedia,
  previewErrorKey,
  resolveExerciseMediaUrl,
} from '@/lib/exerciseMedia';

type EditableMediaType = Exclude<ExerciseMediaType, 'thumbnail'>;

interface ExerciseMediaManagerProps {
  exerciseId: string;
  exerciseName: string;
  media: ExerciseMediaRecord[];
  loading: boolean;
  canManage: boolean;
  onChanged: () => Promise<void>;
}

interface MediaFormState {
  mode: 'add' | 'edit';
  type: ExerciseMediaType;
  url: string;
  status: string;
  primary: boolean;
  row: ExerciseMediaRecord | null;
}

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

export function ExerciseMediaManager({ exerciseId, exerciseName, media, loading, canManage, onChanged }: ExerciseMediaManagerProps) {
  const orderedMedia = useMemo(() => orderExerciseMedia(media), [media]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolvedUrls, setResolvedUrls] = useState<Record<string, string>>(EMPTY_URLS);
  const [previewErrors, setPreviewErrors] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<MediaFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    setSelectedId(null);
    setForm(null);
    setMessage(null);
  }, [exerciseId]);

  useEffect(() => {
    let cancelled = false;
    async function resolveUrls() {
      const next: Record<string, string> = {};
      await Promise.all(orderedMedia.map(async (item) => {
        const resolved = await resolveExerciseMediaUrl(item, async (key) => {
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
    setForm({ mode: 'add', type, url: '', status: 'TO_CREATE', primary: media.length === 0, row: null });
  }

  function startEdit(row: ExerciseMediaRecord) {
    setMessage(null);
    setForm({
      mode: 'edit',
      type: row.media_type,
      url: row.url ?? '',
      status: row.media_status ?? 'READY',
      primary: row.is_primary,
      row,
    });
  }

  async function saveMedia() {
    if (!form || !isValidExerciseMediaUrl(form.url.trim(), form.type)) {
      setMessage({ kind: 'error', text: 'Enter a complete HTTPS URL without spaces.' });
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
        idempotencyKey: form.mode === 'add' ? crypto.randomUUID() : undefined,
        mediaType: form.type,
        url,
        isPrimary: form.primary,
      },
    });

    if (error || !data?.success) {
      setMessage({ kind: 'error', text: data?.error || error?.message || 'Could not save media.' });
      setSaving(false);
      return;
    }

    const savedMediaId = data.media?.id;
    if (form.status === 'READY') {
      const transition = await supabase.functions.invoke('upload-to-r2', {
        body: { action: 'set-exercise-media-status', exerciseId, mediaId: savedMediaId, status: 'READY' },
      });
      if (transition.error || !transition.data?.success) {
        await onChanged();
        setMessage({ kind: 'error', text: transition.data?.error || transition.error?.message || 'Media was saved as unpublished but could not be marked ready.' });
        setSaving(false);
        return;
      }
    }

    await onChanged();
    setForm(null);
    setSaving(false);
    setMessage({ kind: 'success', text: form.mode === 'add' ? 'Media URL added.' : 'Media URL updated.' });
  }

  async function removeExternalMedia(row: ExerciseMediaRecord) {
    if (!isExternalMedia(row) || !window.confirm(`Remove this ${typeLabel(row.media_type).toLowerCase()} URL from ${exerciseName}?`)) return;
    setRemovingId(row.id);
    setMessage(null);
    const { data, error } = await supabase.functions.invoke('upload-to-r2', {
      body: { action: 'delete-exercise-media', exerciseId, mediaId: row.id },
    });
    if (error || !data?.success) {
      setMessage({ kind: 'error', text: data?.error || error?.message || 'Could not remove media.' });
    } else if (data.cleanupPending) {
      await onChanged();
      setMessage({ kind: 'error', text: 'Media record removed, but stored file cleanup is still pending.' });
    } else {
      await onChanged();
      setMessage({ kind: 'success', text: 'External media removed.' });
    }
    setRemovingId(null);
  }

  return (
    <section className="space-y-3" aria-label="Exercise media">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase text-gray-500">Media</p>
          <p className="text-xs font-bold text-white">{mediaStatusLabel(orderedMedia)}</p>
        </div>
        {canManage && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => startAdd('gif')} className="rounded-md border border-white/10 p-1.5 text-gray-300 hover:bg-white/5" title="Add GIF URL"><Plus className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => startAdd('video')} className="rounded-md border border-white/10 p-1.5 text-gray-300 hover:bg-white/5" title="Add video URL"><Film className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => startAdd('image')} className="rounded-md border border-white/10 p-1.5 text-gray-300 hover:bg-white/5" title="Add image URL"><ImageIcon className="h-3.5 w-3.5" /></button>
          </div>
        )}
      </div>

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
            <p className="text-xs font-bold text-gray-300">{selected && !selectedIsPublishable ? 'Planned media' : selected ? 'Media unavailable' : 'No media available'}</p>
            <p className="mt-1 text-[10px] text-gray-500">{selected && !selectedIsPublishable ? 'This asset is not published yet.' : selected ? 'The published media URL could not be loaded.' : 'Add an HTTPS GIF, video, or image URL.'}</p>
          </div>
        )}
        {selected && (
          <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[9px] font-bold text-white">
            {typeLabel(selected.media_type)} · {selectedIsPublishable ? selected.r2_key ? 'R2' : 'URL' : selected.media_status ?? 'Unavailable'}
          </span>
        )}
      </div>

      {orderedMedia.length > 0 && (
        <div className="space-y-1.5">
          {orderedMedia.map((item) => (
            <div key={item.id} className={`flex items-center gap-2 rounded-md border px-2.5 py-2 ${selected?.id === item.id ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/5 bg-white/[0.02]'}`}>
              <button type="button" onClick={() => setSelectedId(item.id)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[11px] font-bold text-white">{typeLabel(item.media_type)}{item.is_primary ? ' · Primary' : ''}</span>
                <span className="block truncate text-[9px] text-gray-500">{item.r2_key ?? item.url ?? 'Missing locator'}</span>
              </button>
              {resolvedUrls[item.id] && <a href={resolvedUrls[item.id]} target="_blank" rel="noreferrer" className="p-1 text-gray-400 hover:text-white" title="Open media"><ExternalLink className="h-3.5 w-3.5" /></a>}
              {canManage && <button type="button" onClick={() => startEdit(item)} className="p-1 text-gray-400 hover:text-blue-300" title={item.r2_key ? 'Replace R2 media with URL' : 'Edit URL'}><Pencil className="h-3.5 w-3.5" /></button>}
              {canManage && isExternalMedia(item) && <button type="button" disabled={removingId === item.id} onClick={() => removeExternalMedia(item)} className="p-1 text-gray-400 hover:text-rose-400 disabled:opacity-40" title="Remove external media"><Trash2 className="h-3.5 w-3.5" /></button>}
            </div>
          ))}
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
            <span className="text-[10px] text-gray-400">{form.primary ? 'Primary media' : 'Alternate media'}</span>
            <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="rounded-md border border-white/10 bg-[#161C28] px-2 py-1.5 text-[10px] text-white"><option value="TO_CREATE">To create</option><option value="READY">Ready</option></select>
            <button type="button" disabled={saving} onClick={saveMedia} className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-blue-500 disabled:opacity-50">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save</button>
          </div>
        </div>
      )}

      {message && <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[10px] ${message.kind === 'error' ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>{message.kind === 'error' && <AlertCircle className="h-3.5 w-3.5" />}{message.text}</div>}
    </section>
  );
}
