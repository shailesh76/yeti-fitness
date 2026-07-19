// Shared display helpers for exercise metadata — used by both the Exercise
// Library list (apps/mobile/app/exercises/index.tsx) and the Exercise Detail
// screen (apps/mobile/app/exercises/[id]/index.tsx) so the two don't diverge.

const EQUIPMENT_LABELS: Record<string, string> = {
  'body only': 'Bodyweight',
  'e-z curl bar': 'EZ Curl Bar',
};

export function displayLabel(value: string): string {
  if (EQUIPMENT_LABELS[value]) return EQUIPMENT_LABELS[value];
  return value.replace(/\b\w/g, c => c.toUpperCase());
}

export function parseSecondaryMuscles(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.length > 0) {
    try { return JSON.parse(value); } catch { return []; }
  }
  return [];
}
