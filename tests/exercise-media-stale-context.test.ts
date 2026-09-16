import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  canMutateExerciseMedia,
  createExerciseDetailRequestGate,
  mediaForActiveExercise,
} from '../apps/coach-dashboard/lib/exerciseMediaContext';

const mediaA = { id: 'media-a', exercise_id: 'exercise-a', is_primary: true };
const mediaB = { id: 'media-b', exercise_id: 'exercise-b', is_primary: false };

describe('exercise media context isolation', () => {
  it('loads only media belonging to exercise A', () => {
    expect(mediaForActiveExercise([mediaA, mediaB], 'exercise-a')).toEqual([mediaA]);
  });

  it('makes A media non-actionable immediately after A to B transition', () => {
    expect(canMutateExerciseMedia({ exerciseId: 'exercise-b', media: [mediaA], row: mediaA, canManage: true, loading: false })).toBe(false);
  });

  it('prevents a stale A response from publishing over B', () => {
    const gate = createExerciseDetailRequestGate();
    const publishA = gate.begin('exercise-a');
    const publishB = gate.begin('exercise-b');
    expect(publishA()).toBe(false);
    expect(publishB()).toBe(true);
  });

  it('renders only B media while B is active', () => {
    expect(mediaForActiveExercise([mediaA, mediaB], 'exercise-b')).toEqual([mediaB]);
  });

  it.each(['delete', 'primary', 'publish', 'unpublish', 'replacement'])(
    'blocks stale A %s mutation in B context',
    () => {
      expect(canMutateExerciseMedia({ exerciseId: 'exercise-b', media: [mediaB], row: mediaA, canManage: true, loading: false })).toBe(false);
    },
  );

  it('allows normal management of the active B media', () => {
    expect(canMutateExerciseMedia({ exerciseId: 'exercise-b', media: [mediaB], row: mediaB, canManage: true, loading: false })).toBe(true);
  });

  it('preserves zero-primary media as active context data', () => {
    expect(mediaForActiveExercise([mediaB], 'exercise-b').some((row) => row.is_primary)).toBe(false);
  });

  it('keeps rapid A to B to A sequencing safe', () => {
    const gate = createExerciseDetailRequestGate();
    const firstA = gate.begin('exercise-a');
    const requestB = gate.begin('exercise-b');
    const finalA = gate.begin('exercise-a');
    expect(firstA()).toBe(false);
    expect(requestB()).toBe(false);
    expect(finalA()).toBe(true);
  });

  it('accepts only the latest request regardless of response order', () => {
    const gate = createExerciseDetailRequestGate();
    const first = gate.begin('exercise-a');
    const second = gate.begin('exercise-a');
    expect(second()).toBe(true);
    expect(first()).toBe(false);
  });

  it('disables all management while the active context is loading', () => {
    expect(canMutateExerciseMedia({ exerciseId: 'exercise-b', media: [mediaB], row: mediaB, canManage: true, loading: true })).toBe(false);
  });

  it('wires every media mutation through the context guard', () => {
    const source = readFileSync(resolve('apps/coach-dashboard/components/ExerciseMediaManager.tsx'), 'utf8');
    expect(source).toMatch(/async function saveMedia\(\)[\s\S]*?if \(!canAct\(form\?\.row/);
    expect(source).toMatch(/async function setMediaStatus[\s\S]*?if \(!canAct\(row\)\) return/);
    expect(source).toMatch(/async function setPrimaryMedia[\s\S]*?if \(!canAct\(row\)\) return/);
    expect(source).toMatch(/async function removeMedia[\s\S]*?if \(!canAct\(row\)\) return/);
    expect(source).toMatch(/async function submitUpload\(\)[\s\S]*?if \(!canAct\(\)/);
  });
});
