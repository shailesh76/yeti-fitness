import { describe, it, expect, vi } from 'vitest';
import { ProgressRepository } from '../packages/database/src/repositories/ProgressRepository';
import * as fs from 'fs';
import * as path from 'path';

describe('BUG A — Viewport Zoom & Scaling Contract', () => {
  it('+html.tsx has mobile viewport meta configured with user-scalable=no and maximum-scale=1.0', () => {
    const htmlPath = path.join(__dirname, '../apps/mobile/app/+html.tsx');
    const content = fs.readFileSync(htmlPath, 'utf8');

    expect(content).toContain('maximum-scale=1.0');
    expect(content).toContain('user-scalable=no');
    expect(content).toContain('viewport-fit=cover');
    expect(content).toContain('touch-action');
    expect(content).toContain('gesturestart');
  });
});

describe('BUG B — Body Weight Logging & ProgressRepository', () => {
  it('saves measurement locally to WatermelonDB and syncs to Supabase', async () => {
    const createdLocalRecord: any = {};
    const mockDb = {
      write: vi.fn(async (cb: any) => cb()),
      get: vi.fn().mockReturnValue({
        create: vi.fn((populate: any) => {
          populate(createdLocalRecord);
          return createdLocalRecord;
        }),
      }),
    } as any;

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    const repo = new ProgressRepository(mockDb, mockSupabase);
    const userId = 'athlete_123';
    const weightKg = 82.5;
    const bodyFatPct = 14.2;

    const result = await repo.saveMeasurement(userId, weightKg, bodyFatPct);

    // Verify local creation
    expect(createdLocalRecord.user_id).toBe(userId);
    expect(createdLocalRecord.weight_kg).toBe(82.5);
    expect(createdLocalRecord.body_fat_pct).toBe(14.2);
    expect(createdLocalRecord.is_synced).toBe(false);

    // Verify remote Supabase sync
    expect(mockSupabase.from).toHaveBeenCalledWith('measurements');
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });

  it('gracefully saves directly to Supabase when local DB is not available (Web fallback)', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };

    const repo = new ProgressRepository(null as any, mockSupabase);
    const result = await repo.saveMeasurement('web_athlete', 77.0, undefined);

    expect(result.user_id).toBe('web_athlete');
    expect(result.weight_kg).toBe(77.0);
    expect(mockSupabase.from).toHaveBeenCalledWith('measurements');
  });

  it('fetches and consolidates measurements from Supabase when local DB is empty', async () => {
    const now = Date.now();
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'm1',
                  user_id: 'u1',
                  type: 'weight_kg',
                  value: 80.5,
                  logged_at: new Date(now - 86400000).toISOString(),
                },
                {
                  id: 'm2',
                  user_id: 'u1',
                  type: 'body_fat_pct',
                  value: 15.0,
                  logged_at: new Date(now - 86400000).toISOString(),
                },
                {
                  id: 'm3',
                  user_id: 'u1',
                  type: 'weight_kg',
                  value: 79.8,
                  logged_at: new Date(now).toISOString(),
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    };

    const repo = new ProgressRepository(null as any, mockSupabase);
    const list = await repo.getMeasurements('u1');

    expect(list.length).toBe(2);
    expect(list[0].weight_kg).toBe(79.8); // Newest first
    expect(list[1].weight_kg).toBe(80.5);
    expect(list[1].body_fat_pct).toBe(15.0);
  });

  it('calculates kg and lbs conversions accurately for UI toggle', () => {
    const weightInKg = 80;
    const toLbs = Math.round(weightInKg * 2.20462 * 10) / 10;
    expect(toLbs).toBe(176.4);

    const backToKg = Math.round((toLbs / 2.20462) * 10) / 10;
    expect(backToKg).toBe(80);
  });
});
