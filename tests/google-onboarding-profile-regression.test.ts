import { describe, expect, it, vi } from 'vitest';
import { UserRepository } from '../packages/database/src/repositories/UserRepository';
import {
  getAuthDisplayName,
  resolveProfileDisplayName,
  shouldPreserveOnboardingTargets,
} from '../apps/mobile/services/profileIdentity';

function remote(sequence: Array<{ data: any; error: any }>) {
  return {
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(sequence.shift())),
  };
}

describe('Google onboarding profile regression', () => {
  it('reads Google full_name metadata', () => {
    expect(getAuthDisplayName({ user_metadata: { full_name: 'Alex Yeti' } })).toBe('Alex Yeti');
  });

  it('falls back to Google name metadata', () => {
    expect(getAuthDisplayName({ user_metadata: { name: 'Alex Yeti' } })).toBe('Alex Yeti');
  });

  it('combines Google given and family names', () => {
    expect(getAuthDisplayName({ user_metadata: { given_name: 'Alex', family_name: 'Yeti' } })).toBe('Alex Yeti');
  });

  it('normalizes whitespace in identity names', () => {
    expect(getAuthDisplayName({ user_metadata: { full_name: '  Alex   Yeti ' } })).toBe('Alex Yeti');
  });

  it('keeps an explicit Yeti profile name ahead of Google metadata', () => {
    expect(resolveProfileDisplayName('Coach Chosen', { user_metadata: { full_name: 'Google Name' } })).toBe('Coach Chosen');
  });

  it('uses Google metadata ahead of a cached placeholder', () => {
    expect(resolveProfileDisplayName(null, { user_metadata: { full_name: 'Google Name' } }, 'Athlete')).toBe('Google Name');
  });

  it('uses a real cached name when profile and Google metadata are absent', () => {
    expect(resolveProfileDisplayName(null, null, 'Cached Athlete Name')).toBe('Cached Athlete Name');
  });

  it('uses a neutral fallback when no authoritative name exists', () => {
    expect(resolveProfileDisplayName(null, null, 'Athlete')).toBe('Athlete');
  });

  it('does not insert when the existing profile update succeeds', async () => {
    const client = remote([{ data: { id: 'u1', full_name: 'Existing' }, error: null }]);
    const result = await new UserRepository(null as any, client).updateProfile('u1', { full_name: 'Existing' });
    expect(result.remoteSuccess).toBe(true);
    expect(client.insert).not.toHaveBeenCalled();
  });

  it('inserts the authenticated id when the profile row is missing', async () => {
    const client = remote([
      { data: null, error: null },
      { data: { id: 'u2', full_name: 'Google Name' }, error: null },
    ]);
    const result = await new UserRepository(null as any, client).updateProfile('u2', { id: 'wrong', full_name: 'Google Name' });
    expect(result.remoteSuccess).toBe(true);
    expect(client.insert).toHaveBeenCalledWith({ id: 'u2', full_name: 'Google Name' });
  });

  it('reports an insert RLS rejection without queueing it as offline', async () => {
    const rls = { code: '42501', status: 403, message: 'row-level security policy' };
    const client = remote([{ data: null, error: null }, { data: null, error: rls }]);
    const result = await new UserRepository(null as any, client).updateProfile('u3', { full_name: 'Google Name' });
    expect(result.remoteSuccess).toBe(false);
    expect(result.queued).toBe(false);
    expect(result.remoteError).toBe(rls);
  });

  it('retries update when the signup trigger wins the bootstrap race', async () => {
    const client = remote([
      { data: null, error: null },
      { data: null, error: { code: '23505', message: 'duplicate key' } },
      { data: { id: 'u4', full_name: 'Google Name' }, error: null },
    ]);
    const result = await new UserRepository(null as any, client).updateProfile('u4', { full_name: 'Google Name' });
    expect(result.remoteSuccess).toBe(true);
    expect(client.update).toHaveBeenCalledTimes(2);
  });

  it('preserves manual nutrition targets during onboarding completion', () => {
    expect(shouldPreserveOnboardingTargets({ locked: false, mode: 'MANUAL' })).toBe(true);
  });

  it('preserves coach-locked nutrition targets during onboarding completion', () => {
    expect(shouldPreserveOnboardingTargets({ locked: true, mode: 'AUTO' })).toBe(true);
  });

  it('allows automatic targets for an unlocked AUTO profile', () => {
    expect(shouldPreserveOnboardingTargets({ locked: false, mode: 'AUTO' })).toBe(false);
  });
});
