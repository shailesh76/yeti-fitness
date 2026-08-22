import { Database } from '@nozbe/watermelondb';
import { Profile } from '../models/Profile';

export class UserRepository {
  private db: Database;
  private supabase?: any;
  private pendingQueue: Record<string, any[]> = {};

  constructor(db: Database, supabase?: any) {
    this.db = db;
    this.supabase = supabase;
  }

  /**
   * Guards local WatermelonDB access. The native SQLite adapter is unavailable on
   * web, where `db` is null — fail with a clear, catchable error instead of a
   * cryptic "Cannot read properties of null" crash.
   */
  private requireDb(): Database {
    if (!this.db) {
      throw new Error('LOCAL_DB_UNAVAILABLE: local database is not available on this platform');
    }
    return this.db;
  }

  async getProfile(userId: string): Promise<Profile | any | null> {
    if (this.db) {
      try {
        const records = await this.db.get<Profile>('profiles').query().fetch();
        const profile = records.find(r => r.user_id === userId);
        if (profile) return profile;
      } catch {
        // Fall back to remote
      }
    }
    if (this.supabase?.from) {
      try {
        const { data, error } = await this.supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (!error && data) return data;
      } catch {
        // Fallback null
      }
    }
    return null;
  }

  private async queuePendingUpdate(userId: string, updates: any): Promise<void> {
    if (!this.pendingQueue[userId]) {
      this.pendingQueue[userId] = [];
    }
    this.pendingQueue[userId].push({ updates, timestamp: Date.now() });

    try {
      const AsyncStorage = (globalThis as any).AsyncStorage || require('@react-native-async-storage/async-storage')?.default;
      if (AsyncStorage) {
        const key = `pending_profile_updates_${userId}`;
        const existingRaw = await AsyncStorage.getItem(key);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        existing.push({ updates, timestamp: Date.now() });
        await AsyncStorage.setItem(key, JSON.stringify(existing));
      }
    } catch {
      // Best-effort offline queueing
    }
  }

  async syncPendingProfileUpdates(userId: string): Promise<{ synced: boolean; error?: any }> {
    if (!this.supabase?.from) return { synced: false };

    let pendingItems: any[] = this.pendingQueue[userId] || [];
    try {
      const AsyncStorage = (globalThis as any).AsyncStorage || require('@react-native-async-storage/async-storage')?.default;
      if (AsyncStorage) {
        const key = `pending_profile_updates_${userId}`;
        const existingRaw = await AsyncStorage.getItem(key);
        if (existingRaw) {
          const items = JSON.parse(existingRaw);
          pendingItems = [...pendingItems, ...items];
        }
      }
    } catch {
      // Fallback to in-memory queue
    }

    if (pendingItems.length === 0) return { synced: true };

    const mergedUpdates = pendingItems.reduce((acc, item) => ({ ...acc, ...item.updates }), {});

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .update(mergedUpdates)
        .eq('id', userId)
        .select('id')
        .maybeSingle();

      if (error || !data) {
        // The request reached the server: either it was rejected (RLS,
        // constraint, schema) or zero rows matched (no profiles row for
        // this user). Both are permanent for this payload — retrying the
        // identical write will never succeed, so drop it instead of
        // retrying forever.
        await this.clearPendingQueue(userId);
        return { synced: false, error: error || new Error('PROFILE_NOT_FOUND: no profiles row exists for this user') };
      }

      await this.clearPendingQueue(userId);
      return { synced: true };
    } catch (err: any) {
      // Never reached the server — still offline. Leave the queue intact
      // so the next flush attempt retries the same merged update.
      return { synced: false, error: err };
    }
  }

  private async clearPendingQueue(userId: string): Promise<void> {
    this.pendingQueue[userId] = [];
    try {
      const AsyncStorage = (globalThis as any).AsyncStorage || require('@react-native-async-storage/async-storage')?.default;
      if (AsyncStorage) {
        await AsyncStorage.removeItem(`pending_profile_updates_${userId}`);
      }
    } catch {
      // Best-effort cleanup
    }
  }

  async updateProfile(userId: string, updates: any): Promise<any> {
    let localProfile: any = null;
    let localSuccess = false;
    let localError: any = null;

    // 1. Local Write
    if (this.db) {
      try {
        localProfile = await this.db.write(async () => {
          const profile = await this.getProfile(userId);
          if (profile) {
            await profile.update((p: any) => {
              Object.assign(p, updates);
            });
            return profile;
          } else {
            return await this.db.get<Profile>('profiles').create((p: any) => {
              p.user_id = userId;
              Object.assign(p, updates);
            });
          }
        });
        localSuccess = true;
      } catch (err: any) {
        localError = err;
      }
    } else {
      localError = new Error('LOCAL_DB_UNAVAILABLE: local database is not available on this platform');
    }

    // 2. Remote Write
    let remoteData: any = null;
    let remoteSuccess = false;
    let remoteError: any = null;
    // True only when this failure was actually queued for automatic retry.
    // A permanent rejection (RLS, missing row) is never queued, so callers
    // must not tell the user "will sync when online" unless this is true —
    // see decideProfileSaveOutcome below.
    let queued = false;

    if (this.supabase?.from) {
      try {
        // update(), not upsert(): id is the profiles PK and a row is always
        // created for every signed-up user by the SECURITY DEFINER trigger
        // in 20260719_auto_create_profile_on_signup.sql, which bypasses RLS.
        // There is no INSERT policy on profiles for any client role, so
        // upsert()'s insert branch would be RLS-rejected if it were ever
        // reached — update() fails safe (zero rows) instead.
        const { data, error } = await this.supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select('id, full_name, age, gender, height_cm, weight_kg, body_fat_percent, activity_level, goal')
          .maybeSingle();

        if (error) {
          // The request reached the server and was rejected (RLS,
          // constraint, schema). Permanent for this payload — must not be
          // queued alongside genuine connectivity failures below, or a
          // caller could tell the user "will sync later" for a write that
          // structurally never will.
          remoteError = error;
          remoteSuccess = false;
        } else if (!data) {
          // Zero rows updated: no profiles row exists for this user. A
          // data-integrity condition, not connectivity — queuing it would
          // retry forever without ever succeeding.
          remoteError = new Error('PROFILE_NOT_FOUND: no profiles row exists for this user');
          remoteSuccess = false;
        } else {
          remoteData = data;
          remoteSuccess = true;
        }
      } catch (err: any) {
        // Never reached the server — genuine connectivity failure. Worth
        // queuing for retry once the connection returns.
        remoteError = err;
        remoteSuccess = false;
        await this.queuePendingUpdate(userId, updates);
        queued = true;
      }
    } else if (!localSuccess) {
      // Neither local DB write nor Supabase client available
      throw localError || new Error('LOCAL_DB_UNAVAILABLE: local database is not available on this platform');
    }

    const baseData = remoteData || (localProfile ? { ...updates, ...localProfile } : updates);
    return {
      ...baseData,
      profile: baseData,
      localSuccess,
      remoteSuccess,
      remoteError,
      queued,
    };
  }

  // --- Remote Operations ---

  async fetchProfileRemote(userId: string, columns: string = 'id, full_name'): Promise<any> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in UserRepository');
    }
    // Select requested columns confirmed to exist on the live `profiles` table.
    const { data, error } = await this.supabase
      .from('profiles')
      .select(columns)
      .eq('id', userId)
      .maybeSingle();
    return { data, error };
  }

  async saveBetaConsents(consents: any[]): Promise<{ error: any }> {
    if (!this.supabase) {
      throw new Error('Supabase client not configured in UserRepository');
    }
    const { error } = await this.supabase
      .from('beta_consents')
      .insert(consents);
    return { error };
  }
}

export type PostLoginRouteDecision =
  | { outcome: 'home' }
  | { outcome: 'onboarding' }
  | { outcome: 'error'; code: string };

// The fields the three onboarding screens (basic-info, body-metrics, goals)
// collect and require before they'll submit. Kept as a single source of
// truth: decidePostLoginRoute() checks these, and POST_LOGIN_PROFILE_COLUMNS
// (below) is derived from the same array, so the completeness check can
// never silently drift from what's actually selected off the row. Excludes
// body_fat_percent, which goals.tsx submits as optional/nullable.
export const REQUIRED_PROFILE_FIELDS = [
  'full_name',
  'age',
  'gender',
  'height_cm',
  'weight_kg',
  'activity_level',
  'goal',
] as const;

// Pass to fetchProfileRemote() at any post-login routing call site so the
// row it returns has every field decidePostLoginRoute() needs to judge
// completeness. Using the bare default ('id, full_name') here would make
// every account look perpetually incomplete.
export const POST_LOGIN_PROFILE_COLUMNS = ['id', ...REQUIRED_PROFILE_FIELDS].join(', ');

function isProfileComplete(data: any): boolean {
  if (!data) return false;
  return REQUIRED_PROFILE_FIELDS.every((field) => {
    const value = data[field];
    return value !== null && value !== undefined && value !== '';
  });
}

/**
 * Decides where to route a user immediately after a successful auth event
 * (email/password sign-in or OAuth callback), from the result of
 * fetchProfileRemote(). Shared by both flows so they can't drift.
 *
 * A failed lookup (network, schema, RLS, etc.) must never be treated the same
 * as "no profile row" — doing so silently sends an existing, fully configured
 * athlete back through onboarding on every transient error, which is exactly
 * what the missing-avatar_url bug did.
 *
 * A row existing is not enough: the auto-create-signup trigger inserts a
 * minimal `{ id }`-only row for every new user (see
 * 20260719_auto_create_profile_on_signup.sql), so "row present" alone would
 * route brand-new users straight to /home with an empty profile instead of
 * onboarding. Route home only once the onboarding-required fields are
 * actually filled in.
 */
export function decidePostLoginRoute(result: { data: any; error: any }): PostLoginRouteDecision {
  if (result.error) {
    return { outcome: 'error', code: result.error.code || 'PROFILE_FETCH_FAILED' };
  }
  return isProfileComplete(result.data) ? { outcome: 'home' } : { outcome: 'onboarding' };
}

export type ProfileSaveOutcome =
  | { kind: 'success' }
  | { kind: 'offline-queued' }
  | { kind: 'blocked' };

/**
 * Decides how a screen should react to updateProfile()'s result. Plain data
 * in, plain data out — no RN/UI imports — so onboarding/goals.tsx (and any
 * other save flow) can import this instead of re-deriving its own reading of
 * the same three flags, and so it stays testable without a component-render
 * harness.
 *
 * A local-only success is only ever "offline-queued" (safe to tell the user
 * it will sync later) when the write was actually queued for automatic
 * retry. A permanently rejected remote write (RLS, missing row) also has
 * localSuccess: true in some cases, but queued: false — that must be
 * `blocked`, not `offline-queued`, because waiting will never make it sync.
 */
export function decideProfileSaveOutcome(result: {
  remoteSuccess: boolean;
  localSuccess: boolean;
  queued: boolean;
}): ProfileSaveOutcome {
  if (result.remoteSuccess) return { kind: 'success' };
  if (result.localSuccess && result.queued) return { kind: 'offline-queued' };
  return { kind: 'blocked' };
}

