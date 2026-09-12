"use client";

import { useState } from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchAllExerciseRows, type ExerciseMediaRecord } from '@/lib/exerciseMedia';
import {
  executeExerciseMediaIngestion,
  parseExerciseMediaManifest,
  planExerciseMediaIngestion,
  reconcileExerciseMedia,
  type MediaIngestionReport,
} from '@/lib/exerciseMediaIngestion';

const EXAMPLE_MANIFEST = JSON.stringify([{
  operationId: '00000000-0000-4000-a000-000000000001',
  exerciseSlug: 'back-squat',
  mediaType: 'video',
  url: 'https://media.example.com/back-squat.mp4',
  isPrimary: false,
  sourceNote: 'Licensed source and attribution reference',
}], null, 2);

async function loadAllMedia(): Promise<ExerciseMediaRecord[]> {
  const rows: ExerciseMediaRecord[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('exercise_media')
      .select('id, exercise_id, media_type, file_format, r2_key, url, thumbnail_url, is_primary, media_status, media_notes, created_at')
      .order('id', { ascending: true }).range(from, from + 999);
    if (error) throw error;
    const page = (data ?? []) as ExerciseMediaRecord[];
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

export default function ExerciseMediaIngestionPage() {
  const [manifest, setManifest] = useState(EXAMPLE_MANIFEST);
  const [report, setReport] = useState<MediaIngestionReport | null>(null);
  const [reviewSummary, setReviewSummary] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);

  async function prepare() {
    setBusy(true);
    setMessage(null);
    try {
      const parsed = parseExerciseMediaManifest(manifest);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Your session expired. Sign in again.');
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profileError || !profile || !['admin', 'coach'].includes(profile.role)) throw new Error('You do not have permission to ingest exercise media.');
      const [{ rows: exercises }, media] = await Promise.all([
        fetchAllExerciseRows(async (from, to) => {
          const result = await supabase.from('exercises').select('id, slug, source_type, created_by_coach_id', { count: 'exact' })
            .is('archived_at', null).order('id', { ascending: true }).range(from, to);
          return { data: result.data, count: result.count, error: result.error };
        }),
        loadAllMedia(),
      ]);
      const next = planExerciseMediaIngestion(parsed, exercises, media, { id: user.id, role: profile.role });
      setReport(next);
      const reconciliation = reconcileExerciseMedia(media);
      const reconciliationValues = Array.from(reconciliation.values());
      const awaiting = reconciliationValues.filter((issues) => issues.has('TO_CREATE_R2') || issues.has('TO_CREATE_EXTERNAL')).length;
      const noPrimary = reconciliationValues.filter((issues) => issues.has('NO_PRIMARY')).length;
      setReviewSummary(`${awaiting} exercises await media review; ${noPrimary} have media but no primary selection.`);
      setMessage({ kind: 'success', text: 'Dry run complete. No database or R2 writes were made.' });
      return next;
    } catch (error) {
      setReport(null);
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Could not validate manifest.' });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function ingest() {
    const prepared = await prepare();
    if (!prepared || prepared.counts.CONFLICT || prepared.counts.INVALID) return;
    if (!window.confirm('Import the first validated batch as TO_CREATE? Nothing will be published.')) return;
    setBusy(true);
    const result = await executeExerciseMediaIngestion(prepared, {
      async create(item) {
        if (!item.row) throw new Error('Validated ingestion row is missing.');
        const { data, error } = await supabase.functions.invoke('upload-to-r2', { body: {
          action: 'save-external-media',
          exerciseId: item.exerciseId,
          idempotencyKey: item.row.operationId,
          mediaType: item.row.mediaType,
          url: item.row.url,
          isPrimary: false,
          mediaNotes: item.row.sourceNote,
        } });
        if (error || !data?.success) throw new Error(data?.error || error?.message || 'Media import failed.');
        return { mediaId: data.media.id, mediaStatus: data.media.media_status };
      },
      async setPrimary(exerciseId, mediaId) {
        const primary = await supabase.functions.invoke('upload-to-r2', { body: {
          action: 'set-exercise-media-primary', exerciseId, mediaId,
        } });
        if (primary.error || !primary.data?.success) throw new Error(primary.data?.error || primary.error?.message || 'Primary selection failed.');
      },
    }, 25, false);
    setReport(result);
    setBusy(false);
    setMessage(result.counts.ERROR
      ? { kind: 'error', text: `Batch completed with ${result.counts.ERROR} row error(s). Successful rows remain TO_CREATE.` }
      : { kind: 'success', text: 'Batch imported as TO_CREATE. Review and publish each asset individually.' });
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-6">
      <div>
        <h1 className="text-xl font-bold text-white">Media ingestion</h1>
        <p className="mt-1 text-sm text-gray-400">Validate a bounded external-media manifest before creating unpublished review rows.</p>
      </div>
      <textarea value={manifest} onChange={(event) => { setManifest(event.target.value); setReport(null); }} rows={14}
        className="w-full rounded-md border border-white/10 bg-[#111722] p-3 font-mono text-xs text-white" aria-label="Media ingestion manifest" />
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => void prepare()} className="rounded-md border border-white/10 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Dry run'}</button>
        <button type="button" disabled={busy || !report || report.counts.INVALID > 0 || report.counts.CONFLICT > 0} onClick={() => void ingest()} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Import batch</button>
      </div>
      {message && <p className={`flex items-center gap-2 text-sm ${message.kind === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>{message.kind === 'error' ? <AlertCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}{message.text}</p>}
      {reviewSummary && <p className="text-sm text-gray-300">{reviewSummary}</p>}
      {report && <div className="space-y-2">
        <p className="text-xs text-gray-400">CREATE {report.counts.CREATE} · RETRY PRIMARY {report.counts.RETRY_PRIMARY} · SKIP {report.counts.SKIP_EXISTING} · CONFLICT {report.counts.CONFLICT} · INVALID {report.counts.INVALID} · ERROR {report.counts.ERROR}</p>
        {report.rows.map((item, index) => <div key={`${item.row?.operationId ?? 'invalid'}:${index}`} className="rounded-md border border-white/10 p-3 text-xs text-gray-300"><strong>{item.outcome}</strong> · {item.row?.exerciseId ?? item.row?.exerciseSlug ?? 'Invalid row'} · {item.row?.url ?? ''}<br /><span className="text-gray-500">{item.reason}</span></div>)}
      </div>}
    </main>
  );
}
