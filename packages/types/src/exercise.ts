export type ExerciseCategory =
  | 'strength'
  | 'cardio'
  | 'stretching'
  | 'plyometrics'
  | 'powerlifting'
  | 'olympic_weightlifting'
  | 'calisthenics'
  | 'strongman'
  | 'mobility'
  | string;

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'expert' | string;

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'lunge'
  | 'carry'
  | 'rotation'
  | 'isolation'
  | string;

export type MuscleRole = 'primary' | 'secondary' | 'stabilizer';

export type MediaType = 'video' | 'gif' | 'thumbnail' | 'image';
export type FileFormat = 'mp4' | 'gif' | 'webp' | 'jpg' | 'png';

export interface ExerciseMedia {
  id: string;
  exercise_id: string;
  media_type: MediaType;
  file_format: FileFormat;
  r2_bucket: string;
  r2_key: string;
  url?: string | null;
  thumbnail_url?: string | null;
  is_primary?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ExerciseAlias {
  id: string;
  exercise_id: string;
  alias: string;
  created_at?: string;
}

export interface ExerciseTag {
  id: string;
  exercise_id: string;
  tag: string;
  tag_type?: string; // 'ai' | 'functional' | 'hypertrophy'
  created_at?: string;
}

export interface ExerciseMuscle {
  id: string;
  exercise_id: string;
  muscle: string;
  role: MuscleRole;
  created_at?: string;
}

export interface ExerciseAlternative {
  id: string;
  exercise_id: string;
  alternative_exercise_id: string;
  reason?: string | null;
  created_at?: string;
  alternative_exercise?: Exercise;
}

export interface ExerciseProgression {
  id: string;
  exercise_id: string;
  progression_exercise_id: string;
  difficulty_delta?: number;
  created_at?: string;
  progression_exercise?: Exercise;
}

export interface ExerciseRegression {
  id: string;
  exercise_id: string;
  regression_exercise_id: string;
  difficulty_delta?: number;
  created_at?: string;
  regression_exercise?: Exercise;
}

export interface Exercise {
  id: string;
  slug: string;
  name: string;
  category?: ExerciseCategory | null;
  equipment?: string | null;
  primary_muscle?: string | null;
  target_muscle?: string | null;
  secondary_muscles?: string[] | null;
  movement_pattern?: MovementPattern | null;
  difficulty?: ExerciseDifficulty | null;
  unilateral?: boolean;
  setup_instructions?: string | null;
  execution_instructions?: string | null;
  breathing?: string | null;
  coaching_cues?: string[] | null;
  common_mistakes?: string[] | null;
  safety_notes?: string | null;
  default_sets?: number;
  default_reps?: number;
  tempo?: string | null;
  instructions?: string | null;
  gif_url?: string | null;
  video_url?: string | null;
  media_type?: string | null;
  thumbnail_url?: string | null;
  source?: string | null;
  source_id?: string | null;
  is_public?: boolean;
  created_by_coach_id?: string | null;
  default_rest_period_sec?: number;
  source_type?: string | null;
  license?: string | null;
  recommended_rest_seconds?: number | null;
  hypertrophy_reps?: string | null;
  strength_reps?: string | null;
  endurance_reps?: string | null;
  media_status?: string | null;
  media_notes?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;

  // Joined relations
  media?: ExerciseMedia[];
  aliases?: ExerciseAlias[];
  tags?: ExerciseTag[];
  muscles?: ExerciseMuscle[];
  alternatives?: ExerciseAlternative[];
  progressions?: ExerciseProgression[];
  regressions?: ExerciseRegression[];
}

export interface ExerciseSearchFilters {
  query?: string;
  category?: string;
  equipment?: string;
  muscle?: string;
  movement_pattern?: MovementPattern;
  tag?: string;
  difficulty?: ExerciseDifficulty;
  source_type?: string;
  limit?: number;
  offset?: number;
}

export interface ExerciseSearchResult {
  exercises: Exercise[];
  total: number;
  limit: number;
  offset: number;
}

export interface ExerciseImportItem {
  exercise_id?: string;
  id?: string;
  slug?: string;
  name: string;
  category?: string;
  equipment?: string;
  primary_muscle?: string;
  target_muscle?: string;
  secondary_muscles?: string[];
  movement_pattern?: string;
  difficulty?: string;
  unilateral?: boolean;
  setup_instructions?: string;
  execution_instructions?: string;
  breathing?: string;
  coaching_cues?: string[];
  common_mistakes?: string[];
  safety_notes?: string;
  default_sets?: number;
  default_reps?: number;
  tempo?: string;
  source_type?: string;
  license?: string;
  recommended_rest_seconds?: number;
  hypertrophy_reps?: string;
  strength_reps?: string;
  endurance_reps?: string;
  media_status?: string;
  media_notes?: string;
  metadata?: Record<string, any>;
  search_aliases?: string[];
  ai_tags?: string[];
  muscles?: Array<{ muscle: string; role: MuscleRole }>;
  alternatives?: Array<any>;
  progressions?: Array<any>;
  regressions?: Array<any>;
  media?: Array<{
    media_type: MediaType;
    file_format: FileFormat;
    r2_bucket?: string;
    r2_key: string;
    url?: string;
    thumbnail_url?: string;
    is_primary?: boolean;
    media_status?: string;
    media_notes?: string;
  }>;
}
