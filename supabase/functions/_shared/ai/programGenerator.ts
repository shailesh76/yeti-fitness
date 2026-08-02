// Deterministic workout-program generation. Pure module (Deno + vitest) — takes
// an ALREADY-QUERIED candidate exercise pool (the edge fn does the real DB
// query; this module never touches a database) and deterministically builds a
// day-by-day program. The LLM is never asked to invent exercises, sets, reps
// or structure — it only explains what this function already decided.
//
// Real catalog value vocabulary (exact target_muscle/body_part/equipment text)
// isn't fully known at the pure-module boundary, so grouping raw catalog rows
// into the semantic MuscleGroup buckets below is the EDGE FUNCTION's job (it
// can query broadly with multiple ilike patterns); this module only consumes
// the already-grouped pool.

import { ExperienceLevel, ProgramGoal, EquipmentSetting } from './programRequirements.ts';

export type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core';

export interface ExerciseCandidate {
  name: string;
  equipment: string | null; // raw catalog text, e.g. 'dumbbell', 'barbell', 'machine', 'body weight', 'cable'
}

export interface GeneratedExercise {
  name: string;
  muscleGroup: MuscleGroup;
  sets: number;
  reps: string;
  restSeconds: number;
}

export interface GeneratedDay {
  name: string;
  exercises: GeneratedExercise[];
}

export interface GenerateProgramInput {
  dayNames: string[];
  experience: ExperienceLevel;
  goal: ProgramGoal | null;
  equipment: EquipmentSetting | null;
  customEquipment?: string[];
  candidatesByGroup: Partial<Record<MuscleGroup, ExerciseCandidate[]>>;
  excludedExerciseNames?: string[];  // dislikes + injury-conflicting names, pre-merged by caller if desired
  likedExerciseNames?: string[];
  priorityMuscleGroups?: MuscleGroup[];
  injuryKeywords?: string[];        // raw injury text fragments, e.g. ["shoulder"]
}

export interface GenerateProgramResult {
  days: GeneratedDay[];
  unfilledSlots: string[]; // "<day>: no <group> candidate available" — honest, never silently invented
}

interface DaySlot { group: MuscleGroup; role: 'compound' | 'accessory' }

const DAY_TEMPLATES: Record<string, DaySlot[]> = {
  push: [
    { group: 'chest', role: 'compound' }, { group: 'shoulders', role: 'compound' },
    { group: 'chest', role: 'accessory' }, { group: 'triceps', role: 'accessory' }, { group: 'shoulders', role: 'accessory' },
  ],
  pull: [
    { group: 'back', role: 'compound' }, { group: 'back', role: 'compound' },
    { group: 'back', role: 'accessory' }, { group: 'biceps', role: 'accessory' }, { group: 'biceps', role: 'accessory' },
  ],
  legs: [
    { group: 'quads', role: 'compound' }, { group: 'hamstrings', role: 'compound' },
    { group: 'quads', role: 'accessory' }, { group: 'hamstrings', role: 'accessory' }, { group: 'calves', role: 'accessory' },
  ],
  upper: [
    { group: 'chest', role: 'compound' }, { group: 'back', role: 'compound' },
    { group: 'shoulders', role: 'accessory' }, { group: 'biceps', role: 'accessory' }, { group: 'triceps', role: 'accessory' },
  ],
  lower: [
    { group: 'quads', role: 'compound' }, { group: 'hamstrings', role: 'compound' },
    { group: 'glutes', role: 'accessory' }, { group: 'calves', role: 'accessory' },
  ],
  'full body': [
    { group: 'quads', role: 'compound' }, { group: 'chest', role: 'compound' }, { group: 'back', role: 'compound' },
    { group: 'shoulders', role: 'accessory' }, { group: 'core', role: 'accessory' },
  ],
};

/** Strips a trailing " 1"/" 2" etc. and matches to a known template; falls back to Full Body. */
function templateFor(dayName: string): DaySlot[] {
  const key = dayName.toLowerCase().replace(/\s*\d+\s*$/, '').trim();
  return DAY_TEMPLATES[key] || DAY_TEMPLATES['full body'];
}

// Best-effort, conservative safety filter — NOT a medical judgment. Purely
// reduces obviously-provocative movements for a reported joint; the prompt
// separately tells the athlete to see a professional for real pain.
const INJURY_EXCLUSIONS: Record<string, RegExp> = {
  shoulder: /overhead press|military press|behind.the.neck|upright row|dip\b/i,
  knee: /jump|box jump|pistol squat|deep lunge|leg extension/i,
  back: /deadlift|good morning|bent.over row|romanian deadlift/i,
  wrist: /barbell curl|front squat|handstand/i,
  elbow: /skull.?crusher|close.grip|tricep extension/i,
};

function equipmentAllows(setting: EquipmentSetting | null, custom: string[], raw: string | null): boolean {
  const eq = (raw || '').toLowerCase();
  if (!setting || setting === 'commercial_gym') return true;
  if (setting === 'custom') {
    if (custom.length === 0) return true; // nothing specified — don't over-restrict
    return custom.some((c) => eq.includes(c.toLowerCase())) || eq.includes('body weight') || eq.includes('bodyweight');
  }
  if (setting === 'bodyweight') return eq.includes('body weight') || eq.includes('bodyweight') || eq === '' ;
  if (setting === 'dumbbells_only') return eq.includes('dumbbell') || eq.includes('body weight') || eq.includes('bodyweight');
  if (setting === 'home_gym') return !eq.includes('machine'); // everything but big multi-station machines
  return true;
}

function isExcluded(name: string, excluded: string[], injuryKeywords: string[]): boolean {
  const n = name.toLowerCase();
  if (excluded.some((e) => e && n.includes(e.toLowerCase()))) return true;
  for (const kw of injuryKeywords) {
    const pattern = INJURY_EXCLUSIONS[kw.toLowerCase()];
    if (pattern && pattern.test(name)) return true;
  }
  return false;
}

function prescriptionFor(goal: ProgramGoal | null, experience: ExperienceLevel, role: 'compound' | 'accessory') {
  const repsByGoal: Record<ProgramGoal, string> = {
    strength: '4-6', muscle_gain: '8-12', fat_loss: '12-15', general_fitness: '10-12', athletic_performance: '6-10',
  };
  const restByGoal: Record<ProgramGoal, number> = {
    strength: 180, muscle_gain: 90, fat_loss: 60, general_fitness: 90, athletic_performance: 120,
  };
  const g = goal ?? 'general_fitness';
  const sets = experience === 'beginner' ? 3 : role === 'compound' ? (experience === 'advanced' ? 5 : 4) : (experience === 'advanced' ? 4 : 3);
  return { sets, reps: repsByGoal[g], restSeconds: restByGoal[g] };
}

/**
 * Builds the full program from an already-fetched candidate pool. Deterministic
 * (same input -> same output): picks the first non-excluded, equipment-
 * compatible candidate per slot, preferring a liked exercise if one matches.
 * Skips (never invents) a slot with no valid candidate, recording it honestly
 * in `unfilledSlots`. Adds one bonus accessory slot per day for a priority
 * muscle group that appears in that day's template.
 */
export function generateProgram(input: GenerateProgramInput): GenerateProgramResult {
  const {
    dayNames, experience, goal, equipment, customEquipment = [],
    candidatesByGroup, excludedExerciseNames = [], likedExerciseNames = [],
    priorityMuscleGroups = [], injuryKeywords = [],
  } = input;

  const usedNames = new Set<string>(); // avoid repeating the same exercise twice in one program
  const unfilledSlots: string[] = [];

  const pick = (group: MuscleGroup): ExerciseCandidate | null => {
    const pool = candidatesByGroup[group] || [];
    const valid = pool.filter((c) =>
      !usedNames.has(c.name) &&
      equipmentAllows(equipment, customEquipment, c.equipment) &&
      !isExcluded(c.name, excludedExerciseNames, injuryKeywords),
    );
    if (valid.length === 0) return null;
    const liked = valid.find((c) => likedExerciseNames.some((l) => c.name.toLowerCase().includes(l.toLowerCase())));
    const chosen = liked || valid[0];
    usedNames.add(chosen.name);
    return chosen;
  };

  const days: GeneratedDay[] = dayNames.map((dayName) => {
    const slots = [...templateFor(dayName)];
    // Bonus accessory for a priority muscle group already relevant to this day.
    const priorityHit = slots.find((s) => priorityMuscleGroups.includes(s.group));
    if (priorityHit) slots.push({ group: priorityHit.group, role: 'accessory' });

    const exercises: GeneratedExercise[] = [];
    for (const slot of slots) {
      const candidate = pick(slot.group);
      if (!candidate) {
        unfilledSlots.push(`${dayName}: no available ${slot.group} exercise (equipment/exclusions filtered out all options)`);
        continue;
      }
      const { sets, reps, restSeconds } = prescriptionFor(goal, experience, slot.role);
      exercises.push({ name: candidate.name, muscleGroup: slot.group, sets, reps, restSeconds });
    }
    return { name: dayName, exercises };
  });

  return { days, unfilledSlots };
}

export interface DraftEditRequest {
  action: 'add' | 'remove' | 'replace' | 'move';
  exercise: string;
  replacement?: string;
  targetDay?: string;
}

/**
 * Applies a natural edit (replace, add, remove, move) to an in-memory draft program.
 * Returns a new array of GeneratedDays with the modification applied.
 */
export function applyDraftEdit(days: GeneratedDay[], edit: DraftEditRequest): GeneratedDay[] {
  const newDays = days.map((d) => ({
    name: d.name,
    exercises: [...d.exercises.map((e) => ({ ...e }))],
  }));

  const exLower = (edit.exercise || '').toLowerCase().trim();
  const replLower = (edit.replacement || '').toLowerCase().trim();
  const targetDayLower = (edit.targetDay || '').toLowerCase().trim();

  if (edit.action === 'replace') {
    newDays.forEach((day) => {
      day.exercises.forEach((ex, idx) => {
        if (ex.name.toLowerCase().includes(exLower)) {
          day.exercises[idx] = {
            ...ex,
            name: edit.replacement || ex.name,
          };
        }
      });
    });
  } else if (edit.action === 'remove') {
    newDays.forEach((day) => {
      day.exercises = day.exercises.filter((ex) => !ex.name.toLowerCase().includes(exLower));
    });
  } else if (edit.action === 'move') {
    let movedExercise: GeneratedExercise | null = null;
    newDays.forEach((day) => {
      const idx = day.exercises.findIndex((ex) => ex.name.toLowerCase().includes(exLower));
      if (idx !== -1) {
        movedExercise = day.exercises.splice(idx, 1)[0];
      }
    });
    if (movedExercise) {
      const target = newDays.find((d) => d.name.toLowerCase().includes(targetDayLower)) || newDays[0];
      target.exercises.push(movedExercise);
    }
  } else if (edit.action === 'add') {
    const target = newDays.find((d) => d.name.toLowerCase().includes(targetDayLower)) || newDays[0];
    const muscleGroup: MuscleGroup = exLower.includes('squat') || exLower.includes('lunge') ? 'quads'
      : exLower.includes('curl') ? 'biceps'
      : exLower.includes('fly') || exLower.includes('press') ? 'chest'
      : exLower.includes('raise') ? 'shoulders'
      : 'other' as any;
    target.exercises.push({
      name: edit.exercise,
      muscleGroup,
      sets: 3,
      reps: '8-12',
      restSeconds: 90,
    });
  }

  return newDays;
}

