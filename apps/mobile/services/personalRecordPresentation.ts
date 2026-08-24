export interface PersonalRecordLike {
  id?: string;
  exercise_id: string;
  record_type: string;
  value: number;
  achieved_at: string | number;
  [key: string]: unknown;
}

/** Return the current best per exercise and metric; identical history counts once. */
export function currentPersonalRecords<T extends PersonalRecordLike>(records: T[]): T[] {
  const best = new Map<string, T>();
  for (const record of records) {
    const key = `${record.exercise_id}:${record.record_type}`;
    const previous = best.get(key);
    const isBetter = !previous || Number(record.value) > Number(previous.value);
    const isEarlierEqual = previous && Number(record.value) === Number(previous.value)
      && new Date(record.achieved_at).getTime() < new Date(previous.achieved_at).getTime();
    if (isBetter || isEarlierEqual) best.set(key, record);
  }
  return Array.from(best.values());
}
