-- Migration: Cloudflare R2 Media Storage & Progress Photos Table
-- Date: 2024-06-30

-- 1. Create progress_photos table
create table public.progress_photos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  photo_key text not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.progress_photos enable row level security;

-- Policies for progress_photos
create policy "Users can view their own progress photos"
  on progress_photos for select
  using ( auth.uid() = user_id );

create policy "Coaches can view their clients' progress photos"
  on progress_photos for select
  using (
    exists (
      select 1 from public.workout_plans
      where coach_id = auth.uid() and user_id = progress_photos.user_id
    )
  );

create policy "Users can insert their own progress photos"
  on progress_photos for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete their own progress photos"
  on progress_photos for delete
  using ( auth.uid() = user_id );

-- 2. Update exercises table columns or verify consistency
-- Exercises table holds gif_url and video_url. We will keep these but support R2 URLs.
-- No schema change is strictly needed for exercises unless we want to track the R2 key,
-- but the design plan stores the direct public R2 URL in the `gif_url` and `video_url` columns
-- or updates them dynamically. Let's document this in the migration comments.
comment on column public.exercises.gif_url is 'Direct public URL or R2 CDN URL for the exercise guide GIF';
comment on column public.exercises.video_url is 'Direct public URL or R2 CDN URL for the exercise guide video';
