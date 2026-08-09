import { describe, expect, it } from 'vitest';
import {
  activeAthleteCount,
  atRiskAthletes,
  averageAdherence,
  countSessionsToday,
} from '../../lib/dashboardMetrics';
import type { Client } from '../../store/useCoachStore';

const client = (id: string, adherenceScore: number | null): Client => ({
  id,
  name: `Athlete ${id}`,
  initials: id.toUpperCase(),
  avatarColor: '',
  lastWorkout: 0,
  adherenceScore,
  caloriesLogged: 0,
  calorieTarget: 2000,
  weight: 70,
  avgHeartRate: 0,
  wearableConnected: false,
  planName: 'Plan',
  weekProgress: 'Active',
});

describe('dashboard metrics', () => {
  it('reports zero clients and a real linked-client count', () => {
    expect(activeAthleteCount([])).toBe(0);
    expect(activeAthleteCount([client('a', 80), client('b', 90)])).toBe(2);
  });

  it('distinguishes a successful zero-workout result at the derivation boundary', () => {
    expect(countSessionsToday([], new Date('2026-08-08T12:00:00'))).toBe(0);
  });

  it('averages only successful adherence values', () => {
    expect(averageAdherence([client('a', 80), client('b', 100)])).toBe(90);
    expect(averageAdherence([client('a', 80), client('b', null)])).toBe(80);
    expect(averageAdherence([client('a', null)])).toBeNull();
  });

  it('never classifies unavailable adherence as at risk', () => {
    const ranked = atRiskAthletes([
      client('failed', null),
      client('low', 35),
      client('high', 95),
    ]);
    expect(ranked.map((item) => item.clientId)).toEqual(['low']);
  });
});
