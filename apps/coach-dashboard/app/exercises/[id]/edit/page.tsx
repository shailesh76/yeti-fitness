"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle, Archive, ArrowLeft, Check, Loader2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  buildExerciseEditorV2Payload,
  canEditExercise,
  DerivedRelationItem,
  ExerciseAlternativeItem,
  ExerciseEditorErrors,
  ExerciseEditorForm,
  ExerciseMuscleItem,
  ExerciseProgressionItem,
  ExerciseRegressionItem,
  ExerciseTagItem,
  isExerciseEditorDirty,
  validateExerciseEditor,
} from '@/lib/exerciseEditor';
import { ExerciseRelationSections } from '@/components/ExerciseRelationSections';

interface ExerciseRow {
  id: string;
  name: string;
  primary_muscle: string | null;
  equipment: string | null;
  category: string | null;
  movement_pattern: string | null;
  difficulty: string | null;
  unilateral: boolean | null;
  setup_instructions: string | null;
  execution_instructions: string | null;
  breathing: string | null;
  coaching_cues: string[] | null;
  common_mistakes: string[] | null;
  safety_notes: string | null;
  default_sets: number | null;
  default_reps: number | null;
  default_reps_prescription: string | null;
  tempo: string | null;
  source_type: string;
  source: string | null;
  source_id: string | null;
  created_by_coach_id: string | null;
  license: string | null;
  archived_at: string | null;
}

type LoadState = 'loading' | 'ready' | 'not-found' | 'unauthenticated' | 'denied' | 'error';

const INPUT_CLASS = 'w-full rounded-md border border-white/10 bg-[#161C28] px-3 py-2 text-sm text-white outline-none focus:border-blue-500';
const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-28 resize-y`;

export default function ExerciseEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const exerciseId = params.id;
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [exercise, setExercise] = useState<ExerciseRow | null>(null);
  const [initialForm, setInitialForm] = useState<ExerciseEditorForm | null>(null);
  const [form, setForm] = useState<ExerciseEditorForm | null>(null);
  const [derivedRelations, setDerivedRelations] = useState<DerivedRelationItem[]>([]);
  const [errors, setErrors] = useState<ExerciseEditorErrors>({});
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(
    () => Boolean(initialForm && form && isExerciseEditorDirty(initialForm, form)),
    [initialForm, form],
  );

  const loadExercise = useCallback(async () => {
    setLoadState('loading');
    setMessage(null);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData.user;
    if (authError || !user) {
      setLoadState('unauthenticated');
      return;
    }

    const [
      { data: profile, error: profileError },
      { data: row, error: exerciseError },
      { data: aliasesData, error: aliasesError },
      { data: tagsData, error: tagsError },
      { data: musclesData, error: musclesError },
      { data: altsData, error: alternativesError },
      { data: progsData, error: progressionsError },
      { data: regsData, error: regressionsError },
      { data: derivedProgsData, error: derivedProgressionsError },
      { data: derivedRegsData, error: derivedRegressionsError },
    ] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      supabase.from('exercises').select([
        'id', 'name', 'primary_muscle', 'equipment', 'category', 'movement_pattern', 'difficulty',
        'unilateral', 'setup_instructions', 'execution_instructions', 'breathing', 'coaching_cues',
        'common_mistakes', 'safety_notes', 'default_sets', 'default_reps',
        'default_reps_prescription', 'tempo', 'source_type', 'source', 'source_id',
        'created_by_coach_id', 'license', 'archived_at',
      ].join(',')).eq('id', exerciseId).maybeSingle(),
      supabase.from('exercise_aliases').select('id, alias').eq('exercise_id', exerciseId),
      supabase.from('exercise_tags').select('id, tag, tag_type').eq('exercise_id', exerciseId),
      supabase.from('exercise_muscles').select('id, muscle, role').eq('exercise_id', exerciseId),
      supabase.from('exercise_alternatives').select('id, alternative_exercise_id, reason, alternative:exercises!exercise_alternatives_alternative_exercise_id_fkey(id, name, slug)').eq('exercise_id', exerciseId),
      supabase.from('exercise_progressions').select('id, progression_exercise_id, difficulty_delta, progression:exercises!exercise_progressions_progression_exercise_id_fkey(id, name, slug)').eq('exercise_id', exerciseId),
      supabase.from('exercise_regressions').select('id, regression_exercise_id, difficulty_delta, regression:exercises!exercise_regressions_regression_exercise_id_fkey(id, name, slug)').eq('exercise_id', exerciseId),
      // Derived relations
      supabase.from('exercise_regressions').select('exercise_id, exercise:exercises!exercise_regressions_exercise_id_fkey(id, name, slug)').eq('regression_exercise_id', exerciseId),
      supabase.from('exercise_progressions').select('exercise_id, exercise:exercises!exercise_progressions_exercise_id_fkey(id, name, slug)').eq('progression_exercise_id', exerciseId),
    ]);

    if (profileError || exerciseError) {
      setMessage({ kind: 'error', text: 'The exercise editor could not be loaded.' });
      setLoadState('error');
      return;
    }
    if (!row) {
      setLoadState('not-found');
      return;
    }

    const relationError = aliasesError || tagsError || musclesError || alternativesError
      || progressionsError || regressionsError || derivedProgressionsError || derivedRegressionsError;
    if (relationError) {
      console.error('Exercise relation data could not be loaded.', { exerciseId });
      setMessage({ kind: 'error', text: 'Exercise relationships could not be loaded. No changes were made.' });
      setLoadState('error');
      return;
    }

    const typedRow = row as unknown as ExerciseRow;
    const canEdit = canEditExercise(profile?.role, user.id, typedRow);
    if (!canEdit) {
      setExercise(typedRow);
      setLoadState('denied');
      return;
    }

    // Process aliases
    const aliases = (aliasesData || []).map((a: any) => a.alias);

    // Process tags
    const tags: ExerciseTagItem[] = (tagsData || []).map((t: any) => ({
      id: t.id,
      tag: t.tag,
      tagType: t.tag_type,
    }));

    // Process muscles
    const muscles: ExerciseMuscleItem[] = (musclesData || []).map((m: any) => ({
      id: m.id,
      muscle: m.muscle,
      role: m.role,
    }));

    // Process alternatives
    const alternatives: ExerciseAlternativeItem[] = (altsData || []).map((a: any) => ({
      id: a.id,
      alternativeExerciseId: a.alternative_exercise_id,
      name: a.alternative?.name || a.alternative_exercise_id,
      reason: a.reason || '',
    }));

    // Process progressions
    const progressions: ExerciseProgressionItem[] = (progsData || []).map((p: any) => ({
      id: p.id,
      progressionExerciseId: p.progression_exercise_id,
      name: p.progression?.name || p.progression_exercise_id,
      difficultyDelta: p.difficulty_delta ?? 1,
    }));

    // Process regressions
    const regressions: ExerciseRegressionItem[] = (regsData || []).map((r: any) => ({
      id: r.id,
      regressionExerciseId: r.regression_exercise_id,
      name: r.regression?.name || r.regression_exercise_id,
      difficultyDelta: r.difficulty_delta ?? -1,
    }));

    // Process derived inverse relations
    const derived: DerivedRelationItem[] = [
      ...(derivedProgsData || []).map((dp: any) => ({
        exerciseId: dp.exercise_id,
        name: dp.exercise?.name || dp.exercise_id,
        slug: dp.exercise?.slug,
        relationship: 'derived_progression' as const,
      })),
      ...(derivedRegsData || []).map((dr: any) => ({
        exerciseId: dr.exercise_id,
        name: dr.exercise?.name || dr.exercise_id,
        slug: dr.exercise?.slug,
        relationship: 'derived_regression' as const,
      })),
    ];
    setDerivedRelations(derived);

    const nextForm: ExerciseEditorForm = {
      name: typedRow.name,
      primaryMuscle: typedRow.primary_muscle ?? '',
      equipment: typedRow.equipment ?? '',
      category: typedRow.category ?? '',
      movementPattern: typedRow.movement_pattern ?? '',
      difficulty: typedRow.difficulty ?? '',
      unilateral: typedRow.unilateral ?? false,
      setupInstructions: typedRow.setup_instructions ?? '',
      executionInstructions: typedRow.execution_instructions ?? '',
      breathing: typedRow.breathing ?? '',
      coachingCues: (typedRow.coaching_cues ?? []).join('\n'),
      commonMistakes: (typedRow.common_mistakes ?? []).join('\n'),
      safetyNotes: typedRow.safety_notes ?? '',
      defaultSets: String(typedRow.default_sets ?? 3),
      defaultReps: typedRow.default_reps == null ? '' : String(typedRow.default_reps),
      defaultRepsPrescription: typedRow.default_reps_prescription ?? '',
      tempo: typedRow.tempo ?? '',
      archived: Boolean(typedRow.archived_at),
      aliases,
      tags,
      muscles,
      alternatives,
      progressions,
      regressions,
    };

    setExercise(typedRow);
    setInitialForm(nextForm);
    setForm(nextForm);
    setLoadState('ready');
  }, [exerciseId]);

  useEffect(() => { void loadExercise(); }, [loadExercise]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function update<K extends keyof ExerciseEditorForm>(key: K, value: ExerciseEditorForm[K]) {
    setForm((current) => current ? { ...current, [key]: value } : current);
    setErrors((current) => ({ ...current, [key]: undefined }));
    setMessage(null);
  }

  function leaveEditor() {
    if (!dirty || window.confirm('Discard your unsaved exercise changes?')) router.push('/exercises');
  }

  async function save(nextArchived = form?.archived ?? false) {
    if (!form || saving) return;
    const nextForm = { ...form, archived: nextArchived };
    const nextErrors = validateExerciseEditor(nextForm, exerciseId);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setMessage({ kind: 'error', text: 'Correct the highlighted fields before saving.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    const payload = buildExerciseEditorV2Payload(exerciseId, nextForm);
    const { error } = await supabase.rpc('save_exercise_editor_v2', { p_payload: payload });
    if (error) {
      setMessage({ kind: 'error', text: error.message || 'Exercise changes were not saved.' });
      setSaving(false);
      return;
    }

    setForm(nextForm);
    setInitialForm(nextForm);
    setMessage({ kind: 'success', text: nextArchived ? 'Exercise archived.' : form.archived ? 'Exercise restored.' : 'Exercise saved.' });
    setSaving(false);
  }

  if (loadState === 'loading') return <StatePanel icon={<Loader2 className="h-7 w-7 animate-spin" />} title="Loading exercise" />;
  if (loadState === 'not-found') return <StatePanel icon={<AlertCircle className="h-7 w-7" />} title="Exercise not found" action={leaveEditor} />;
  if (loadState === 'unauthenticated') return <StatePanel icon={<AlertCircle className="h-7 w-7" />} title="Your session has expired" action={() => router.replace('/login')} actionLabel="Sign in" />;
  if (loadState === 'denied') return <StatePanel icon={<AlertCircle className="h-7 w-7" />} title="You do not have permission to edit this exercise" action={leaveEditor} />;
  if (loadState === 'error' || !form || !exercise) return <StatePanel icon={<AlertCircle className="h-7 w-7" />} title={message?.text || 'Could not load exercise'} action={() => void loadExercise()} actionLabel="Retry" />;

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-[#0B1117] px-5 py-7 text-gray-100">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={leaveEditor} className="p-2 text-gray-400 hover:text-white" title="Back to exercises"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0"><p className="text-xs font-bold uppercase text-blue-400">Exercise Editor</p><h1 className="truncate text-xl font-bold">{exercise.name}</h1></div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={saving} onClick={() => void save(!form.archived)} className="flex min-h-11 items-center gap-2 rounded-md border border-amber-500/30 px-3 text-sm font-bold text-amber-300 disabled:opacity-40"><Archive className="h-4 w-4" /> {form.archived ? 'Restore' : 'Archive'}</button>
          <button type="button" disabled={saving || !dirty} onClick={() => void save()} className="flex min-h-11 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save</button>
        </div>
      </div>

      {message && <div className={`mb-5 flex items-center gap-2 rounded-md border px-4 py-3 text-sm ${message.kind === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-300'}`}>{message.kind === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}{message.text}</div>}

      <section className="mb-6 border-b border-white/10 pb-5" aria-label="Exercise provenance">
        <h2 className="mb-3 text-sm font-bold">Provenance</h2>
        <dl className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-5">
          <Provenance label="Source type" value={exercise.source_type} /><Provenance label="Source" value={exercise.source} />
          <Provenance label="Source ID" value={exercise.source_id} /><Provenance label="Owner" value={exercise.created_by_coach_id} />
          <Provenance label="License" value={exercise.license} />
        </dl>
      </section>

      <form className="space-y-7" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <section><h2 className="mb-3 text-sm font-bold">Core details</h2><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Name" error={errors.name}><input className={INPUT_CLASS} value={form.name} onChange={(e) => update('name', e.target.value)} /></Field>
          <Field label="Primary muscle"><input className={INPUT_CLASS} value={form.primaryMuscle} onChange={(e) => update('primaryMuscle', e.target.value)} /></Field>
          <Field label="Equipment"><input className={INPUT_CLASS} value={form.equipment} onChange={(e) => update('equipment', e.target.value)} /></Field>
          <Field label="Category"><input className={INPUT_CLASS} value={form.category} onChange={(e) => update('category', e.target.value)} /></Field>
          <Field label="Movement pattern"><input className={INPUT_CLASS} value={form.movementPattern} onChange={(e) => update('movementPattern', e.target.value)} /></Field>
          <Field label="Difficulty"><input className={INPUT_CLASS} value={form.difficulty} onChange={(e) => update('difficulty', e.target.value)} /></Field>
          <Field label="Laterality"><div className="grid h-10 grid-cols-2 rounded-md border border-white/10 bg-[#161C28] p-1"><button type="button" onClick={() => update('unilateral', false)} className={`rounded text-xs font-bold ${!form.unilateral ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Bilateral</button><button type="button" onClick={() => update('unilateral', true)} className={`rounded text-xs font-bold ${form.unilateral ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Unilateral</button></div></Field>
        </div></section>

        <section><h2 className="mb-3 text-sm font-bold">Instructions</h2><div className="grid gap-4 md:grid-cols-2">
          <Field label="Setup instructions"><textarea className={TEXTAREA_CLASS} value={form.setupInstructions} onChange={(e) => update('setupInstructions', e.target.value)} /></Field>
          <Field label="Execution instructions"><textarea className={TEXTAREA_CLASS} value={form.executionInstructions} onChange={(e) => update('executionInstructions', e.target.value)} /></Field>
          <Field label="Breathing"><textarea className={TEXTAREA_CLASS} value={form.breathing} onChange={(e) => update('breathing', e.target.value)} /></Field>
          <Field label="Safety notes"><textarea className={TEXTAREA_CLASS} value={form.safetyNotes} onChange={(e) => update('safetyNotes', e.target.value)} /></Field>
          <Field label="Coaching cues" hint="One cue per line" error={errors.coachingCues}><textarea className={TEXTAREA_CLASS} value={form.coachingCues} onChange={(e) => update('coachingCues', e.target.value)} /></Field>
          <Field label="Common mistakes" hint="One mistake per line" error={errors.commonMistakes}><textarea className={TEXTAREA_CLASS} value={form.commonMistakes} onChange={(e) => update('commonMistakes', e.target.value)} /></Field>
        </div></section>

        <section><h2 className="mb-3 text-sm font-bold">Default prescription</h2><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Sets" error={errors.defaultSets}><input inputMode="numeric" className={INPUT_CLASS} value={form.defaultSets} onChange={(e) => update('defaultSets', e.target.value)} /></Field>
          <Field label="Numeric reps" hint="Compatibility fallback" error={errors.defaultReps}><input inputMode="numeric" className={INPUT_CLASS} value={form.defaultReps} onChange={(e) => update('defaultReps', e.target.value)} /></Field>
          <Field label="Display prescription"><input className={INPUT_CLASS} placeholder="8-12 or 30-60 sec" value={form.defaultRepsPrescription} onChange={(e) => update('defaultRepsPrescription', e.target.value)} /></Field>
          <Field label="Tempo" error={errors.tempo}><input className={INPUT_CLASS} placeholder="2-0-2-0" value={form.tempo} onChange={(e) => update('tempo', e.target.value)} /></Field>
        </div></section>

        {/* Phase B Relational & Taxonomy Sections */}
        <ExerciseRelationSections
          form={form}
          errors={errors}
          currentExerciseId={exerciseId}
          derivedRelations={derivedRelations}
          onChange={update}
        />
      </form>
    </main>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-bold text-gray-300">{label}</span>{children}{hint && !error && <span className="mt-1 block text-[10px] text-gray-500">{hint}</span>}{error && <span className="mt-1 block text-[10px] text-rose-400">{error}</span>}</label>;
}

function Provenance({ label, value }: { label: string; value: string | null }) {
  return <div className="min-w-0"><dt className="text-[10px] font-bold uppercase text-gray-500">{label}</dt><dd className="truncate text-gray-200">{value || 'Not recorded'}</dd></div>;
}

function StatePanel({ icon, title, action, actionLabel = 'Back to exercises' }: { icon: React.ReactNode; title: string; action?: () => void; actionLabel?: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#0B1117] px-5 text-gray-100"><div className="text-center"><div className="mx-auto mb-3 w-fit text-gray-400">{icon}</div><h1 className="text-lg font-bold">{title}</h1>{action && <button type="button" onClick={action} className="mt-4 min-h-11 rounded-md bg-blue-600 px-4 text-sm font-bold">{actionLabel}</button>}</div></main>;
}
