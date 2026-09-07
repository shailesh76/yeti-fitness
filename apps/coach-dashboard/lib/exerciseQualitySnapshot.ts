import {
  evaluateExerciseQuality,
  matchesQualityAssessment,
  type ExerciseQualityAssessment,
  type ExerciseQualityFilter,
  type ExerciseQualityInput,
  type ExerciseRelationCounts,
} from './exerciseQuality';
import {
  classifyExerciseMedia,
  matchesExerciseMediaFilter,
  type ExerciseMediaCompletenessFilter,
  type ExerciseMediaRecord,
} from './exerciseMedia';

export interface QualityExercise extends ExerciseQualityInput {
  id: string;
  name: string;
  slug: string;
  source_type: string;
  category?: string | null;
  equipment?: string | null;
  primary_muscle?: string | null;
  target_muscle?: string | null;
  difficulty?: string | null;
  created_at?: string | null;
}

interface ExerciseRelationRow {
  id: string;
  exercise_id: string;
}

interface ExerciseAliasRow extends ExerciseRelationRow {
  alias: string;
}

export interface ExerciseQualitySnapshot {
  exercises: QualityExercise[];
  assessments: Map<string, ExerciseQualityAssessment>;
  relationCounts: Map<string, ExerciseRelationCounts>;
  mediaByExercise: Map<string, ExerciseMediaRecord[]>;
  aliasesByExercise: Map<string, string[]>;
  firstPartySummary: FirstPartyQualitySummary;
}

export interface FirstPartyQualitySummary {
  total: number;
  ready: number;
  incomplete: number;
  readyPercentage: number;
}

export interface ExerciseSnapshotFilters {
  search: string;
  source: 'all' | 'yeti_first_party' | 'legacy_catalog' | 'custom';
  category: string;
  muscle: string;
  equipment: string;
  difficulty: string;
  media: 'all' | ExerciseMediaCompletenessFilter;
  quality: ExerciseQualityFilter;
  sort: 'az' | 'newest';
}

export interface FilteredExercisePage {
  exercises: QualityExercise[];
  totalCount: number;
  totalPages: number;
}

type SupabaseClientLike = {
  from: (table: string) => {
    select: (columns: string, options?: { count?: 'exact' }) => any;
  };
};

const EMPTY_RELATIONS: ExerciseRelationCounts = {
  tagsCount: 0,
  musclesCount: 0,
  alternativesCount: 0,
  aliasesCount: 0,
  progressionsCount: 0,
  regressionsCount: 0,
};

async function fetchAllRows<T>(
  client: SupabaseClientLike,
  table: string,
  columns: string,
  orderColumn: keyof T & string,
  pageSize = 1000,
  configure?: (query: any) => any,
): Promise<T[]> {
  const rows: T[] = [];
  const seenOrderKeys = new Set<unknown>();
  for (let from = 0; ; from += pageSize) {
    const baseQuery = client.from(table).select(columns);
    const query = configure ? configure(baseQuery) : baseQuery;
    const { data, error } = await query.order(orderColumn, { ascending: true }).range(from, from + pageSize - 1);
    if (error) throw new Error(`Could not load exercise quality ${table}: ${error.message}`);
    const page = (data ?? []) as T[];
    for (const row of page) {
      const orderKey = row[orderColumn];
      if (orderKey === null || orderKey === undefined || orderKey === '') {
        throw new Error(`Could not load exercise quality ${table}: missing ${orderColumn}.`);
      }
      if (seenOrderKeys.has(orderKey)) {
        throw new Error(`Could not load exercise quality ${table}: duplicate ${orderColumn} ${String(orderKey)}.`);
      }
      seenOrderKeys.add(orderKey);
    }
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

function incrementRelation(
  counts: Map<string, ExerciseRelationCounts>,
  exerciseId: string,
  field: keyof ExerciseRelationCounts,
): void {
  const entry = counts.get(exerciseId);
  if (entry) entry[field]++;
}

export function summarizeFirstPartyQuality(
  exercises: QualityExercise[],
  assessments: Map<string, ExerciseQualityAssessment>,
): FirstPartyQualitySummary {
  const firstParty = exercises.filter((exercise) => exercise.source_type === 'yeti_first_party');
  const ready = firstParty.filter((exercise) => assessments.get(exercise.id)?.fullyPublished).length;
  return {
    total: firstParty.length,
    ready,
    incomplete: firstParty.length - ready,
    readyPercentage: firstParty.length === 0 ? 0 : Math.round((ready / firstParty.length) * 1000) / 10,
  };
}

export async function loadExerciseQualitySnapshot(
  client: SupabaseClientLike,
): Promise<ExerciseQualitySnapshot> {
  const activeExercises = await fetchAllRows<QualityExercise>(
    client,
    'exercises',
    '*',
    'id',
    1000,
    (query) => query.is('archived_at', null),
  );
  const activeIds = new Set(activeExercises.map((exercise) => exercise.id));

  const [tags, muscles, alternatives, aliases, progressions, regressions, media] = await Promise.all([
    fetchAllRows<ExerciseRelationRow>(client, 'exercise_tags', 'id, exercise_id', 'id'),
    fetchAllRows<ExerciseRelationRow>(client, 'exercise_muscles', 'id, exercise_id', 'id'),
    fetchAllRows<ExerciseRelationRow>(client, 'exercise_alternatives', 'id, exercise_id', 'id'),
    fetchAllRows<ExerciseAliasRow>(client, 'exercise_aliases', 'id, exercise_id, alias', 'id'),
    fetchAllRows<ExerciseRelationRow>(client, 'exercise_progressions', 'id, exercise_id', 'id'),
    fetchAllRows<ExerciseRelationRow>(client, 'exercise_regressions', 'id, exercise_id', 'id'),
    fetchAllRows<ExerciseMediaRecord>(
      client,
      'exercise_media',
      'id, exercise_id, media_type, file_format, url, r2_key, thumbnail_url, is_primary, media_status, media_notes, created_at',
      'id',
    ),
  ]);

  const relationCounts = new Map<string, ExerciseRelationCounts>();
  const aliasesByExercise = new Map<string, string[]>();
  const mediaByExercise = new Map<string, ExerciseMediaRecord[]>();
  for (const exercise of activeExercises) relationCounts.set(exercise.id, { ...EMPTY_RELATIONS });

  for (const row of tags) if (activeIds.has(row.exercise_id)) incrementRelation(relationCounts, row.exercise_id, 'tagsCount');
  for (const row of muscles) if (activeIds.has(row.exercise_id)) incrementRelation(relationCounts, row.exercise_id, 'musclesCount');
  for (const row of alternatives) if (activeIds.has(row.exercise_id)) incrementRelation(relationCounts, row.exercise_id, 'alternativesCount');
  for (const row of progressions) if (activeIds.has(row.exercise_id)) incrementRelation(relationCounts, row.exercise_id, 'progressionsCount');
  for (const row of regressions) if (activeIds.has(row.exercise_id)) incrementRelation(relationCounts, row.exercise_id, 'regressionsCount');
  for (const row of aliases) {
    if (!activeIds.has(row.exercise_id)) continue;
    incrementRelation(relationCounts, row.exercise_id, 'aliasesCount');
    aliasesByExercise.set(row.exercise_id, [...(aliasesByExercise.get(row.exercise_id) ?? []), row.alias]);
  }
  for (const row of media) {
    if (!activeIds.has(row.exercise_id)) continue;
    mediaByExercise.set(row.exercise_id, [...(mediaByExercise.get(row.exercise_id) ?? []), row]);
  }

  const assessments = new Map<string, ExerciseQualityAssessment>();
  for (const exercise of activeExercises) {
    assessments.set(exercise.id, evaluateExerciseQuality({
      ...exercise,
      aliases: (aliasesByExercise.get(exercise.id) ?? []).map((alias) => ({ alias })),
      media: (mediaByExercise.get(exercise.id) ?? []).map((row) => ({
        id: row.id,
        media_status: row.media_status ?? undefined,
        r2_key: row.r2_key,
        url: row.url,
      })),
    }, relationCounts.get(exercise.id)));
  }

  return {
    exercises: activeExercises,
    assessments,
    relationCounts,
    mediaByExercise,
    aliasesByExercise,
    firstPartySummary: summarizeFirstPartyQuality(activeExercises, assessments),
  };
}

function normalizeSearchValue(value: string | null | undefined): string {
  return (value ?? '').toLocaleLowerCase().replace(/[\s-]+/g, ' ').trim();
}

function contains(value: string | null | undefined, query: string): boolean {
  return normalizeSearchValue(value).includes(query);
}

export function filterExerciseQualitySnapshot(
  snapshot: ExerciseQualitySnapshot,
  filters: ExerciseSnapshotFilters,
  page: number,
  pageSize: number,
): FilteredExercisePage {
  const query = normalizeSearchValue(filters.search);
  const matching = snapshot.exercises.filter((exercise) => {
    if (filters.source !== 'all' && exercise.source_type !== filters.source) return false;
    if (filters.category !== 'all' && exercise.category !== filters.category) return false;
    if (filters.equipment !== 'all' && exercise.equipment !== filters.equipment) return false;
    if (filters.difficulty !== 'all' && exercise.difficulty !== filters.difficulty) return false;
    if (filters.muscle !== 'all'
      && !contains(exercise.primary_muscle, filters.muscle.toLocaleLowerCase())
      && !contains(exercise.target_muscle, filters.muscle.toLocaleLowerCase())) return false;
    if (query && ![
      exercise.name,
      exercise.slug,
      exercise.equipment,
      exercise.primary_muscle,
      exercise.target_muscle,
      ...(snapshot.aliasesByExercise.get(exercise.id) ?? []),
    ].some((value) => contains(value, query))) return false;

    const assessment = snapshot.assessments.get(exercise.id);
    if (!assessment) return false;
    if (!matchesQualityAssessment(assessment, filters.quality)) return false;
    if (filters.media !== 'all'
      && !matchesExerciseMediaFilter(snapshot.mediaByExercise.get(exercise.id) ?? [], filters.media)) return false;
    return true;
  });

  matching.sort((a, b) => filters.sort === 'az'
    ? a.name.localeCompare(b.name)
    : (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  const totalPages = Math.max(1, Math.ceil(matching.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const from = (safePage - 1) * pageSize;
  return { exercises: matching.slice(from, from + pageSize), totalCount: matching.length, totalPages };
}

export function getExerciseMediaCompleteness(snapshot: ExerciseQualitySnapshot, exerciseId: string) {
  return classifyExerciseMedia(snapshot.mediaByExercise.get(exerciseId) ?? []);
}
