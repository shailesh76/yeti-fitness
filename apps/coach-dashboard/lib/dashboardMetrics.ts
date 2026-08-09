import type { Client } from "@/store/useCoachStore";

/**
 * Pure, dependency-free derivations of the coach dashboard-home KPIs from
 * data useCoachStore.getClients() already fetches. Kept separate from the
 * store/component layer so these can be unit tested directly (see
 * tests/dashboard-metrics.test.ts) without rendering React or touching
 * Supabase.
 *
 * Every function here only rearranges/aggregates real values already present
 * on Client (or on a raw workout_sessions row) — none of them invent a
 * number, a trend, or a formula that isn't already backed by an existing
 * product definition (calculate_adherence) or a raw table column.
 */

export interface RawWorkoutSession {
  athlete_id: string;
  completed_at: string | null;
}

export interface RecentActivityItem {
  clientId: string;
  clientName: string;
  initials: string;
  planName: string | null;
  lastWorkout: number; // epoch ms
}

export interface RankedAthlete {
  clientId: string;
  clientName: string;
  initials: string;
  adherenceScore: number;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Number of athletes currently linked to this coach via coach_clients. */
export function activeAthleteCount(clients: Client[]): number {
  return clients.length;
}

/**
 * Total workout_sessions rows completed today (local calendar day), across
 * this coach's whole roster. Operates on the raw session rows (not Client,
 * which only carries each athlete's single most-recent workout) so an
 * athlete who logged two sessions today is correctly counted twice — this
 * is meant to answer "how many workouts happened today", not "how many
 * athletes were active today".
 */
export function countSessionsToday(sessions: RawWorkoutSession[], now: Date = new Date()): number {
  return sessions.filter((s) => s.completed_at && isSameLocalDay(new Date(s.completed_at), now)).length;
}

/**
 * Average of the successfully loaded adherence scores. Athletes whose
 * calculate_adherence RPC failed have a null score and are excluded; the
 * store separately exposes that partial failure to the UI. Returns null when
 * no successful score exists so a missing metric can never appear as 0%.
 */
export function averageAdherence(clients: Client[]): number | null {
  const available = clients.filter((client) => client.adherenceScore !== null);
  if (available.length === 0) return null;
  const total = available.reduce((sum, client) => sum + client.adherenceScore!, 0);
  return Math.round(total / available.length);
}

/** Each client's most recent real workout, most-recent-first, capped at `limit`. Clients with no logged workout (lastWorkout === 0) are excluded rather than shown as a bogus 1970 date. */
export function recentActivity(clients: Client[], limit = 5): RecentActivityItem[] {
  return clients
    .filter((c) => c.lastWorkout !== null && c.lastWorkout > 0)
    .sort((a, b) => b.lastWorkout! - a.lastWorkout!)
    .slice(0, limit)
    .map((c) => ({
      clientId: c.id,
      clientName: c.name,
      initials: c.initials,
      planName: c.planName,
      lastWorkout: c.lastWorkout!,
    }));
}

/**
 * Ranking helper shared by atRiskAthletes/topPerformers. Caps each side to
 * half the roster so the same athlete can never appear on both lists at
 * once (e.g. with 2 total clients, calling one "at risk" and the other "top
 * performer" relative to a roster of two is real math but reads as a
 * fabricated-sounding claim) — this is a display-safety cap, not a new
 * adherence formula; the ranking itself is 100% real adherenceScore.
 */
function rankLimit(totalClients: number, requestedLimit: number): number {
  return Math.min(requestedLimit, Math.floor(totalClients / 2));
}

/** Lowest successful adherenceScore first; unavailable scores are excluded. */
export function atRiskAthletes(clients: Client[], limit = 3): RankedAthlete[] {
  const available = clients.filter((client) => client.adherenceScore !== null);
  const cap = rankLimit(available.length, limit);
  if (cap <= 0) return [];
  return available
    .sort((a, b) => a.adherenceScore! - b.adherenceScore!)
    .slice(0, cap)
    .map((c) => ({ clientId: c.id, clientName: c.name, initials: c.initials, adherenceScore: c.adherenceScore! }));
}

/** Highest successful adherenceScore first; unavailable scores are excluded. */
export function topPerformers(clients: Client[], limit = 3): RankedAthlete[] {
  const available = clients.filter((client) => client.adherenceScore !== null);
  const cap = rankLimit(available.length, limit);
  if (cap <= 0) return [];
  return available
    .sort((a, b) => b.adherenceScore! - a.adherenceScore!)
    .slice(0, cap)
    .map((c) => ({ clientId: c.id, clientName: c.name, initials: c.initials, adherenceScore: c.adherenceScore! }));
}

/**
 * The dashboard "Coach Inbox: Needs Attention" rule, preserved from the
 * committed dashboard: adherence below 70, OR no workout ever recorded.
 *
 * The one deliberate change is null handling, forced by the nullable Client
 * contract: `lastWorkout === 0` still means "no workouts recorded" and is
 * flagged, but `null` now means "the workout query failed" and is NOT
 * flagged — we don't know anything about that athlete, so asserting they
 * need attention would be a fabricated claim. Same for a null adherence.
 */
export function needsAttention(clients: Client[]): Client[] {
  return clients.filter(
    (c) => (c.adherenceScore !== null && c.adherenceScore < 70) || c.lastWorkout === 0,
  );
}

/** Real count of invites still awaiting acceptance, from client_invites.status. */
export function pendingInviteCount(invites: { status?: string | null }[]): number {
  return invites.filter((invite) => invite.status === 'pending').length;
}

/** "2h ago" / "5m ago" / "3d ago" style relative label for a real past timestamp. */
export function formatRelativeTime(pastMs: number, now: Date = new Date()): string {
  const diffMs = now.getTime() - pastMs;
  if (diffMs < 60000) return "Just now";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Real time-of-day greeting from an actual clock reading (0-23 hour), not a hardcoded "Good morning" regardless of when the coach actually opens the dashboard. */
export function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
