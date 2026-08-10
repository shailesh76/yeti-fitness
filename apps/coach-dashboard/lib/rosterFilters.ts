import type { Client } from "@/store/useCoachStore";

/**
 * Pure search/filter/sort for the athlete roster, kept out of the component so
 * it can be tested directly.
 *
 * Only dimensions the schema actually backs are supported. The old mock roster
 * had "Active / New / Archived" tabs and an "Online / Check-in due" status
 * filter; profiles has no lifecycle-status, presence, or check-in column, so
 * those are gone rather than being faked. "Needs attention" survives because it
 * reuses the same real rule the dashboard inbox already uses.
 */

export type RosterTab = "all" | "needs_attention";
export type RosterSort = "name" | "last_active" | "adherence";

export interface RosterFilters {
  tab: RosterTab;
  search: string;
  /** profiles.goal enum value, or "all". */
  goal: string;
  /** Assigned plan name, or "all". */
  program: string;
  sort: RosterSort;
}

/** Same rule as the dashboard inbox: real low adherence, or no workout ever recorded. Unavailable data never counts as at-risk. */
export function isNeedsAttention(client: Client): boolean {
  return (client.adherenceScore !== null && client.adherenceScore < 70) || client.lastWorkout === 0;
}

/** Distinct real plan names across the roster, for the program dropdown. */
export function programOptions(clients: Client[]): string[] {
  const names = new Set<string>();
  clients.forEach((c) => {
    if (c.planName && c.planName !== "No Plan") names.add(c.planName);
  });
  return Array.from(names).sort();
}

/** Distinct real goal values across the roster, for the goal dropdown. */
export function goalOptions(clients: Client[]): string[] {
  const goals = new Set<string>();
  clients.forEach((c) => {
    if (c.goal) goals.add(c.goal);
  });
  return Array.from(goals).sort();
}

export function filterRoster(clients: Client[], filters: RosterFilters): Client[] {
  const search = filters.search.trim().toLowerCase();

  const filtered = clients.filter((c) => {
    if (filters.tab === "needs_attention" && !isNeedsAttention(c)) return false;
    if (search && !c.name.toLowerCase().includes(search)) return false;
    if (filters.goal !== "all" && c.goal !== filters.goal) return false;
    if (filters.program !== "all" && c.planName !== filters.program) return false;
    return true;
  });

  return [...filtered].sort((a, b) => {
    switch (filters.sort) {
      case "name":
        return a.name.localeCompare(b.name);
      case "adherence":
        // Athletes with no adherence data sort last rather than as a zero.
        if (a.adherenceScore === null && b.adherenceScore === null) return 0;
        if (a.adherenceScore === null) return 1;
        if (b.adherenceScore === null) return -1;
        return b.adherenceScore - a.adherenceScore;
      case "last_active":
      default:
        // null (unavailable) sorts last; 0 (never trained) sorts after real dates.
        if (a.lastWorkout === null && b.lastWorkout === null) return 0;
        if (a.lastWorkout === null) return 1;
        if (b.lastWorkout === null) return -1;
        return b.lastWorkout - a.lastWorkout;
    }
  });
}

/** Human label for the profiles.goal enum, without inventing goals the schema doesn't have. */
export function goalLabel(goal: string | null): string {
  switch (goal) {
    case "LOSE_FAT":
      return "Fat loss";
    case "BUILD_MUSCLE":
      return "Muscle gain";
    case "MAINTAIN":
      return "Maintain";
    default:
      return "No goal set";
  }
}
