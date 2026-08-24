export interface DurableWorkoutSet {
  id: string;
  session_id: string;
  plan_exercise_id: string | null;
  exercise_id: string;
  weight: number;
  reps: number;
  completed_at: string;
}

export interface DurableWorkoutCompletion {
  session: {
    id: string;
    athlete_id: string;
    plan_day_id: string | null;
    started_at: string;
    completed_at: string;
    duration_seconds: number;
  };
  sets: DurableWorkoutSet[];
}

type SupabaseLike = {
  from: (table: string) => any;
};

export interface WorkoutCompletionPersistenceResult {
  sessionId: string;
  status: 'complete' | 'sets_pending';
  error?: unknown;
}

async function hasDurableCompletedSession(
  client: SupabaseLike,
  completion: DurableWorkoutCompletion,
): Promise<boolean> {
  try {
    const query = client
      .from('workout_sessions')
      .select('id, completed_at')
      .eq('id', completion.session.id)
      .eq('athlete_id', completion.session.athlete_id);
    const { data, error } = typeof query.maybeSingle === 'function'
      ? await query.maybeSingle()
      : await query.single();
    return !error && String(data?.id || '') === completion.session.id && Boolean(data?.completed_at);
  } catch {
    return false;
  }
}

export async function persistWorkoutCompletion(
  client: SupabaseLike,
  completion: DurableWorkoutCompletion,
): Promise<WorkoutCompletionPersistenceResult> {
  const sessions = client.from('workout_sessions');
  const sessionWrite = typeof sessions.upsert === 'function'
    ? sessions.upsert(completion.session, { onConflict: 'id' })
    : sessions.insert(completion.session);
  const selected = sessionWrite.select('id');
  const { data, error } = typeof selected.single === 'function'
    ? await selected.single()
    : await selected.maybeSingle();

  let persistedSessionId = data?.id ? String(data.id) : null;
  if (error || !persistedSessionId) {
    if (await hasDurableCompletedSession(client, completion)) {
      persistedSessionId = completion.session.id;
    } else {
      throw error || new Error('Workout session persistence returned no id');
    }
  }

  if (completion.sets.length > 0) {
    const rows = completion.sets.map((set) => ({
      ...set,
      session_id: persistedSessionId,
    }));
    const sets = client.from('session_sets');
    const { error: setsError } = typeof sets.upsert === 'function'
      ? await sets.upsert(rows, { onConflict: 'id' })
      : await sets.insert(rows);
    if (setsError) {
      return { sessionId: persistedSessionId, status: 'sets_pending', error: setsError };
    }
  }

  return { sessionId: persistedSessionId, status: 'complete' };
}
