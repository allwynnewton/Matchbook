-- Fix for: "new row violates row-level security policy" (saving profiles OR photos).
-- Recreates every RLS policy the app needs — the three tables AND storage — without
-- recreating the tables, so it is safe to run on an existing database any number of
-- times. Paste this whole file into Supabase -> SQL Editor -> Run.

-- 1. Make sure RLS is enabled on the tables.
alter table public.profiles enable row level security;
alter table public.profile_photos enable row level security;
alter table public.profile_comments enable row level security;

-- 2. Table policies (owner-only access).
drop policy if exists "owners manage profiles" on public.profiles;
drop policy if exists "owners manage photos" on public.profile_photos;
drop policy if exists "owners manage comments" on public.profile_comments;

create policy "owners manage profiles" on public.profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owners manage photos" on public.profile_photos for all
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

create policy "owners manage comments" on public.profile_comments for all
  using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

-- 3. Make sure the private bucket exists.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

-- 4. Storage policies. The folder (first path segment) is the profile id, so a user
--    may only touch photos of profiles they own.
drop policy if exists "owners upload profile photos" on storage.objects;
drop policy if exists "owners read profile photos" on storage.objects;
drop policy if exists "owners delete profile photos" on storage.objects;

create policy "owners upload profile photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and exists (
    select 1 from public.profiles p where p.id::text = (storage.foldername(name))[1] and p.user_id = auth.uid()));

create policy "owners read profile photos" on storage.objects for select to authenticated
  using (bucket_id = 'profile-photos' and exists (
    select 1 from public.profiles p where p.id::text = (storage.foldername(name))[1] and p.user_id = auth.uid()));

create policy "owners delete profile photos" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos' and exists (
    select 1 from public.profiles p where p.id::text = (storage.foldername(name))[1] and p.user_id = auth.uid()));

-- 5. Verify — should return 6 rows: 3 on public tables + 3 on storage.objects.
select schemaname, tablename, policyname, cmd
from pg_policies
where (schemaname = 'public' and tablename in ('profiles','profile_photos','profile_comments'))
   or (schemaname = 'storage' and tablename = 'objects' and policyname like 'owners %profile photos')
order by schemaname, tablename, policyname;
