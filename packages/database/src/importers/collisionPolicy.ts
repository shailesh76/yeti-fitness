/**
 * Import collision policy and lossless prescription handling.
 *
 * Kept outside ExerciseImporter so the rules can be exercised directly, with no
 * Supabase client and no database. Two defects live here:
 *
 *  1. The importer upserted on slug and only WARNED about duplicates, so a V3
 *     record silently overwrote the V2 row that already held that slug while
 *     keeping the V2 UUID. Twenty-four slugs appear in both datasets, so that
 *     path ran 24 times with no signal that content had been replaced.
 *
 *  2. default_reps was reduced to its first integer via /\d+/. Every authored
 *     prescription is a string — "8–12", "30–60 sec", "6–10 controlled reps"
 *     (EN DASH, U+2013) — so "30–60 sec" became the number 30, turning a
 *     30-second sled push into a 30-repetition one.
 */

export type CollisionKind =
  | 'new'
  | 'canonical-id-match'
  | 'manifest-merge'
  | 'manifest-merge-skipped'
  | 'not-canonical'
  | 'unexpected-slug-collision'
  | 'unexpected-id-collision'
  | 'foreign-owner-collision';

export interface CollisionDecision {
  kind: CollisionKind;
  /** False means the importer must refuse the record rather than overwrite. */
  proceed: boolean;
  slug: string;
  reason: string;
}

/** Minimal shape the policy needs; the manifest supplies these. */
export interface ManifestEntry {
  slug: string;
  dataset_versions: Array<'v2' | 'v3'>;
  /** Which dataset supplies content. Reviewed, never inferred from file order. */
  merge_winner: 'v2' | 'v3';
}

/**
 * Whether an incoming dataset record is the one allowed to write this slug.
 *
 * For the 24 shared slugs both datasets carry a record, but only the reviewed
 * winner may supply content. Without this the outcome depends on which file the
 * importer happens to read last — which is exactly how 22 of the 24 live rows
 * ended up holding V2's boilerplate instead of V3's corrected metadata.
 */
export function isMergeWinner(entry: ManifestEntry, incomingDataset: 'v2' | 'v3'): boolean {
  return entry.merge_winner === incomingDataset;
}

export interface ExistingRow {
  id?: string | null;
  slug: string;
  source_type?: string | null;
  created_by_coach_id?: string | null;
}

export type OwnershipVerdict = 'absent' | 'yeti_owned' | 'coach_authored' | 'foreign';

/**
 * Proves — or refuses to prove — that an existing row is Yeti-owned.
 *
 * Ownership comes from the row's OWN provenance, never from the fact that the
 * incoming record is canonical. Matching slug, matching id, matching name, and
 * "this slug appears in the manifest" are all insufficient: a legacy_catalog or
 * coach-authored row can occupy a canonical slug, and treating that as licence
 * to overwrite is how foreign data gets destroyed by an import.
 *
 * `yeti_v2` is accepted only transitionally — it is the historical value that
 * 20260812133000 rewrites to `yeti_first_party` — and only when the row's own
 * slug is independently manifest-proven. Once that migration is applied this
 * branch stops matching anything.
 */
export function classifyExistingOwnership(
  existing: ExistingRow | null,
  manifest: Map<string, ManifestEntry>,
): OwnershipVerdict {
  if (!existing) return 'absent';
  // Coach authorship dominates every other signal.
  if (existing.created_by_coach_id) return 'coach_authored';

  const sourceType = (existing.source_type ?? '').trim();
  if (sourceType === 'yeti_first_party') return 'yeti_owned';
  if (sourceType === 'yeti_v2' && manifest.has(existing.slug)) return 'yeti_owned';

  // legacy_catalog, custom, null, anything else — not ours to touch.
  return 'foreign';
}

export interface IncomingRecord {
  exercise_id?: string | null;
  slug: string;
  name?: string;
  /** Which dataset this record came from, for merge-winner arbitration. */
  dataset?: 'v2' | 'v3';
}

/**
 * Decides what to do with one incoming record.
 *
 * A slug that the manifest says belongs to BOTH datasets is an expected merge:
 * the two dataset records describe one exercise, so the second one updates the
 * first rather than colliding. Every other slug or id clash is unexpected and
 * fails, because silently overwriting is how catalogue content goes missing.
 */
export function decideCollision(
  incoming: IncomingRecord,
  existing: ExistingRow | null,
  manifest: Map<string, ManifestEntry>,
): CollisionDecision {
  const slug = incoming.slug;

  // ---- gate 0: the INCOMING record must itself be canonical ----------------
  if (!manifest.has(slug)) {
    return {
      kind: 'not-canonical',
      proceed: false,
      slug,
      reason: `Slug "${slug}" is not in the provenance manifest; canonical import only writes manifest members.`,
    };
  }

  if (!existing) {
    return { kind: 'new', proceed: true, slug, reason: 'No existing row for this slug.' };
  }

  // ---- gate 1: OWNERSHIP, before any identity reasoning --------------------
  // Canonical membership of the INCOMING record says nothing about who owns the
  // EXISTING row. A legacy or coach-authored row can occupy a canonical slug or
  // even a canonical id, and matching on either used to be treated as licence
  // to overwrite it. Ownership is now proven from the existing row's own
  // provenance and is checked first.
  const ownership = classifyExistingOwnership(existing, manifest);
  if (ownership === 'coach_authored') {
    return {
      kind: 'foreign-owner-collision',
      proceed: false,
      slug,
      reason: `Row ${existing.id} is coach-authored (created_by_coach_id set); canonical import never overwrites it, whatever its slug or id.`,
    };
  }
  if (ownership === 'foreign') {
    return {
      kind: 'foreign-owner-collision',
      proceed: false,
      slug,
      reason: `Row ${existing.id} has source_type "${existing.source_type ?? '<null>'}" and is not provably Yeti-owned; canonical import must not mutate it.`,
    };
  }

  // Ownership proven. Only now may identity decide WHICH update happens.
  if (incoming.exercise_id && existing.id && incoming.exercise_id === existing.id) {
    return { kind: 'canonical-id-match', proceed: true, slug, reason: 'Same canonical id on a Yeti-owned row.' };
  }

  const entry = manifest.get(slug);
  if (entry && entry.dataset_versions.length > 1) {
    // Both datasets carry this slug; only the reviewed winner writes content.
    // The loser is skipped, not failed — its presence is expected.
    if (incoming.dataset && !isMergeWinner(entry, incoming.dataset)) {
      return {
        kind: 'manifest-merge-skipped',
        proceed: false,
        slug,
        reason: `Slug "${slug}" is a V2/V3 merge won by ${entry.merge_winner}; the ${incoming.dataset} record does not supply content.`,
      };
    }
    return {
      kind: 'manifest-merge',
      proceed: true,
      slug,
      reason: `Slug "${slug}" is a known V2/V3 merge (${entry.dataset_versions.join('+')}) won by ${entry.merge_winner}; updating the canonical row in place.`,
    };
  }

  if (entry) {
    // In the manifest but only one dataset owns the slug, yet a different row
    // already holds it — that is a genuine clash, not a planned merge.
    return {
      kind: 'unexpected-slug-collision',
      proceed: false,
      slug,
      reason: `Slug "${slug}" is claimed by only ${entry.dataset_versions.join('+')} but an unrelated row already holds it.`,
    };
  }

  return {
    kind: 'unexpected-slug-collision',
    proceed: false,
    slug,
    reason: `Slug "${slug}" is not in the provenance manifest and already exists.`,
  };
}

/** Detects duplicate ids inside a single import batch. */
export function findDuplicateIds(records: IncomingRecord[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const r of records) {
    if (!r.exercise_id) continue;
    if (seen.has(r.exercise_id)) dupes.add(r.exercise_id);
    else seen.add(r.exercise_id);
  }
  return [...dupes];
}

export interface Prescription {
  /** The authored value, unchanged. This is the value of record. */
  text: string;
  /** Leading integer, ONLY for the legacy integer column. Null when meaningless. */
  legacyNumeric: number | null;
  /** True when legacyNumeric cannot represent `text` without losing meaning. */
  lossy: boolean;
  /** True when the prescription measures time rather than repetitions. */
  isDuration: boolean;
}

const DURATION_RE = /\b(sec|second|seconds|min|minute|minutes)\b/i;
// Hyphen, EN DASH (U+2013) and EM DASH (U+2014) all appear in authored ranges.
const RANGE_RE = /\d\s*[-–—]\s*\d/;

/**
 * Parses an authored prescription WITHOUT discarding it.
 *
 * The authored text is always preserved. A numeric form is offered only as a
 * compatibility shim for the not-yet-migrated integer column, and is flagged
 * `lossy` whenever it fails to carry the original meaning, so callers can
 * report it instead of writing a wrong number silently.
 */
export function parsePrescription(value: unknown): Prescription {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { text: String(value), legacyNumeric: value, lossy: false, isDuration: false };
  }
  const text = String(value ?? '').trim();
  if (!text) return { text: '', legacyNumeric: null, lossy: false, isDuration: false };

  const isDuration = DURATION_RE.test(text);
  const isRange = RANGE_RE.test(text);
  const m = text.match(/\d+/);
  const legacyNumeric = m ? parseInt(m[0], 10) : null;
  const pureInteger = /^\d+$/.test(text);

  return {
    text,
    legacyNumeric,
    // A duration or a range cannot be represented by one repetition count.
    lossy: !pureInteger && (isDuration || isRange || legacyNumeric !== null),
    isDuration,
  };
}

/** Loads the checked-in manifest into the lookup the policy expects. */
export function buildManifestIndex(entries: ManifestEntry[]): Map<string, ManifestEntry> {
  return new Map(entries.map((e) => [e.slug, e]));
}
