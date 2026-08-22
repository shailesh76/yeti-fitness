import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearScreenDataForTests, getScreenData, setScreenData } from '../apps/mobile/services/screenDataCache';
import { applyNutritionTargetsLocal } from '../apps/mobile/services/nutritionTargets';

const realtime = vi.hoisted(() => {
  const handlers: Array<(payload: any) => void> = [];
  const removeChannel = vi.fn(async () => 'ok');
  const channel = vi.fn(() => {
    const value: any = {
      on: vi.fn((_type: string, _filter: any, handler: (payload: any) => void) => {
        handlers.push(handler);
        return value;
      }),
      subscribe: vi.fn(() => value),
    };
    return value;
  });
  return { handlers, removeChannel, channel };
});

vi.mock('../apps/mobile/lib/supabase', () => ({
  supabase: {
    channel: realtime.channel,
    removeChannel: realtime.removeChannel,
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
    })),
  },
}));

import {
  applyRealtimeProfileRow,
  getActiveProfileRealtimeUserForTests,
  markLocalProfileWrite,
  startProfileRealtime,
  stopProfileRealtime,
} from '../apps/mobile/services/profileRealtime';

describe('local-first profile and selective Realtime flow', () => {
  beforeEach(async () => {
    await stopProfileRealtime();
    clearScreenDataForTests();
    realtime.handlers.length = 0;
    vi.clearAllMocks();
  });

  it('publishes AUTO targets synchronously before remote persistence resolves', () => {
    setScreenData('nutrition-targets:u1', { calories: 2000, protein: 150, carbs: 200, fat: 60, mode: 'AUTO', locked: false });
    applyNutritionTargetsLocal('u1', { calories: 1715, protein: 160, carbs: 150, fat: 55 }, 'AUTO');
    expect(getScreenData<any>('nutrition-targets:u1')?.calories).toBe(1715);
  });

  it('applies remote profile fields without a screen reload', async () => {
    await startProfileRealtime('u1');
    setScreenData('profile:u1', { weight_kg: 80, goal: 'MAINTAIN' });
    const changed = await applyRealtimeProfileRow('u1', { weight_kg: 79, goal: 'LOSE_FAT' });
    expect(changed).toBe(true);
    expect(getScreenData<any>('profile:u1')).toMatchObject({ weight_kg: 79, goal: 'LOSE_FAT' });
  });

  it('suppresses a matching local-write Realtime echo', async () => {
    await startProfileRealtime('u1');
    setScreenData('profile:u1', { weight_kg: 79 });
    markLocalProfileWrite('u1', { weight_kg: 78 });
    const changed = await applyRealtimeProfileRow('u1', { weight_kg: 78 });
    expect(changed).toBe(false);
    expect(getScreenData<any>('profile:u1')?.weight_kg).toBe(79);
  });

  it('unsubscribes on logout', async () => {
    await startProfileRealtime('u1');
    await stopProfileRealtime();
    expect(realtime.removeChannel).toHaveBeenCalledTimes(1);
    expect(getActiveProfileRealtimeUserForTests()).toBeNull();
  });

  it('rejects previous-athlete events after an account switch', async () => {
    await startProfileRealtime('u1');
    await startProfileRealtime('u2');
    setScreenData('profile:u2', { weight_kg: 65 });
    expect(await applyRealtimeProfileRow('u1', { weight_kg: 90 })).toBe(false);
    expect(getScreenData<any>('profile:u2')?.weight_kg).toBe(65);
  });
});
