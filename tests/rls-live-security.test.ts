import { describe, it, expect, beforeAll } from 'vitest';
import {
  LIVE_ENABLED,
  RUN_MUTATING,
  TEST_USERS,
  anonClient,
  signInClient,
} from './helpers/live';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * LIVE RLS security tests against the real Supabase project. These encode the
 * Phase 1 RLS audit test cases (TC-1 … TC-7) and are the automated regression
 * guard for the drift class that broke activity_logs / conversations / error_logs.
 *
 * Non-mutating by default. The policy-presence test that inserts a row is gated
 * behind RUN_MUTATING_TESTS=1 (activity_logs has no user DELETE policy, so it
 * cannot self-clean). Skipped entirely when Supabase env vars are unavailable.
 */
const d = LIVE_ENABLED ? describe : describe.skip;

const USER_SCOPED: Array<[string, string]> = [
  ['activity_logs', 'user_id'],
  ['measurements', 'user_id'],
  ['meal_logs', 'user_id'],
  ['notifications', 'user_id'],
  ['ai_memory', 'athlete_id'],
  ['ai_request_logs', 'athlete_id'],
  ['workout_sessions', 'athlete_id'],
  ['user_entitlements', 'user_id'],
];

d('Live RLS — isolation, coach scope, recursion, anon', () => {
  let a1: { client: SupabaseClient; userId: string };
  let a2: { client: SupabaseClient; userId: string };
  let coach: { client: SupabaseClient; userId: string };

  beforeAll(async () => {
    a1 = await signInClient(TEST_USERS.athlete1.email, TEST_USERS.athlete1.password);
    a2 = await signInClient(TEST_USERS.athlete2.email, TEST_USERS.athlete2.password);
    coach = await signInClient(TEST_USERS.coach.email, TEST_USERS.coach.password);
  }, 30_000);

  // TC-1/TC-2: user reads own data only; never another user's rows.
  it.each(USER_SCOPED)('athlete-1 never sees athlete-2 rows in %s', async (table, key) => {
    const { data, error } = await a1.client.from(table).select(key).limit(1000);
    expect(error).toBeNull();
    expect((data ?? []).some((r: any) => r[key] === a2.userId)).toBe(false);
  });

  // TC-3: coach cannot read a non-client's profile.
  it('coach cannot read a non-client profile', async () => {
    const { data: cc } = await coach.client.from('coach_clients').select('athlete_id');
    const clients = new Set((cc ?? []).map((r: any) => r.athlete_id));
    const target = clients.has(a2.userId) ? a1.userId : a2.userId;
    const { data } = await coach.client.from('profiles').select('id').eq('id', target);
    expect(data?.length ?? 0).toBe(0);
  });

  // TC-5: recursion guard — must never throw 42P17.
  it('no infinite recursion (42P17) on conversations / conversation_members', async () => {
    const r1 = await a1.client.from('conversation_members').select('*').limit(1);
    const r2 = await a1.client.from('conversations').select('*').limit(1);
    expect(r1.error?.code).not.toBe('42P17');
    expect(r2.error?.code).not.toBe('42P17');
  });

  // TC-4: anon cannot read user-facing data.
  it('anon cannot read user data', async () => {
    const anon = anonClient();
    for (const t of ['profiles', 'activity_logs', 'user_entitlements', 'conversations', 'ai_request_logs']) {
      const { data } = await anon.from(t).select('*').limit(3);
      expect(data?.length ?? 0).toBe(0);
    }
  });

  // TC-6: authenticated user cannot write entitlements (deny policy).
  it('authenticated user cannot INSERT user_entitlements', async () => {
    const { error } = await a1.client
      .from('user_entitlements')
      .insert({ user_id: a1.userId, plan_id: 'PRO', status: 'active', source: 'test' });
    expect(error).not.toBeNull();
  });

});

// TC-7: policy-presence — own-row INSERT must succeed (guards the exact activity_logs
// drift we hit). Gated because activity_logs has no user DELETE policy to self-clean.
(LIVE_ENABLED && RUN_MUTATING ? describe : describe.skip)(
  'Live RLS — policy presence (mutating)',
  () => {
    it('athlete can insert own activity_logs row', async () => {
      const { client, userId } = await signInClient(
        TEST_USERS.athlete1.email,
        TEST_USERS.athlete1.password,
      );
      const { error } = await client
        .from('activity_logs')
        .insert({ user_id: userId, event_name: 'app_opened', metadata: { test: true } });
      expect(error).toBeNull();
    });

    // Step 4.5 regression guard: plan_days/plan_exercises originally had only a
    // "coach manages via wp.coach_id" policy — an athlete's own self-created
    // workout_plans row (no coach) could be created, but plan_days under it
    // could not (confirmed live: 42501 before the fix). Self-cleans via the
    // athlete's own DELETE rights on all three tables.
    it('athlete can create and clean up their own plan_days/plan_exercises; another athlete cannot see or write them', async () => {
      const a1 = await signInClient(TEST_USERS.athlete1.email, TEST_USERS.athlete1.password);
      const a2 = await signInClient(TEST_USERS.athlete2.email, TEST_USERS.athlete2.password);

      const { data: plan, error: planErr } = await a1.client
        .from('workout_plans')
        .insert({ user_id: a1.userId, name: '__TEST_OWNERSHIP_PLAN__' })
        .select()
        .single();
      expect(planErr).toBeNull();

      try {
        const { data: day, error: dayErr } = await a1.client
          .from('plan_days')
          .insert({ plan_id: plan!.id, day_number: 1, name: 'Day 1' })
          .select()
          .single();
        expect(dayErr).toBeNull();

        const { data: exRow } = await a1.client.from('exercises').select('id').limit(1).maybeSingle();
        const { data: planExercise, error: peErr } = await a1.client
          .from('plan_exercises')
          .insert({ plan_day_id: day!.id, exercise_id: exRow!.id, sets: '3', reps: '10', order_index: 0 })
          .select()
          .single();
        expect(peErr).toBeNull();

        // Ownership isolation: athlete-2 cannot see or write athlete-1's rows.
        const { data: a2SeesDay } = await a2.client.from('plan_days').select('id').eq('id', day!.id);
        expect(a2SeesDay?.length ?? 0).toBe(0);

        const { data: a2SeesExercise } = await a2.client.from('plan_exercises').select('id').eq('id', planExercise!.id);
        expect(a2SeesExercise?.length ?? 0).toBe(0);

        const { error: a2WriteErr } = await a2.client
          .from('plan_exercises')
          .insert({ plan_day_id: day!.id, exercise_id: exRow!.id, sets: '5', reps: '5', order_index: 1 });
        expect(a2WriteErr).not.toBeNull();

        await a1.client.from('plan_exercises').delete().eq('id', planExercise!.id);
        await a1.client.from('plan_days').delete().eq('id', day!.id);
      } finally {
        await a1.client.from('workout_plans').delete().eq('id', plan!.id);
      }
    });

    // Step 4.5 regression guard: the athlete-created-template flow must never
    // write to workout_plan_exercises, the pre-plan_days/plan_exercises legacy
    // join table kept only for compatibility with whatever historical data
    // still references it.
    it('creating an athlete workout template never inserts into workout_plan_exercises', async () => {
      const a1 = await signInClient(TEST_USERS.athlete1.email, TEST_USERS.athlete1.password);
      const { count: before } = await a1.client
        .from('workout_plan_exercises')
        .select('*', { head: true, count: 'exact' });

      const { data: plan } = await a1.client
        .from('workout_plans')
        .insert({ user_id: a1.userId, name: '__TEST_LEGACY_GUARD_PLAN__' })
        .select()
        .single();
      const { data: day } = await a1.client
        .from('plan_days')
        .insert({ plan_id: plan!.id, day_number: 1, name: 'Day 1' })
        .select()
        .single();
      const { data: exRow } = await a1.client.from('exercises').select('id').limit(1).maybeSingle();
      const { data: planExercise } = await a1.client
        .from('plan_exercises')
        .insert({ plan_day_id: day!.id, exercise_id: exRow!.id, sets: '3', reps: '10', order_index: 0 })
        .select()
        .single();

      const { count: after } = await a1.client
        .from('workout_plan_exercises')
        .select('*', { head: true, count: 'exact' });
      expect(after).toBe(before);

      await a1.client.from('plan_exercises').delete().eq('id', planExercise!.id);
      await a1.client.from('plan_days').delete().eq('id', day!.id);
      await a1.client.from('workout_plans').delete().eq('id', plan!.id);
    });
  },
);
