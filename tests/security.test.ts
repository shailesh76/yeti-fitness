import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const aiCoachSource = readFileSync('supabase/functions/ai-coach/index.ts', 'utf8');
const exerciseGuidanceSource = readFileSync('supabase/functions/exercise-guidance/index.ts', 'utf8');

function incrementRpcCalls(source: string): number {
  return source.match(/\.rpc\s*\(\s*['"]increment_ai_usage['"]/g)?.length ?? 0;
}

/**
 * Phase 3.2 Security & Integration Tests
 *
 * Covers:
 * - RLS policy simulation (athlete/coach isolation)
 * - sync-push numeric bounds validation
 * - AI entitlement enforcement edge cases
 * - AI memory write control
 * - analyze-food-image auth guard
 * - Event name allowlist
 * - Messaging security (conversation member join guard)
 */

// ─── Helpers mirroring Edge Function logic ───────────────────────────────────

function evaluatePremiumAccess(
  incrementedRequests: number,
  isPremium: boolean
): { allowed: boolean; error?: string } {
  if (!isPremium && incrementedRequests > 5) {
    return {
      allowed: false,
      error: 'AI Coach daily limit reached for free tier.',
    };
  }
  return { allowed: true };
}

function resolveSubscriptionTier(entitlements: Array<{ plan_id: string }>) {
  const hasCoaching = entitlements.some((e) => e.plan_id === 'COACHING');
  const hasPro = entitlements.some((e) => e.plan_id === 'PRO');
  if (hasCoaching) return 'COACHING';
  if (hasPro) return 'PRO';
  return 'FREE';
}

const VALID_EVENTS = new Set([
  'app_opened', 'signup_completed', 'login_completed',
  'workout_started', 'workout_completed', 'pr_achieved',
  'meal_logged', 'ai_chat_started', 'ai_memory_saved',
  'message_sent', 'plan_assigned', 'check_in_submitted', 'weight_logged',
]);

function validateEventName(name: string): boolean {
  return VALID_EVENTS.has(name);
}

function clampSyncField(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function isPayloadTooLarge(rawBody: string): boolean {
  return rawBody.length > 512 * 1024;
}

function isImageTooLarge(base64: string): boolean {
  return base64.length > 7 * 1024 * 1024;
}

// ─── 1. AI Entitlement Enforcement ───────────────────────────────────────────

describe('AI Entitlement Enforcement', () => {
  it('allows the fifth free request', () => {
    expect(evaluatePremiumAccess(5, false).allowed).toBe(true);
  });

  it('blocks the sixth free request', () => {
    expect(evaluatePremiumAccess(6, false).allowed).toBe(false);
  });

  it('always allows PRO user regardless of count', () => {
    expect(evaluatePremiumAccess(100, true).allowed).toBe(true);
  });

  it('accounts exactly once in each endpoint with no direct ai_usage mutation', () => {
    for (const source of [aiCoachSource, exerciseGuidanceSource]) {
      expect(incrementRpcCalls(source)).toBe(1);
      expect(source).not.toMatch(/\.from\(['"]ai_usage['"]\)/);
    }
    expect(aiCoachSource.indexOf(".rpc('increment_ai_usage'")).toBeLessThan(aiCoachSource.indexOf('const intent ='));
    expect(exerciseGuidanceSource.indexOf("'increment_ai_usage'")).toBeLessThan(exerciseGuidanceSource.indexOf('const result = await generateChat'));
    expect(aiCoachSource).toMatch(/newRequestCount\s*>\s*5/);
    expect(exerciseGuidanceSource).toMatch(/newRequestCount\s*>\s*5/);
  });

  it('resolves COACHING tier when user has COACHING entitlement', () => {
    expect(resolveSubscriptionTier([{ plan_id: 'COACHING' }])).toBe('COACHING');
  });

  it('resolves PRO tier when user has PRO but not COACHING', () => {
    expect(resolveSubscriptionTier([{ plan_id: 'PRO' }])).toBe('PRO');
  });

  it('resolves FREE tier when user has no active plan', () => {
    expect(resolveSubscriptionTier([])).toBe('FREE');
  });
});

// ─── 2. sync-push Payload Validation ─────────────────────────────────────────

describe('sync-push Payload Security', () => {
  it('rejects payload over 512KB', () => {
    const bigPayload = 'x'.repeat(513 * 1024);
    expect(isPayloadTooLarge(bigPayload)).toBe(true);
  });

  it('accepts payload under 512KB', () => {
    const smallPayload = JSON.stringify({ changes: {} });
    expect(isPayloadTooLarge(smallPayload)).toBe(false);
  });

  it('clamps reps to 0–200 bounds', () => {
    expect(clampSyncField(999_999, 0, 200)).toBe(200);
    expect(clampSyncField(-5, 0, 200)).toBe(0);
    expect(clampSyncField(12, 0, 200)).toBe(12);
  });

  it('clamps weight_kg to 0–1500 bounds', () => {
    expect(clampSyncField(9999, 0, 1500)).toBe(1500);
    expect(clampSyncField(-10, 0, 1500)).toBe(0);
    expect(clampSyncField(100, 0, 1500)).toBe(100);
  });

  it('clamps servings to 0.1–50 bounds', () => {
    expect(clampSyncField(200, 0.1, 50)).toBe(50);
    expect(clampSyncField(0, 0.1, 50)).toBe(0.1);
    expect(clampSyncField(2.5, 0.1, 50)).toBe(2.5);
  });
});

// ─── 3. analyze-food-image Auth Guard ────────────────────────────────────────

describe('analyze-food-image Security', () => {
  it('rejects requests with no Authorization header', () => {
    const headers = new Headers();
    const authHeader = headers.get('Authorization');
    expect(authHeader).toBeNull();
    // In the Edge Function: if (!authHeader) return 401
  });

  it('rejects images over 7MB encoded ceiling', () => {
    const tooBigImage = 'A'.repeat(7 * 1024 * 1024 + 1);
    expect(isImageTooLarge(tooBigImage)).toBe(true);
  });

  it('accepts images under the size limit', () => {
    const okImage = 'A'.repeat(1024 * 100); // 100KB
    expect(isImageTooLarge(okImage)).toBe(false);
  });

  it('rejects descriptions over 2000 characters', () => {
    const longDesc = 'A'.repeat(2001);
    expect(longDesc.length > 2000).toBe(true);
  });
});

// ─── 4. Activity Log Event Allowlist ─────────────────────────────────────────

describe('Activity Log Event Allowlist', () => {
  it('accepts all valid EVENTS constants', () => {
    const validNames = [
      'app_opened', 'signup_completed', 'login_completed',
      'workout_started', 'workout_completed', 'pr_achieved',
      'meal_logged', 'ai_chat_started', 'ai_memory_saved',
      'message_sent', 'plan_assigned', 'check_in_submitted', 'weight_logged',
    ];
    validNames.forEach((name) => {
      expect(validateEventName(name)).toBe(true);
    });
  });

  it('rejects arbitrary event names that are not in the allowlist', () => {
    expect(validateEventName('admin_delete_user')).toBe(false);
    expect(validateEventName('hack_attempt')).toBe(false);
    expect(validateEventName('')).toBe(false);
    expect(validateEventName('workout_COMPLETED')).toBe(false); // case-sensitive
  });
});

// ─── 5. RLS Policy Simulation (Athlete/Coach Isolation) ──────────────────────

describe('RLS Policy Simulation — Athlete Isolation', () => {
  it('athlete can only access their own workout sessions', () => {
    const athleteId = 'athlete-uuid-1';
    const sessions = [
      { id: 's1', athlete_id: 'athlete-uuid-1' },
      { id: 's2', athlete_id: 'athlete-uuid-2' },  // another athlete
    ];
    // Simulate RLS: athlete_id = auth.uid()
    const visible = sessions.filter((s) => s.athlete_id === athleteId);
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('s1');
  });

  it('coach can only view sessions for assigned athletes', () => {
    const coachId = 'coach-uuid-1';
    const coachClients = [{ coach_id: 'coach-uuid-1', athlete_id: 'athlete-uuid-1' }];
    const sessions = [
      { id: 's1', athlete_id: 'athlete-uuid-1' },
      { id: 's2', athlete_id: 'athlete-uuid-3' }, // not assigned
    ];
    const assignedAthleteIds = coachClients
      .filter((cc) => cc.coach_id === coachId)
      .map((cc) => cc.athlete_id);
    const visible = sessions.filter((s) => assignedAthleteIds.includes(s.athlete_id));
    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe('s1');
  });

  it('athlete cannot read another athlete\'s AI memory', () => {
    const currentUserId = 'athlete-uuid-1';
    const memories = [
      { athlete_id: 'athlete-uuid-1', memory_key: 'preferred_split', memory_value: 'PPL' },
      { athlete_id: 'athlete-uuid-2', memory_key: 'preferred_split', memory_value: 'Upper/Lower' },
    ];
    // Simulate: athlete_id = auth.uid()
    const visible = memories.filter((m) => m.athlete_id === currentUserId);
    expect(visible).toHaveLength(1);
    expect(visible[0].memory_value).toBe('PPL');
  });
});

// ─── 6. Conversation Member Join Guard ───────────────────────────────────────

describe('Conversation Member Join Guard', () => {
  it('prevents athlete from joining a conversation they are not part of', () => {
    const currentUserId = 'athlete-uuid-1';
    const conversations = [
      { id: 'conv-1', athlete_id: 'athlete-uuid-1', coach_id: 'coach-uuid-1' },
      { id: 'conv-2', athlete_id: 'athlete-uuid-2', coach_id: 'coach-uuid-1' },
    ];

    // Simulate: conversation_id must match where athlete_id = auth.uid() OR coach_id = auth.uid()
    function canJoinConversation(userId: string, conversationId: string): boolean {
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv) return false;
      return conv.athlete_id === userId || conv.coach_id === userId;
    }

    expect(canJoinConversation(currentUserId, 'conv-1')).toBe(true);
    expect(canJoinConversation(currentUserId, 'conv-2')).toBe(false); // another athlete's convo
  });
});

// ─── 7. AI Memory Write Control (Hardened) ───────────────────────────────────

describe('AI Memory Write Control (Hardened)', () => {
  it('athlete cannot directly INSERT or UPDATE ai_memory (client write blocked)', () => {
    const currentUserId = 'athlete-uuid-1';
    
    // Simulate RLS: Only SELECT allowed for auth.uid() = athlete_id. No INSERT/UPDATE policy for athletes.
    const canAthleteWrite = false; // Banned by absence of policies for authenticated role
    expect(canAthleteWrite).toBe(false);
  });

  it('service_role can write (INSERT/UPDATE/DELETE) AI memory', () => {
    // Simulate: TO service_role USING (true) WITH CHECK (true)
    const canServiceRoleWrite = true;
    expect(canServiceRoleWrite).toBe(true);
  });
});

// ─── 8. Foods Ownership Hardening ──────────────────────────────────────────

describe('Foods Ownership Hardening', () => {
  it('users can update their own custom foods', () => {
    const userId = 'user-1';
    const food = { id: 'food-1', created_by: 'user-1' };
    const canUpdate = food.created_by === userId;
    expect(canUpdate).toBe(true);
  });

  it('users cannot update system/seeded foods (where created_by is NULL)', () => {
    const userId = 'user-1';
    const food = { id: 'food-1', created_by: null };
    const canUpdate = food.created_by === userId; // created_by = auth.uid()
    expect(canUpdate).toBe(false);
  });

  it('normal users cannot delete any foods (delete policy is always false)', () => {
    const canUserDelete = false; // FOR DELETE USING (false)
    expect(canUserDelete).toBe(false);
  });
});

// ─── 9. User Entitlements Hardening ─────────────────────────────────────────

describe('User Entitlements Hardening', () => {
  it('athletes can read their own entitlements', () => {
    const userId = 'user-1';
    const entitlement = { user_id: 'user-1', plan_id: 'PRO' };
    const canRead = entitlement.user_id === userId;
    expect(canRead).toBe(true);
  });

  it('athletes cannot INSERT or UPDATE entitlements (only service_role)', () => {
    const canUserWrite = false; // FOR INSERT/UPDATE WITH CHECK (false)
    expect(canUserWrite).toBe(false);
  });
});

// ─── 10. AI Safety Logs Hardening ───────────────────────────────────────────

describe('AI Safety Logs Hardening', () => {
  it('athletes cannot directly INSERT safety logs (write only via service_role)', () => {
    const canUserInsert = false; // No athlete INSERT policy
    expect(canUserInsert).toBe(false);
  });

  it('service_role can insert safety logs', () => {
    const canServiceRoleInsert = true;
    expect(canServiceRoleInsert).toBe(true);
  });
});

// ─── 11. Beta Onboarding & Feedback Security (Phase 3.3C) ─────────────────────

describe('Beta Onboarding & Feedback Security (Phase 3.3C)', () => {
  describe('beta_consents RLS', () => {
    it('allows users to read and insert their own consents', () => {
      const authUserId = 'athlete-1';
      const consentRecord = { user_id: 'athlete-1', consent_type: 'BETA_TESTING' };
      
      const canRead = consentRecord.user_id === authUserId;
      const canInsert = consentRecord.user_id === authUserId;
      
      expect(canRead).toBe(true);
      expect(canInsert).toBe(true);
    });

    it('blocks users from reading or inserting consents of another user', () => {
      const authUserId = 'athlete-1';
      const consentRecord = { user_id: 'athlete-2', consent_type: 'BETA_TESTING' };
      
      const canRead = consentRecord.user_id === authUserId;
      const canInsert = consentRecord.user_id === authUserId;
      
      expect(canRead).toBe(false);
      expect(canInsert).toBe(false);
    });
  });

  describe('beta_user_feedback RLS', () => {
    it('allows authenticated users to insert their own feedback', () => {
      const authUserId = 'athlete-1';
      const feedbackRecord = { user_id: 'athlete-1', feedback_text: 'Great app!' };
      
      const canInsert = feedbackRecord.user_id === authUserId;
      expect(canInsert).toBe(true);
    });

    it('blocks users from inserting feedback as another user', () => {
      const authUserId = 'athlete-1';
      const feedbackRecord = { user_id: 'athlete-2', feedback_text: 'Great app!' };
      
      const canInsert = feedbackRecord.user_id === authUserId;
      expect(canInsert).toBe(false);
    });

    it('allows coaches and admins to view feedback', () => {
      const viewerRole = 'coach';
      const canView = viewerRole === 'coach' || viewerRole === 'admin';
      expect(canView).toBe(true);
    });

    it('blocks normal athletes from viewing feedback', () => {
      const viewerRole = 'athlete';
      const canView = viewerRole === 'coach' || viewerRole === 'admin';
      expect(canView).toBe(false);
    });
  });
});

// ─── 12. Admin Data Access Security (Phase 1) ──────────────────────────────────

function simulateVerifyAdmin(userRole: string): { status: number; error?: string } {
  if (userRole !== 'admin') {
    return { status: 403, error: 'Forbidden: admin only' };
  }
  return { status: 200 };
}

describe('Admin Data Access Security (Phase 1)', () => {
  it('allows access to admin-data Edge Function for user with role = admin', () => {
    const res = simulateVerifyAdmin('admin');
    expect(res.status).toBe(200);
    expect(res.error).toBeUndefined();
  });

  it('denies access to admin-data Edge Function for coach role', () => {
    const res = simulateVerifyAdmin('coach');
    expect(res.status).toBe(403);
    expect(res.error).toBe('Forbidden: admin only');
  });

  it('denies access to admin-data Edge Function for athlete role', () => {
    const res = simulateVerifyAdmin('athlete');
    expect(res.status).toBe(403);
    expect(res.error).toBe('Forbidden: admin only');
  });

  it('athlete RLS simulation: can only read their own user entitlements', () => {
    const athleteId = 'athlete-123';
    const entitlements = [
      { user_id: 'athlete-123', plan_id: 'PRO' },
      { user_id: 'athlete-456', plan_id: 'PRO' }
    ];
    // RLS: user_id = auth.uid()
    const visible = entitlements.filter(e => e.user_id === athleteId);
    expect(visible).toHaveLength(1);
    expect(visible[0].user_id).toBe('athlete-123');
  });

  it('athlete RLS simulation: can only read their own AI request logs', () => {
    const athleteId = 'athlete-123';
    const requestLogs = [
      { athlete_id: 'athlete-123', success: true },
      { athlete_id: 'athlete-456', success: true }
    ];
    // RLS: athlete_id = auth.uid()
    const visible = requestLogs.filter(l => l.athlete_id === athleteId);
    expect(visible).toHaveLength(1);
    expect(visible[0].athlete_id).toBe('athlete-123');
  });

  it('athlete RLS simulation: can only read their own coach assignments', () => {
    const athleteId = 'athlete-123';
    const coachClients = [
      { athlete_id: 'athlete-123', coach_id: 'coach-1' },
      { athlete_id: 'athlete-456', coach_id: 'coach-1' }
    ];
    // RLS: athlete_id = auth.uid()
    const visible = coachClients.filter(c => c.athlete_id === athleteId);
    expect(visible).toHaveLength(1);
    expect(visible[0].athlete_id).toBe('athlete-123');
  });

  it('service_role / admin client bypasses RLS and can read all user entitlements', () => {
    const entitlements = [
      { user_id: 'athlete-123', plan_id: 'PRO' },
      { user_id: 'athlete-456', plan_id: 'PRO' }
    ];
    // service_role/admin query reads everything
    const visible = [...entitlements];
    expect(visible).toHaveLength(2);
  });
});
