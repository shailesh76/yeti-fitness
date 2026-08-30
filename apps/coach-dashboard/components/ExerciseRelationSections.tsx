'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowUpRight, ArrowDownRight, Link2, Plus, Search, Trash2, X, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  DerivedRelationItem,
  ExerciseAlternativeItem,
  ExerciseEditorErrors,
  ExerciseEditorForm,
  ExerciseMuscleItem,
  ExerciseProgressionItem,
  ExerciseRegressionItem,
  ExerciseTagItem,
  MuscleRole,
} from '@/lib/exerciseEditor';

interface Props {
  form: ExerciseEditorForm;
  errors: ExerciseEditorErrors;
  currentExerciseId?: string | null;
  derivedRelations?: DerivedRelationItem[];
  onChange: <K extends keyof ExerciseEditorForm>(key: K, value: ExerciseEditorForm[K]) => void;
}

interface SearchResultExercise {
  id: string;
  name: string;
  slug: string | null;
  primary_muscle: string | null;
  equipment: string | null;
}

const INPUT_CLASS = 'w-full rounded-md border border-white/10 bg-[#161C28] px-3 py-2 text-sm text-white outline-none focus:border-blue-500';
const BUTTON_SECONDARY = 'flex items-center gap-1.5 rounded-md border border-white/10 bg-[#1C2433] px-3 py-1.5 text-xs font-bold text-gray-200 hover:bg-[#253043] transition-colors';

export function ExerciseRelationSections({
  form,
  errors,
  currentExerciseId,
  derivedRelations = [],
  onChange,
}: Props) {
  // Aliases input state
  const [newAlias, setNewAlias] = useState('');

  // Tags input state
  const [newTag, setNewTag] = useState('');

  // Muscles input state
  const [newMuscle, setNewMuscle] = useState('');
  const [newMuscleRole, setNewMuscleRole] = useState<MuscleRole>('secondary');
  const [taxonomyMuscles, setTaxonomyMuscles] = useState<string[]>([]);

  // Search Picker State
  const [pickerTarget, setPickerTarget] = useState<'alternative' | 'progression' | 'regression' | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerResults, setPickerResults] = useState<SearchResultExercise[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  // Load taxonomy muscles on mount for auto-suggestions
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('exercise_taxonomy')
        .select('value')
        .eq('kind', 'muscle');
      if (data) {
        setTaxonomyMuscles(data.map((d) => d.value));
      }
    })();
  }, []);

  // Search exercises for picker
  const searchExercises = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPickerResults([]);
      return;
    }
    setPickerLoading(true);
    try {
      let req = supabase
        .from('exercises')
        .select('id, name, slug, primary_muscle, equipment')
        .ilike('name', `%${query.trim()}%`)
        .is('archived_at', null)
        .limit(10);

      if (currentExerciseId) {
        req = req.neq('id', currentExerciseId);
      }

      const { data, error } = await req;
      if (!error && data) {
        setPickerResults(data as SearchResultExercise[]);
      }
    } catch (err) {
      console.error('Picker search error:', err);
    } finally {
      setPickerLoading(false);
    }
  }, [currentExerciseId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (pickerTarget) void searchExercises(pickerQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [pickerQuery, pickerTarget, searchExercises]);

  // Aliases handlers
  function addAlias() {
    const trimmed = newAlias.trim();
    if (!trimmed) return;
    if (form.aliases.some((a) => a.toLowerCase() === trimmed.toLowerCase())) return;
    onChange('aliases', [...form.aliases, trimmed]);
    setNewAlias('');
  }

  function removeAlias(index: number) {
    onChange('aliases', form.aliases.filter((_, i) => i !== index));
  }

  // Tags handlers
  function addTag() {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (form.tags.some((t) => t.tag.toLowerCase() === trimmed.toLowerCase())) return;
    onChange('tags', [...form.tags, { tag: trimmed, tagType: 'coach' }]);
    setNewTag('');
  }

  function removeTag(index: number) {
    onChange('tags', form.tags.filter((_, i) => i !== index));
  }

  // Muscles handlers
  function addMuscle() {
    const trimmed = newMuscle.trim();
    if (!trimmed) return;
    // If setting primary, check if a primary already exists and replace it or reject
    let nextMuscles = [...form.muscles];
    if (newMuscleRole === 'primary') {
      nextMuscles = nextMuscles.filter((m) => m.role !== 'primary');
    }
    // Check duplicate
    if (nextMuscles.some((m) => m.muscle.toLowerCase() === trimmed.toLowerCase() && m.role === newMuscleRole)) {
      return;
    }
    nextMuscles.push({ muscle: trimmed, role: newMuscleRole });
    onChange('muscles', nextMuscles);
    if (newMuscleRole === 'primary') {
      onChange('primaryMuscle', trimmed);
    }
    setNewMuscle('');
  }

  function removeMuscle(index: number) {
    const removed = form.muscles[index];
    const nextMuscles = form.muscles.filter((_, i) => i !== index);
    onChange('muscles', nextMuscles);
    if (removed?.role === 'primary') {
      onChange('primaryMuscle', '');
    }
  }

  // Picker selection handler
  function selectPickerExercise(exercise: SearchResultExercise) {
    if (pickerTarget === 'alternative') {
      if (!form.alternatives.some((a) => a.alternativeExerciseId === exercise.id)) {
        onChange('alternatives', [
          ...form.alternatives,
          { alternativeExerciseId: exercise.id, name: exercise.name, reason: '' },
        ]);
      }
    } else if (pickerTarget === 'progression') {
      if (!form.progressions.some((p) => p.progressionExerciseId === exercise.id)) {
        onChange('progressions', [
          ...form.progressions,
          { progressionExerciseId: exercise.id, name: exercise.name, difficultyDelta: 1 },
        ]);
      }
    } else if (pickerTarget === 'regression') {
      if (!form.regressions.some((r) => r.regressionExerciseId === exercise.id)) {
        onChange('regressions', [
          ...form.regressions,
          { regressionExerciseId: exercise.id, name: exercise.name, difficultyDelta: -1 },
        ]);
      }
    }
    setPickerTarget(null);
    setPickerQuery('');
    setPickerResults([]);
  }

  return (
    <div className="space-y-7 border-t border-white/10 pt-7">
      {/* 1. Aliases Section */}
      <section aria-labelledby="aliases-heading">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 id="aliases-heading" className="text-sm font-bold text-gray-100">
              Aliases &amp; Search Synonyms
            </h2>
            <p className="text-xs text-gray-400">
              Alternative exercise names used for smart search and indexing.
            </p>
          </div>
        </div>
        {errors.aliases && (
          <p className="mb-2 text-xs text-rose-400">{errors.aliases}</p>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          {form.aliases.map((alias, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#161C28] px-2.5 py-1 text-xs font-semibold text-gray-200"
            >
              {alias}
              <button
                type="button"
                onClick={() => removeAlias(idx)}
                className="text-gray-400 hover:text-rose-400"
                title="Remove alias"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {form.aliases.length === 0 && (
            <span className="text-xs italic text-gray-500">No aliases configured.</span>
          )}
        </div>
        <div className="flex max-w-md gap-2">
          <input
            className={INPUT_CLASS}
            placeholder="Add alias (e.g. Bayesian Curl)..."
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addAlias();
              }
            }}
          />
          <button type="button" onClick={addAlias} className={BUTTON_SECONDARY}>
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </section>

      {/* 2. Muscle Involvement Section */}
      <section aria-labelledby="muscles-heading">
        <div className="mb-3">
          <h2 id="muscles-heading" className="text-sm font-bold text-gray-100">
            Muscle Involvement
          </h2>
          <p className="text-xs text-gray-400">
            Define primary, secondary, and stabilizing muscles. Exactly one primary muscle is synced with legacy catalog.
          </p>
        </div>
        {errors.muscles && (
          <p className="mb-2 text-xs text-rose-400">{errors.muscles}</p>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          {form.muscles.map((m, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${
                m.role === 'primary'
                  ? 'border-blue-500/40 bg-blue-500/10 text-blue-300'
                  : m.role === 'secondary'
                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-300'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              }`}
            >
              <span className="capitalize">{m.muscle}</span>
              <span className="text-[10px] font-bold uppercase opacity-70">({m.role})</span>
              <button
                type="button"
                onClick={() => removeMuscle(idx)}
                className="text-gray-400 hover:text-rose-400"
                title="Remove muscle"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {form.muscles.length === 0 && (
            <span className="text-xs italic text-gray-500">No muscles assigned.</span>
          )}
        </div>
        <div className="flex max-w-lg flex-wrap gap-2">
          <select
            aria-label="Muscle Role"
            className="rounded-md border border-white/10 bg-[#161C28] px-3 py-2 text-xs text-white outline-none focus:border-blue-500"
            value={newMuscleRole}
            onChange={(e) => setNewMuscleRole(e.target.value as MuscleRole)}
          >
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="stabilizer">Stabilizer</option>
          </select>
          <input
            className={`${INPUT_CLASS} flex-1 min-w-40`}
            placeholder="Muscle name (e.g. Pectoralis Major)..."
            value={newMuscle}
            onChange={(e) => setNewMuscle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addMuscle();
              }
            }}
            list="taxonomy-muscles-list"
          />
          <datalist id="taxonomy-muscles-list">
            {taxonomyMuscles.map((tm) => (
              <option key={tm} value={tm} />
            ))}
          </datalist>
          <button type="button" onClick={addMuscle} className={BUTTON_SECONDARY}>
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </section>

      {/* 3. Tags Section */}
      <section aria-labelledby="tags-heading">
        <div className="mb-3">
          <h2 id="tags-heading" className="text-sm font-bold text-gray-100">
            Tags &amp; Categorization
          </h2>
          <p className="text-xs text-gray-400">
            Semantic labels used for AI workout generation and equipment filtering.
          </p>
        </div>
        {errors.tags && (
          <p className="mb-2 text-xs text-rose-400">{errors.tags}</p>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          {form.tags.map((t, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#161C28] px-2.5 py-1 text-xs font-semibold text-gray-200"
            >
              #{t.tag}
              <button
                type="button"
                onClick={() => removeTag(idx)}
                className="text-gray-400 hover:text-rose-400"
                title="Remove tag"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {form.tags.length === 0 && (
            <span className="text-xs italic text-gray-500">No tags configured.</span>
          )}
        </div>
        <div className="flex max-w-md gap-2">
          <input
            className={INPUT_CLASS}
            placeholder="Add tag (e.g. hypertrophy, compound)..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <button type="button" onClick={addTag} className={BUTTON_SECONDARY}>
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </section>

      {/* 4. Alternatives Section */}
      <section aria-labelledby="alternatives-heading">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 id="alternatives-heading" className="text-sm font-bold text-gray-100">
              Biomechanical Alternatives
            </h2>
            <p className="text-xs text-gray-400">
              Direct substitution exercises when equipment is busy or modified.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPickerTarget('alternative')}
            className={BUTTON_SECONDARY}
          >
            <Plus className="h-3.5 w-3.5" /> Add Alternative
          </button>
        </div>
        {errors.alternatives && (
          <p className="mb-2 text-xs text-rose-400">{errors.alternatives}</p>
        )}
        <div className="space-y-2">
          {form.alternatives.map((alt, idx) => (
            <div
              key={alt.alternativeExerciseId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/10 bg-[#161C28] p-3 text-xs"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Link2 className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="font-bold text-gray-200 truncate">
                  {alt.name || alt.alternativeExerciseId}
                </span>
              </div>
              <div className="flex flex-1 items-center justify-end gap-2">
                <input
                  className="rounded border border-white/10 bg-[#0B1117] px-2 py-1 text-xs text-gray-200 outline-none max-w-xs w-full"
                  placeholder="Substitution reason (optional)..."
                  value={alt.reason || ''}
                  onChange={(e) => {
                    const nextAlts = [...form.alternatives];
                    nextAlts[idx] = { ...nextAlts[idx], reason: e.target.value };
                    onChange('alternatives', nextAlts);
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      'alternatives',
                      form.alternatives.filter((_, i) => i !== idx),
                    )
                  }
                  className="p-1 text-gray-400 hover:text-rose-400"
                  title="Remove alternative"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {form.alternatives.length === 0 && (
            <p className="text-xs italic text-gray-500">No alternatives configured.</p>
          )}
        </div>
      </section>

      {/* 5. Progressions & Regressions Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Progressions */}
        <section aria-labelledby="progressions-heading">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 id="progressions-heading" className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
                <ArrowUpRight className="h-4 w-4 text-emerald-400" /> Progressions (Harder)
              </h2>
              <p className="text-[11px] text-gray-400">Step-up difficulty hierarchy.</p>
            </div>
            <button
              type="button"
              onClick={() => setPickerTarget('progression')}
              className={BUTTON_SECONDARY}
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          {errors.progressions && (
            <p className="mb-2 text-xs text-rose-400">{errors.progressions}</p>
          )}
          <div className="space-y-2">
            {form.progressions.map((prog, idx) => (
              <div
                key={prog.progressionExerciseId}
                className="flex items-center justify-between gap-2 rounded-md border border-emerald-500/20 bg-[#161C28] p-2.5 text-xs"
              >
                <span className="font-bold text-gray-200 truncate">
                  {prog.name || prog.progressionExerciseId}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Delta: +{prog.difficultyDelta ?? 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(
                        'progressions',
                        form.progressions.filter((_, i) => i !== idx),
                      )
                    }
                    className="p-1 text-gray-400 hover:text-rose-400"
                    title="Remove progression"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {form.progressions.length === 0 && (
              <p className="text-xs italic text-gray-500">No progressions configured.</p>
            )}
          </div>
        </section>

        {/* Regressions */}
        <section aria-labelledby="regressions-heading">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 id="regressions-heading" className="text-sm font-bold text-gray-100 flex items-center gap-1.5">
                <ArrowDownRight className="h-4 w-4 text-amber-400" /> Regressions (Easier)
              </h2>
              <p className="text-[11px] text-gray-400">Step-down / modification hierarchy.</p>
            </div>
            <button
              type="button"
              onClick={() => setPickerTarget('regression')}
              className={BUTTON_SECONDARY}
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          {errors.regressions && (
            <p className="mb-2 text-xs text-rose-400">{errors.regressions}</p>
          )}
          <div className="space-y-2">
            {form.regressions.map((reg, idx) => (
              <div
                key={reg.regressionExerciseId}
                className="flex items-center justify-between gap-2 rounded-md border border-amber-500/20 bg-[#161C28] p-2.5 text-xs"
              >
                <span className="font-bold text-gray-200 truncate">
                  {reg.name || reg.regressionExerciseId}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Delta: {reg.difficultyDelta ?? -1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChange(
                        'regressions',
                        form.regressions.filter((_, i) => i !== idx),
                      )
                    }
                    className="p-1 text-gray-400 hover:text-rose-400"
                    title="Remove regression"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {form.regressions.length === 0 && (
              <p className="text-xs italic text-gray-500">No regressions configured.</p>
            )}
          </div>
        </section>
      </div>

      {/* 6. Derived Inverse Relationships (Read-Only) */}
      {derivedRelations.length > 0 && (
        <section aria-labelledby="derived-heading" className="rounded-md border border-blue-500/20 bg-blue-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold text-blue-300">
            <Info className="h-4 w-4" />
            <h3 id="derived-heading">Derived Inverse Relationships (Read-Only)</h3>
          </div>
          <p className="mb-3 text-[11px] text-gray-400">
            These relationships are established on other exercises that reference this movement.
          </p>
          <div className="flex flex-wrap gap-2">
            {derivedRelations.map((dr, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 rounded border border-white/10 bg-[#161C28] px-2.5 py-1 text-xs text-gray-300"
              >
                <span className="font-semibold">{dr.name}</span>
                <span className="text-[10px] font-bold text-blue-400 uppercase">
                  {dr.relationship === 'derived_progression' ? '↳ Inferred Progression' : '↳ Inferred Regression'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Searchable Modal Picker */}
      {pickerTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-lg rounded-lg border border-white/10 bg-[#121824] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white capitalize">
                Select {pickerTarget} Exercise
              </h3>
              <button
                type="button"
                onClick={() => setPickerTarget(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                className={`${INPUT_CLASS} pl-9`}
                placeholder="Search exercise catalog..."
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {pickerResults.map((ex) => {
                const isSelected =
                  form.alternatives.some((a) => a.alternativeExerciseId === ex.id) ||
                  form.progressions.some((p) => p.progressionExerciseId === ex.id) ||
                  form.regressions.some((r) => r.regressionExerciseId === ex.id);

                return (
                  <button
                    key={ex.id}
                    type="button"
                    disabled={isSelected}
                    onClick={() => selectPickerExercise(ex)}
                    className="flex w-full items-center justify-between rounded-md p-2 text-left text-xs transition-colors hover:bg-white/5 disabled:opacity-40"
                  >
                    <div>
                      <p className="font-bold text-gray-200">{ex.name}</p>
                      <p className="text-[11px] text-gray-500">
                        {ex.primary_muscle || 'General'} • {ex.equipment || 'Bodyweight'}
                      </p>
                    </div>
                    {isSelected ? (
                      <span className="text-[10px] font-bold text-amber-400">Already Added</span>
                    ) : (
                      <span className="text-xs text-blue-400 font-bold">+ Select</span>
                    )}
                  </button>
                );
              })}
              {!pickerLoading && pickerQuery.trim() && pickerResults.length === 0 && (
                <p className="py-4 text-center text-xs text-gray-500">No exercises found.</p>
              )}
              {pickerLoading && (
                <p className="py-4 text-center text-xs text-gray-400">Searching catalog...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
