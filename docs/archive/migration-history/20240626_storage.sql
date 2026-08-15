-- 1. Create a public storage bucket for workout media (GIFs and videos)
insert into storage.buckets (id, name, public)
values ('workout-media', 'workout-media', true)
on conflict (id) do nothing;

-- 2. Allow public access to read files in the bucket
drop policy if exists "Public Access to Workout Media" on storage.objects;
create policy "Public Access to Workout Media"
  on storage.objects for select
  using ( bucket_id = 'workout-media' );

-- 3. Restrict upload/delete permissions to authenticated users
drop policy if exists "Authenticated users can upload workout media" on storage.objects;
create policy "Authenticated users can upload workout media"
  on storage.objects for insert
  with check ( bucket_id = 'workout-media' and auth.role() = 'authenticated' );

drop policy if exists "Authenticated users can delete workout media" on storage.objects;
create policy "Authenticated users can delete workout media"
  on storage.objects for delete
  using ( bucket_id = 'workout-media' and auth.role() = 'authenticated' );
