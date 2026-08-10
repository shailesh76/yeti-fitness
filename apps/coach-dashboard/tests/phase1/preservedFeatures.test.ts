import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { needsAttention, pendingInviteCount } from '../../lib/dashboardMetrics';
import type { Client } from '../../store/useCoachStore';

const dashboard = fs.readFileSync(path.resolve(__dirname, '../../app/dashboard/page.tsx'), 'utf8');

const client = (overrides: Partial<Client> = {}): Client => ({
  id: 'a',
  name: 'Athlete A',
  initials: 'AA',
  avatarColor: '',
  lastWorkout: Date.now(),
  adherenceScore: 90,
  caloriesLogged: 0,
  calorieTarget: 2000,
  weight: 70,
  avgHeartRate: 0,
  wearableConnected: false,
  planName: 'Plan',
  weekProgress: 'Active',
  age: null,
  gender: null,
  goal: null,
  heightCm: null,
  bodyFatPercent: null,
  ...overrides,
});

// These guard the features that already existed in the committed dashboard
// before the Phase 1 rewrite. They exist because the first pass at Phase 1
// silently dropped all four.
describe('needs-attention logic preserved from HEAD', () => {
  it('flags adherence below 70', () => {
    const flagged = needsAttention([client({ id: 'low', adherenceScore: 69 })]);
    expect(flagged.map((c) => c.id)).toEqual(['low']);
  });

  it('does not flag adherence at or above 70', () => {
    expect(needsAttention([client({ adherenceScore: 70 })])).toEqual([]);
  });

  it('flags an athlete with zero recorded workouts even when adherence is high', () => {
    const flagged = needsAttention([client({ id: 'nowork', adherenceScore: 100, lastWorkout: 0 })]);
    expect(flagged.map((c) => c.id)).toEqual(['nowork']);
  });

  it('does not flag an athlete whose data is merely unavailable', () => {
    // null !== 0: "query failed" must not be reported as "never trained".
    expect(needsAttention([client({ adherenceScore: null, lastWorkout: null })])).toEqual([]);
  });
});

describe('pending invites are real, never fabricated', () => {
  it('counts only pending invites', () => {
    expect(pendingInviteCount([
      { status: 'pending' },
      { status: 'accepted' },
      { status: 'pending' },
    ])).toBe(2);
  });

  it('reports a real zero rather than a placeholder', () => {
    expect(pendingInviteCount([])).toBe(0);
    expect(pendingInviteCount([{ status: 'accepted' }])).toBe(0);
  });

  it('does not hardcode the retired "Pending Invites: 1" value', () => {
    expect(dashboard).not.toMatch(/Pending Invites[\s\S]{0,120}>1</);
    expect(dashboard).toContain('pendingInviteCount');
  });

  it('renders unavailable instead of a number when the invite fetch failed', () => {
    expect(dashboard).toContain("invitesError ? 'Unavailable' : pendingInvites");
  });
});

describe('invite flow preserved', () => {
  it('still calls the real inviteClient action', () => {
    expect(dashboard).toContain('inviteClient(inviteEmail)');
  });

  it('keeps the email input, sending state, and success/error handling', () => {
    expect(dashboard).toContain('setInviteEmail');
    expect(dashboard).toContain('Sending Invite...');
    expect(dashboard).toContain('Invite sent successfully!');
    expect(dashboard).toContain('inviteMessage.isError');
  });
});

describe('roster and drill-down preserved', () => {
  it('renders every linked athlete, not only an adherence slice', () => {
    expect(dashboard).toContain('clients.map((athlete)');
  });

  it('shows name, initials, weight and current plan per athlete', () => {
    expect(dashboard).toContain('athlete.initials');
    expect(dashboard).toContain('athlete.name');
    expect(dashboard).toContain('Weight: ${athlete.weight}kg');
    expect(dashboard).toContain("athlete.planName ?? 'Unavailable'");
  });

  it('keeps click-through to the athlete detail route from roster and inbox', () => {
    const drillDowns = dashboard.match(/router\.push\(`\/dashboard\/\$\{athlete\.id\}`\)/g) || [];
    expect(drillDowns.length).toBe(2);
  });
});
