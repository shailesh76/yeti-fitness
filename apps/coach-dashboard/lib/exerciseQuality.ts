// apps/coach-dashboard/lib/exerciseQuality.ts

export type ExerciseQualityStatus =
  | 'fully_published'
  | 'content_ready'
  | 'needs_relations'
  | 'needs_content'
  | 'needs_taxonomy'
  | 'reference_only';

export type ExerciseQualityFilter =
  | 'all'
  | 'needs_media'
  | ExerciseQualityStatus;

export interface QualityDimensionScore {
  score: number;
  maxScore: number;
  complete: boolean;
  missingFields: string[];
}

export interface ExerciseRelationCounts {
  tagsCount: number;
  musclesCount: number;
  alternativesCount: number;
  aliasesCount: number;
}

export interface ExerciseQualityAssessment {
  score: number; // 0-100 supplemental score
  status: ExerciseQualityStatus;

  // Boolean readiness flags
  hasTaxonomy: boolean;
  hasCoaching: boolean;
  hasPrescription: boolean;
  hasRequiredRelations: boolean;

  // Explicit Gate flags
  taxonomyReady: boolean;
  coachingReady: boolean;
  rxReady: boolean;
  contentReady: boolean;   // taxonomyReady && coachingReady && rxReady
  relationReady: boolean;  // hasRequiredRelations (muscles, tags, alternatives)
  mediaReady: boolean;     // verified READY publishable HTTPS media
  fullyPublished: boolean; // isCurated && contentReady && relationReady && mediaReady

  dimensions: {
    taxonomy: QualityDimensionScore;
    coaching: QualityDimensionScore;
    prescription: QualityDimensionScore;
    requiredRelations: QualityDimensionScore;
    optionalEnrichment: QualityDimensionScore;
    media: QualityDimensionScore;
  };
  missingFields: string[];
  missingRelations: string[];
}

export interface ExerciseQualityInput {
  id?: string;
  name?: string | null;
  slug?: string | null;
  source_type?: string | null;
  primary_muscle?: string | null;
  target_muscle?: string | null;
  secondary_muscles?: string[] | null;
  muscle_group?: string | null;
  equipment?: string | null;
  category?: string | null;
  difficulty?: string | null;
  movement_pattern?: string | null;
  unilateral?: boolean | null;
  setup_instructions?: string | null;
  execution_instructions?: string | null;
  breathing?: string | null;
  coaching_cues?: string[] | null;
  common_mistakes?: string[] | null;
  safety_notes?: string | null;
  default_sets?: number | null;
  default_reps?: number | null;
  default_reps_prescription?: string | null;
  tempo?: string | null;
  recommended_rest_seconds?: number | null;
  default_rest_period_sec?: number | null;
  media_status?: string | null;
  video_url?: string | null;
  gif_url?: string | null;

  // Relations (full objects or counts)
  aliases?: Array<{ id?: string; alias?: string }>;
  tags?: Array<{ id?: string; tag?: string; tag_type?: string }>;
  muscles?: Array<{ id?: string; muscle?: string; role?: string }>;
  alternatives?: Array<{ id?: string; alternative_exercise_id?: string; reason?: string }>;
  progressions?: Array<{ id?: string; progression_exercise_id?: string }>;
  regressions?: Array<{ id?: string; regression_exercise_id?: string }>;
  media?: Array<{ id?: string; media_status?: string; url?: string | null }>;
}

function isMeaningfulString(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  const s = val.trim();
  if (s.length < 3) return false;
  if (/^(n\/a|none|placeholder|tbd|todo|\.|\-)$/i.test(s)) return false;
  return true;
}

function isMeaningfulArray(val: unknown): boolean {
  if (!Array.isArray(val) || val.length === 0) return false;
  return val.some(item => isMeaningfulString(item));
}

function isValidHttpsUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' && parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

/**
 * Deterministically evaluates the catalog quality and readiness of an exercise.
 */
export function evaluateExerciseQuality(
  exercise: ExerciseQualityInput,
  relationCounts?: ExerciseRelationCounts
): ExerciseQualityAssessment {
  const missingFields: string[] = [];
  const missingRelations: string[] = [];

  // 1. Taxonomy (25 pts max)
  let taxScore = 0;
  const taxMissing: string[] = [];
  if (isMeaningfulString(exercise.primary_muscle)) taxScore += 5; else taxMissing.push('primary_muscle');
  if (isMeaningfulString(exercise.equipment)) taxScore += 5; else taxMissing.push('equipment');
  if (isMeaningfulString(exercise.category)) taxScore += 5; else taxMissing.push('category');
  if (isMeaningfulString(exercise.difficulty)) taxScore += 5; else taxMissing.push('difficulty');
  if (isMeaningfulString(exercise.movement_pattern)) taxScore += 5; else taxMissing.push('movement_pattern');
  missingFields.push(...taxMissing);

  // 2. Coaching (35 pts max)
  let coachScore = 0;
  const coachMissing: string[] = [];
  if (isMeaningfulString(exercise.setup_instructions)) coachScore += 7; else coachMissing.push('setup_instructions');
  if (isMeaningfulString(exercise.execution_instructions)) coachScore += 7; else coachMissing.push('execution_instructions');
  if (isMeaningfulArray(exercise.coaching_cues)) coachScore += 7; else coachMissing.push('coaching_cues');
  if (isMeaningfulArray(exercise.common_mistakes)) coachScore += 7; else coachMissing.push('common_mistakes');
  if (isMeaningfulString(exercise.safety_notes)) coachScore += 4; else coachMissing.push('safety_notes');
  if (isMeaningfulString(exercise.breathing)) coachScore += 3; else coachMissing.push('breathing');
  missingFields.push(...coachMissing);

  // 3. Prescription (15 pts max)
  let rxScore = 0;
  const rxMissing: string[] = [];
  if (typeof exercise.default_sets === 'number' && exercise.default_sets > 0) rxScore += 4; else rxMissing.push('default_sets');
  if ((typeof exercise.default_reps === 'number' && exercise.default_reps > 0) || isMeaningfulString(exercise.default_reps_prescription)) rxScore += 4; else rxMissing.push('default_reps');
  if (isMeaningfulString(exercise.tempo)) rxScore += 4; else rxMissing.push('tempo');
  if (
    (typeof exercise.recommended_rest_seconds === 'number' && exercise.recommended_rest_seconds > 0) ||
    (typeof exercise.default_rest_period_sec === 'number' && exercise.default_rest_period_sec > 0)
  ) rxScore += 3; else rxMissing.push('rest_period');
  missingFields.push(...rxMissing);

  // 4. Required Relations (15 pts max)
  let relScore = 0;
  const tagsCount = exercise.tags ? exercise.tags.length : (relationCounts ? relationCounts.tagsCount : 0);
  const musclesCount = exercise.muscles ? exercise.muscles.length : (relationCounts ? relationCounts.musclesCount : 0);
  const altsCount = exercise.alternatives ? exercise.alternatives.length : (relationCounts ? relationCounts.alternativesCount : 0);

  if (tagsCount > 0) relScore += 5; else missingRelations.push('exercise_tags');
  if (musclesCount > 0) relScore += 5; else missingRelations.push('exercise_muscles');
  if (altsCount > 0) relScore += 5; else missingRelations.push('exercise_alternatives');

  // 5. Optional Enrichment (0 pts towards 100, informational only)
  const aliasesCount = exercise.aliases ? exercise.aliases.length : (relationCounts ? relationCounts.aliasesCount : 0);
  const progsCount = exercise.progressions ? exercise.progressions.length : 0;
  const regsCount = exercise.regressions ? exercise.regressions.length : 0;
  let optScore = 0;
  if (aliasesCount > 0) optScore += 1;
  if (progsCount > 0) optScore += 1;
  if (regsCount > 0) optScore += 1;

  // 6. Media Readiness (10 pts max)
  // Strict rule: Only verified READY media with a valid HTTPS locator qualifies.
  const mediaList = exercise.media || [];
  const rawMediaStatus = (exercise.media_status || '').toUpperCase();
  const directVideoValid = isValidHttpsUrl(exercise.video_url);
  const directGifValid = isValidHttpsUrl(exercise.gif_url);

  const hasReadyMediaRow = mediaList.some(
    m => (m.media_status || '').toUpperCase() === 'READY' && isValidHttpsUrl(m.url)
  );
  const hasReadyDirect = rawMediaStatus === 'READY' && (directVideoValid || directGifValid);
  const mediaReady = Boolean(hasReadyMediaRow || hasReadyDirect);

  const mediaScore = mediaReady ? 10 : 0;
  if (!mediaReady) {
    missingFields.push('publishable_media');
  }

  // Explicit Gate flags
  const isLegacy = exercise.source_type === 'legacy_catalog';
  const isCurated = !isLegacy;

  const taxonomyReady = taxMissing.length === 0;
  const coachingReady = coachMissing.length === 0;
  const rxReady = rxMissing.length === 0;
  const contentReady = taxonomyReady && coachingReady && rxReady;
  const relationReady = missingRelations.length === 0;
  const fullyPublished = isCurated && contentReady && relationReady && mediaReady;

  // Boolean dimensions (backwards compatible aliases)
  const hasTaxonomy = taxonomyReady;
  const hasCoaching = coachingReady;
  const hasPrescription = rxReady;
  const hasRequiredRelations = relationReady;

  const totalScore = taxScore + coachScore + rxScore + relScore + mediaScore;

  // Classification status determination (Mutually Exclusive Precedence)
  let status: ExerciseQualityStatus;

  if (isLegacy) {
    status = 'reference_only';
  } else if (fullyPublished) {
    status = 'fully_published';
  } else if (contentReady && relationReady) {
    status = 'content_ready';
  } else if (contentReady && !relationReady) {
    status = 'needs_relations';
  } else if (!hasTaxonomy && !hasCoaching) {
    status = 'reference_only';
  } else if (hasTaxonomy && !hasCoaching) {
    status = 'needs_content';
  } else if (!hasTaxonomy && hasCoaching) {
    status = 'needs_taxonomy';
  } else if (!hasPrescription) {
    status = 'needs_content';
  } else {
    status = 'reference_only';
  }

  return {
    score: totalScore,
    status,
    hasTaxonomy,
    hasCoaching,
    hasPrescription,
    hasRequiredRelations,
    taxonomyReady,
    coachingReady,
    rxReady,
    contentReady,
    relationReady,
    mediaReady,
    fullyPublished,
    dimensions: {
      taxonomy: {
        score: taxScore,
        maxScore: 25,
        complete: hasTaxonomy,
        missingFields: taxMissing,
      },
      coaching: {
        score: coachScore,
        maxScore: 35,
        complete: hasCoaching,
        missingFields: coachMissing,
      },
      prescription: {
        score: rxScore,
        maxScore: 15,
        complete: hasPrescription,
        missingFields: rxMissing,
      },
      requiredRelations: {
        score: relScore,
        maxScore: 15,
        complete: hasRequiredRelations,
        missingFields: missingRelations,
      },
      optionalEnrichment: {
        score: optScore,
        maxScore: 3,
        complete: optScore === 3,
        missingFields: [
          ...(aliasesCount === 0 ? ['exercise_aliases'] : []),
          ...(progsCount === 0 ? ['exercise_progressions'] : []),
          ...(regsCount === 0 ? ['exercise_regressions'] : []),
        ],
      },
      media: {
        score: mediaScore,
        maxScore: 10,
        complete: mediaReady,
        missingFields: mediaReady ? [] : ['publishable_media'],
      },
    },
    missingFields,
    missingRelations,
  };
}

/**
 * Filter predicate matching an exercise against a selected quality filter.
 */
export function matchesQualityFilter(
  exercise: ExerciseQualityInput,
  filter: ExerciseQualityFilter,
  relationCounts?: ExerciseRelationCounts
): boolean {
  if (filter === 'all') return true;
  const assessment = evaluateExerciseQuality(exercise, relationCounts);

  if (filter === 'needs_media') {
    // Explicit filter: Content & Relations ready, but publishable media pending
    return assessment.contentReady && assessment.relationReady && !assessment.mediaReady;
  }

  return assessment.status === filter;
}

export async function fetchExerciseRelationCounts(
  exerciseIds: string[],
  supabaseClient: any,
  options: { chunkSize?: number } = {}
): Promise<Map<string, ExerciseRelationCounts>> {
  const map = new Map<string, ExerciseRelationCounts>();
  if (exerciseIds.length === 0) return map;

  const chunkSize = options.chunkSize ?? 150;
  for (const id of exerciseIds) {
    map.set(id, { tagsCount: 0, musclesCount: 0, alternativesCount: 0, aliasesCount: 0 });
  }

  for (let i = 0; i < exerciseIds.length; i += chunkSize) {
    const chunk = exerciseIds.slice(i, i + chunkSize);
    const [tagsRes, musclesRes, altsRes, aliasesRes] = await Promise.all([
      supabaseClient.from('exercise_tags').select('exercise_id').in('exercise_id', chunk),
      supabaseClient.from('exercise_muscles').select('exercise_id').in('exercise_id', chunk),
      supabaseClient.from('exercise_alternatives').select('exercise_id').in('exercise_id', chunk),
      supabaseClient.from('exercise_aliases').select('exercise_id').in('exercise_id', chunk),
    ]);

    if (tagsRes.data) {
      for (const r of tagsRes.data) {
        const entry = map.get(r.exercise_id);
        if (entry) entry.tagsCount++;
      }
    }
    if (musclesRes.data) {
      for (const r of musclesRes.data) {
        const entry = map.get(r.exercise_id);
        if (entry) entry.musclesCount++;
      }
    }
    if (altsRes.data) {
      for (const r of altsRes.data) {
        const entry = map.get(r.exercise_id);
        if (entry) entry.alternativesCount++;
      }
    }
    if (aliasesRes.data) {
      for (const r of aliasesRes.data) {
        const entry = map.get(r.exercise_id);
        if (entry) entry.aliasesCount++;
      }
    }
  }

  return map;
}

export function getQualityStatusLabel(status: ExerciseQualityStatus | ExerciseQualityFilter): string {
  switch (status) {
    case 'fully_published':
      return 'Published';
    case 'content_ready':
      return 'Ready — Needs Media';
    case 'needs_relations':
      return 'Needs Relations';
    case 'needs_content':
      return 'Needs Content';
    case 'needs_taxonomy':
      return 'Needs Taxonomy';
    case 'needs_media':
      return 'Ready — Needs Media';
    case 'reference_only':
      return 'Reference Only';
    case 'all':
      return 'All Quality';
    default:
      return status;
  }
}

export function getQualityStatusBadgeConfig(status: ExerciseQualityStatus): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotColor: string;
} {
  switch (status) {
    case 'fully_published':
      return {
        label: 'Published',
        bgClass: 'bg-emerald-500/10',
        textClass: 'text-emerald-400',
        borderClass: 'border-emerald-500/20',
        dotColor: 'bg-emerald-400',
      };
    case 'content_ready':
      return {
        label: 'Ready — Needs Media',
        bgClass: 'bg-blue-500/10',
        textClass: 'text-blue-400',
        borderClass: 'border-blue-500/20',
        dotColor: 'bg-blue-400',
      };
    case 'needs_relations':
      return {
        label: 'Needs Relations',
        bgClass: 'bg-amber-500/10',
        textClass: 'text-amber-400',
        borderClass: 'border-amber-500/20',
        dotColor: 'bg-amber-400',
      };
    case 'needs_content':
    case 'needs_taxonomy':
      return {
        label: status === 'needs_taxonomy' ? 'Needs Taxonomy' : 'Needs Content',
        bgClass: 'bg-rose-500/10',
        textClass: 'text-rose-400',
        borderClass: 'border-rose-500/20',
        dotColor: 'bg-rose-400',
      };
    case 'reference_only':
    default:
      return {
        label: 'Reference Only',
        bgClass: 'bg-slate-500/10',
        textClass: 'text-slate-400',
        borderClass: 'border-slate-500/20',
        dotColor: 'bg-slate-400',
      };
  }
}
