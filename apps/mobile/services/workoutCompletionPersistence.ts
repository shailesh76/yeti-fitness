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

export async function persistWorkoutCompletion(
  client: SupabaseLike,
  completion: DurableWorkoutCompletion,
): Promise<string> {
  const sessions = client.from('workout_sessions');
  const sessionWrite = typeof sessions.upsert === 'function'
    ? sessions.upsert(completion.session, { onConflict: 'id' })
    : sessions.insert(completion.session);
  const selected = sessionWrite.select('id');
  const { data, error } = typeof selected.single === 'function'
    ? await selected.single()
    : await selected.maybeSingle();

  if (error || !data?.id) {
    throw error || new Error('Workout session persistence returned no id');
  }

  const persistedSessionId = String(data.id);
  if (completion.sets.length > 0) {
    const rows = completion.sets.map((set) => ({
      ...set,
      session_id: persistedSessionId,
    }));
    const sets = client.from('session_sets');
    const { error: setsError } = typeof sets.upsert === 'function'
      ? await sets.upsert(rows, { onConflict: 'id' })
      : await sets.insert(rows);
    if (setsError) throw setsError;
  }

  return persistedSessionId;
}
