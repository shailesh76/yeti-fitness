import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  filterRoster, programOptions, goalOptions, goalLabel, isNeedsAttention,
  type RosterFilters,
} from '../../lib/rosterFilters';
import type { Client } from '../../store/useCoachStore';

const rosterPage = fs.readFileSync(path.resolve(__dirname, '../../app/dashboard/athletes/page.tsx'), 'utf8');

const client = (overrides: Partial<Client> = {}): Client => ({
  id: 'a',
  name: 'Athlete A',
  initials: 'AA',
  avatarColor: '',
  lastWorkout: 1_700_000_000_000,
  adherenceScore: 90,
  caloriesLogged: 0,
  calorieTarget: null,
  weight: 70,
  avgHeartRate: null,
  wearableConnected: false,
  planName: 'Push Pull Legs',
  weekProgress: 'Active',
  age: 30,
  gender: 'Male',
  goal: 'BUILD_MUSCLE',
  heightCm: 180,
  bodyFatPercent: 15,
  ...overrides,
});

const filters = (overrides: Partial<RosterFilters> = {}): RosterFilters => ({
  tab: 'all',
  search: '',
  goal: 'all',
  program: 'all',
  sort: 'last_active',
  ...overrides,
});

describe('roster contains no demo athletes', () => {
  it('has no ATHLETES_DATA constant or mock names', () => {
    expect(rosterPage).not.toContain('ATHLETES_DATA');
    for (const fake of ['James Wilson', 'Sarah Johnson', 'Michael Chen', 'Emma Davis', 'David Rodriguez']) {
      expect(rosterPage).not.toContain(fake);
    }
  });

  it('renders from the real coach store instead', () => {
    expect(rosterPage).toContain('useCoachStore');
    expect(rosterPage).toContain('getClients');
    expect(rosterPage).toContain('filterRoster');
  });

  it('drops filters the schema cannot back', () => {
    // No lifecycle-status, presence or check-in data exists in profiles.
    expect(rosterPage).not.toContain('Archived');
    expect(rosterPage).not.toContain('Check-in Due');
    expect(rosterPage).not.toContain('Online');
  });

  it('keeps honest loading, empty and error states', () => {
    expect(rosterPage).toContain('Loading athletes…');
    expect(rosterPage).toContain('No athletes yet');
    expect(rosterPage).toContain("Couldn&apos;t load your roster");
    expect(rosterPage).toContain('Try again');
  });

  it('routes rows to the canonical athlete detail route', () => {
    expect(rosterPage).toContain('router.push(`/dashboard/${athlete.id}`)');
  });
});

describe('roster search and filtering against real fields', () => {
  it('returns an empty list for a coach with no athletes', () => {
    expect(filterRoster([], filters())).toEqual([]);
  });

  it('searches by real athlete name, case-insensitively', () => {
    const roster = [client({ id: 'a', name: 'Ana Ruiz' }), client({ id: 'b', name: 'Ben Poole' })];
    expect(filterRoster(roster, filters({ search: 'ana' })).map((c) => c.id)).toEqual(['a']);
    expect(filterRoster(roster, filters({ search: 'zzz' }))).toEqual([]);
  });

  it('filters by real assigned program', () => {
    const roster = [client({ id: 'a', planName: 'Push Pull Legs' }), client({ id: 'b', planName: 'Upper Lower' })];
    expect(filterRoster(roster, filters({ program: 'Upper Lower' })).map((c) => c.id)).toEqual(['b']);
  });

  it('filters by the real profiles.goal enum', () => {
    const roster = [client({ id: 'a', goal: 'BUILD_MUSCLE' }), client({ id: 'b', goal: 'LOSE_FAT' })];
    expect(filterRoster(roster, filters({ goal: 'LOSE_FAT' })).map((c) => c.id)).toEqual(['b']);
  });

  it('needs-attention tab reuses the real low-adherence / never-trained rule', () => {
    const roster = [
      client({ id: 'low', adherenceScore: 50 }),
      client({ id: 'never', adherenceScore: 95, lastWorkout: 0 }),
      client({ id: 'fine', adherenceScore: 95 }),
      client({ id: 'unknown', adherenceScore: null, lastWorkout: null }),
    ];
    const ids = filterRoster(roster, filters({ tab: 'needs_attention' })).map((c) => c.id).sort();
    expect(ids).toEqual(['low', 'never']);
  });

  it('never treats unavailable data as at-risk', () => {
    expect(isNeedsAttention(client({ adherenceScore: null, lastWorkout: null }))).toBe(false);
  });

  it('sorts unavailable values last rather than as zero', () => {
    const roster = [
      client({ id: 'none', adherenceScore: null }),
      client({ id: 'high', adherenceScore: 90 }),
      client({ id: 'low', adherenceScore: 20 }),
    ];
    expect(filterRoster(roster, filters({ sort: 'adherence' })).map((c) => c.id)).toEqual(['high', 'low', 'none']);
  });

  it('builds dropdown options only from real values', () => {
    const roster = [
      client({ id: 'a', planName: 'Push Pull Legs', goal: 'BUILD_MUSCLE' }),
      client({ id: 'b', planName: 'No Plan', goal: null }),
    ];
    expect(programOptions(roster)).toEqual(['Push Pull Legs']);
    expect(goalOptions(roster)).toEqual(['BUILD_MUSCLE']);
  });

  it('labels goals without inventing ones', () => {
    expect(goalLabel('LOSE_FAT')).toBe('Fat loss');
    expect(goalLabel(null)).toBe('No goal set');
  });
});
