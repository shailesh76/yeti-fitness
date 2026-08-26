import { Database, Q } from '@nozbe/watermelondb';
import { Exercise } from '../models/Exercise';
import { SessionSet } from '../models/SessionSet';
import {
  ExerciseSearchFilters,
  ExerciseSearchResult,
  ExerciseMedia,
  ExerciseMuscle,
  ExerciseAlternative,
  ExerciseProgression,
  ExerciseRegression,
  ExerciseImportItem,
  Exercise as ExerciseDTO,
} from '@yeti/types';

function parseJsonStringArray(value: unknown): string[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Normalizes either a WatermelonDB Exercise model instance (local path) or a raw
 * Supabase `exercises` row (remote path) into the @yeti/types Exercise DTO shape
 * that ExerciseSearchResult promises callers. The two sources disagree on a few
 * fields: WatermelonDB stores secondary_muscles/coaching_cues/common_mistakes as
 * JSON-encoded strings (SQLite has no native array/JSONB column), while Postgres
 * (TEXT[]/JSONB columns) returns them to supabase-js already parsed as arrays —
 * parseJsonStringArray handles both without double-parsing or throwing.
 */
export function mapExerciseRowToDTO(row: any): ExerciseDTO {
  return {
    id: row.id,
    slug: row.slug || (row.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: canonicalExerciseName(row.name, row.id),
    category: row.category ?? null,
    equipment: row.equipment ?? null,
    primary_muscle: row.primary_muscle ?? null,
    target_muscle: row.target_muscle ?? null,
    secondary_muscles: parseJsonStringArray(row.secondary_muscles),
    movement_pattern: row.movement_pattern ?? null,
    difficulty: row.difficulty ?? null,
    unilateral: row.unilateral ?? undefined,
    setup_instructions: row.setup_instructions ?? null,
    execution_instructions: row.execution_instructions ?? null,
    breathing: row.breathing ?? null,
    coaching_cues: parseJsonStringArray(row.coaching_cues),
    common_mistakes: parseJsonStringArray(row.common_mistakes),
    safety_notes: row.safety_notes ?? null,
    default_sets: row.default_sets ?? undefined,
    default_reps: row.default_reps ?? undefined,
    default_reps_prescription: row.default_reps_prescription ?? null,
    tempo: row.tempo ?? null,
    instructions: row.instructions ?? null,
    gif_url: row.gif_url ?? null,
    video_url: row.video_url ?? null,
    media_type: row.media_type ?? null,
    thumbnail_url: row.thumbnail_url ?? null,
    source: row.source ?? null,
    source_id: row.source_id ?? null,
    is_public: row.is_public ?? undefined,
    created_by_coach_id: row.created_by_coach_id ?? null,
    default_rest_period_sec: row.default_rest_period_sec ?? undefined,
    source_type: row.source_type ?? null,
    license: row.license ?? null,
    recommended_rest_seconds: row.recommended_rest_seconds ?? null,
    hypertrophy_reps: row.hypertrophy_reps ?? null,
    strength_reps: row.strength_reps ?? null,
    endurance_reps: row.endurance_reps ?? null,
    media_status: row.media_status ?? null,
    media_notes: row.media_notes ?? null,
    metadata: row.metadata ?? null,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  };
}

/**
 * Removes only the technical collision suffix generated from legacy imports
 * (e.g. `(Legacy a45e)`, `(Legacy 30ee)`), including repeated suffixes at the end of the string.
 * Arbitrary legitimate names containing "Legacy" (e.g. "Legacy Strength Press", "Legacy Press Variation")
 * are preserved intact. Historical references and UUIDs remain stable.
 */
export function canonicalExerciseName(name: string, exerciseId?: string | null): string {
  let canonical = (name || '').trim();
  if (!canonical) return '';

  const idPrefix = (exerciseId || '').replace(/-/g, '').slice(0, 4).toLowerCase();
  if (idPrefix) {
    const specificSuffix = new RegExp(`\\s*\\(Legacy\\s+${idPrefix}\\)$`, 'i');
    while (specificSuffix.test(canonical)) {
      canonical = canonical.replace(specificSuffix, '').trimEnd();
    }
  }

  // A historical snapshot may retain the suffix from a pre-merge exercise id.
  // Strip the technical import marker even when it no longer matches the id.
  const legacyCollisionSuffix = /\s*\((?:Legacy|legacy)\s+[a-f0-9]{3,8}\)$/i;
  while (legacyCollisionSuffix.test(canonical)) {
    canonical = canonical.replace(legacyCollisionSuffix, '').trimEnd();
  }

  return canonical;
}

// ─── Library normalisation (source-prioritisation + dedupe) ──────────────────
// The mobile library, the exercise detail screen, and the workout-builder picker
// all read one array: useWorkoutStore.fetchExercises() → getExercises(). The live
// catalog is ~396 curated `yeti_first_party` rows plus ~2,095 legacy rows. Without
// prioritisation the legacy rows bury the curated ones (and duplicate them under
// "(Legacy xxxx)" names). normalizeExerciseList canonicalises names, de-duplicates
// by canonical name preferring first-party, and sorts first-party first — so the
// curated catalog surfaces instead of being hidden.

export const FIRST_PARTY_SOURCE_TYPE = 'yeti_first_party';

// Seed placeholder CDNs that never resolve — treated as "no media" for tie-breaks.
const PLACEHOLDER_MEDIA_HOST = /cdn\.yeti\.fit|cdn\.yetifitness\.app/i;

/** True only for a real, resolvable http(s) media URL (not a seed placeholder). */
export function exerciseHasResolvableMedia(row: any): boolean {
  const url = row?.gif_url || row?.video_url || row?.thumbnail_url;
  if (!url || typeof url !== 'string') return false;
  if (PLACEHOLDER_MEDIA_HOST.test(url)) return false;
  return /^https?:\/\//i.test(url);
}

function isFirstParty(row: any): boolean {
  return row?.source_type === FIRST_PARTY_SOURCE_TYPE;
}

// Prefer first-party over legacy; within the same tier prefer a row that carries
// resolvable (non-placeholder) media. Otherwise keep the incumbent.
function isBetterExercise(candidate: any, incumbent: any): boolean {
  const candFp = isFirstParty(candidate);
  const incFp = isFirstParty(incumbent);
  if (candFp !== incFp) return candFp;
  const candMedia = exerciseHasResolvableMedia(candidate);
  const incMedia = exerciseHasResolvableMedia(incumbent);
  if (candMedia !== incMedia) return candMedia;
  return false;
}

// Maps a WatermelonDB Exercise model OR a raw remote row to a plain, display-ready
// object. Both expose the same snake_case field names, so one accessor path serves
// either. The name is canonicalised so legacy import suffixes never reach the UI.
export function toPlainExercise(row: any): any {
  return {
    id: row.id,
    server_id: row.server_id ?? null,
    slug: row.slug ?? null,
    name: canonicalExerciseName(row.name, row.id),
    primary_muscle: row.primary_muscle ?? null,
    muscle_group: row.muscle_group ?? null,
    category: row.category ?? null,
    equipment: row.equipment ?? null,
    movement_pattern: row.movement_pattern ?? null,
    unilateral: row.unilateral ?? null,
    setup_instructions: row.setup_instructions ?? null,
    execution_instructions: row.execution_instructions ?? null,
    breathing: row.breathing ?? null,
    coaching_cues: row.coaching_cues ?? null,
    common_mistakes: row.common_mistakes ?? null,
    safety_notes: row.safety_notes ?? null,
    default_sets: row.default_sets ?? null,
    default_reps: row.default_reps ?? null,
    default_reps_prescription: row.default_reps_prescription ?? null,
    tempo: row.tempo ?? null,
    instructions: row.instructions ?? null,
    gif_url: row.gif_url ?? null,
    video_url: row.video_url ?? null,
    is_compound: row.is_compound ?? null,
    body_part: row.body_part ?? null,
    target_muscle: row.target_muscle ?? null,
    secondary_muscles: row.secondary_muscles ?? null,
    difficulty: row.difficulty ?? null,
    media_type: row.media_type ?? null,
    thumbnail_url: row.thumbnail_url ?? null,
    source: row.source ?? null,
    source_id: row.source_id ?? null,
    source_type: row.source_type ?? null,
    is_public: row.is_public ?? null,
  };
}

/**
 * Shapes the raw exercise catalog for the library UI:
 *  1. Canonicalises every name (strips legacy import collision suffixes).
 *  2. De-duplicates by canonical name (case-insensitive), preferring a
 *     first-party row over legacy, then a row with resolvable media.
 *  3. Stable-sorts first-party rows ahead of legacy so the curated catalog
 *     surfaces first instead of being buried under the legacy rows.
 * Nameless rows are dropped. Input may be WatermelonDB models or raw remote rows.
 */
export function normalizeExerciseList(rows: any[]): any[] {
  const mapped = (rows || []).map(toPlainExercise).filter(ex => ex.name);

  const byName = new Map<string, any>();
  const order: string[] = [];
  for (const ex of mapped) {
    const key = ex.name.toLowerCase();
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, ex);
      order.push(key);
    } else if (isBetterExercise(ex, existing)) {
      byName.set(key, ex);
    }
  }

  const deduped = order.map(key => byName.get(key));
  // Stable partition — first-party first, relative order preserved within each
  // tier (Array.prototype.sort is stable in modern engines, incl. Hermes).
  return deduped.sort((a, b) => (isFirstParty(b) ? 1 : 0) - (isFirstParty(a) ? 1 : 0));
}

/**
 * Normalizes a string for search matching: lowercases, converts hyphens/underscores/slashes/punctuation
 * to spaces, collapses multiple whitespace characters, and trims.
 */
export function normalizeSearchToken(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[-_.,/\\()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds the combined searchable text corpus for an exercise DTO / model.
 */
export function buildExerciseSearchCorpus(ex: any): string {
  if (!ex) return '';
  const fields = [
    ex.name,
    ex.equipment,
    ex.category,
    ex.body_part,
    ex.primary_muscle,
    ex.target_muscle,
    ex.muscle_group,
    ex.movement_pattern,
    ex.instructions,
    ...(Array.isArray(ex.search_aliases) ? ex.search_aliases : []),
  ];
  return fields.map(normalizeSearchToken).filter(Boolean).join(' ');
}

/**
 * Multi-token search predicate: splits the query into individual normalized tokens,
 * and requires every token to be present in the exercise search corpus.
 */
export function matchesExerciseSearch(ex: any, searchQuery: string): boolean {
  const q = normalizeSearchToken(searchQuery);
  if (!q) return true;
  const tokens = q.split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  const corpus = buildExerciseSearchCorpus(ex);
  return tokens.every(token => corpus.includes(token));
}

// ─── Deterministic relevance ranking ─────────────────────────────────────────
// matchesExerciseSearch answers the boolean "does this row match?"; the helpers
// below answer "how well does it match?" so the exercise the athlete clearly meant
// ranks first. buildExerciseSearchIndexEntry() does ALL the lower-casing / regex
// normalization once per exercise when the catalog changes — it is never meant to
// run per keystroke. scoreExerciseRelevance() then works purely off those
// precomputed strings (substring/prefix/equality checks only).

/** Joins several raw fields into one normalized, space-separated haystack. */
function joinNormalized(fields: Array<string | null | undefined>): string {
  return fields.map(normalizeSearchToken).filter(Boolean).join(' ');
}

/**
 * Precomputed, normalized search surfaces for one exercise. Build ONCE per exercise
 * whenever the catalog changes (never per keystroke) and feed each entry to
 * scoreExerciseRelevance for every query.
 */
export interface ExerciseSearchIndexEntry {
  /** normalized exercise display name */
  name: string;
  /** name + aliases — the first-party canonical / alias surface */
  nameAlias: string;
  /** equipment + category + muscle + body-part + movement metadata */
  metadata: string;
  /** muscle fields only (drives the muscle facet without matching equipment text) */
  muscles: string;
  /** normalized equipment (exact-match equipment facet) */
  equipment: string;
  /** normalized category (exact-match category facet) */
  category: string;
  /** full corpus incl. instructions + aliases — membership parity with matchesExerciseSearch */
  corpus: string;
  firstParty: boolean;
}

export function buildExerciseSearchIndexEntry(ex: any): ExerciseSearchIndexEntry {
  const aliases = Array.isArray(ex?.search_aliases) ? ex.search_aliases : [];
  return {
    name: normalizeSearchToken(ex?.name),
    nameAlias: joinNormalized([ex?.name, ...aliases]),
    metadata: joinNormalized([
      ex?.equipment, ex?.category, ex?.primary_muscle, ex?.target_muscle,
      ex?.muscle_group, ex?.body_part, ex?.movement_pattern,
    ]),
    muscles: joinNormalized([ex?.primary_muscle, ex?.target_muscle, ex?.muscle_group, ex?.body_part]),
    equipment: normalizeSearchToken(ex?.equipment),
    category: normalizeSearchToken(ex?.category),
    corpus: buildExerciseSearchCorpus(ex),
    firstParty: isFirstParty(ex),
  };
}

/**
 * Deterministic relevance tiers (higher = more relevant). Spaced by 100 so the small
 * first-party tie-break can never lift a lower-tier row above a higher-tier one:
 * relevance dominates, first-party only breaks ties WITHIN the same tier.
 */
export const EXERCISE_RELEVANCE = {
  EXACT_NAME: 600,
  NAME_PREFIX: 500,
  NAME_ALL_TOKENS: 400,
  ALIAS: 300,
  METADATA: 200,
  INSTRUCTIONS: 100,
  NONE: 0,
  FIRST_PARTY_BONUS: 10,
} as const;

/**
 * Scores one precomputed entry against a NORMALIZED query. Returns NONE (0) when the
 * row is not a match at all — this is the same membership as matchesExerciseSearch
 * (the INSTRUCTIONS tier == "every token somewhere in the full corpus"), so callers
 * filter on score > 0 and sort on score descending.
 */
export function scoreExerciseRelevance(entry: ExerciseSearchIndexEntry, normalizedQuery: string): number {
  const q = normalizedQuery;
  if (!q) return EXERCISE_RELEVANCE.NONE;
  const tokens = q.split(' ').filter(Boolean);
  if (tokens.length === 0) return EXERCISE_RELEVANCE.NONE;

  let base: number;
  if (entry.name === q) base = EXERCISE_RELEVANCE.EXACT_NAME;
  else if (entry.name.startsWith(q)) base = EXERCISE_RELEVANCE.NAME_PREFIX;
  else if (tokens.every(t => entry.name.includes(t))) base = EXERCISE_RELEVANCE.NAME_ALL_TOKENS;
  else if (tokens.every(t => entry.nameAlias.includes(t))) base = EXERCISE_RELEVANCE.ALIAS;
  else if (tokens.every(t => entry.metadata.includes(t))) base = EXERCISE_RELEVANCE.METADATA;
  else if (tokens.every(t => entry.corpus.includes(t))) base = EXERCISE_RELEVANCE.INSTRUCTIONS;
  else return EXERCISE_RELEVANCE.NONE;

  return base + (entry.firstParty ? EXERCISE_RELEVANCE.FIRST_PARTY_BONUS : 0);
}

/**
 * Pure, catalog-order-stable ranker used by the library screen's regression tests
 * (and any non-faceted caller). Input order — already first-party-first from
 * normalizeExerciseList — is the final deterministic tie-break, so equal-relevance
 * rows never reshuffle between renders/engines. Empty query → input order, no drops.
 */
export function rankExercisesByRelevance<T extends Record<string, any>>(list: T[], query: string): T[] {
  const q = normalizeSearchToken(query);
  if (!q) return list.slice();
  return list
    .map((ex, index) => ({ ex, index, score: scoreExerciseRelevance(buildExerciseSearchIndexEntry(ex), q) }))
    .filter(s => s.score > 0)
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .map(s => s.ex);
}

// ─── AI Coach exercise-name resolution ───────────────────────────────────────
// The AI Coach's deterministic program generator (supabase/functions/_shared/ai/
// programGenerator.ts) works purely on exercise NAME strings pulled from the
// real catalog — it never carries an exercise id. Resolving those names back to
// real ids is this repository's job, against the FULL catalog (getExercises()
// already paginates past Supabase's default page size — see below), never a
// truncated subset, and never with a same-array[0] fallback when a name can't
// be matched: an unresolved name must be reported, not silently swapped for an
// unrelated exercise.

/** Case/whitespace-insensitive key so "Bench Press", "bench press", and
 * " Bench  Press " all resolve to the same catalog entry. */
export function normalizeExerciseName(name: string): string {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface ExerciseCatalogEntry {
  id: string;
  name: string;
  /** Alternate names for this exercise (from exercise_aliases), if any. */
  aliases?: string[];
}

export interface ExerciseNameResolution {
  /** normalizeExerciseName(requested name) -> catalog exercise id, for every name that matched. */
  resolved: Map<string, string>;
  /** Original (non-normalized) requested strings that matched nothing — name, not id, since
   * there is nothing else to show the user for these. */
  unresolved: string[];
}

/**
 * Pure name→id resolver — no DB/network access, so it's directly testable
 * against a synthetic catalog of any size (including one exceeding whatever
 * page size a caller might otherwise have limited a query to). A name/alias
 * collision keeps whichever catalog entry it first encountered; duplicate
 * catalog names are not expected to be common enough to warrant a tie-break
 * beyond "first wins, deterministically".
 */
export function resolveExerciseNamesAgainstCatalog(
  requestedNames: string[],
  catalog: ExerciseCatalogEntry[],
): ExerciseNameResolution {
  const idByKey = new Map<string, string>();
  for (const entry of catalog) {
    const nameKey = normalizeExerciseName(entry.name);
    if (nameKey && !idByKey.has(nameKey)) idByKey.set(nameKey, entry.id);
    for (const alias of entry.aliases || []) {
      const aliasKey = normalizeExerciseName(alias);
      if (aliasKey && !idByKey.has(aliasKey)) idByKey.set(aliasKey, entry.id);
    }
  }

  const resolved = new Map<string, string>();
  const unresolved: string[] = [];
  for (const requested of requestedNames) {
    const key = normalizeExerciseName(requested);
    const id = key ? idByKey.get(key) : undefined;
    if (id) {
      resolved.set(key, id);
    } else {
      unresolved.push(requested);
    }
  }
  return { resolved, unresolved };
}

export type ExerciseGuidanceType =
  | 'form_explanation'
  | 'common_mistakes'
  | 'breathing_technique'
  | 'beginner_version'
  | 'advanced_version'
  | 'injury_modifications';

export interface ExerciseRelations {
  variations: Exercise[];
  alternatives: Exercise[];
}

/**
 * Outcome of one child-table write, reported per stage.
 *
 * `attempted` is what the parser produced; `upserted` is what the DATABASE
 * confirmed. They are deliberately separate: the CLI used to print the parser
 * count under the label "Inserted", so a canary that wrote 6 tags and 0 media
 * rows reported "Tags Inserted 18 / Media Records Inserted 9".
 *
 * `upserted` counts rows the DB accepted, insert OR update — it is not a claim
 * that every one was newly created.
 */
export interface ChildWriteResult {
  stage: 'alias upsert' | 'tag upsert' | 'muscle upsert' | 'media upsert';
  attempted: number;
  upserted: number;
  error: string | null;
}

export class ExerciseRepository {
  private db: Database;
  private supabase?: any;

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
  }

  async getExercises(): Promise<any[]> {
    let localRows: Exercise[] = [];
    try {
      localRows = await this.db.get<Exercise>('exercises').query().fetch();
    } catch (e) {
      console.warn('Failed to query local exercises, trying remote:', e);
    }

    const supabaseAvailable = !!(this.supabase && typeof this.supabase.from === 'function');

    if (localRows.length > 0) {
      // A cache written before source_type existed (schema < v9) can't be
      // prioritised. If remote is reachable, fall through to rebuild it once so
      // first-party prioritisation actually takes effect; otherwise serve what
      // we have (still canonicalised + de-duplicated).
      const cacheHasSourceType = localRows.some(r => (r as any).source_type != null);
      if (cacheHasSourceType || !supabaseAvailable) {
        return normalizeExerciseList(localRows);
      }
    }

    if (supabaseAvailable) {
      const BATCH_SIZE = 1000;
      let data: any[] = [];
      let from = 0;
      const seenIds = new Set<string>();

      while (true) {
        const { data: pageChunk, error } = await this.supabase
          .from('exercises')
          .select('*')
          .order('updated_at', { ascending: true })
          .order('id', { ascending: true })
          .range(from, from + BATCH_SIZE - 1);

        if (error || !pageChunk || pageChunk.length === 0) break;

        for (const ex of pageChunk) {
          if (!seenIds.has(ex.id)) {
            seenIds.add(ex.id);
            data.push(ex);
          }
        }

        if (pageChunk.length < BATCH_SIZE) break;
        from += BATCH_SIZE;
      }

      if (data.length > 0) {
        if (this.db) {
          // Only reached with a non-empty local cache on the source_type-backfill
          // path — rebuild it so the previously-cached rows gain source_type.
          const rebuildStaleCache = localRows.length > 0;
          this.db.write(async () => {
            if (rebuildStaleCache) {
              // Exercises are a pure server-derived cache (no local-only edits),
              // so clearing + refetching is lossless for the user's own data.
              try {
                await this.db.get<Exercise>('exercises').query().destroyAllPermanently();
              } catch {}
            }
            for (const ex of data) {
              try {
                await this.db.get<Exercise>('exercises').create(r => {
                  r._raw.id = ex.id;
                  r.name = ex.name;
                  r.slug = ex.slug;
                  r.primary_muscle = ex.primary_muscle;
                  r.muscle_group = ex.muscle_group;
                  r.category = ex.category;
                  r.equipment = ex.equipment;
                  r.movement_pattern = ex.movement_pattern;
                  r.unilateral = ex.unilateral;
                  r.setup_instructions = ex.setup_instructions;
                  r.execution_instructions = ex.execution_instructions;
                  r.breathing = ex.breathing;
                  r.coaching_cues = ex.coaching_cues ? JSON.stringify(ex.coaching_cues) : undefined;
                  r.common_mistakes = ex.common_mistakes ? JSON.stringify(ex.common_mistakes) : undefined;
                  r.safety_notes = ex.safety_notes;
                  r.default_sets = ex.default_sets;
                  r.default_reps = ex.default_reps;
                  r.default_reps_prescription = ex.default_reps_prescription;
                  r.tempo = ex.tempo;
                  r.instructions = ex.instructions;
                  r.gif_url = ex.gif_url;
                  r.video_url = ex.video_url;
                  r.body_part = ex.body_part;
                  r.target_muscle = ex.target_muscle;
                  r.secondary_muscles = ex.secondary_muscles ? JSON.stringify(ex.secondary_muscles) : undefined;
                  r.difficulty = ex.difficulty;
                  r.media_type = ex.media_type;
                  r.thumbnail_url = ex.thumbnail_url;
                  r.source = ex.source;
                  r.source_id = ex.source_id;
                  r.source_type = ex.source_type;
                  r.is_public = ex.is_public;
                });
              } catch {}
            }
          }).catch(err => console.warn('Could not cache exercises locally:', err));
        }
        return normalizeExerciseList(data);
      }

      // Remote yielded nothing (transient/offline). Fall back to a stale local
      // cache rather than emptying the library.
      if (localRows.length > 0) {
        return normalizeExerciseList(localRows);
      }
    }

    return [];
  }

  async getExerciseById(id: string): Promise<Exercise | null> {
    try {
      const local = await this.db.get<Exercise>('exercises').find(id);
      if (local) return local;
    } catch {
      // Fall through to remote
    }

    try {
      if (this.supabase && typeof this.supabase.from === 'function') {
        const { data, error } = await this.supabase.from('exercises').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          return data as Exercise;
        }
      }
    } catch {
      // Fail closed
    }

    return null;
  }

  async getExerciseBySlug(slug: string): Promise<Exercise | null> {
    try {
      if (this.db) {
        const local = await this.db.get<Exercise>('exercises').query(Q.where('slug', slug)).fetch();
        if (local.length > 0) return local[0];
      }
    } catch {}

    if (this.supabase && typeof this.supabase.from === 'function') {
      const { data, error } = await this.supabase.from('exercises').select('*').eq('slug', slug).maybeSingle();
      if (!error && data) return data as Exercise;
    }

    return null;
  }

  /**
   * Indexed sub-100ms search across exercise names, aliases, muscles, equipment, category,
   * movement pattern, and AI tags.
   */
  async searchExercises(filters: ExerciseSearchFilters): Promise<ExerciseSearchResult> {
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    // Try local WatermelonDB query first if available
    try {
      if (this.db) {
        const conditions: Q.Where[] = [];
        if (filters.query) {
          conditions.push(Q.where('name', Q.like(`%${Q.sanitizeLikeString(filters.query)}%`)));
        }
        if (filters.category) {
          conditions.push(Q.where('category', filters.category));
        }
        if (filters.equipment) {
          conditions.push(Q.where('equipment', filters.equipment));
        }
        if (filters.muscle) {
          conditions.push(Q.where('primary_muscle', filters.muscle));
        }
        if (filters.movement_pattern) {
          conditions.push(Q.where('movement_pattern', filters.movement_pattern));
        }
        if (filters.difficulty) {
          conditions.push(Q.where('difficulty', filters.difficulty));
        }

        const query = this.db.get<Exercise>('exercises').query(...conditions);
        const allMatches = await query.fetch();
        const paginated = allMatches.slice(offset, offset + limit);

        if (allMatches.length > 0 || !this.supabase) {
          return {
            exercises: paginated.map(mapExerciseRowToDTO),
            total: allMatches.length,
            limit,
            offset,
          };
        }
      }
    } catch (e) {
      console.warn('Local search fallback to Supabase:', e);
    }

    // Remote Supabase indexed search fallback
    if (this.supabase && typeof this.supabase.from === 'function') {
      let query = this.supabase.from('exercises').select('*', { count: 'exact' });

      if (filters.query) {
        const q = filters.query.trim();
        query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%,primary_muscle.ilike.%${q}%,equipment.ilike.%${q}%,category.ilike.%${q}%,movement_pattern.ilike.%${q}%`);
      }
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.equipment) query = query.eq('equipment', filters.equipment);
      if (filters.muscle) query = query.or(`primary_muscle.eq.${filters.muscle},target_muscle.eq.${filters.muscle},muscle_group.eq.${filters.muscle}`);
      if (filters.movement_pattern) query = query.eq('movement_pattern', filters.movement_pattern);
      if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);

      query = query.order('name').range(offset, offset + limit - 1);

      const { data, count, error } = await query;
      if (!error && data) {
        return {
          exercises: data.map(mapExerciseRowToDTO),
          total: count || data.length,
          limit,
          offset,
        };
      }
    }

    return { exercises: [], total: 0, limit, offset };
  }

  async getAlternatives(exerciseId: string): Promise<Exercise[]> {
    if (this.supabase && typeof this.supabase.from === 'function') {
      const { data } = await this.supabase
        .from('exercise_alternatives')
        .select('alternative_exercise_id, reason, alternative_exercise:exercises!exercise_alternatives_alternative_exercise_id_fkey(*)')
        .eq('exercise_id', exerciseId);

      if (data && data.length > 0) {
        return data.map((d: any) => d.alternative_exercise).filter(Boolean);
      }
    }

    // Fallback to same muscle group
    const ex = await this.getExerciseById(exerciseId);
    if (!ex) return [];
    try {
      const list = await this.getExercises();
      return list.filter(item => (item.primary_muscle === ex.primary_muscle || item.target_muscle === ex.target_muscle) && item.id !== ex.id);
    } catch {
      return [];
    }
  }

  async getProgressions(exerciseId: string): Promise<Exercise[]> {
    if (this.supabase && typeof this.supabase.from === 'function') {
      const { data } = await this.supabase
        .from('exercise_progressions')
        .select('progression_exercise_id, difficulty_delta, progression_exercise:exercises!exercise_progressions_progression_exercise_id_fkey(*)')
        .eq('exercise_id', exerciseId);

      if (data && data.length > 0) {
        return data.map((d: any) => d.progression_exercise).filter(Boolean);
      }
    }
    return [];
  }

  async getRegressions(exerciseId: string): Promise<Exercise[]> {
    if (this.supabase && typeof this.supabase.from === 'function') {
      const { data } = await this.supabase
        .from('exercise_regressions')
        .select('regression_exercise_id, difficulty_delta, regression_exercise:exercises!exercise_regressions_regression_exercise_id_fkey(*)')
        .eq('exercise_id', exerciseId);

      if (data && data.length > 0) {
        return data.map((d: any) => d.regression_exercise).filter(Boolean);
      }
    }
    return [];
  }

  async getMedia(exerciseId: string): Promise<ExerciseMedia[]> {
    if (!this.supabase || typeof this.supabase.from !== 'function') return [];
    const { data, error } = await this.supabase
      .from('exercise_media')
      .select('*')
      .eq('exercise_id', exerciseId)
      .order('is_primary', { ascending: false });

    if (error || !data) return [];
    return data as ExerciseMedia[];
  }

  async getMuscles(exerciseId: string): Promise<ExerciseMuscle[]> {
    if (!this.supabase || typeof this.supabase.from !== 'function') return [];
    const { data, error } = await this.supabase
      .from('exercise_muscles')
      .select('*')
      .eq('exercise_id', exerciseId);

    if (error || !data) return [];
    return data as ExerciseMuscle[];
  }

  async getRelations(exerciseId: string): Promise<ExerciseRelations> {
    if (!this.supabase || typeof this.supabase.from !== 'function') return { variations: [], alternatives: [] };
    const { data, error } = await this.supabase
      .from('exercise_relations')
      .select('related_exercise_id, relation_type')
      .eq('exercise_id', exerciseId);
    if (error || !data || data.length === 0) return { variations: [], alternatives: [] };

    const variationIds = data.filter((r: any) => r.relation_type === 'variation').map((r: any) => r.related_exercise_id);
    const alternativeIds = data.filter((r: any) => r.relation_type === 'alternative').map((r: any) => r.related_exercise_id);

    const [variations, alternatives] = await Promise.all([
      Promise.all(variationIds.map((id: string) => this.getExerciseById(id))),
      Promise.all(alternativeIds.map((id: string) => this.getExerciseById(id))),
    ]);

    return {
      variations: variations.filter((e): e is Exercise => e !== null),
      alternatives: alternatives.filter((e): e is Exercise => e !== null),
    };
  }

  async getGuidance(exerciseId: string, guidanceType: ExerciseGuidanceType): Promise<string> {
    if (!this.supabase) throw new Error('AI guidance requires network connectivity');
    const { data, error } = await this.supabase.functions.invoke('exercise-guidance', {
      body: { exerciseId, guidanceType },
    });
    if (error) {
      let serverMessage: string | undefined;
      try {
        const body = await (error as any)?.context?.json?.();
        serverMessage = body?.error || body?.message;
      } catch {}
      if (serverMessage) throw new Error(serverMessage);
      throw error;
    }
    if (!data?.text) throw new Error('AI_PROVIDER_NOT_CONFIGURED');
    return data.text as string;
  }

  /** exercise_id -> its known alternate names, for resolveExerciseNamesAgainstCatalog.
   * Best-effort: an empty map (never a throw) if the table is unreachable, so a
   * transient alias-lookup failure degrades to exact-name-only matching rather
   * than blocking resolution entirely. */
  async getAliasesByExerciseId(): Promise<Map<string, string[]>> {
    const grouped = new Map<string, string[]>();
    if (!this.supabase || typeof this.supabase.from !== 'function') return grouped;
    try {
      const { data, error } = await this.supabase.from('exercise_aliases').select('exercise_id, alias');
      if (error || !data) return grouped;
      for (const row of data as { exercise_id: string; alias: string }[]) {
        if (!row?.exercise_id || !row?.alias) continue;
        const list = grouped.get(row.exercise_id) || [];
        list.push(row.alias);
        grouped.set(row.exercise_id, list);
      }
    } catch {
      // Fail closed — exact-name matching still works without aliases.
    }
    return grouped;
  }

  async getTaxonomy(): Promise<Record<string, string[]>> {
    if (!this.supabase) return {};
    const { data, error } = await this.supabase.from('exercise_taxonomy').select('kind, value');
    if (error || !data) return {};
    const grouped: Record<string, string[]> = {};
    for (const row of data) {
      (grouped[row.kind] = grouped[row.kind] || []).push(row.value);
    }
    return grouped;
  }

  async getFavoriteIds(userId: string): Promise<Set<string>> {
    if (!this.supabase) return new Set();
    const { data, error } = await this.supabase
      .from('exercise_favorites')
      .select('exercise_id')
      .eq('user_id', userId);
    if (error || !data) return new Set();
    return new Set(data.map((r: { exercise_id: string }) => r.exercise_id));
  }

  async addFavorite(userId: string, exerciseId: string): Promise<void> {
    if (!this.supabase) return;
    await this.supabase
      .from('exercise_favorites')
      .upsert({ user_id: userId, exercise_id: exerciseId }, { onConflict: 'user_id,exercise_id' });
  }

  async removeFavorite(userId: string, exerciseId: string): Promise<void> {
    if (!this.supabase) return;
    await this.supabase
      .from('exercise_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId);
  }

  async getRecentExerciseIds(userId: string, limit = 10): Promise<string[]> {
    if (!this.db) return [];
    try {
      const recentSets = await this.db.get<SessionSet>('session_sets')
        .query(Q.where('user_id', userId), Q.sortBy('completed_at', Q.desc), Q.take(200))
        .fetch();
      const seen = new Set<string>();
      const ids: string[] = [];
      for (const set of recentSets) {
        if (!set.exercise_id || seen.has(set.exercise_id)) continue;
        seen.add(set.exercise_id);
        ids.push(set.exercise_id);
        if (ids.length >= limit) break;
      }
      return ids;
    } catch {
      return [];
    }
  }

  /**
   * Upserts an exercise record and its sub-table items without creating duplicates.
   */
  /**
   * Looks up the row a canonical dataset record would write, by id then slug.
   *
   * Deliberately does NOT fall back to name matching: two different exercises
   * can legitimately share a name, and using it as identity risks overwriting
   * an unrelated row. The generic upsert path keeps its name fallback for
   * callers that still depend on it; canonical imports must not.
   */
  async findCanonicalRow(
    exerciseId: string | null | undefined,
    slug: string,
  ): Promise<{ id: string; slug: string; source_type: string | null; created_by_coach_id: string | null } | null> {
    if (!this.supabase) throw new Error('findCanonicalRow requires Supabase client');
    const cols = 'id, slug, source_type, created_by_coach_id';
    if (exerciseId) {
      const { data } = await this.supabase.from('exercises').select(cols).eq('id', exerciseId).maybeSingle();
      if (data) return data;
    }
    if (slug) {
      const { data } = await this.supabase.from('exercises').select(cols).eq('slug', slug).maybeSingle();
      if (data) return data;
    }
    return null;
  }

  /**
   * Merges incoming metadata over what the row already has.
   *
   * A canonical re-import must not wipe provenance the taxonomy migration
   * wrote. `dataset_version` and `content_source` are migration-owned, and
   * blind replacement of the metadata object would delete them (along with any
   * unrelated keys) the first time V3 was re-imported after reconciliation.
   * Incoming keys win for their own fields; everything else survives.
   */
  static mergeMetadata(
    existing: Record<string, any> | null | undefined,
    incoming: Record<string, any> | null | undefined,
  ): Record<string, any> {
    return { ...(existing ?? {}), ...(incoming ?? {}) };
  }

  async upsertExercise(
    payload: ExerciseImportItem,
    opts?: { canonical?: boolean; existingId?: string | null },
  ): Promise<{ id: string; action: 'created' | 'updated'; children: ChildWriteResult[] }> {
    if (!this.supabase) throw new Error('upsertExercise requires Supabase client');

    const slug = payload.slug || payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const exerciseId = payload.exercise_id || payload.id;

    // Canonical imports resolve the target row through the collision policy and
    // pass it in, so no lookup — and crucially no name matching — happens here.
    let existingId: string | null = opts?.existingId ?? null;
    if (!opts?.canonical) {
      if (!existingId && exerciseId) {
        const { data } = await this.supabase.from('exercises').select('id').eq('id', exerciseId).maybeSingle();
        if (data) existingId = data.id;
      }
      if (!existingId && slug) {
        const { data } = await this.supabase.from('exercises').select('id').eq('slug', slug).maybeSingle();
        if (data) existingId = data.id;
      }
      if (!existingId) {
        const { data } = await this.supabase.from('exercises').select('id').eq('name', payload.name).maybeSingle();
        if (data) existingId = data.id;
      }
    }

    // Read the row's current metadata so migration-written provenance survives
    // the update instead of being replaced wholesale.
    let existingMetadata: Record<string, any> | null = null;
    if (existingId) {
      const { data } = await this.supabase
        .from('exercises')
        .select('metadata')
        .eq('id', existingId)
        .maybeSingle();
      existingMetadata = data?.metadata ?? null;
    }

    const row = {
      ...(existingId ? { id: existingId } : exerciseId ? { id: exerciseId } : {}),
      name: payload.name,
      slug,
      category: payload.category || 'strength',
      equipment: payload.equipment || 'bodyweight',
      primary_muscle: payload.primary_muscle || payload.target_muscle || 'full_body',
      target_muscle: payload.target_muscle || payload.primary_muscle || 'full_body',
      secondary_muscles: payload.secondary_muscles || [],
      movement_pattern: payload.movement_pattern || 'isolation',
      difficulty: payload.difficulty || 'intermediate',
      unilateral: payload.unilateral ?? false,
      setup_instructions: payload.setup_instructions || '',
      execution_instructions: payload.execution_instructions || '',
      breathing: payload.breathing || '',
      coaching_cues: payload.coaching_cues || [],
      common_mistakes: payload.common_mistakes || [],
      safety_notes: payload.safety_notes || '',
      default_sets: payload.default_sets || 3,
      default_reps: payload.default_reps || 10,
      tempo: payload.tempo || '2-0-2-0',
      // Never assume Yeti ownership. A payload with no source_type used to be
      // stamped 'yeti_first_party' here, which silently minted false first-party
      // provenance on every import and would defeat the taxonomy reconciliation
      // the moment it ran. Absent an explicit value the row is legacy.
      source_type: payload.source_type || 'legacy_catalog',
      license: payload.license || 'Yeti Proprietary',
      recommended_rest_seconds: payload.recommended_rest_seconds || 90,
      hypertrophy_reps: payload.hypertrophy_reps || '6–15',
      strength_reps: payload.strength_reps || '3–6',
      endurance_reps: payload.endurance_reps || '15–25+',
      media_status: payload.media_status || 'TO_CREATE',
      media_notes: payload.media_notes || '',
      metadata: ExerciseRepository.mergeMetadata(existingMetadata, payload.metadata),
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error } = await this.supabase
      .from('exercises')
      .upsert(row, { onConflict: 'id' })
      .select('id')
      .single();

    if (error || !upserted) {
      // Stage-labelled so an auth/permission failure is attributable instead of
      // reading as a generic "Failed to upsert exercise X: Invalid API key".
      throw new Error(`exercise parent upsert failed for "${payload.name}": ${error?.message ?? 'no row returned'}`);
    }

    const id = upserted.id;
    const action = existingId ? 'updated' : 'created';

    // ---- child tables -------------------------------------------------------
    // Every one of these used to be a bare `await` whose { error } was never
    // read, so a rejected child write was invisible and the CLI still reported
    // the parsed count as "Inserted". Each now reports what the DATABASE
    // confirmed, and names its own stage so a failure is attributable.
    const children: ChildWriteResult[] = [];

    const writeChildren = async (
      stage: ChildWriteResult['stage'],
      table: string,
      rows: any[],
      onConflict: string,
    ) => {
      if (rows.length === 0) return;
      const { data, error } = await this.supabase
        .from(table)
        .upsert(rows, { onConflict })
        .select('id');
      children.push({
        stage,
        attempted: rows.length,
        upserted: error ? 0 : (data?.length ?? 0),
        error: error ? `${stage}: ${error.message}` : null,
      });
    };

    if (payload.search_aliases && payload.search_aliases.length > 0) {
      await writeChildren(
        'alias upsert', 'exercise_aliases',
        payload.search_aliases.map((alias: string) => ({ exercise_id: id, alias })),
        'exercise_id,alias',
      );
    }

    if (payload.ai_tags && payload.ai_tags.length > 0) {
      await writeChildren(
        'tag upsert', 'exercise_tags',
        payload.ai_tags.map((tag: string) => ({ exercise_id: id, tag, tag_type: 'ai' })),
        'exercise_id,tag',
      );
    }

    if (payload.muscles && payload.muscles.length > 0) {
      await writeChildren(
        'muscle upsert', 'exercise_muscles',
        payload.muscles.map((m: NonNullable<ExerciseImportItem['muscles']>[number]) => ({ exercise_id: id, muscle: m.muscle, role: m.role })),
        'exercise_id,muscle,role',
      );
    }

    if (payload.media && payload.media.length > 0) {
      await writeChildren(
        'media upsert', 'exercise_media',
        payload.media.map((m: NonNullable<ExerciseImportItem['media']>[number]) => ({
          exercise_id: id,
          media_type: m.media_type,
          file_format: m.file_format,
          r2_bucket: m.r2_bucket || 'dude-media',
          r2_key: m.r2_key,
          url: m.url || null,
          thumbnail_url: m.thumbnail_url || null,
          is_primary: m.is_primary ?? false,
          media_status: m.media_status || 'TO_CREATE',
          media_notes: m.media_notes || '',
        })),
        'exercise_id,r2_key',
      );
    }

    return { id, action, children };
  }
}
