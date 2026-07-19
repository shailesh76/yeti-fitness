-- Phase 2 Database Schema Migration
-- Preserving existing tables, creating new ones for advanced features

-- Roles and Permissions
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid REFERENCES roles(id) ON DELETE CASCADE,
  resource text NOT NULL,
  action text NOT NULL
);

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id),
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

-- Coach Relationship
CREATE TABLE IF NOT EXISTS coach_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  bio text,
  specialties text[]
);

CREATE TABLE IF NOT EXISTS athlete_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  goals text[]
);

CREATE TABLE IF NOT EXISTS coach_athletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES coach_profiles(id) ON DELETE CASCADE,
  athlete_id uuid REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coach_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES coach_profiles(id) ON DELETE CASCADE,
  athlete_id uuid REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Training System
CREATE TABLE IF NOT EXISTS exercise_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS muscle_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES exercise_categories(id),
  equipment_id uuid REFERENCES equipment(id)
);

CREATE TABLE IF NOT EXISTS exercise_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  type text NOT NULL -- 'video' | 'image'
);

CREATE TABLE IF NOT EXISTS exercise_variations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE,
  variation_exercise_id uuid REFERENCES exercises(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid REFERENCES coach_profiles(id),
  name text NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS program_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid REFERENCES programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index integer NOT NULL
);

CREATE TABLE IF NOT EXISTS program_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id uuid REFERENCES program_phases(id) ON DELETE CASCADE,
  order_index integer NOT NULL
);

CREATE TABLE IF NOT EXISTS program_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid REFERENCES program_weeks(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index integer NOT NULL
);

CREATE TABLE IF NOT EXISTS workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid REFERENCES program_days(id) ON DELETE CASCADE,
  name text NOT NULL
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercises(id),
  order_index integer NOT NULL,
  target_sets integer,
  target_reps text
);

CREATE TABLE IF NOT EXISTS exercise_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_exercise_id uuid REFERENCES workout_exercises(id) ON DELETE CASCADE,
  reps integer,
  weight numeric,
  rpe numeric
);

CREATE TABLE IF NOT EXISTS workout_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  workout_id uuid REFERENCES workouts(id),
  completed_at timestamptz DEFAULT now()
);

-- Nutrition
CREATE TABLE IF NOT EXISTS foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  barcode text UNIQUE
);

CREATE TABLE IF NOT EXISTS food_nutrients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id uuid REFERENCES foods(id) ON DELETE CASCADE,
  calories numeric NOT NULL,
  protein numeric NOT NULL,
  carbs numeric NOT NULL,
  fat numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  instructions text
);

CREATE TABLE IF NOT EXISTS meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  food_id uuid REFERENCES foods(id),
  recipe_id uuid REFERENCES recipes(id),
  servings numeric NOT NULL,
  logged_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nutrition_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  target_calories numeric,
  target_protein numeric,
  target_carbs numeric,
  target_fat numeric,
  active_from timestamptz DEFAULT now()
);

-- AI System
CREATE TABLE IF NOT EXISTS ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL, -- 'user' | 'assistant'
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id uuid REFERENCES athlete_profiles(id) ON DELETE CASCADE,
  memory_key text NOT NULL,
  memory_value text NOT NULL
);

-- Subscription
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  tier text NOT NULL,
  status text NOT NULL,
  valid_until timestamptz
);

CREATE TABLE IF NOT EXISTS entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  feature_key text NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  currency text NOT NULL,
  payment_date timestamptz DEFAULT now()
);
