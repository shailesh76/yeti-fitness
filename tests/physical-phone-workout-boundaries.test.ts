import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { canonicalExerciseName } from '../packages/database/src/repositories/ExerciseRepository';
import {
  claimTerminalState,
  clearPendingDiscardIfMatches,
  discardRemoteWorkoutSession,
  enqueuePendingWorkoutDiscard,
  flushPendingWorkoutDiscard,
  readPendingWorkoutDiscards,
  reconcilePendingDiscardState,
} from '../apps/mobile/services/workoutDiscardPersistence';
import { WorkoutRepository } from '../packages/database/src/repositories/WorkoutRepository';
import {
  DurableWorkoutCompletion,
  persistWorkoutCompletion,
} from '../apps/mobile/services/workoutCompletionPersistence';

const discardStorage = new Map<string, string>();
const discardStorageAdapter = {
  getItem: async (key: string) => discardStorage.get(key) ?? null,
  setItem: async (key: string, value: string) => { discardStorage.set(key, value); },
  removeItem: async (key: string) => { discardStorage.delete(key); },
};

const completion: DurableWorkoutCompletion = {
  session: {
    id: 'session-a',
    athlete_id: 'athlete-a',
    plan_day_id: 'day-a',
    started_at: '2026-08-24T00:00:00.000Z',
    completed_at: '2026-08-24T01:00:00.000Z',
    duration_seconds: 3600,
  },
  sets: [
    { id: 'set-a', session_id: 'session-a', plan_exercise_id: 'plan-ex-a', exercise_id: 'exercise-a', weight: 80, reps: 8, completed_at: '2026-08-24T00:30:00.000Z' },
    { id: 'set-b', session_id: 'session-a', plan_exercise_id: 'plan-ex-b', exercise_id: 'exercise-b', weight: 50, reps: 10, completed_at: '2026-08-24T00:40:00.000Z' },
  ],
};

function discardClient(initialSessions: any[], initialSets: any[]) {
  const sessions = [...initialSessions];
  const sets = [...initialSets];
  let mode: 'delete' | 'select' = 'select';
  let filters: Record<string, unknown> = {};
  const chain: any = {
    delete() { mode = 'delete'; filters = {}; return chain; },
    select() { mode = 'select'; filters = {}; return chain; },
    eq(key: string, value: unknown) { filters[key] = value; return chain; },
    is(key: string, value: unknown) { filters[key] = value; return chain; },
    then(resolve: (value: unknown) => void) {
      if (mode === 'delete') {
        for (let index = sessions.length - 1; index >= 0; index -= 1) {
          const row = sessions[index];
          if (Object.entries(filters).every(([key, value]) => row[key] === value)) {
            sessions.splice(index, 1);
            for (let setIndex = sets.length - 1; setIndex >= 0; setIndex -= 1) {
              if (sets[setIndex].session_id === row.id) sets.splice(setIndex, 1);
            }
          }
        }
      }
      resolve({ error: null });
    },
    async maybeSingle() {
      const data = sessions.find((row) => Object.entries(filters).every(([key, value]) => row[key] === value)) || null;
      return { data, error: null };
    },
  };
  return { client: { from: () => chain } as any, sessions, sets };
}

function nativeDiscardDb(session: any | null, sets: any[] = [], writeError?: Error) {
  return {
    write: async (work: () => Promise<void>) => {
      if (writeError) throw writeError;
      await work();
    },
    batch: async (...operations: Array<(() => Promise<void>) | unknown>) => {
      for (const operation of operations) {
        if (typeof operation === 'function') await operation();
      }
    },
    get: (table: string) => ({
      query: () => ({
        fetch: async () => table === 'workout_sessions'
          ? (session ? [session] : [])
          : sets,
      }),
    }),
  } as any;
}

describe('physical phone workout boundaries', () => {
  beforeEach(() => discardStorage.clear());

  it('cleans repeated persisted suffixes after an exercise id remap', () => {
    expect(canonicalExerciseName(
      'Alternate Incline Dumbbell Curl (Legacy 30ee) (Legacy 30ee)',
      'ffffffff-ffff-4fff-8fff-ffffffffffff',
    )).toBe('Alternate Incline Dumbbell Curl');
    expect(canonicalExerciseName('3/4 Sit-up (Legacy a45e) (Legacy a45e)')).toBe('3/4 Sit-up');
  });

  it('fixes every Progress tab to the same compact cross-axis size', () => {
    const source = fs.readFileSync('apps/mobile/app/analytics.tsx', 'utf8');
    expect(source).toMatch(/tabsScrollView:\s*\{[^}]*height:\s*44[^}]*maxHeight:\s*44[^}]*flexGrow:\s*0/s);
    expect(source).toMatch(/tabsRow:\s*\{[^}]*height:\s*44[^}]*alignItems:\s*'center'/s);
    expect(source).toMatch(/tabBtn:\s*\{[^}]*height:\s*36[^}]*minHeight:\s*36[^}]*maxHeight:\s*36[^}]*borderRadius:\s*18[^}]*flexGrow:\s*0/s);
    expect(source).toMatch(/<ScrollView[^>]*horizontal/);
    expect(source).toMatch(/numberOfLines=\{1\}>\{tab\.label\}/);
  });

  it('preserves day identity and excludes abandoned rows from completion transport', () => {
    const pull = fs.readFileSync('supabase/functions/sync-pull/index.ts', 'utf8');
    const push = fs.readFileSync('supabase/functions/sync-push/index.ts', 'utf8');
    expect(pull).toContain("[row.plan_day?.workout_plans?.name, row.plan_day?.name]");
    expect(push).toContain("if (row.status === 'abandoned') continue");
  });

  it('keeps native discard as a durable Watermelon deletion instead of a permanent local erase', () => {
    const repository = fs.readFileSync('packages/database/src/repositories/WorkoutRepository.ts', 'utf8');
    expect(repository).toContain('set.prepareMarkAsDeleted()');
    expect(repository).toContain('session.prepareMarkAsDeleted()');
    expect(repository).toContain('await this.db.batch(');
    expect(repository).not.toMatch(/abandonWorkoutSession[\s\S]*?destroyPermanently/);
  });

  it('sync-push deletes only the authenticated athlete incomplete session', () => {
    const push = fs.readFileSync('supabase/functions/sync-push/index.ts', 'utf8');
    expect(push).toMatch(/from\('workout_sessions'\)[\s\S]*?\.delete\(\)[\s\S]*?\.eq\('athlete_id', user\.id\)[\s\S]*?\.is\('completed_at', null\)/);
  });

  it('deletes an already-synced active session and cascades its sets', async () => {
    const boundary = discardClient(
      [{ id: 'session-a', athlete_id: 'athlete-a', completed_at: null }],
      [{ id: 'set-a', session_id: 'session-a' }],
    );
    await expect(discardRemoteWorkoutSession(boundary.client, {
      sessionId: 'session-a', athleteId: 'athlete-a',
    })).resolves.toBe('discarded');
    expect(boundary.sessions).toEqual([]);
    expect(boundary.sets).toEqual([]);
  });

  it('repeated remote discard is idempotent', async () => {
    const boundary = discardClient([{ id: 'session-a', athlete_id: 'athlete-a', completed_at: null }], []);
    const intent = { sessionId: 'session-a', athleteId: 'athlete-a' };
    await expect(discardRemoteWorkoutSession(boundary.client, intent)).resolves.toBe('discarded');
    await expect(discardRemoteWorkoutSession(boundary.client, intent)).resolves.toBe('discarded');
  });

  it('does not delete a durably completed remote workout', async () => {
    const boundary = discardClient(
      [{ id: 'session-a', athlete_id: 'athlete-a', completed_at: '2026-08-24T01:00:00Z' }],
      [{ id: 'set-a', session_id: 'session-a' }],
    );
    await expect(discardRemoteWorkoutSession(boundary.client, {
      sessionId: 'session-a', athleteId: 'athlete-a',
    })).resolves.toBe('already_completed');
    expect(boundary.sessions).toHaveLength(1);
    expect(boundary.sets).toHaveLength(1);
  });

  it('cannot discard another athlete session', async () => {
    const boundary = discardClient([{ id: 'session-b', athlete_id: 'athlete-b', completed_at: null }], []);
    await expect(discardRemoteWorkoutSession(boundary.client, {
      sessionId: 'session-b', athleteId: 'athlete-a',
    })).resolves.toBe('discarded');
    expect(boundary.sessions).toHaveLength(1);
  });

  it('persists discard before clearing active and pending completion storage', () => {
    const store = fs.readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    const persist = store.indexOf('enqueuePendingWorkoutDiscard(discard)');
    const clearActive = store.indexOf('AsyncStorage.removeItem(SESSION_STORAGE_KEY)', persist);
    const clearCompletion = store.indexOf('AsyncStorage.removeItem(PENDING_COMPLETION_KEY)', persist);
    expect(persist).toBeGreaterThan(-1);
    expect(clearActive).toBeGreaterThan(persist);
    expect(clearCompletion).toBeGreaterThan(persist);
  });

  it('restart suppresses a discarded active session before remote acknowledgement', () => {
    const store = fs.readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    expect(store).toContain('reconcilePendingDiscardState(');
    expect(store).toContain('void flushPendingWorkoutDiscard(supabase, discard, undefined, true)');
  });

  it('same-session pending completion loses to confirmed pending discard', () => {
    const store = fs.readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    expect(store).toContain('reconcilePendingDiscardState(');
    expect(store).toMatch(/pendingDiscards\.some\(\(discard\) => \([\s\S]*?discard\.sessionId === stored\.session\.id[\s\S]*?!discard\.preservePendingCompletion/);
  });

  it('discard removes optimistic history without creating PR, volume, or consistency credit', () => {
    const store = fs.readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    const abandon = store.slice(store.indexOf('abandonSession: async () =>'));
    expect(abandon).toContain('removeWorkoutLog(session.localId)');
    expect(abandon).not.toContain('recordPersonalBests(');
    expect(abandon).not.toContain('weeklyWorkoutCount:');
  });

  it('discard leaves the assigned day retryable and does not mark it completed', () => {
    const store = fs.readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    const abandon = store.slice(store.indexOf('abandonSession: async () =>'));
    expect(abandon).toContain('buildTodaysPlan({');
    expect(abandon).not.toContain('completedDayIds.add(session.planDayId)');
  });

  it('pending discard A suppresses active session A only', () => {
    const activeA = { localId: 'session-a' };
    const result = reconcilePendingDiscardState(activeA, null, {
      sessionId: 'session-a', athleteId: 'athlete-a',
    });
    expect(result.activeSession).toBeNull();
    expect(result.clearActiveStorage).toBe(true);
  });

  it('pending discard A preserves active session B', () => {
    const activeB = { localId: 'session-b' };
    const result = reconcilePendingDiscardState(activeB, null, {
      sessionId: 'session-a', athleteId: 'athlete-a',
    });
    expect(result.activeSession).toBe(activeB);
    expect(result.clearActiveStorage).toBe(false);
  });

  it('pending discard A suppresses pending completion A only', () => {
    const completionA = { session: { id: 'session-a' } };
    const result = reconcilePendingDiscardState(null, completionA, {
      sessionId: 'session-a', athleteId: 'athlete-a',
    });
    expect(result.pendingCompletion).toBeNull();
    expect(result.clearCompletionStorage).toBe(true);
  });

  it('pending discard A preserves pending completion B', () => {
    const completionB = { session: { id: 'session-b' } };
    const result = reconcilePendingDiscardState(null, completionB, {
      sessionId: 'session-a', athleteId: 'athlete-a',
    });
    expect(result.pendingCompletion).toBe(completionB);
    expect(result.clearCompletionStorage).toBe(false);
  });

  it('pending discard A preserves active and completion state for B together', () => {
    const activeB = { localId: 'session-b' };
    const completionB = { session: { id: 'session-b' } };
    const result = reconcilePendingDiscardState(activeB, completionB, {
      sessionId: 'session-a', athleteId: 'athlete-a',
    });
    expect(result.activeSession).toBe(activeB);
    expect(result.pendingCompletion).toBe(completionB);
    expect(result.clearActiveStorage).toBe(false);
    expect(result.clearCompletionStorage).toBe(false);
  });

  it('missing or already-deleted native session is idempotent success', async () => {
    const repository = new WorkoutRepository(nativeDiscardDb(null), null as any);
    await expect(repository.abandonWorkoutSession('session-a')).resolves.toBeUndefined();
  });

  it('native set deletion failure propagates', async () => {
    const session = { prepareMarkAsDeleted: () => async () => undefined };
    const sets = [{ prepareMarkAsDeleted: () => async () => { throw new Error('set delete failed'); } }];
    const repository = new WorkoutRepository(nativeDiscardDb(session, sets), null as any);
    await expect(repository.abandonWorkoutSession('session-a')).rejects.toThrow('set delete failed');
  });

  it('native session deletion failure propagates', async () => {
    const session = { prepareMarkAsDeleted: () => async () => { throw new Error('session delete failed'); } };
    const sets = [{ prepareMarkAsDeleted: () => async () => undefined }];
    const repository = new WorkoutRepository(nativeDiscardDb(session, sets), null as any);
    await expect(repository.abandonWorkoutSession('session-a')).rejects.toThrow('session delete failed');
  });

  it('native database transaction failure propagates', async () => {
    const repository = new WorkoutRepository(
      nativeDiscardDb(null, [], new Error('transaction failed')),
      null as any,
    );
    await expect(repository.abandonWorkoutSession('session-a')).rejects.toThrow('transaction failed');
  });

  it('native discard retries after transient failure and succeeds once', async () => {
    let attempts = 0;
    let successfulSessionMarks = 0;
    const session = {
      prepareMarkAsDeleted: () => async () => {
          attempts += 1;
          if (attempts === 1) throw new Error('transient');
          successfulSessionMarks += 1;
        },
    };
    const repository = new WorkoutRepository(nativeDiscardDb(session), null as any);
    await expect(repository.abandonWorkoutSession('session-a')).rejects.toThrow('transient');
    await expect(repository.abandonWorkoutSession('session-a')).resolves.toBeUndefined();
    expect(successfulSessionMarks).toBe(1);
  });

  it('native state and storage cleanup occur only after repository deletion succeeds', () => {
    const store = fs.readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    const abandon = store.slice(store.indexOf('abandonSession: async () =>'));
    const nativeDelete = abandon.indexOf('await workoutRepository.abandonWorkoutSession(session.localId)');
    const persistDiscard = abandon.indexOf('enqueuePendingWorkoutDiscard(discard)');
    const clearSession = abandon.indexOf('AsyncStorage.removeItem(SESSION_STORAGE_KEY)');
    expect(nativeDelete).toBeGreaterThan(-1);
    expect(persistDiscard).toBeLessThan(nativeDelete);
    expect(clearSession).toBeGreaterThan(nativeDelete);
    expect(abandon).toContain('clearPendingDiscardIfMatches(session.localId)');
  });

  it('session success plus set failure is completed with child rows pending', async () => {
    const client = {
      from: (table: string) => table === 'workout_sessions'
        ? { upsert: () => ({ select: () => ({ single: async () => ({ data: { id: 'session-a' }, error: null }) }) }) }
        : { upsert: async () => ({ error: new Error('set batch failed') }) },
    };
    await expect(persistWorkoutCompletion(client, completion)).resolves.toMatchObject({
      sessionId: 'session-a',
      status: 'sets_pending',
    });
  });

  it('an already-completed server session resumes only its idempotent set retry', async () => {
    let setWrites = 0;
    const sessionQuery: any = {
      upsert: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error('response lost') }) }) }),
      select: () => sessionQuery,
      eq: () => sessionQuery,
      maybeSingle: async () => ({ data: { id: 'session-a', completed_at: completion.session.completed_at }, error: null }),
    };
    const client = {
      from: (table: string) => table === 'workout_sessions'
        ? sessionQuery
        : { upsert: async () => { setWrites += 1; return { error: null }; } },
    };
    await expect(persistWorkoutCompletion(client, completion)).resolves.toEqual({
      sessionId: 'session-a',
      status: 'complete',
    });
    expect(setWrites).toBe(1);
  });

  it('partial child retry uses stable IDs and does not duplicate existing sets', async () => {
    const persistedSets = new Map<string, DurableWorkoutCompletion['sets'][number]>();
    let firstAttempt = true;
    const client = {
      from: (table: string) => table === 'workout_sessions'
        ? { upsert: () => ({ select: () => ({ single: async () => ({ data: { id: 'session-a' }, error: null }) }) }) }
        : { upsert: async (rows: DurableWorkoutCompletion['sets']) => {
            if (firstAttempt) {
              firstAttempt = false;
              persistedSets.set(rows[0].id, rows[0]);
              return { error: new Error('partial transport failure') };
            }
            rows.forEach((row) => persistedSets.set(row.id, row));
            return { error: null };
          } },
    };
    expect((await persistWorkoutCompletion(client, completion)).status).toBe('sets_pending');
    expect((await persistWorkoutCompletion(client, completion)).status).toBe('complete');
    expect([...persistedSets.keys()].sort()).toEqual(['set-a', 'set-b']);
  });

  it('partial completion remains terminal and cannot flow through Discard', () => {
    const store = fs.readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    expect(store).toContain("status === 'sets_pending'");
    expect(store).toContain("terminalState: 'COMPLETED'");
    expect(claimTerminalState('COMPLETED', 'DISCARDING')).toBeNull();
  });

  it('proven completion clears only the stale active snapshot non-destructively', () => {
    const workouts = fs.readFileSync('apps/mobile/app/workouts.tsx', 'utf8');
    const store = fs.readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    expect(workouts).toContain('clearStaleActiveSession(');
    expect(workouts).not.toMatch(/completedPlanDayIds\.has\(activeSession\.planDayId\)[\s\S]{0,120}abandonSession/);
    const clear = store.slice(store.indexOf('clearStaleActiveSession: async'));
    expect(clear).not.toContain('abandonWorkoutSession(');
    expect(clear).not.toContain('removeWorkoutLog(');
  });

  it('matching native stale row is reconciled to completed without deletion', async () => {
    let deleted = false;
    const row: any = {
      id: 'session-a',
      status: 'active',
      prepareMarkAsDeleted: () => { deleted = true; return {}; },
      update: async (mutate: (record: any) => void) => mutate(row),
    };
    const repository = new WorkoutRepository(nativeDiscardDb(row), null as any);
    await repository.reconcileStaleActiveSession('session-a', 'session-a', completion.session.completed_at);
    expect(row.status).toBe('completed');
    expect(row.finished_at).toBe(new Date(completion.session.completed_at).getTime());
    expect(deleted).toBe(false);
  });

  it('distinct stale native attempt is deleted without touching the completed session', async () => {
    let staleDeleted = false;
    const stale: any = {
      id: 'session-stale',
      prepareMarkAsDeleted: () => () => { staleDeleted = true; },
    };
    const repository = new WorkoutRepository(nativeDiscardDb(stale), null as any);
    await repository.reconcileStaleActiveSession('session-stale', 'session-completed', completion.session.completed_at);
    expect(staleDeleted).toBe(true);
  });

  it('stale active A cleanup cannot clear a replacement active B', () => {
    const store = fs.readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    const clear = store.slice(store.indexOf('clearStaleActiveSession: async'));
    expect(clear).toContain('state.activeSession?.localId === sessionId');
  });

  it('native discard failure keeps the snapshot and returns terminal ownership to ACTIVE', () => {
    const store = fs.readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    const abandon = store.slice(store.indexOf('abandonSession: async () =>'), store.indexOf('clearStaleActiveSession: async'));
    const nativeDelete = abandon.indexOf('await workoutRepository.abandonWorkoutSession(session.localId)');
    expect(abandon.indexOf('AsyncStorage.removeItem(SESSION_STORAGE_KEY)')).toBeGreaterThan(nativeDelete);
    expect(abandon.indexOf("terminalState: 'ACTIVE'", nativeDelete)).toBeGreaterThan(nativeDelete);
  });

  it('post-delete storage cleanup failure retains the discard marker', () => {
    const store = fs.readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    const abandon = store.slice(store.indexOf('abandonSession: async () =>'), store.indexOf('clearStaleActiveSession: async'));
    expect(abandon).toContain('await Promise.all(removals)');
    expect(abandon).toContain('if (localReconciled)');
    expect(abandon.indexOf("terminalState: 'DISCARDED'")).toBeGreaterThan(abandon.indexOf('await Promise.all(removals)'));
  });

  it('remote success plus local cleanup failure remains suppressed across restart', async () => {
    const intent = { sessionId: 'session-a', athleteId: 'athlete-a' };
    const boundary = discardClient(
      [{ id: 'session-a', athlete_id: 'athlete-a', completed_at: null }],
      [{ id: 'set-a', session_id: 'session-a' }],
    );
    await enqueuePendingWorkoutDiscard(intent, discardStorageAdapter);
    await discardRemoteWorkoutSession(boundary.client, intent);

    const firstHydration = reconcilePendingDiscardState({ localId: 'session-a' }, null, await readPendingWorkoutDiscards(discardStorageAdapter));
    expect(firstHydration.activeSession).toBeNull();
    expect(await readPendingWorkoutDiscards(discardStorageAdapter)).toEqual([intent]);

    const restarted = reconcilePendingDiscardState({ localId: 'session-a' }, null, await readPendingWorkoutDiscards(discardStorageAdapter));
    expect(restarted.activeSession).toBeNull();
    await expect(flushPendingWorkoutDiscard(boundary.client, intent, discardStorageAdapter, true)).resolves.toBe(true);
    expect(await readPendingWorkoutDiscards(discardStorageAdapter)).toEqual([]);
  });

  it('discard cannot be acknowledged before local reconciliation succeeds', async () => {
    const intent = { sessionId: 'session-a', athleteId: 'athlete-a' };
    const boundary = discardClient([{ id: 'session-a', athlete_id: 'athlete-a', completed_at: null }], []);
    await enqueuePendingWorkoutDiscard(intent, discardStorageAdapter);
    await expect(flushPendingWorkoutDiscard(boundary.client, intent, discardStorageAdapter, false)).resolves.toBe(false);
    expect(boundary.sessions).toHaveLength(1);
    expect(await readPendingWorkoutDiscards(discardStorageAdapter)).toEqual([intent]);
  });

  it('completed-session stale cleanup preserves its pending child-set retry', () => {
    const pendingCompletion = { session: { id: 'session-a' } };
    const intent = {
      sessionId: 'session-a',
      athleteId: 'athlete-a',
      preservePendingCompletion: true,
    };
    const reconciled = reconcilePendingDiscardState({ localId: 'session-a' }, pendingCompletion, intent);
    expect(reconciled.activeSession).toBeNull();
    expect(reconciled.pendingCompletion).toBe(pendingCompletion);
    expect(reconciled.clearCompletionStorage).toBe(false);
  });

  it('obsolete PWA attempt is removed by exact athlete/session/incomplete identity and cannot pull again', async () => {
    const boundary = discardClient(
      [
        { id: 'session-stale', athlete_id: 'athlete-a', completed_at: null },
        { id: 'session-completed', athlete_id: 'athlete-a', completed_at: completion.session.completed_at },
      ],
      [{ id: 'set-stale', session_id: 'session-stale' }],
    );
    await discardRemoteWorkoutSession(boundary.client, {
      sessionId: 'session-stale', athleteId: 'athlete-a',
    });
    expect(boundary.sessions.map((row) => row.id)).toEqual(['session-completed']);
    expect(boundary.sets).toEqual([]);
  });

  it('Workouts retries pending stale cleanup on offline-to-online reconnect', () => {
    const workouts = fs.readFileSync('apps/mobile/app/workouts.tsx', 'utf8');
    expect(workouts).toContain("from '@react-native-community/netinfo'");
    expect(workouts).toContain('connected && wasConnected === false');
    expect(workouts).toContain('void resumeSession()');
  });

  it('completion publication remains single-shot while missing sets retry separately', () => {
    const store = fs.readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    const retry = store.slice(store.indexOf('retryPendingCompletion: async () =>'), store.indexOf('abandonSession: async () =>'));
    expect(retry).not.toContain('publishCompletedSession(');
    expect(retry).not.toContain('recordPersonalBests(');
  });

  it('discard A acknowledgement after B is queued preserves B', async () => {
    await enqueuePendingWorkoutDiscard({ sessionId: 'session-a', athleteId: 'athlete-a' }, discardStorageAdapter);
    await enqueuePendingWorkoutDiscard({ sessionId: 'session-b', athleteId: 'athlete-a' }, discardStorageAdapter);
    await expect(clearPendingDiscardIfMatches('session-a', discardStorageAdapter)).resolves.toBe(true);
    expect(await readPendingWorkoutDiscards(discardStorageAdapter)).toEqual([
      { sessionId: 'session-b', athleteId: 'athlete-a' },
    ]);
  });

  it('discard A acknowledgement clears A when A remains current', async () => {
    await enqueuePendingWorkoutDiscard({ sessionId: 'session-a', athleteId: 'athlete-a' }, discardStorageAdapter);
    await expect(clearPendingDiscardIfMatches('session-a', discardStorageAdapter)).resolves.toBe(true);
    expect(await readPendingWorkoutDiscards(discardStorageAdapter)).toEqual([]);
  });

  it('queued discard operations remain isolated by athlete and session', async () => {
    await enqueuePendingWorkoutDiscard({ sessionId: 'session-a', athleteId: 'athlete-a' }, discardStorageAdapter);
    await enqueuePendingWorkoutDiscard({ sessionId: 'session-b', athleteId: 'athlete-b' }, discardStorageAdapter);
    await clearPendingDiscardIfMatches('session-a', discardStorageAdapter);
    expect(await readPendingWorkoutDiscards(discardStorageAdapter)).toEqual([
      { sessionId: 'session-b', athleteId: 'athlete-b' },
    ]);
  });

  it('Finish in progress rejects Discard even when promises resolve in reverse order', async () => {
    let state: any = 'ACTIVE';
    let releaseFinish!: () => void;
    const finishGate = new Promise<void>((resolve) => { releaseFinish = resolve; });
    const finish = (async () => {
      const claimed = claimTerminalState(state, 'FINISHING');
      expect(claimed).toBe('FINISHING');
      state = claimed;
      await finishGate;
      state = 'COMPLETED';
    })();
    expect(claimTerminalState(state, 'DISCARDING')).toBeNull();
    releaseFinish();
    await finish;
    expect(state).toBe('COMPLETED');
  });

  it('Discard in progress rejects Finish', () => {
    const state = claimTerminalState('ACTIVE', 'DISCARDING');
    expect(state).toBe('DISCARDING');
    expect(claimTerminalState(state!, 'FINISHING')).toBeNull();
  });

  it('Finish failure returns to ACTIVE and permits Discard', () => {
    let state = claimTerminalState('ACTIVE', 'FINISHING');
    expect(state).toBe('FINISHING');
    state = 'ACTIVE';
    expect(claimTerminalState(state, 'DISCARDING')).toBe('DISCARDING');
  });

  it('Discard failure returns to ACTIVE and permits Finish', () => {
    let state = claimTerminalState('ACTIVE', 'DISCARDING');
    expect(state).toBe('DISCARDING');
    state = 'ACTIVE';
    expect(claimTerminalState(state, 'FINISHING')).toBe('FINISHING');
  });

  it('rapid Finish plus Discard has exactly one terminal owner', () => {
    const first = claimTerminalState('ACTIVE', 'FINISHING');
    const second = claimTerminalState(first!, 'DISCARDING');
    expect([first, second].filter(Boolean)).toEqual(['FINISHING']);
  });

  it('rapid Discard plus Finish has exactly one terminal owner', () => {
    const first = claimTerminalState('ACTIVE', 'DISCARDING');
    const second = claimTerminalState(first!, 'FINISHING');
    expect([first, second].filter(Boolean)).toEqual(['DISCARDING']);
  });

  it('store guards terminal ownership below the UI layer', () => {
    const store = fs.readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    expect(store.match(/claimTerminalState\(currentTerminal, 'FINISHING'\)/g)?.length).toBeGreaterThanOrEqual(2);
    expect(store.match(/claimTerminalState\(currentTerminal, 'DISCARDING'\)/g)).toHaveLength(1);
  });

  it('completed terminal state rejects a later stale Discard', () => {
    expect(claimTerminalState('COMPLETED', 'DISCARDING')).toBeNull();
  });

  it('discarded terminal state rejects a later stale Finish', () => {
    expect(claimTerminalState('DISCARDED', 'FINISHING')).toBeNull();
  });

  it('completion side effects are published only after durable persistence', () => {
    const store = fs.readFileSync('apps/mobile/store/useSessionStore.ts', 'utf8');
    const finish = store.slice(store.indexOf('finishSession: async () =>'), store.indexOf('retryPendingCompletion: async () =>'));
    expect(finish.indexOf('publishCompletedSession(')).toBeGreaterThan(finish.indexOf('persistWorkoutCompletion(supabase, completion)'));
  });

  it('UI disables Finish, Discard, Continue, and workout options during terminal work', () => {
    const screen = fs.readFileSync('apps/mobile/app/workouts/session.tsx', 'utf8');
    expect(screen).toContain("terminalState === 'FINISHING' || terminalState === 'DISCARDING'");
    expect(screen.match(/disabled=\{isTerminalBusy\}/g)?.length).toBeGreaterThanOrEqual(5);
  });
});
