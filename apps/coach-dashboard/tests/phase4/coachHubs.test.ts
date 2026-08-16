import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activeTodaySessions,
  aggregateNutrition,
  buildCalendarEvents,
  calculateAnalytics,
  calendarMonthBounds,
  dashboardDateKey,
  groupCompletedSessionsByDashboardDay,
} from '../../lib/coachHubData';

const read = (...parts: string[]) => fs.readFileSync(path.join(__dirname, '..', '..', ...parts), 'utf8');

const mocks = vi.hoisted(() => ({ filters: [] as Array<[string, unknown]>, result: { data: [] as any[], error: null as any } }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: 'coach-own' } } }, error: null })) },
    from: vi.fn(() => {
      const query: any = { select: () => query, eq: (field: string, value: unknown) => { mocks.filters.push([field, value]); return query; } };
      query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(mocks.result).then(resolve);
      return query;
    }),
  },
}));
import { fetchCoachClients } from '../../lib/coachHubQueries';

beforeEach(() => { mocks.filters.length = 0; mocks.result = { data: [], error: null }; });

describe('nutrition calculations', () => {
  it('maps canonical food nutrients and servings without fallback numbers', () => {
    expect(aggregateNutrition([{ id: '1', user_id: 'a', meal_type: 'LUNCH', servings: 1.5, logged_at: '2026-08-16T01:00:00Z', food: { calories: 200, protein: 20, carbs: 30, fat: 4 } }])).toEqual({ calories: 300, protein: 30, carbs: 45, fat: 6 });
    expect(aggregateNutrition([])).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });

  it('formats normal and Sydney-morning dates as stable local date keys', () => {
    expect(dashboardDateKey('2026-08-16T02:00:00Z')).toBe('2026-08-16');
    expect(dashboardDateKey('2026-08-15T23:30:00Z')).toBe('2026-08-16');
    expect(dashboardDateKey('2026-08-15T23:30:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('coach authorization', () => {
  it('scopes the roster query to the authenticated coach', async () => {
    await fetchCoachClients();
    expect(mocks.filters).toEqual([['coach_id', 'coach-own']]);
  });
});

describe('calendar transformations', () => {
  it('uses only explicit start dates and recorded session dates', () => {
    const names = new Map([['a', 'Alex']]);
    const events = buildCalendarEvents([
      { id: 'no-date', athlete_id: 'a', start_date: null, workout_plans: { name: 'Ignored' } },
      { id: 'p', athlete_id: 'a', start_date: '2026-08-20', workout_plans: { name: 'Strength' } },
    ], [{ id: 's', athlete_id: 'a', started_at: '2026-08-18T01:00:00Z', completed_at: '2026-08-18T02:00:00Z', plan_days: { name: 'Day 1' } }], names);
    expect(events.map((event) => [event.kind, event.date])).toEqual([['completed', '2026-08-18T01:00:00Z'], ['assignment', '2026-08-20']]);
  });

  it('uses complete exclusive DATE bounds without UTC leakage', () => {
    expect(calendarMonthBounds(2026, 7)).toEqual({ startDate: '2026-08-01', endDate: '2026-09-01' });
    expect(calendarMonthBounds(2026, 7).startDate).not.toBe('2026-07-31');
    expect('2026-08-31' < calendarMonthBounds(2026, 7).endDate).toBe(true);
  });

  it('handles the December to January transition', () => {
    expect(calendarMonthBounds(2026, 11)).toEqual({ startDate: '2026-12-01', endDate: '2027-01-01' });
  });
});

describe('analytics calculations', () => {
  it('calculates only numeric completed data and never divides by zero', () => {
    expect(calculateAnalytics(2, [{ completed_at: 'x', duration_seconds: 3600 }, { completed_at: null, duration_seconds: 100 }], [{ weight: 20, reps: 10 }, { weight: null, reps: 20 }])).toEqual({ activeAthletes: 2, completedSessions: 1, totalVolumeKg: 200, averageDurationMinutes: 60 });
    expect(calculateAnalytics(0, [], []).averageDurationMinutes).toBeNull();
  });

  it('groups completed sessions on Sydney local days around midnight', () => {
    const grouped = groupCompletedSessionsByDashboardDay([
      { started_at: '2026-08-16T13:59:00Z', completed_at: '2026-08-16T14:10:00Z' },
      { started_at: '2026-08-16T14:01:00Z', completed_at: '2026-08-16T15:00:00Z' },
      { started_at: '2026-08-15T15:00:00Z', completed_at: '2026-08-15T16:00:00Z' },
    ]);
    expect(grouped).toEqual({ '2026-08-16': 2, '2026-08-17': 1 });
  });
});

describe('live session filtering', () => {
  it('keeps only unfinished sessions started today', () => {
    const now = new Date('2026-08-16T12:00:00');
    expect(activeTodaySessions([
      { id: 'active', started_at: '2026-08-16T09:00:00', completed_at: null },
      { id: 'done', started_at: '2026-08-16T08:00:00', completed_at: '2026-08-16T09:00:00' },
      { id: 'old', started_at: '2026-08-15T23:00:00', completed_at: null },
    ], now).map((row) => row.id)).toEqual(['active']);
  });
});

describe('legacy routes and unsupported check-ins', () => {
  it('preserves the athlete id when redirecting', () => expect(read('app', 'dashboard', 'athletes', '[id]', 'page.tsx')).toContain('redirect(`/dashboard/${params.id}`)'));
  it('redirects the duplicate builder', () => expect(read('app', 'dashboard', 'templates', 'builder', 'page.tsx')).toContain("redirect('/plans/builder')"));
  it('does not query or fabricate production check-ins', () => {
    const page = read('app', 'dashboard', 'checkins', 'page.tsx');
    expect(page).not.toContain("from('check_ins')");
    expect(page).toContain('does not currently contain a supported check-in table');
  });

  it('keeps check-ins out of primary navigation and preserves the exercise badge', () => {
    const sidebar = read('components', 'Sidebar.tsx');
    expect(sidebar).not.toContain('{ name: "Check-ins"');
    expect(sidebar).toContain('badge: "396 Yeti"');
  });
});

describe('hub query wiring guards', () => {
  it('constrains nutrition logs to the authorized roster before selection', () => {
    const page = read('app', 'dashboard', 'nutrition', 'page.tsx');
    expect(page).toContain(".in('user_id', clients.map((client) => client.id))");
    expect(page).toContain(".eq('user_id', athleteId)");
  });

  it('constrains calendar sources to authorized athlete ids', () => {
    const page = read('app', 'dashboard', 'calendar', 'page.tsx');
    expect(page.match(/\.in\('athlete_id', ids\)/g)).toHaveLength(2);
  });

  it('constrains analytics sessions to athletes and sets to returned session ids', () => {
    const page = read('app', 'dashboard', 'analytics', 'page.tsx');
    expect(page).toContain(".in('athlete_id', ids)");
    expect(page).toContain(".in('session_id', authorizedSessionIds)");
  });

  it('constrains live sessions to athletes and sets to active session ids', () => {
    const page = read('app', 'dashboard', 'live', 'page.tsx');
    expect(page).toContain(".in('athlete_id', ids)");
    expect(page).toContain(".in('session_id', sessionIds)");
  });
});

describe('schema and mock-data regression guards', () => {
  it('uses only canonical nutrition target field names', () => {
    const implementation = [
      read('lib', 'coachHubQueries.ts'),
      read('app', 'dashboard', 'nutrition', 'page.tsx'),
    ].join('\n');
    for (const field of ['daily_calorie_target', 'daily_protein_target', 'daily_carb_target', 'daily_fat_target']) {
      expect(implementation).toContain(field);
    }
    for (const stale of ['daily_carbs_target', 'daily_carbs_target_g', 'daily_protein_target_g', 'daily_fat_target_g', 'target_calories']) {
      expect(implementation).not.toContain(stale);
    }
  });

  it('contains no operational mock datasets in Round 1 hub pages', () => {
    const pages = ['nutrition', 'checkins', 'calendar', 'analytics', 'live'].map((page) => read('app', 'dashboard', page, 'page.tsx'));
    for (const page of pages) {
      expect(page).not.toMatch(/\b(mock|fake|demo|sample)(Data|Rows|Events|Sessions|Athletes|CheckIns)?\b/i);
      expect(page).not.toMatch(/James Wilson|24,560|Yeti Score/);
    }
  });
});
