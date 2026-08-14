import { ExerciseImportItem } from '@yeti/types';
import { ExerciseRepository } from '../repositories/ExerciseRepository';
import {
  parsePrescription, decideCollision, buildManifestIndex,
  type ManifestEntry, type CollisionDecision,
} from './collisionPolicy';

export interface DetailedImportMetrics {
  rowsRead: number;
  accepted: number;
  rejected: number;
  exercisesInserted: number;
  exercisesUpdated: number;
  aliasesInserted: number;
  tagsInserted: number;
  musclesInserted: number;
  alternativesResolved: number;
  alternativesUnresolved: number;
  alternativesAmbiguous: number;
  alternativesSelfReferences: number;
  mediaRecordsInserted: number;
  duplicatesPrevented: number;
  /** DATABASE-confirmed child upserts (insert or update), not parser counts. */
  aliasesUpserted: number;
  tagsUpserted: number;
  musclesUpserted: number;
  mediaUpserted: number;
  /** Child rows whose write returned an error. */
  childWritesFailed: number;
  errors: Array<{ row: number; name: string; error: string }>;
  warnings: Array<{ row: number; name: string; message: string }>;
  unresolvedAlternativesList: Array<{ exerciseId: string; exerciseName: string; unresolvedName: string }>;
}

/** Maps a repository child stage onto its DATABASE-confirmed metric bucket. */
const CHILD_METRIC_KEYS = {
  'alias upsert': 'aliasesUpserted',
  'tag upsert': 'tagsUpserted',
  'muscle upsert': 'musclesUpserted',
  'media upsert': 'mediaUpserted',
} as const;

export class ExerciseImporter {
  private repository: ExerciseRepository;

  /** Set to enable canonical-import mode; null means the legacy generic path. */
  private canonicalManifest: Map<string, ManifestEntry> | null = null;
  private canonicalDataset?: 'v2' | 'v3';
  /** Every collision decision taken during the last import, for reporting. */
  public conflicts: Array<{ row: number; name: string } & CollisionDecision> = [];

  constructor(repository: ExerciseRepository) {
    this.repository = repository;
  }

  /**
   * Enables canonical-import mode: every record is checked against the
   * provenance manifest before any mutation, and identity resolution drops the
   * name fallback. `dataset` lets the policy arbitrate the 24 V2/V3 merges by
   * the manifest's reviewed winner instead of by file order.
   */
  public useCanonicalManifest(entries: ManifestEntry[], dataset?: 'v2' | 'v3'): void {
    this.canonicalManifest = buildManifestIndex(entries);
    this.canonicalDataset = dataset;
    this.conflicts = [];
  }

  /** Human-readable conflict report for the CLI. */
  public conflictReport(): string {
    if (!this.conflicts.length) return 'No collisions.';
    return this.conflicts
      .map((c) => `  [row ${c.row}] ${c.kind}: ${c.reason}`)
      .join('\n');
  }

  /**
   * Parses JSON string into normalized ExerciseImportItem objects.
   */
  parseJson(jsonContent: string): ExerciseImportItem[] {
    const raw = JSON.parse(jsonContent);
    const list = Array.isArray(raw) ? raw : [raw];
    return list.map((item, idx) => this.normalizeItem(item, idx + 1));
  }

  /**
   * Parses CSV string into normalized ExerciseImportItem objects.
   */
  parseCsv(csvContent: string): ExerciseImportItem[] {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) return [];

    const headers = this.parseCsvRow(lines[0]).map(h => h.trim().toLowerCase());
    const items: ExerciseImportItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvRow(lines[i]);
      if (values.length === 0 || !values[0]) continue;

      const rawObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rawObj[h] = values[idx] ? values[idx].trim() : '';
      });

      items.push(this.normalizeCsvItem(rawObj, i + 1));
    }

    return items;
  }

  /**
   * Performs a validation-only Dry Run across all records without database writes.
   */
  validateDryRun(items: ExerciseImportItem[]): DetailedImportMetrics {
    const metrics: DetailedImportMetrics = {
      rowsRead: items.length,
      accepted: 0,
      rejected: 0,
      exercisesInserted: 0,
      exercisesUpdated: 0,
      aliasesInserted: 0,
      tagsInserted: 0,
      musclesInserted: 0,
      alternativesResolved: 0,
      alternativesUnresolved: 0,
      alternativesAmbiguous: 0,
      alternativesSelfReferences: 0,
      mediaRecordsInserted: 0,
      duplicatesPrevented: 0,
      aliasesUpserted: 0,
      tagsUpserted: 0,
      musclesUpserted: 0,
      mediaUpserted: 0,
      childWritesFailed: 0,
      errors: [],
      warnings: [],
      unresolvedAlternativesList: [],
    };

    const seenSlugs = new Set<string>();
    const seenIds = new Set<string>();

    items.forEach((item, idx) => {
      const rowNum = idx + 1;
      if (!item.name || item.name.trim().length === 0) {
        metrics.rejected++;
        metrics.errors.push({ row: rowNum, name: 'Missing Name', error: 'Exercise name is required' });
        return;
      }

      // A slug seen twice WITHIN one batch is always a hard error. Cross-file
      // V2/V3 merges are legitimate, but they are resolved against the
      // provenance manifest before import, never by letting the later record
      // quietly overwrite the earlier one.
      const slug = item.slug || this.slugify(item.name);
      if (seenSlugs.has(slug)) {
        metrics.duplicatesPrevented++;
        metrics.rejected++;
        metrics.errors.push({
          row: rowNum,
          name: item.name,
          error: `Duplicate slug "${slug}" within this batch — refusing to overwrite the earlier record.`,
        });
        return;
      }
      seenSlugs.add(slug);

      const exId = item.exercise_id || item.id;
      if (exId && seenIds.has(exId)) {
        metrics.duplicatesPrevented++;
        metrics.rejected++;
        metrics.errors.push({
          row: rowNum,
          name: item.name,
          error: `Duplicate ID "${exId}" within this batch — refusing to overwrite the earlier record.`,
        });
        return;
      }
      if (exId) seenIds.add(exId);

      metrics.accepted++;
      metrics.aliasesInserted += item.search_aliases?.length || 0;
      metrics.tagsInserted += item.ai_tags?.length || 0;
      metrics.musclesInserted += item.muscles?.length || 1;
      metrics.mediaRecordsInserted += item.media?.length || 0;
    });

    return metrics;
  }

  /**
   * Imports ExerciseImportItems into Supabase using item upserts and detailed metrics tracking.
   */
  async importExercises(items: ExerciseImportItem[], supabaseClient?: any): Promise<DetailedImportMetrics> {
    const metrics = this.validateDryRun(items);

    const client = supabaseClient || (this.repository as any)?.supabase;
    if (!client && !this.repository) throw new Error('Supabase client or repository is required for importing dataset');

    // Canonical mode has exactly ONE mutation path: the collision-aware
    // repository. The direct client.upsert() fallback below bypasses ownership
    // checks entirely, so if the repository contract is unavailable we fail
    // closed BEFORE any write rather than silently degrading to it.
    if (this.canonicalManifest) {
      const hasContract =
        this.repository &&
        typeof this.repository.upsertExercise === 'function' &&
        typeof (this.repository as any).findCanonicalRow === 'function';
      if (!hasContract) {
        throw new Error(
          'Canonical import requires an ExerciseRepository providing findCanonicalRow() and upsertExercise(). ' +
            'Refusing to fall back to a direct client upsert, which would bypass ownership and collision checks.',
        );
      }
    }

    const idMap = new Map<string, string>();
    const nameMap = new Map<string, string>();

    items.forEach(item => {
      const exId = item.exercise_id || item.id;
      if (exId) idMap.set(exId, exId);
      if (item.name) {
        nameMap.set(item.name.toLowerCase().trim(), exId || item.name);
        nameMap.set(this.slugify(item.name), exId || item.name);
      }
      if (item.slug) {
        nameMap.set(item.slug.toLowerCase().trim(), exId || item.slug);
      }
    });

    const upsertedIds: string[] = [];

    // Pass 1: Upsert exercises via repository
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.name) continue;

      try {
        // ---- canonical mode: consult the collision policy BEFORE any write --
        // Without this the importer resolved rows by id -> slug -> NAME and
        // overwrote whatever it found, which is how V2 content replaced V3 on
        // all 24 shared slugs with no error reported.
        let resolvedExistingId: string | null = null;
        if (this.canonicalManifest) {
          const slug = item.slug || this.slugify(item.name);
          const existing = this.repository && typeof (this.repository as any).findCanonicalRow === 'function'
            ? await (this.repository as any).findCanonicalRow(item.exercise_id || item.id, slug)
            : null;
          const decision = decideCollision(
            { exercise_id: item.exercise_id || item.id, slug, name: item.name, dataset: this.canonicalDataset },
            existing,
            this.canonicalManifest,
          );
          if (!decision.proceed) {
            if (decision.kind === 'manifest-merge-skipped') {
              metrics.duplicatesPrevented++;
              metrics.warnings.push({ row: i + 1, name: item.name, message: decision.reason });
            } else {
              metrics.rejected++;
              metrics.errors.push({ row: i + 1, name: item.name, error: decision.reason });
            }
            this.conflicts.push({ row: i + 1, name: item.name, ...decision });
            continue; // no mutation
          }
          resolvedExistingId = existing ? existing.id : null;
        }

        if (this.repository && typeof this.repository.upsertExercise === 'function') {
          const { id, action, children } = await this.repository.upsertExercise(
            item,
            this.canonicalManifest ? { canonical: true, existingId: resolvedExistingId } : undefined,
          );
          if (action === 'created') metrics.exercisesInserted++;
          else metrics.exercisesUpdated++;
          upsertedIds.push(id);

          // Record what the DATABASE confirmed, never what the parser produced.
          // A child failure does not silently pass: it is counted as failed and
          // surfaced as an error, so a parent success cannot be reported as a
          // full success.
          for (const c of children ?? []) {
            const bucket = CHILD_METRIC_KEYS[c.stage];
            if (c.error) {
              metrics.childWritesFailed += c.attempted;
              metrics.errors.push({ row: i + 1, name: item.name, error: c.error });
            } else {
              metrics[bucket] += c.upserted;
            }
          }
        } else if (client) {
          const exId = item.exercise_id || item.id || this.slugify(item.name);
          const { error } = await client.from('exercises').upsert({
            id: exId,
            name: item.name,
            slug: item.slug || this.slugify(item.name),
            category: item.category || 'strength',
            equipment: item.equipment || 'bodyweight',
            primary_muscle: item.primary_muscle || 'full_body',
            target_muscle: item.primary_muscle || 'full_body',
            source_type: this.normalizeSourceType(item.source_type),
            license: item.license || 'Yeti Proprietary',
          }, { onConflict: 'id' });
          if (!error) {
            metrics.exercisesInserted++;
            upsertedIds.push(exId);
          } else {
            metrics.errors.push({ row: i + 1, name: item.name, error: error.message });
          }
        }
      } catch (err: any) {
        metrics.errors.push({ row: i + 1, name: item.name, error: err.message || String(err) });
      }
    }

    // Pass 2: Resolve and insert alternatives
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const sourceId = item.exercise_id || item.id || upsertedIds[i];
      if (!sourceId || !item.alternatives || item.alternatives.length === 0) continue;

      for (const alt of item.alternatives) {
        const altRef = (typeof alt === 'string' ? alt : alt.alternative_exercise_id || alt.alternative_exercise_name || '').trim();
        if (!altRef) continue;

        if (altRef === sourceId || (item.name && altRef.toLowerCase() === item.name.toLowerCase())) {
          metrics.alternativesSelfReferences++;
          metrics.warnings.push({ row: i + 1, name: item.name, message: `Self-referencing alternative "${altRef}" ignored` });
          continue;
        }

        let targetId = idMap.get(altRef) || nameMap.get(altRef.toLowerCase()) || nameMap.get(this.slugify(altRef));

        if (!targetId && client && typeof client.from === 'function') {
          const { data: matchedAlt } = await client
            .from('exercises')
            .select('id')
            .or(`id.eq.${altRef},slug.eq.${this.slugify(altRef)},name.ilike.${altRef}`)
            .maybeSingle();

          if (matchedAlt) targetId = matchedAlt.id;
        }

        if (targetId) {
          if (client && typeof client.from === 'function') {
            try {
              await client.from('exercise_alternatives').upsert({
                exercise_id: sourceId,
                alternative_exercise_id: targetId,
                reason: 'Biomechanical alternative from Yeti v2 dataset',
              }, { onConflict: 'exercise_id,alternative_exercise_id' });
              metrics.alternativesResolved++;
            } catch (err: any) {
              metrics.warnings.push({ row: i + 1, name: item.name, message: `Failed upserting alternative ${targetId}: ${err.message}` });
            }
          } else {
            metrics.alternativesResolved++;
          }
        } else {
          metrics.alternativesUnresolved++;
          metrics.unresolvedAlternativesList.push({
            exerciseId: sourceId,
            exerciseName: item.name,
            unresolvedName: altRef,
          });
          metrics.warnings.push({ row: i + 1, name: item.name, message: `Could not resolve alternative "${altRef}"` });
        }
      }
    }

    return metrics;
  }

  private normalizeItem(raw: any, rowNum: number): ExerciseImportItem {
    const name = (raw.name || raw.exercise_name || '').trim();
    const slug = raw.slug || this.slugify(name);
    const exId = raw.exercise_id || raw.id;

    // The authored prescription is kept verbatim; the numeric form is only a
    // shim for the not-yet-migrated integer column. Losing "30–60 sec" down to
    // 30 changes a 30-second effort into 30 repetitions, so the authored text
    // is always carried alongside it in metadata.
    const prescription = parsePrescription(raw.default_reps);

    const primaryMuscle = (raw.primary_muscle || raw.target_muscle || 'full_body').toLowerCase().trim();
    const secondaryMuscles = Array.isArray(raw.secondary_muscles) ? raw.secondary_muscles.map((m: string) => m.toLowerCase().trim()) : [];
    // V2 spells this `stabilizers`, V3 spells it `stabilizer_muscles`. Reading
    // only the V2 name silently dropped the stabilizer map for all 200 V3
    // records, including every one of the 24 merge winners.
    const rawStabilizers = Array.isArray(raw.stabilizer_muscles)
      ? raw.stabilizer_muscles
      : Array.isArray(raw.stabilizers)
        ? raw.stabilizers
        : [];
    const stabilizers = rawStabilizers.map((m: string) => String(m).toLowerCase().trim());

    const muscles: Array<{ muscle: string; role: 'primary' | 'secondary' | 'stabilizer' }> = [
      { muscle: primaryMuscle, role: 'primary' },
      ...secondaryMuscles.map((m: string) => ({ muscle: m, role: 'secondary' as const })),
      ...stabilizers.map((m: string) => ({ muscle: m, role: 'stabilizer' as const })),
    ];

    const aliases = Array.from(new Set([
      ...(Array.isArray(raw.aliases) ? raw.aliases : []),
      ...(Array.isArray(raw.search_aliases) ? raw.search_aliases : []),
    ])).map(a => String(a).trim()).filter(Boolean);

    const tags = Array.from(new Set([
      ...(Array.isArray(raw.ai_tags) ? raw.ai_tags : []),
      ...(Array.isArray(raw.search_keywords) ? raw.search_keywords : []),
      ...(Array.isArray(raw.training_goals) ? raw.training_goals : []),
    ])).map(t => String(t).trim().toLowerCase()).filter(Boolean);

    const media: Array<any> = [];
    if (raw.video_url) {
      media.push({
        media_type: 'video',
        file_format: 'mp4',
        r2_bucket: 'dude-media',
        r2_key: `exercises/${slug}/demo.mp4`,
        url: raw.video_url,
        is_primary: true,
        media_status: 'TO_CREATE',
        media_notes: raw.media_notes || 'Planned placeholder path only.',
      });
    }
    if (raw.gif_url) {
      media.push({
        media_type: 'gif',
        file_format: 'gif',
        r2_bucket: 'dude-media',
        r2_key: `exercises/${slug}/preview.gif`,
        url: raw.gif_url,
        is_primary: false,
        media_status: 'TO_CREATE',
        media_notes: raw.media_notes || 'Planned placeholder path only.',
      });
    }
    if (raw.thumbnail_url) {
      media.push({
        media_type: 'thumbnail',
        file_format: 'webp',
        r2_bucket: 'dude-media',
        r2_key: `exercises/${slug}/thumbnail.webp`,
        thumbnail_url: raw.thumbnail_url,
        is_primary: false,
        media_status: 'TO_CREATE',
        media_notes: raw.media_notes || 'Planned placeholder path only.',
      });
    }

    const metadata: Record<string, any> = {
      // The prescription of record. exercises.default_reps is still an integer
      // column, so the authored range/duration is preserved here until
      // 20260812140000_exercise_default_reps_lossless.sql converts it to text.
      default_reps_authored: prescription.text,
      default_reps_lossy: prescription.lossy,
      // Authored V3 fields with no column or support-table write today.
      // Persisting them to exercise_progressions / exercise_regressions is
      // Round 2 support-table work; until then they are kept verbatim rather
      // than discarded, so nothing authored is lost.
      ...(raw.progressions !== undefined ? { deferred_progressions: raw.progressions } : {}),
      ...(raw.regressions !== undefined ? { deferred_regressions: raw.regressions } : {}),
      ...(raw.source_id !== undefined ? { source_id: raw.source_id } : {}),
      ...(raw.active !== undefined ? { deferred_active: raw.active } : {}),
      ...(raw.language !== undefined ? { deferred_language: raw.language } : {}),
      ...(raw.voice_script !== undefined ? { deferred_voice_script: raw.voice_script } : {}),
      ...(raw.quality_status !== undefined ? { deferred_quality_status: raw.quality_status } : {}),
      description: raw.description || '',
      stabilizers,
      machine_brand_compatibility: raw.machine_brand_compatibility || [],
      grip_type: raw.grip_type || '',
      bench_angle: raw.bench_angle || '',
      attachment_type: raw.attachment_type || '',
      plane_of_motion: raw.plane_of_motion || '',
      force_type: raw.force_type || '',
      mechanics: raw.mechanics || '',
      skill_level: raw.skill_level || '',
      fatigue_score: raw.fatigue_score ?? null,
      joint_stress: raw.joint_stress || {},
      rpe_recommendation: raw.rpe_recommendation || '',
      range_of_motion: raw.range_of_motion || '',
      contraindication_notes: raw.contraindication_notes || '',
      filming_angle: raw.filming_angle || '',
      content_status: raw.content_status || '',
      schema_version: raw.schema_version || '2.0.0',
    };

    return {
      exercise_id: exId,
      id: exId,
      slug,
      name,
      category: (raw.category || 'strength').toLowerCase().trim(),
      equipment: (raw.equipment || 'bodyweight').toLowerCase().trim(),
      primary_muscle: primaryMuscle,
      target_muscle: primaryMuscle,
      secondary_muscles: secondaryMuscles,
      movement_pattern: (raw.movement_pattern || 'isolation').toLowerCase().trim(),
      difficulty: (raw.difficulty || 'intermediate').toLowerCase().trim(),
      unilateral: Boolean(raw.laterality && String(raw.laterality).toLowerCase().includes('unilateral')) || Boolean(raw.unilateral),
      setup_instructions: raw.setup_instructions || '',
      execution_instructions: raw.execution_instructions || raw.description || '',
      breathing: raw.breathing_cue || raw.breathing || '',
      coaching_cues: Array.isArray(raw.coaching_cues) ? raw.coaching_cues : [],
      common_mistakes: Array.isArray(raw.common_mistakes) ? raw.common_mistakes : [],
      safety_notes: Array.isArray(raw.safety_notes) ? raw.safety_notes.join('; ') : raw.safety_notes || '',
      default_sets: Number(raw.default_sets) || 3,
      default_reps: prescription.legacyNumeric ?? 10,
      tempo: raw.tempo || '2-1-2',
      source_type: this.normalizeSourceType(raw.source_type),
      license: raw.license || 'Yeti Proprietary',
      recommended_rest_seconds: Number(raw.recommended_rest_seconds) || 90,
      hypertrophy_reps: raw.hypertrophy_reps || '6–15',
      strength_reps: raw.strength_reps || '3–6',
      endurance_reps: raw.endurance_reps || '15–25+',
      media_status: raw.media_status || 'TO_CREATE',
      media_notes: raw.media_notes || 'Planned placeholder path only.',
      metadata,
      search_aliases: aliases,
      ai_tags: tags,
      muscles,
      alternatives: Array.isArray(raw.alternatives) ? raw.alternatives : [],
      media,
    };
  }

  private normalizeCsvItem(raw: Record<string, string>, rowNum: number): ExerciseImportItem {
    const parseList = (val?: string) => (val ? val.split(';').map(s => s.trim()).filter(Boolean) : []);
    const name = (raw.name || raw.exercise_name || '').trim();

    return {
      exercise_id: raw.exercise_id || raw.id,
      id: raw.id || raw.exercise_id,
      slug: raw.slug || this.slugify(name),
      name,
      category: raw.category || 'strength',
      equipment: raw.equipment || 'bodyweight',
      primary_muscle: raw.primary_muscle || raw.target_muscle || 'full_body',
      target_muscle: raw.target_muscle || raw.primary_muscle || 'full_body',
      secondary_muscles: parseList(raw.secondary_muscles),
      movement_pattern: raw.movement_pattern || 'isolation',
      difficulty: raw.difficulty || 'beginner',
      unilateral: raw.unilateral === 'true' || raw.unilateral === '1',
      setup_instructions: raw.setup_instructions || '',
      execution_instructions: raw.execution_instructions || raw.instructions || '',
      breathing: raw.breathing || raw.breathing_cue || '',
      coaching_cues: parseList(raw.coaching_cues),
      common_mistakes: parseList(raw.common_mistakes),
      safety_notes: raw.safety_notes || '',
      default_sets: parseInt(raw.default_sets || '3', 10) || 3,
      default_reps: parseInt(raw.default_reps || '10', 10) || 10,
      tempo: raw.tempo || '2-0-2-0',
      source_type: this.normalizeSourceType(raw.source_type),
      license: 'Yeti Proprietary',
      search_aliases: parseList(raw.search_aliases || raw.aliases),
      ai_tags: parseList(raw.ai_tags || raw.tags),
    };
  }

  private parseCsvRow(rowText: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < rowText.length; i++) {
      const char = rowText[i];
      if (char === '"') {
        if (inQuotes && rowText[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  private slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  /**
   * Maps a dataset's source_type onto the canonical taxonomy.
   *
   * A missing value must NOT become Yeti-owned. That fallback was the app-layer
   * twin of the `source_type DEFAULT 'yeti_v2'` column default: between them,
   * anything imported without an explicit source_type acquired first-party
   * provenance it had not earned. Unknown now means legacy.
   */
  public normalizeSourceType(sourceType?: string): string {
    if (!sourceType) return 'legacy_catalog';
    const s = sourceType.trim().toLowerCase();
    if (s === 'yeti_v2' || s === 'yeti_v3' || s === 'yeti_first_party') {
      return 'yeti_first_party';
    }
    if (s === 'custom') return 'custom';
    return 'legacy_catalog';
  }
}
