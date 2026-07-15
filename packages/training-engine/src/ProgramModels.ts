export type MuscleGroup = 'CHEST' | 'BACK' | 'LEGS' | 'SHOULDERS' | 'ARMS' | 'CORE';
export type ProgramFocus = 'HYPERTROPHY' | 'STRENGTH' | 'FAT_LOSS' | 'GENERAL';

export interface Set {
  id: string;
  reps: number;
  weight: number;
  rpe?: number;
  isWarmup?: boolean;
  isDropSet?: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: MuscleGroup[];
  sets: Set[];
  notes?: string;
}

export interface Workout {
  id: string;
  name: string;
  exercises: Exercise[];
}

export interface TrainingDay {
  id: string;
  name: string;
  workout: Workout;
}

export interface ProgramWeek {
  id: string;
  orderIndex: number;
  days: TrainingDay[];
}

export interface ProgramPhase {
  id: string;
  name: string;
  weeks: ProgramWeek[];
}

export interface Program {
  id: string;
  name: string;
  focus: ProgramFocus;
  phases: ProgramPhase[];
}
