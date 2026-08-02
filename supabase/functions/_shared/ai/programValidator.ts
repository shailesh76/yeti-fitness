// Deterministic program validator. Pure module (Deno + vitest).
// Validates draft programs BEFORE presenting to the athlete:
// 1. Weekly volume per muscle group
// 2. Recovery / consecutive muscle group frequency
// 3. Duplicate movement patterns
// 4. Session duration vs maxSessionMinutes
// 5. Equipment compatibility
// 6. Injury safety
// 7. Catalog exercise ID resolution

import { GeneratedDay } from './programGenerator.ts';
import { ProgramRequirements, EquipmentSetting } from './programRequirements.ts';

export interface ValidationIssue {
  type: 'volume' | 'recovery' | 'duplicate' | 'duration' | 'equipment' | 'injury' | 'catalog';
  severity: 'error' | 'warning';
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  warnings: string[];
  errors: string[];
  estimatedSessionMinutes: Record<string, number>; // dayName -> min
}

const INJURY_PATTERNS: Record<string, RegExp> = {
  shoulder: /overhead press|military press|behind.the.neck|upright row|dip\b/i,
  knee: /jump|box jump|pistol squat|deep lunge|leg extension/i,
  back: /deadlift|good morning|bent.over row|romanian deadlift/i,
  wrist: /barbell curl|front squat|handstand/i,
  elbow: /skull.?crusher|close.grip|tricep extension/i,
};

function checkEquipment(setting: EquipmentSetting | null, raw: string | null): boolean {
  if (!setting || setting === 'commercial_gym') return true;
  const eq = (raw || '').toLowerCase();
  if (setting === 'bodyweight') return eq.includes('body weight') || eq.includes('bodyweight') || eq === '';
  if (setting === 'dumbbells_only') return eq.includes('dumbbell') || eq.includes('body weight') || eq.includes('bodyweight');
  if (setting === 'home_gym') return !eq.includes('machine');
  return true;
}

export function validateProgram(
  days: GeneratedDay[],
  requirements: Partial<ProgramRequirements>,
  catalogMap?: Record<string, { id: string; equipment: string | null }>,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const estimatedSessionMinutes: Record<string, number> = {};
  const weeklyVolumeByGroup: Record<string, number> = {};

  days.forEach((day, dayIndex) => {
    let dayTotalSec = 0;
    const seenExercisesInDay = new Set<string>();

    day.exercises.forEach((ex) => {
      const nameLower = ex.name.toLowerCase();

      // 1. Duplicate check within same day
      if (seenExercisesInDay.has(nameLower)) {
        issues.push({
          type: 'duplicate',
          severity: 'error',
          message: `Duplicate exercise "${ex.name}" found on ${day.name}.`,
        });
      }
      seenExercisesInDay.add(nameLower);

      // 2. Volume tracking
      const group = ex.muscleGroup || 'other';
      weeklyVolumeByGroup[group] = (weeklyVolumeByGroup[group] || 0) + (ex.sets || 3);

      // 3. Duration estimation: set count * (rest_seconds + 45s execution time)
      const restSec = ex.restSeconds || 90;
      dayTotalSec += (ex.sets || 3) * (restSec + 45);

      // 4. Equipment check
      if (catalogMap && catalogMap[ex.name]) {
        const cat = catalogMap[ex.name];
        if (!checkEquipment(requirements.equipment ?? null, cat.equipment)) {
          issues.push({
            type: 'equipment',
            severity: 'error',
            message: `Exercise "${ex.name}" requires ${cat.equipment || 'incompatible equipment'}, which is not available in your ${requirements.equipment || 'setup'}.`,
          });
        }
      }

      // 5. Injury check
      for (const inj of requirements.injuries || []) {
        const pattern = INJURY_PATTERNS[inj.toLowerCase()];
        if (pattern && pattern.test(ex.name)) {
          issues.push({
            type: 'injury',
            severity: 'error',
            message: `Exercise "${ex.name}" on ${day.name} conflicts with your reported ${inj} pain/injury.`,
          });
        }
      }

      // 6. Catalog ID resolution check
      if (catalogMap && !catalogMap[ex.name]) {
        issues.push({
          type: 'catalog',
          severity: 'warning',
          message: `Exercise "${ex.name}" is not mapped to a known exercise catalog ID.`,
        });
      }
    });

    const estMin = Math.round(dayTotalSec / 60);
    estimatedSessionMinutes[day.name] = estMin;

    if (requirements.maxSessionMinutes && estMin > requirements.maxSessionMinutes) {
      issues.push({
        type: 'duration',
        severity: 'warning',
        message: `${day.name} estimated duration (${estMin} min) exceeds maximum preference of ${requirements.maxSessionMinutes} minutes.`,
      });
    }

    // 7. Recovery check (consecutive days targeting same primary muscle group)
    if (dayIndex > 0) {
      const prevDay = days[dayIndex - 1];
      const prevGroups = new Set(prevDay.exercises.map((e) => e.muscleGroup));
      const currGroups = new Set(day.exercises.map((e) => e.muscleGroup));

      for (const g of currGroups) {
        if (prevGroups.has(g) && (g === 'quads' || g === 'hamstrings' || g === 'chest' || g === 'back')) {
          issues.push({
            type: 'recovery',
            severity: 'warning',
            message: `Consecutive sessions (${prevDay.name} and ${day.name}) hit ${g}. Consider spacing out for optimal recovery.`,
          });
        }
      }
    }
  });

  // 8. Weekly volume limits check
  for (const [group, totalSets] of Object.entries(weeklyVolumeByGroup)) {
    if (totalSets > 24) {
      issues.push({
        type: 'volume',
        severity: 'warning',
        message: `High weekly volume for ${group} (${totalSets} sets/week). Standard upper limit is 20-22 sets.`,
      });
    } else if (totalSets < 4 && days.length >= 3) {
      issues.push({
        type: 'volume',
        severity: 'warning',
        message: `Low weekly volume for ${group} (${totalSets} sets/week).`,
      });
    }
  }

  const errors = issues.filter((i) => i.severity === 'error').map((i) => i.message);
  const warnings = issues.filter((i) => i.severity === 'warning').map((i) => i.message);

  return {
    valid: errors.length === 0,
    issues,
    errors,
    warnings,
    estimatedSessionMinutes,
  };
}
