import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearScreenDataForTests,
  dedupeScreenRefresh,
  getScreenData,
  invalidateScreenData,
  invalidateScreenDataPrefix,
  isScreenDataStale,
  setScreenData,
} from '../apps/mobile/services/screenDataCache';

describe('offline-first screen session cache', () => {
  beforeEach(clearScreenDataForTests);

  it('returns cached data synchronously while a remote refresh is pending', async () => {
    setScreenData('progress:u1', { weight: 82 });
    let finish!: (value: { weight: number }) => void;
    const refresh = dedupeScreenRefresh('progress:u1', () => new Promise((resolve) => { finish = resolve; }));
    expect(getScreenData('progress:u1')).toEqual({ weight: 82 });
    finish({ weight: 81 });
    await refresh;
  });

  it('deduplicates concurrent requests for the same screen', async () => {
    const loader = vi.fn(async () => ({ ok: true }));
    const [a, b] = await Promise.all([
      dedupeScreenRefresh('profile:u1', loader),
      dedupeScreenRefresh('profile:u1', loader),
    ]);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
  });

  it('tracks stale windows without deleting cached data', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    setScreenData('nutrition:u1', { calories: 2100 });
    vi.setSystemTime(61_001);
    expect(isScreenDataStale('nutrition:u1', 60_000)).toBe(true);
    expect(getScreenData('nutrition:u1')).toEqual({ calories: 2100 });
    vi.useRealTimers();
  });

  it('explicit mutation invalidation bypasses the stale window', () => {
    setScreenData('nutrition-targets:u1', { calories: 1715 });
    expect(isScreenDataStale('nutrition-targets:u1')).toBe(false);
    invalidateScreenData('nutrition-targets:u1');
    expect(isScreenDataStale('nutrition-targets:u1')).toBe(true);
    expect(getScreenData('nutrition-targets:u1')).toEqual({ calories: 1715 });
  });

  it('invalidates all dated food diary views for one user only', () => {
    setScreenData('food-diary:u1:2026-08-22', { calories: 400 });
    setScreenData('food-diary:u2:2026-08-22', { calories: 900 });
    invalidateScreenDataPrefix('food-diary:u1:');
    expect(isScreenDataStale('food-diary:u1:2026-08-22')).toBe(true);
    expect(isScreenDataStale('food-diary:u2:2026-08-22')).toBe(false);
  });
});
