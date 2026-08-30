'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  buildExerciseEditorV2Payload,
  ExerciseEditorErrors,
  ExerciseEditorForm,
  isExerciseEditorDirty,
  validateExerciseEditor,
} from '@/lib/exerciseEditor';
import { ExerciseRelationSections } from '@/components/ExerciseRelationSections';

const INPUT = 'w-full rounded-md border border-white/10 bg-[#161C28] px-3 py-2 text-sm text-white outline-none focus:border-blue-500';
const TEXTAREA = `${INPUT} min-h-24 resize-y`;
const EMPTY_FORM: ExerciseEditorForm = {
  name: '', primaryMuscle: '', equipment: '', category: '', movementPattern: '', difficulty: '', unilateral: false,
  setupInstructions: '', executionInstructions: '', breathing: '', coachingCues: '', commonMistakes: '', safetyNotes: '',
  defaultSets: '3', defaultReps: '', defaultRepsPrescription: '', tempo: '', archived: false,
  aliases: [], tags: [], muscles: [], alternatives: [], progressions: [], regressions: [],
};

export default function NewExercisePage() {
  const router = useRouter();
  const [form, setForm] = useState<ExerciseEditorForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<ExerciseEditorErrors>({});
  const [status, setStatus] = useState<'loading' | 'ready' | 'unauthenticated' | 'denied' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dirty = useMemo(() => isExerciseEditorDirty(EMPTY_FORM, form), [form]);

  useEffect(() => {
    void (async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) return setStatus('unauthenticated');
      const { data, error: profileError } = await supabase.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
      if (profileError) return setStatus('error');
      setStatus(data?.role === 'coach' ? 'ready' : 'denied');
    })();
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function update<K extends keyof ExerciseEditorForm>(key: K, value: ExerciseEditorForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setMessage(null);
  }

  function cancel() {
    if (!dirty || window.confirm('Discard this unsaved custom exercise?')) router.push('/exercises');
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const nextErrors = validateExerciseEditor(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setMessage('Correct the highlighted fields before saving.');
      return;
    }

    setSaving(true);
    setMessage(null);
    const payload = buildExerciseEditorV2Payload(null, form);
    const { data, error } = await supabase.rpc('save_exercise_editor_v2', { p_payload: payload });
    setSaving(false);
    if (error) {
      setMessage(error.message || 'Exercise was not created.');
      return;
    }
    router.replace(`/exercises/${data}/edit`);
  }

  if (status === 'loading') return <StatePanel title="Checking exercise permissions" loading />;
  if (status === 'unauthenticated') return <StatePanel title="Your session has expired" onBack={() => router.replace('/login')} actionLabel="Sign in" />;
  if (status === 'error') return <StatePanel title="Exercise permissions could not be loaded" onBack={() => router.push('/exercises')} />;
  if (status === 'denied') return <StatePanel title="Only coaches can create custom exercises" onBack={() => router.push('/exercises')} />;

  return (
    <main className="mx-auto min-h-screen max-w-6xl bg-[#0B1117] px-5 py-7 text-gray-100">
      <div className="mb-6 flex items-center justify-between gap-3 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={cancel} className="p-2 text-gray-400 hover:text-white" title="Back to exercises"><ArrowLeft className="h-5 w-5" /></button>
          <div><p className="text-xs font-bold uppercase text-blue-400">Exercise Editor</p><h1 className="text-xl font-bold">Create custom exercise</h1></div>
        </div>
        <button form="new-exercise-form" type="submit" disabled={saving} className="flex min-h-11 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-bold disabled:opacity-40">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Create
        </button>
      </div>

      <div className="mb-5 rounded-md border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-200">
        New exercises are created as coach-owned custom records. Relations and media can be configured immediately.
      </div>
      {message && <div className="mb-5 flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"><AlertCircle className="h-4 w-4" />{message}</div>}

      <form id="new-exercise-form" className="space-y-7" onSubmit={save}>
        <section><h2 className="mb-3 text-sm font-bold">Core details</h2><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Name" error={errors.name}><input className={INPUT} value={form.name} onChange={(e) => update('name', e.target.value)} /></Field>
          <Field label="Primary muscle"><input className={INPUT} value={form.primaryMuscle} onChange={(e) => update('primaryMuscle', e.target.value)} /></Field>
          <Field label="Equipment"><input className={INPUT} value={form.equipment} onChange={(e) => update('equipment', e.target.value)} /></Field>
          <Field label="Category"><input className={INPUT} value={form.category} onChange={(e) => update('category', e.target.value)} /></Field>
          <Field label="Movement pattern"><input className={INPUT} value={form.movementPattern} onChange={(e) => update('movementPattern', e.target.value)} /></Field>
          <Field label="Difficulty"><input className={INPUT} value={form.difficulty} onChange={(e) => update('difficulty', e.target.value)} /></Field>
          <Field label="Laterality"><div className="grid h-10 grid-cols-2 rounded-md border border-white/10 bg-[#161C28] p-1"><button type="button" onClick={() => update('unilateral', false)} className={`rounded text-xs font-bold ${!form.unilateral ? 'bg-blue-600' : 'text-gray-400'}`}>Bilateral</button><button type="button" onClick={() => update('unilateral', true)} className={`rounded text-xs font-bold ${form.unilateral ? 'bg-blue-600' : 'text-gray-400'}`}>Unilateral</button></div></Field>
        </div></section>
        <section><h2 className="mb-3 text-sm font-bold">Instructions</h2><div className="grid gap-4 md:grid-cols-2">
          <Field label="Setup instructions"><textarea className={TEXTAREA} value={form.setupInstructions} onChange={(e) => update('setupInstructions', e.target.value)} /></Field>
          <Field label="Execution instructions"><textarea className={TEXTAREA} value={form.executionInstructions} onChange={(e) => update('executionInstructions', e.target.value)} /></Field>
          <Field label="Breathing"><textarea className={TEXTAREA} value={form.breathing} onChange={(e) => update('breathing', e.target.value)} /></Field>
          <Field label="Safety notes"><textarea className={TEXTAREA} value={form.safetyNotes} onChange={(e) => update('safetyNotes', e.target.value)} /></Field>
          <Field label="Coaching cues" hint="One cue per line" error={errors.coachingCues}><textarea className={TEXTAREA} value={form.coachingCues} onChange={(e) => update('coachingCues', e.target.value)} /></Field>
          <Field label="Common mistakes" hint="One mistake per line" error={errors.commonMistakes}><textarea className={TEXTAREA} value={form.commonMistakes} onChange={(e) => update('commonMistakes', e.target.value)} /></Field>
        </div></section>
        <section><h2 className="mb-3 text-sm font-bold">Default prescription</h2><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Field label="Sets" error={errors.defaultSets}><input inputMode="numeric" className={INPUT} value={form.defaultSets} onChange={(e) => update('defaultSets', e.target.value)} /></Field>
          <Field label="Numeric reps" hint="Compatibility fallback" error={errors.defaultReps}><input inputMode="numeric" className={INPUT} value={form.defaultReps} onChange={(e) => update('defaultReps', e.target.value)} /></Field>
          <Field label="Display prescription"><input className={INPUT} value={form.defaultRepsPrescription} onChange={(e) => update('defaultRepsPrescription', e.target.value)} /></Field>
          <Field label="Tempo" error={errors.tempo}><input className={INPUT} value={form.tempo} onChange={(e) => update('tempo', e.target.value)} /></Field>
        </div></section>

        {/* Phase B Relational & Taxonomy Sections */}
        <ExerciseRelationSections
          form={form}
          errors={errors}
          currentExerciseId={null}
          onChange={update}
        />
      </form>
    </main>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-bold text-gray-300">{label}</span>{children}{hint && !error && <span className="mt-1 block text-[10px] text-gray-500">{hint}</span>}{error && <span className="mt-1 block text-[10px] text-rose-400">{error}</span>}</label>;
}

function StatePanel({ title, loading = false, onBack, actionLabel = 'Back to exercises' }: { title: string; loading?: boolean; onBack?: () => void; actionLabel?: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#0B1117] px-5 text-gray-100"><div className="text-center">{loading && <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-gray-400" />}<h1 className="text-lg font-bold">{title}</h1>{onBack && <button type="button" onClick={onBack} className="mt-4 min-h-11 rounded-md bg-blue-600 px-4 text-sm font-bold">{actionLabel}</button>}</div></main>;
}
