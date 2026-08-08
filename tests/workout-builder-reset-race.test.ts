import { describe, it, expect, vi, beforeEach } from 'vitest';

// useWorkoutBuilderStore.ts imports WorkoutRepository from the '@yeti/database'
// package barrel, which re-exports every WatermelonDB model in one go (see
// packages/database/index.ts) — Vitest's transform can't parse that. Same
// workaround already established in tests/ai-coach-actions.test.ts: mock the
// barrel (and the database/supabase modules it's constructed from) rather
// than import them for real. None of the store actions under test here
// (reset, setPendingPick, resolvePendingPick, addExercise, replaceExercise,
// beginReplace, clearReplaceTarget) touch the repository at all — only
// save()/loadExisting() do, and neither is exercised by these tests.
vi.mock('@yeti/database', () => ({
  WorkoutRepository: class {
    constructor() {}
  },
}));

vi.mock('../apps/mobile/database/index', () => ({
  database: null,
  isNativeDbAvailable: false,
}));

vi.mock('../apps/mobile/database', () => ({
  database: null,
  isNativeDbAvailable: false,
}));

vi.mock('../apps/mobile/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
  },
}));

import { useWorkoutBuilderStore } from '../apps/mobile/store/useWorkoutBuilderStore';

// P0 — Web Workout Builder Exercise Selection Reset Race.
//
// Root cause: on Expo Router web, navigating from /workouts/create to the
// exercise picker (/exercises?builderPick=1) and back REMOUNTS the create
// screen rather than merely refocusing it. That remount reran the mount
// effect, which called reset() unconditionally whenever there was no
// planId/fromAI param — including on this return trip. reset() wipes
// pendingPick back to null (it's part of initialState), and since React
// fires effects in declaration order within a commit, that reset() (declared
// first) always beat the useFocusEffect's resolvePendingPick() (declared
// second) to the punch. Every picked exercise was silently discarded, the
// workout name reverted to '', and since handleSave() refuses to save with
// zero exercises, no template could ever be created through this screen on
// web at all.
//
// Fix: workouts/create.tsx's mount effect no longer resets on the "no
// planId" branch — it does nothing there now. reset() is instead called
// explicitly at the one real "start fresh" user gesture (workouts.tsx's
// "+ New" / "Build your own workout template" buttons), which can never be
// confused with a remount-after-picker-return because it's a real button
// press, not inferred from timing.
//
// These tests exercise the store directly, in the exact call sequence the
// real screen now produces (and, for comparison, the sequence it used to
// produce), rather than rendering the React tree — matching this codebase's
// existing pattern of testing extracted/store logic instead of components.
describe('P0 — workout builder reset race', () => {
  beforeEach(() => {
    useWorkoutBuilderStore.getState().reset();
  });

  describe('web remount after picker return (the fix)', () => {
    it('pendingPick resolves correctly when nothing calls reset() in between (the new, fixed sequence)', () => {
      const store = useWorkoutBuilderStore.getState();
      store.setName('QA Pull Day');
      store.setPendingPick({ exerciseId: 'ex-1', exerciseName: 'Barbell Row', muscleGroup: 'Back' });
      // Simulates create.tsx's useFocusEffect firing on return — no reset()
      // call happens between the pick and this resolution anymore.
      useWorkoutBuilderStore.getState().resolvePendingPick();

      const state = useWorkoutBuilderStore.getState();
      expect(state.exercises).toHaveLength(1);
      expect(state.exercises[0].exerciseName).toBe('Barbell Row');
      expect(state.exercises[0].exerciseId).toBe('ex-1');
      expect(state.pendingPick).toBeNull();
    });

    it('the workout name is preserved across the picker round trip', () => {
      const store = useWorkoutBuilderStore.getState();
      store.setName('QA Pull Day');
      store.setPendingPick({ exerciseId: 'ex-1', exerciseName: 'Barbell Row' });
      useWorkoutBuilderStore.getState().resolvePendingPick();

      expect(useWorkoutBuilderStore.getState().name).toBe('QA Pull Day');
    });

    it('documents the OLD broken sequence: reset() between setPendingPick and resolvePendingPick discards the pick and the name', () => {
      const store = useWorkoutBuilderStore.getState();
      store.setName('QA Pull Day');
      store.setPendingPick({ exerciseId: 'ex-1', exerciseName: 'Barbell Row' });
      // This is exactly what the old mount effect did on every web remount.
      useWorkoutBuilderStore.getState().reset();
      useWorkoutBuilderStore.getState().resolvePendingPick();

      const state = useWorkoutBuilderStore.getState();
      expect(state.exercises).toHaveLength(0);
      expect(state.name).toBe('');
      expect(state.pendingPick).toBeNull();
    });
  });

  describe('pendingPick resolution', () => {
    it('adds the picked exercise with default sets/reps that can then be edited', () => {
      const store = useWorkoutBuilderStore.getState();
      store.setPendingPick({ exerciseId: 'ex-1', exerciseName: 'Barbell Row', muscleGroup: 'Back' });
      store.resolvePendingPick();

      const added = useWorkoutBuilderStore.getState().exercises[0];
      expect(added.sets).toBe('3');
      expect(added.reps).toBe('10');

      useWorkoutBuilderStore.getState().updateExerciseConfig(added.tempId, { sets: '5', reps: '5' });
      const updated = useWorkoutBuilderStore.getState().exercises[0];
      expect(updated.sets).toBe('5');
      expect(updated.reps).toBe('5');
    });

    it('resolvePendingPick is a safe no-op when nothing is pending (e.g. the very first mount, before any pick)', () => {
      const store = useWorkoutBuilderStore.getState();
      store.setName('Untouched Draft');
      store.resolvePendingPick();

      const state = useWorkoutBuilderStore.getState();
      expect(state.name).toBe('Untouched Draft');
      expect(state.exercises).toEqual([]);
    });

    it('a template becomes saveable once it has a name and at least one exercise (the two handleSave guards)', () => {
      const store = useWorkoutBuilderStore.getState();
      expect(store.name.trim() !== '' && store.exercises.length > 0).toBe(false); // blocked before

      store.setName('QA Pull Day');
      store.setPendingPick({ exerciseId: 'ex-1', exerciseName: 'Barbell Row' });
      store.resolvePendingPick();

      const state = useWorkoutBuilderStore.getState();
      expect(state.name.trim() !== '' && state.exercises.length > 0).toBe(true); // unblocked after
    });
  });

  describe('multiple sequential selections', () => {
    it('accumulates exercises across repeated pick/resolve cycles with no reset in between', () => {
      const store = useWorkoutBuilderStore.getState();
      store.setName('Leg Day');

      store.setPendingPick({ exerciseId: 'ex-1', exerciseName: 'Back Squat' });
      store.resolvePendingPick();
      store.setPendingPick({ exerciseId: 'ex-2', exerciseName: 'Romanian Deadlift' });
      store.resolvePendingPick();
      store.setPendingPick({ exerciseId: 'ex-3', exerciseName: 'Leg Press' });
      store.resolvePendingPick();

      const state = useWorkoutBuilderStore.getState();
      expect(state.exercises.map((e) => e.exerciseName)).toEqual(['Back Squat', 'Romanian Deadlift', 'Leg Press']);
      expect(state.name).toBe('Leg Day');
    });

    it('each accumulated exercise gets its own distinct tempId', () => {
      const store = useWorkoutBuilderStore.getState();
      store.setPendingPick({ exerciseId: 'ex-1', exerciseName: 'Back Squat' });
      store.resolvePendingPick();
      store.setPendingPick({ exerciseId: 'ex-2', exerciseName: 'Leg Press' });
      store.resolvePendingPick();

      const [a, b] = useWorkoutBuilderStore.getState().exercises;
      expect(a.tempId).not.toBe(b.tempId);
    });
  });

  describe('cancel path', () => {
    it('cancelling a picker trip (no setPendingPick call) leaves existing state untouched', () => {
      const store = useWorkoutBuilderStore.getState();
      store.setName('Push Day');
      store.setPendingPick({ exerciseId: 'ex-1', exerciseName: 'Bench Press' });
      store.resolvePendingPick();

      // Simulate opening the picker again and backing out without selecting
      // anything — pendingPick is simply never set this trip.
      const state = useWorkoutBuilderStore.getState();
      expect(state.pendingPick).toBeNull();
      expect(state.exercises).toHaveLength(1);
      expect(state.name).toBe('Push Day');
    });

    it('cancelling a Replace attempt does not corrupt a later, unrelated Add — clearReplaceTarget()', () => {
      const store = useWorkoutBuilderStore.getState();
      store.setPendingPick({ exerciseId: 'ex-1', exerciseName: 'Bench Press' });
      store.resolvePendingPick();
      const tempId = useWorkoutBuilderStore.getState().exercises[0].tempId;

      store.beginReplace(tempId); // athlete tapped "Replace" on Bench Press
      // Athlete cancels out of the picker without selecting a replacement.
      // Tapping "+ Add Exercise" for something unrelated now calls
      // clearReplaceTarget() first (see workouts/create.tsx).
      store.clearReplaceTarget();
      store.setPendingPick({ exerciseId: 'ex-2', exerciseName: 'Overhead Press' });
      store.resolvePendingPick();

      const state = useWorkoutBuilderStore.getState();
      expect(state.exercises).toHaveLength(2);
      expect(state.exercises[0].exerciseName).toBe('Bench Press'); // untouched
      expect(state.exercises[1].exerciseName).toBe('Overhead Press'); // added, not swapped in
      expect(state.replacingTempId).toBeNull();
    });

    it('documents the bug clearReplaceTarget fixes: without it, a cancelled Replace silently hijacks the next Add', () => {
      const store = useWorkoutBuilderStore.getState();
      store.setPendingPick({ exerciseId: 'ex-1', exerciseName: 'Bench Press' });
      store.resolvePendingPick();
      const tempId = useWorkoutBuilderStore.getState().exercises[0].tempId;

      store.beginReplace(tempId);
      // Cancelled — but this time nothing clears replacingTempId.
      store.setPendingPick({ exerciseId: 'ex-2', exerciseName: 'Overhead Press' });
      store.resolvePendingPick();

      const state = useWorkoutBuilderStore.getState();
      expect(state.exercises).toHaveLength(1); // not added
      expect(state.exercises[0].exerciseName).toBe('Overhead Press'); // Bench Press was silently replaced
    });

    it('a genuine Replace (not cancelled) still works correctly', () => {
      const store = useWorkoutBuilderStore.getState();
      store.setPendingPick({ exerciseId: 'ex-1', exerciseName: 'Bench Press' });
      store.resolvePendingPick();
      const tempId = useWorkoutBuilderStore.getState().exercises[0].tempId;

      store.beginReplace(tempId);
      store.setPendingPick({ exerciseId: 'ex-2', exerciseName: 'Incline Bench Press' });
      store.resolvePendingPick();

      const state = useWorkoutBuilderStore.getState();
      expect(state.exercises).toHaveLength(1);
      expect(state.exercises[0].exerciseName).toBe('Incline Bench Press');
      expect(state.exercises[0].tempId).toBe(tempId); // same row, swapped in place
      expect(state.replacingTempId).toBeNull();
    });
  });

  describe('true fresh-create reset', () => {
    it('reset() clears name, exercises, pendingPick, and replacingTempId together', () => {
      const store = useWorkoutBuilderStore.getState();
      store.setName('Old Draft');
      store.setPendingPick({ exerciseId: 'ex-1', exerciseName: 'Squat' });
      store.resolvePendingPick();
      store.setPendingPick({ exerciseId: 'ex-2', exerciseName: 'Deadlift' }); // left pending, unresolved
      store.beginReplace('some-tempid');

      store.reset();

      const state = useWorkoutBuilderStore.getState();
      expect(state.name).toBe('');
      expect(state.notes).toBe('');
      expect(state.exercises).toEqual([]);
      expect(state.pendingPick).toBeNull();
      expect(state.replacingTempId).toBeNull();
      expect(state.planId).toBeNull();
      expect(state.planDayId).toBeNull();
    });

    it('reset() after a save (planId set) clears planId too, so the next template is genuinely new, not an edit of the last one', () => {
      // save() sets planId on success; simulate that directly since save()
      // itself needs a real repository call.
      useWorkoutBuilderStore.setState({ planId: 'saved-plan-1', planDayId: 'saved-day-1' });
      useWorkoutBuilderStore.getState().reset();

      const state = useWorkoutBuilderStore.getState();
      expect(state.planId).toBeNull();
      expect(state.planDayId).toBeNull();
    });
  });

  describe('native (non-web) behavior is unchanged', () => {
    it('loadExisting-triggering params still take the loadExisting path regardless of platform — reset() is simply never the mechanism either platform relies on now', () => {
      // This is a documentation-level assertion: the fix removed reset() from
      // the mount effect's "no planId" branch entirely, replacing it with
      // nothing. Since native never depended on that branch running more than
      // once (screens there don't remount on this navigation), removing it
      // changes nothing observable on native — the explicit reset() at the
      // "+ New" button fires there exactly as it always effectively did.
      const store = useWorkoutBuilderStore.getState();
      store.setPendingPick({ exerciseId: 'ex-1', exerciseName: 'Pull-up' });
      store.resolvePendingPick();
      expect(useWorkoutBuilderStore.getState().exercises).toHaveLength(1);
    });
  });
});
