/**
 * Canonical local-date helper for workout history and calendar views.
 * Ensures consistent, timezone-accurate date matching across:
 * - Selected calendar dates
 * - Calendar completion markers
 * - Workout history filtering
 * - History grouping & range queries
 */

/**
 * Returns 'YYYY-MM-DD' representing the local calendar date of the given timestamp
 * in the specified timezone (or the device's local timezone if omitted).
 */
export function getWorkoutLocalDate(
  dateInput: string | number | Date,
  timeZone?: string
): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return '';

  if (timeZone) {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(d);
    } catch {
      // If timezone string is invalid, fall through to device local
    }
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date into a friendly readable header (e.g. "Monday, 24 Aug 2026" or "Today, 24 Aug").
 */
export function formatWorkoutDisplayDate(
  dateInput: string | number | Date,
  timeZone?: string
): string {
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (!d || isNaN(d.getTime())) return 'Unknown Date';

  const todayKey = getWorkoutLocalDate(new Date(), timeZone);
  const targetKey = getWorkoutLocalDate(d, timeZone);

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || undefined,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const formatted = formatter.format(d);
    if (todayKey === targetKey) {
      return `Today · ${formatted}`;
    }
    return formatted;
  } catch {
    return d.toDateString();
  }
}

/**
 * Returns the ISO start and end timestamps for a given year and month (1-indexed, 1=Jan, 12=Dec).
 */
export function getWorkoutMonthRange(
  year: number,
  monthIndex1Based: number
): { startDate: string; endDate: string } {
  const start = new Date(Date.UTC(year, monthIndex1Based - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex1Based, 0, 23, 59, 59, 999));
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

/**
 * Checks if two date inputs fall on the exact same local calendar date.
 */
export function isSameWorkoutDate(
  dateA: string | number | Date,
  dateB: string | number | Date,
  timeZone?: string
): boolean {
  const keyA = getWorkoutLocalDate(dateA, timeZone);
  const keyB = getWorkoutLocalDate(dateB, timeZone);
  return !!keyA && keyA === keyB;
}
