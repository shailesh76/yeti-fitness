-- Add missing RLS policies for inserting, updating, and deleting workout plans
create policy "Users can insert their own workout plans."
  on public.workout_plans for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own workout plans."
  on public.workout_plans for update
  using ( auth.uid() = user_id );

create policy "Users can delete their own workout plans."
  on public.workout_plans for delete
  using ( auth.uid() = user_id );
