create table public.workout_plan_exercises (
  id uuid default uuid_generate_v4() primary key,
  workout_plan_id uuid references public.workout_plans(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  sets integer not null default 3,
  reps integer not null default 10,
  rest_seconds integer not null default 60,
  order_index integer not null default 0
);

alter table public.workout_plan_exercises enable row level security;

-- Users can view exercises for workout plans they have access to
create policy "Users can view exercises of their plans."
  on workout_plan_exercises for select
  using (
    exists (
      select 1 from workout_plans wp
      where wp.id = workout_plan_exercises.workout_plan_id
      and (wp.user_id = auth.uid() or wp.coach_id = auth.uid())
    )
  );

-- Users can insert exercises to their own plans
create policy "Users can insert exercises to their plans."
  on workout_plan_exercises for insert
  with check (
    exists (
      select 1 from workout_plans wp
      where wp.id = workout_plan_exercises.workout_plan_id
      and (wp.user_id = auth.uid() or wp.coach_id = auth.uid())
    )
  );

-- Users can delete exercises from their own plans
create policy "Users can delete exercises from their plans."
  on workout_plan_exercises for delete
  using (
    exists (
      select 1 from workout_plans wp
      where wp.id = workout_plan_exercises.workout_plan_id
      and (wp.user_id = auth.uid() or wp.coach_id = auth.uid())
    )
  );
