import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRepository, decideProfileSaveOutcome } from '../packages/database/src/repositories/UserRepository';
import { useUserStore } from '../apps/mobile/store/useUserStore';
import { useAuthStore } from '../apps/mobile/store/useAuthStore';

describe('Task 96 — Profile Consistency & Remote Persistence', () => {
  beforeEach(() => {
    useUserStore.getState().reset();
    useAuthStore.getState().setSession(null);
  });

  describe('1. Remote success + local DB unavailable', () => {
    it('UserRepository.updateProfile succeeds remotely when local DB is unavailable (null)', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'user-123',
            full_name: 'Jane Yeti',
            goal: 'BUILD_MUSCLE',
            age: 28,
            gender: 'Female',
            height_cm: 170,
            weight_kg: 65,
            body_fat_percent: 18,
            activity_level: 'MODERATE',
          },
          error: null,
        }),
      };

      // db is null (web / local DB unavailable)
      const repo = new UserRepository(null as any, mockSupabase);

      const result = await repo.updateProfile('user-123', { full_name: 'Jane Yeti', goal: 'BUILD_MUSCLE' });

      expect(result.remoteSuccess).toBe(true);
      expect(result.localSuccess).toBe(false);
      expect(result.full_name).toBe('Jane Yeti');
      expect(result.queued).toBe(false);
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabase.update).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('fetchProfileRemote returns profile attributes correctly without crashing on local DB', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'user-123', full_name: 'Jane Yeti', goal: 'BUILD_MUSCLE' },
          error: null,
        }),
      };

      const repo = new UserRepository(null as any, mockSupabase);
      const { data, error } = await repo.fetchProfileRemote('user-123');

      expect(error).toBeNull();
      expect(data).toEqual({ id: 'user-123', full_name: 'Jane Yeti', goal: 'BUILD_MUSCLE' });
    });
  });

  describe('2. updateProfile remote persistence', () => {
    it('writes updates to public.profiles via update(), not upsert(), and reports remoteSuccess', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 'user-456', full_name: 'Athlete One', goal: 'LOSE_FAT' },
          error: null,
        }),
      };

      const repo = new UserRepository(null as any, mockSupabase);
      const res = await repo.updateProfile('user-456', { goal: 'LOSE_FAT' });

      expect(res.remoteSuccess).toBe(true);
      expect(res.remoteError).toBeNull();
      expect(res.goal).toBe('LOSE_FAT');
      expect(res.queued).toBe(false);
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'user-456');
    });

    it('bootstraps a missing profile row after an error-free zero-row update', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn()
          .mockResolvedValueOnce({ data: null, error: null })
          .mockResolvedValueOnce({ data: { id: 'user-ghost', full_name: 'Nobody' }, error: null }),
      };

      const repo = new UserRepository(null as any, mockSupabase);
      const res = await repo.updateProfile('user-ghost', { full_name: 'Nobody' });

      expect(res.remoteSuccess).toBe(true);
      expect(res.queued).toBe(false);
      expect(mockSupabase.insert).toHaveBeenCalledWith({ id: 'user-ghost', full_name: 'Nobody' });
    });

    it('does not queue a permanent RLS rejection as if it were an offline/network failure', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42501', message: 'new row violates row-level security policy' },
        }),
      };

      const repo = new UserRepository(null as any, mockSupabase);
      const res = await repo.updateProfile('user-rls', { full_name: 'Blocked' });

      expect(res.remoteSuccess).toBe(false);
      expect(res.queued).toBe(false);
      expect(res.remoteError?.code).toBe('42501');

      // Confirm nothing was actually queued: a flush attempt finds nothing to do.
      const flush = await repo.syncPendingProfileUpdates('user-rls');
      expect(flush.synced).toBe(true);
    });

    it('queues a genuine network failure (thrown, never reached the server) for retry', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockRejectedValue(new Error('Network request failed')),
      };

      const repo = new UserRepository(null as any, mockSupabase);
      const res = await repo.updateProfile('user-789', { weight_kg: 80 });

      expect(res.remoteSuccess).toBe(false);
      expect(res.remoteError?.message).toBe('Network request failed');
      expect(res.queued).toBe(true);
    });
  });

  describe('3. useUserStore reset lifecycle', () => {
    it('resets store on logout', () => {
      const userStore = useUserStore.getState();
      userStore.initializeFromProfile({
        full_name: 'Alice',
        age: 30,
        gender: 'Female',
        height_cm: 165,
        weight_kg: 60,
        body_fat_percent: 20,
        activity_level: 'LIGHT',
        goal: 'MAINTAIN',
      }, 'user-alice');

      expect(useUserStore.getState().full_name).toBe('Alice');
      expect(useUserStore.getState().userId).toBe('user-alice');

      // Set session to valid user
      useAuthStore.getState().setSession({ user: { id: 'user-alice' } } as any);

      // Log out (session = null)
      useAuthStore.getState().setSession(null);

      expect(useUserStore.getState().full_name).toBe('');
      expect(useUserStore.getState().userId).toBeNull();
    });

    it('resets store on account switch', () => {
      const userStore = useUserStore.getState();
      userStore.initializeFromProfile({
        full_name: 'User A',
        age: 25,
        goal: 'BUILD_MUSCLE',
      }, 'user-a');

      useAuthStore.getState().setSession({ user: { id: 'user-a' } } as any);
      expect(useUserStore.getState().full_name).toBe('User A');

      // Switch account to User B
      useAuthStore.getState().setSession({ user: { id: 'user-b' } } as any);

      expect(useUserStore.getState().full_name).toBe('');
      expect(useUserStore.getState().userId).toBeNull();
    });
  });

  describe('4. Edit profile initialization', () => {
    it('initializes onboarding form from current profile data', () => {
      const userStore = useUserStore.getState();
      const mockProfile = {
        id: 'user-999',
        full_name: 'Bob Trainer',
        age: 34,
        gender: 'Male',
        height_cm: 185,
        weight_kg: 90,
        body_fat_percent: 15,
        activity_level: 'VERY_ACTIVE',
        goal: 'BUILD_MUSCLE',
      };

      userStore.initializeFromProfile(mockProfile, 'user-999');

      const state = useUserStore.getState();
      expect(state.userId).toBe('user-999');
      expect(state.full_name).toBe('Bob Trainer');
      expect(state.age).toBe('34');
      expect(state.gender).toBe('Male');
      expect(state.height_cm).toBe('185');
      expect(state.weight_kg).toBe('90');
      expect(state.body_fat_percent).toBe('15');
      expect(state.activity_level).toBe('VERY_ACTIVE');
      expect(state.goal).toBe('BUILD_MUSCLE');
    });
  });

  describe('5. syncPendingProfileUpdates — queue flush', () => {
    it('is a no-op when nothing is queued', async () => {
      const mockSupabase = { from: vi.fn().mockReturnThis() };
      const repo = new UserRepository(null as any, mockSupabase);
      const res = await repo.syncPendingProfileUpdates('user-empty');
      expect(res.synced).toBe(true);
    });

    it('flushes a queued update once back online and clears it (idempotent on a second call)', async () => {
      const mockSupabase: any = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockRejectedValue(new Error('Network request failed')),
      };
      const repo = new UserRepository(null as any, mockSupabase);

      const saveResult = await repo.updateProfile('user-offline', { full_name: 'Offline Athlete' });
      expect(saveResult.queued).toBe(true);

      // Reconnect: same repo instance, now succeeding.
      mockSupabase.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'user-offline' }, error: null });
      const flush = await repo.syncPendingProfileUpdates('user-offline');
      expect(flush.synced).toBe(true);

      // Idempotent: nothing left queued, so a second flush is a clean no-op
      // and doesn't attempt another remote write.
      mockSupabase.update = vi.fn().mockReturnThis();
      const secondFlush = await repo.syncPendingProfileUpdates('user-offline');
      expect(secondFlush.synced).toBe(true);
      expect(mockSupabase.update).not.toHaveBeenCalled();
    });

    it('leaves a queued update in place while the flush attempt is still a network failure', async () => {
      const mockSupabase: any = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockRejectedValue(new Error('Network request failed')),
      };
      const repo = new UserRepository(null as any, mockSupabase);
      await repo.updateProfile('user-still-offline', { full_name: 'Still Offline' });

      const firstFlush = await repo.syncPendingProfileUpdates('user-still-offline');
      expect(firstFlush.synced).toBe(false);

      // Still queued: a later successful attempt picks up the same update.
      mockSupabase.maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'user-still-offline' }, error: null });
      const secondFlush = await repo.syncPendingProfileUpdates('user-still-offline');
      expect(secondFlush.synced).toBe(true);
    });

    it('drops a queued update instead of retrying forever if the retry is permanently rejected', async () => {
      const mockSupabase: any = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockRejectedValue(new Error('Network request failed')),
      };
      const repo = new UserRepository(null as any, mockSupabase);
      await repo.updateProfile('user-doomed', { full_name: 'Doomed Write' });

      // Flush attempt now reaches the server and is permanently rejected.
      mockSupabase.maybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'rejected' },
      });
      const flush = await repo.syncPendingProfileUpdates('user-doomed');
      expect(flush.synced).toBe(false);

      // Dropped, not retried forever: the next flush attempts no remote call.
      mockSupabase.update = vi.fn().mockReturnThis();
      const nextFlush = await repo.syncPendingProfileUpdates('user-doomed');
      expect(nextFlush.synced).toBe(true);
      expect(mockSupabase.update).not.toHaveBeenCalled();
    });
  });

  describe('6. decideProfileSaveOutcome', () => {
    it('is success when remoteSuccess is true', () => {
      expect(decideProfileSaveOutcome({ remoteSuccess: true, localSuccess: true, queued: false }))
        .toEqual({ kind: 'success' });
    });

    it('is offline-queued only when the failure was actually queued for retry', () => {
      expect(decideProfileSaveOutcome({ remoteSuccess: false, localSuccess: true, queued: true }))
        .toEqual({ kind: 'offline-queued' });
    });

    it('is blocked when local succeeded but the remote failure was not queued (permanent rejection)', () => {
      // The critical case: localSuccess alone must never imply "safe to tell
      // the user it will sync later" — only queued: true does.
      expect(decideProfileSaveOutcome({ remoteSuccess: false, localSuccess: true, queued: false }))
        .toEqual({ kind: 'blocked' });
    });

    it('is blocked when both local and remote failed', () => {
      expect(decideProfileSaveOutcome({ remoteSuccess: false, localSuccess: false, queued: false }))
        .toEqual({ kind: 'blocked' });
    });
  });
});
