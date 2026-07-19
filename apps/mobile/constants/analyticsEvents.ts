/**
 * Analytics Event Constants
 *
 * Use these constants everywhere instead of raw strings.
 * This prevents typo-based analytics fragmentation and keeps
 * event names consistent with the activity_logs DB allowlist.
 *
 * DB constraint is in: 20260715_phase3_2_security_fixes.sql
 */
export const EVENTS = {
  // ─── Authentication ────────────────────────────────────────
  APP_OPENED: 'app_opened',
  SIGNUP_COMPLETED: 'signup_completed',
  LOGIN_COMPLETED: 'login_completed',

  // ─── Training ──────────────────────────────────────────────
  WORKOUT_STARTED: 'workout_started',
  WORKOUT_COMPLETED: 'workout_completed',
  PR_ACHIEVED: 'pr_achieved',

  // ─── Nutrition ─────────────────────────────────────────────
  MEAL_LOGGED: 'meal_logged',

  // ─── AI Coach ──────────────────────────────────────────────
  AI_CHAT_STARTED: 'ai_chat_started',
  AI_MEMORY_SAVED: 'ai_memory_saved',

  // ─── Coaching & Social ─────────────────────────────────────
  MESSAGE_SENT: 'message_sent',
  PLAN_ASSIGNED: 'plan_assigned',
  CHECK_IN_SUBMITTED: 'check_in_submitted',

  // ─── Progress ──────────────────────────────────────────────
  WEIGHT_LOGGED: 'weight_logged',
} as const;

// Type-safe event name union
export type EventName = typeof EVENTS[keyof typeof EVENTS];
