import { describe, it, expect } from 'vitest';
import { LIVE_ENABLED, columnExists } from './helpers/live';

/**
 * LIVE migration validation — asserts the focus tables and their canonical columns
 * exist on the real database. This is the automated guard against the schema drift
 * found in the Phase 1 audit (missing tables/policies, duplicate definitions).
 *
 * Skipped automatically when Supabase env vars are unavailable.
 */
const d = LIVE_ENABLED ? describe : describe.skip;

const EXPECTED_COLUMNS: Record<string, string[]> = {
  activity_logs: ['id', 'user_id', 'event_name', 'metadata', 'created_at'],
  error_logs: ['id', 'user_id', 'context', 'error_message', 'stack_trace', 'created_at'],
  conversations: ['id', 'athlete_id', 'coach_id', 'title', 'org_id', 'created_at', 'updated_at'],
  conversation_members: ['conversation_id', 'user_id', 'joined_at'],
  user_entitlements: ['user_id', 'plan_id', 'status', 'source', 'expires_at', 'created_at', 'updated_at'],
  ai_memory: ['id', 'athlete_id', 'category', 'memory_key', 'memory_value', 'created_at', 'updated_at'],
  ai_request_logs: ['id', 'athlete_id', 'requested_at', 'subscription_tier', 'success', 'error_reason', 'message_length', 'coach_type'],
  system_errors: ['id', 'error_type', 'message', 'user_id', 'platform', 'app_version', 'stack_trace', 'created_at'],
};

d('Migration validation — focus tables exist with canonical columns', () => {
  for (const [table, cols] of Object.entries(EXPECTED_COLUMNS)) {
    for (const col of cols) {
      it(`${table}.${col} exists`, async () => {
        expect(await columnExists(table, col)).toBe(true);
      });
    }
  }

  it('user_entitlements uses canonical schema, NOT the legacy plan/is_active columns', async () => {
    expect(await columnExists('user_entitlements', 'plan_id')).toBe(true);
    expect(await columnExists('user_entitlements', 'status')).toBe(true);
    // The duplicate/legacy definition (plan, is_active, granted_by, granted_at) must NOT be live —
    // the subscription page was fixed to query plan_id/status accordingly.
    expect(await columnExists('user_entitlements', 'plan')).toBe(false);
    expect(await columnExists('user_entitlements', 'is_active')).toBe(false);
  });
});
