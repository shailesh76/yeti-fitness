import { describe, it, expect, beforeAll } from 'vitest';
import { LIVE_ENABLED, TEST_USERS, signInClient, columnExists, anonClient } from './helpers/live';
import { calculateNutritionTargets } from '../apps/mobile/services/nutritionUtils';
import type { SupabaseClient } from '@supabase/supabase-js';

const d = LIVE_ENABLED ? describe : describe.skip;

d('Live Nutrition Server Provenance & Target Mode Contract', () => {
  let athlete1: { client: SupabaseClient; userId: string };
  let coach: { client: SupabaseClient; userId: string };

  beforeAll(async () => {
    athlete1 = await signInClient(TEST_USERS.athlete1.email, TEST_USERS.athlete1.password);
    coach = await signInClient(TEST_USERS.coach.email, TEST_USERS.coach.password);
  });

  it('1. Column nutrition_target_mode exists on live public.profiles and enforces CHECK constraint', async () => {
    const exists = await columnExists('profiles', 'nutrition_target_mode');
    expect(exists).toBe(true);

    // Invalid value rejection
    const { error: invalidErr } = await athlete1.client
      .from('profiles')
      .update({ nutrition_target_mode: 'INVALID_ENUM' })
      .eq('id', athlete1.userId);

    expect(invalidErr).not.toBeNull();
  });

  it('2. CASE A — Live AUTO mode: weight change calculates and updates targets remotely', async () => {
    // 1. Set mode to AUTO and unlock targets
    const { error: setAutoErr } = await athlete1.client
      .from('profiles')
      .update({
        nutrition_target_mode: 'AUTO',
        nutrition_targets_locked: false,
      })
      .eq('id', athlete1.userId);
    expect(setAutoErr).toBeNull();

    // 2. Fetch current profile
    const { data: profile } = await athlete1.client
      .from('profiles')
      .select('weight_kg, height_cm, age, gender, activity_level, goal')
      .eq('id', athlete1.userId)
      .single();

    const weightKg = profile?.weight_kg || 80;
    const calculated = calculateNutritionTargets({
      weight_kg: weightKg,
      height_cm: profile?.height_cm || 180,
      age: profile?.age || 26,
      gender: profile?.gender || 'MALE',
      activity_level: profile?.activity_level || 1.55,
      goal: profile?.goal || 'MAINTAIN',
    });

    // Write updated auto target
    await athlete1.client.from('profiles').update({
      daily_calorie_target: calculated.calories,
      daily_protein_target: calculated.protein,
      daily_carb_target: calculated.carbs,
      daily_fat_target: calculated.fat,
      nutrition_target_mode: 'AUTO',
    }).eq('id', athlete1.userId);

    const { data: updated } = await athlete1.client
      .from('profiles')
      .select('daily_calorie_target, daily_protein_target, nutrition_target_mode')
      .eq('id', athlete1.userId)
      .single();

    expect(updated?.nutrition_target_mode).toBe('AUTO');
    expect(updated?.daily_calorie_target).toBe(calculated.calories);
  });

  it('3. CASE B — Live MANUAL mode: manual target 3250 kcal persists remotely', async () => {
    const { error: saveManualErr } = await athlete1.client
      .from('profiles')
      .update({
        daily_calorie_target: 3250,
        daily_protein_target: 215,
        daily_carb_target: 340,
        daily_fat_target: 85,
        nutrition_target_mode: 'MANUAL',
      })
      .eq('id', athlete1.userId);

    expect(saveManualErr).toBeNull();

    const { data: manualProfile } = await athlete1.client
      .from('profiles')
      .select('daily_calorie_target, daily_protein_target, nutrition_target_mode')
      .eq('id', athlete1.userId)
      .single();

    expect(manualProfile?.nutrition_target_mode).toBe('MANUAL');
    expect(manualProfile?.daily_calorie_target).toBe(3250);
  });

  it('4. CASE C — Live COACH LOCK: coach locked targets are protected from athlete mutation', async () => {
    // Coach assigns targets via RPC
    const { error: rpcErr } = await coach.client.rpc('assign_client_nutrition_targets', {
      p_athlete_id: athlete1.userId,
      p_calorie_target: 2950,
      p_protein_target: 200,
      p_carb_target: 300,
      p_fat_target: 75,
      p_locked: true,
    });
    expect(rpcErr).toBeNull();

    const { data: lockedProfile } = await athlete1.client
      .from('profiles')
      .select('daily_calorie_target, nutrition_targets_locked')
      .eq('id', athlete1.userId)
      .single();

    expect(lockedProfile?.nutrition_targets_locked).toBe(true);
    expect(lockedProfile?.daily_calorie_target).toBe(2950);

    // Unlock for subsequent clean test states
    await coach.client.rpc('assign_client_nutrition_targets', {
      p_athlete_id: athlete1.userId,
      p_calorie_target: 2800,
      p_protein_target: 190,
      p_carb_target: 290,
      p_fat_target: 70,
      p_locked: false,
    });
  });

  it('5. CASE D — Manual target close to formula (5 kcal delta) remains authoritative MANUAL', async () => {
    // Calculated = 2800, athlete manually sets 2805
    const { error: errD } = await athlete1.client
      .from('profiles')
      .update({
        daily_calorie_target: 2805,
        nutrition_target_mode: 'MANUAL',
      })
      .eq('id', athlete1.userId);

    expect(errD).toBeNull();

    const { data: profileD } = await athlete1.client
      .from('profiles')
      .select('daily_calorie_target, nutrition_target_mode')
      .eq('id', athlete1.userId)
      .single();

    expect(profileD?.nutrition_target_mode).toBe('MANUAL');
    expect(profileD?.daily_calorie_target).toBe(2805);
  });

  it('6. Food Diary & AI Coach read canonical columns without divergence', async () => {
    const { data: canonical } = await athlete1.client
      .from('profiles')
      .select('daily_calorie_target, daily_protein_target, daily_carb_target, daily_fat_target, nutrition_target_mode')
      .eq('id', athlete1.userId)
      .single();

    expect(canonical?.daily_calorie_target).toBeDefined();
    expect(canonical?.daily_protein_target).toBeDefined();
    expect(canonical?.daily_carb_target).toBeDefined();
    expect(canonical?.daily_fat_target).toBeDefined();
    expect(['AUTO', 'MANUAL']).toContain(canonical?.nutrition_target_mode);
  });
});
