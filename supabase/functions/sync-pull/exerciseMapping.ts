export function supportsExerciseSchemaV8(schemaVersion: unknown): boolean {
  return Number.isInteger(schemaVersion) && (schemaVersion as number) >= 8;
}

export function mapExerciseForPull(row: any, nowMs: number, schemaVersion: unknown): Record<string, unknown> {
  const mapped: Record<string, unknown> = {
    id: row.id,
    server_id: row.id,
    name: row.name,
    muscle_group: row.muscle_group || null,
    category: row.category || null,
    equipment: row.equipment || null,
    instructions: row.instructions || null,
    gif_url: row.gif_url || null,
    video_url: row.video_url || null,
    is_compound: null,
    synced_at: nowMs,
    body_part: row.body_part || null,
    target_muscle: row.target_muscle || null,
    secondary_muscles: row.secondary_muscles ? JSON.stringify(row.secondary_muscles) : null,
    difficulty: row.difficulty || null,
    media_type: row.media_type || null,
    thumbnail_url: row.thumbnail_url || null,
    source: row.source || null,
    source_id: row.source_id || null,
    is_public: row.is_public ?? true,
    created_at: new Date(row.created_at || row.updated_at || nowMs).getTime(),
    updated_at: new Date(row.updated_at || nowMs).getTime(),
  };

  if (supportsExerciseSchemaV8(schemaVersion)) {
    mapped.slug = typeof row.slug === 'string' ? row.slug : null;
    mapped.primary_muscle = typeof row.primary_muscle === 'string' ? row.primary_muscle : null;
    mapped.movement_pattern = typeof row.movement_pattern === 'string' ? row.movement_pattern : null;
    mapped.unilateral = typeof row.unilateral === 'boolean' ? row.unilateral : null;
    mapped.setup_instructions = typeof row.setup_instructions === 'string' ? row.setup_instructions : null;
    mapped.execution_instructions = typeof row.execution_instructions === 'string' ? row.execution_instructions : null;
    mapped.breathing = typeof row.breathing === 'string' ? row.breathing : null;
    mapped.coaching_cues = Array.isArray(row.coaching_cues) ? JSON.stringify(row.coaching_cues) : null;
    mapped.common_mistakes = Array.isArray(row.common_mistakes) ? JSON.stringify(row.common_mistakes) : null;
    mapped.safety_notes = typeof row.safety_notes === 'string' ? row.safety_notes : null;
    mapped.default_sets = typeof row.default_sets === 'number' && Number.isInteger(row.default_sets)
      ? row.default_sets
      : null;
    mapped.default_reps = typeof row.default_reps === 'number' && Number.isInteger(row.default_reps)
      ? row.default_reps
      : null;
    mapped.default_reps_prescription = typeof row.default_reps_prescription === 'string'
      ? row.default_reps_prescription
      : null;
    mapped.tempo = typeof row.tempo === 'string' ? row.tempo : null;
  }

  return mapped;
}
