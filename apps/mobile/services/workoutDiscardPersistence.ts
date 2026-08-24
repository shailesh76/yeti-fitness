import AsyncStorage from '@react-native-async-storage/async-storage';

export const PENDING_DISCARD_KEY = '@yeti_pending_workout_discard';

export interface PendingWorkoutDiscard {
  sessionId: string;
  athleteId: string;
  preservePendingCompletion?: boolean;
}

export type SessionTerminalState = 'ACTIVE' | 'FINISHING' | 'DISCARDING' | 'COMPLETED' | 'DISCARDED';

export function claimTerminalState(
  current: SessionTerminalState,
  requested: 'FINISHING' | 'DISCARDING',
): SessionTerminalState | null {
  return current === 'ACTIVE' ? requested : null;
}

let discardStorageLock: Promise<void> = Promise.resolve();

interface DiscardStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

function withDiscardStorageLock<T>(work: () => Promise<T>): Promise<T> {
  const result = discardStorageLock.then(work, work);
  discardStorageLock = result.then(() => undefined, () => undefined);
  return result;
}

function parseDiscardQueue(raw: string | null): PendingWorkoutDiscard[] {
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function readDiscardQueueUnlocked(storage: DiscardStorage): Promise<PendingWorkoutDiscard[]> {
  return parseDiscardQueue(await storage.getItem(PENDING_DISCARD_KEY));
}

export function readPendingWorkoutDiscards(
  storage: DiscardStorage = AsyncStorage,
): Promise<PendingWorkoutDiscard[]> {
  return withDiscardStorageLock(() => readDiscardQueueUnlocked(storage));
}

export function enqueuePendingWorkoutDiscard(
  discard: PendingWorkoutDiscard,
  storage: DiscardStorage = AsyncStorage,
): Promise<void> {
  return withDiscardStorageLock(async () => {
    const queue = await readDiscardQueueUnlocked(storage);
    const next = [...queue.filter((item) => item.sessionId !== discard.sessionId), discard];
    await storage.setItem(PENDING_DISCARD_KEY, JSON.stringify(next));
  });
}

export function clearPendingDiscardIfMatches(
  sessionId: string,
  storage: DiscardStorage = AsyncStorage,
): Promise<boolean> {
  return withDiscardStorageLock(async () => {
    const queue = await readDiscardQueueUnlocked(storage);
    if (!queue.some((item) => item.sessionId === sessionId)) return false;
    const next = queue.filter((item) => item.sessionId !== sessionId);
    if (next.length > 0) {
      await storage.setItem(PENDING_DISCARD_KEY, JSON.stringify(next));
    } else {
      await storage.removeItem(PENDING_DISCARD_KEY);
    }
    return true;
  });
}

export function reconcilePendingDiscardState<
  TActive extends { localId: string },
  TCompletion extends { session: { id: string } },
>(
  activeSession: TActive | null,
  pendingCompletion: TCompletion | null,
  pendingDiscard: PendingWorkoutDiscard | PendingWorkoutDiscard[] | null,
) {
  const pendingDiscards = pendingDiscard
    ? (Array.isArray(pendingDiscard) ? pendingDiscard : [pendingDiscard])
    : [];
  const activeMatches = Boolean(
    activeSession && pendingDiscards.some((item) => item.sessionId === activeSession.localId),
  );
  const completionMatches = Boolean(
    pendingCompletion && pendingDiscards.some((item) => (
      item.sessionId === pendingCompletion.session.id && !item.preservePendingCompletion
    )),
  );
  return {
    activeSession: activeMatches ? null : activeSession,
    pendingCompletion: completionMatches ? null : pendingCompletion,
    clearActiveStorage: activeMatches,
    clearCompletionStorage: completionMatches,
  };
}

interface SupabaseLike {
  from: (table: string) => any;
}

export async function discardRemoteWorkoutSession(
  client: SupabaseLike,
  discard: PendingWorkoutDiscard,
): Promise<'discarded' | 'already_completed'> {
  const { error: deleteError } = await client
    .from('workout_sessions')
    .delete()
    .eq('id', discard.sessionId)
    .eq('athlete_id', discard.athleteId)
    .is('completed_at', null);
  if (deleteError) throw deleteError;

  const { data, error: verifyError } = await client
    .from('workout_sessions')
    .select('id, completed_at')
    .eq('id', discard.sessionId)
    .eq('athlete_id', discard.athleteId)
    .maybeSingle();
  if (verifyError) throw verifyError;
  if (data?.completed_at) return 'already_completed';
  if (data) throw new Error('Workout discard was not acknowledged');
  return 'discarded';
}

export async function flushPendingWorkoutDiscard(
  client: SupabaseLike,
  discard: PendingWorkoutDiscard,
  storage: DiscardStorage = AsyncStorage,
  localReconciled: boolean,
): Promise<boolean> {
  if (!localReconciled) return false;
  try {
    await discardRemoteWorkoutSession(client, discard);
    await clearPendingDiscardIfMatches(discard.sessionId, storage);
    return true;
  } catch {
    return false;
  }
}
