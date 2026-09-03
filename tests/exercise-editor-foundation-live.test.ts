import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LIVE_ENABLED, LIVE_ATHLETE1_AUTH_ENABLED, LIVE_COACH_AUTH_ENABLED, TEST_USERS, signInClient } from './helpers/live';

const RUN_EDITOR_INTEGRATION = process.env.RUN_EXERCISE_EDITOR_INTEGRATION === '1';
const COACH_TWO_EMAIL = process.env.YETI_TEST_COACH_2_EMAIL || '';
const COACH_TWO_PASSWORD = process.env.YETI_TEST_COACH_2_PASSWORD || '';
const ADMIN_EMAIL = process.env.YETI_TEST_ADMIN_EMAIL || '';
const ADMIN_PASSWORD = process.env.YETI_TEST_ADMIN_PASSWORD || '';
const GLOBAL_EXERCISE_ID = process.env.YETI_TEST_GLOBAL_EXERCISE_ID || '';
const enabled = LIVE_ENABLED && RUN_EDITOR_INTEGRATION && Boolean(
  COACH_TWO_EMAIL && COACH_TWO_PASSWORD && ADMIN_EMAIL && ADMIN_PASSWORD && GLOBAL_EXERCISE_ID,
);

interface Actor { client: SupabaseClient; userId: string }

function editorArgs(exerciseId: string | null, name: string, archived = false) {
  return {
    p_exercise_id: exerciseId, p_name: name, p_primary_muscle: 'quadriceps', p_equipment: 'dumbbell',
    p_category: 'strength', p_movement_pattern: 'squat', p_difficulty: 'beginner', p_unilateral: false,
    p_setup_instructions: 'Set up safely.', p_execution_instructions: 'Move under control.',
    p_breathing: 'Exhale through effort.', p_coaching_cues: ['Brace'], p_common_mistakes: ['Rushing'],
    p_safety_notes: 'Use a manageable load.', p_default_sets: 3, p_default_reps: 10,
    p_default_reps_prescription: '8-12', p_tempo: '2-0-2-0', p_archived: archived,
  };
}

(enabled ? describe.sequential : describe.skip)('Exercise Editor Phase A live staging authorization', () => {
  let athlete: Actor;
  let coach: Actor;
  let coachTwo: Actor;
  let admin: Actor;
  let customId = '';
  let globalRow: Record<string, any>;

  beforeAll(async () => {
    athlete = await signInClient(TEST_USERS.athlete1.email, TEST_USERS.athlete1.password);
    coach = await signInClient(TEST_USERS.coach.email, TEST_USERS.coach.password);
    coachTwo = await signInClient(COACH_TWO_EMAIL, COACH_TWO_PASSWORD);
    admin = await signInClient(ADMIN_EMAIL, ADMIN_PASSWORD);
    const { data, error } = await admin.client.from('exercises').select('*').eq('id', GLOBAL_EXERCISE_ID).single();
    if (error) throw error;
    globalRow = data;
  }, 30_000);

  afterAll(async () => {
    if (customId) await coach.client.from('exercises').delete().eq('id', customId);
  });

  it('denies athlete insert and RPC mutation', async () => {
    const promotion = await athlete.client.from('profiles').update({ role: 'coach' }).eq('id', athlete.userId);
    expect(promotion.error).not.toBeNull();
    const direct = await athlete.client.from('exercises').insert({ name: '__EDITOR_ATHLETE_DENIED__' });
    expect(direct.error).not.toBeNull();
    const rpc = await athlete.client.rpc('save_exercise_editor', editorArgs(null, '__EDITOR_ATHLETE_DENIED__'));
    expect(rpc.error).not.toBeNull();
  });

  it('allows a coach to create only a server-owned custom exercise', async () => {
    const result = await coach.client.rpc('save_exercise_editor', editorArgs(null, `__EDITOR_CUSTOM_${Date.now()}__`));
    expect(result.error).toBeNull();
    customId = result.data as string;
    const { data } = await coach.client.from('exercises').select('source_type,source,source_id,created_by_coach_id').eq('id', customId).single();
    expect(data).toMatchObject({ source_type: 'custom', source: 'coach', source_id: null, created_by_coach_id: coach.userId });
    const directGlobal = await coach.client.from('exercises').insert({ name: '__EDITOR_GLOBAL_DENIED__', source_type: 'yeti_first_party' });
    expect(directGlobal.error).not.toBeNull();
  });

  it('allows only the owning coach to edit or delete a custom exercise', async () => {
    const own = await coach.client.rpc('save_exercise_editor', editorArgs(customId, '__EDITOR_CUSTOM_UPDATED__'));
    expect(own.error).toBeNull();
    const otherEdit = await coachTwo.client.rpc('save_exercise_editor', editorArgs(customId, '__EDITOR_OTHER_COACH_DENIED__'));
    expect(otherEdit.error).not.toBeNull();
    const otherDelete = await coachTwo.client.from('exercises').delete().eq('id', customId).select('id');
    expect(otherDelete.data).toEqual([]);
    const athleteEdit = await athlete.client.from('exercises').update({ name: '__EDITOR_ATHLETE_DENIED__' }).eq('id', customId);
    expect(athleteEdit.error).not.toBeNull();
    const athleteDelete = await athlete.client.from('exercises').delete().eq('id', customId).select('id');
    expect(athleteDelete.data).toEqual([]);
  });

  it('denies coaches global edits and allows the admin authorized path without changing provenance', async () => {
    const coachEdit = await coach.client.rpc('save_exercise_editor', editorArgs(GLOBAL_EXERCISE_ID, globalRow.name));
    expect(coachEdit.error).not.toBeNull();
    const adminEdit = await admin.client.rpc('save_exercise_editor', {
      ...editorArgs(GLOBAL_EXERCISE_ID, globalRow.name, Boolean(globalRow.archived_at)),
      p_primary_muscle: globalRow.primary_muscle, p_equipment: globalRow.equipment, p_category: globalRow.category,
      p_movement_pattern: globalRow.movement_pattern, p_difficulty: globalRow.difficulty,
      p_unilateral: globalRow.unilateral, p_setup_instructions: globalRow.setup_instructions,
      p_execution_instructions: globalRow.execution_instructions, p_breathing: globalRow.breathing,
      p_coaching_cues: globalRow.coaching_cues, p_common_mistakes: globalRow.common_mistakes,
      p_safety_notes: globalRow.safety_notes, p_default_sets: globalRow.default_sets,
      p_default_reps: globalRow.default_reps, p_default_reps_prescription: globalRow.default_reps_prescription,
      p_tempo: globalRow.tempo,
    });
    expect(adminEdit.error).toBeNull();
    const { data } = await admin.client.from('exercises').select('source_type,source,source_id,created_by_coach_id').eq('id', GLOBAL_EXERCISE_ID).single();
    expect(data).toMatchObject({
      source_type: globalRow.source_type, source: globalRow.source,
      source_id: globalRow.source_id, created_by_coach_id: globalRow.created_by_coach_id,
    });
  });

  it('archives atomically and leaves failed saves unchanged', async () => {
    const archived = await coach.client.rpc('save_exercise_editor', editorArgs(customId, '__EDITOR_CUSTOM_UPDATED__', true));
    expect(archived.error).toBeNull();
    const { data: archivedRow } = await coach.client.from('exercises').select('name,archived_at').eq('id', customId).single();
    expect(archivedRow?.archived_at).toBeTruthy();

    const failed = await coach.client.rpc('save_exercise_editor', {
      ...editorArgs(customId, '__EDITOR_PARTIAL_WRITE_MUST_NOT_SURVIVE__'), p_default_sets: 0,
    });
    expect(failed.error).not.toBeNull();
    const { data: unchanged } = await coach.client.from('exercises').select('name,archived_at').eq('id', customId).single();
    expect(unchanged).toEqual(archivedRow);
  });
});
