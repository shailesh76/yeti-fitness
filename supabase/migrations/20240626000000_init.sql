-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create Profiles Table
create type activity_level_enum as enum ('SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE');
create type goal_enum as enum ('LOSE_FAT', 'BUILD_MUSCLE', 'MAINTAIN');

create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  age integer,
  gender text,
  height_cm numeric,
  weight_kg numeric,
  body_fat_percent numeric,
  activity_level activity_level_enum,
  goal goal_enum,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Policies for profiles
create policy "Users can view their own profile."
  on profiles for select
  using ( auth.uid() = id );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 2. Create Exercises Table
create table public.exercises (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  muscle_group text,
  instructions text,
  gif_url text,
  video_url text
);

-- Enable RLS on exercises (public read)
alter table public.exercises enable row level security;

create policy "Exercises are viewable by everyone."
  on exercises for select
  using ( true );

-- 3. Create Workout Plans Table
create table public.workout_plans (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references public.profiles(id),
  user_id uuid references public.profiles(id),
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.workout_plans enable row level security;

create policy "Users can view their own workout plans."
  on workout_plans for select
  using ( auth.uid() = user_id or auth.uid() = coach_id );

-- 4. Create Workout Logs Table
create table public.workout_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  workout_plan_id uuid references public.workout_plans(id),
  started_at timestamp with time zone not null,
  completed_at timestamp with time zone,
  total_volume integer
);

alter table public.workout_logs enable row level security;

create policy "Users can view their own workout logs."
  on workout_logs for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own workout logs."
  on workout_logs for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own workout logs."
  on workout_logs for update
  using ( auth.uid() = user_id );

