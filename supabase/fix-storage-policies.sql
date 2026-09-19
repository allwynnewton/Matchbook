-- Fix for: "new row violates row-level security policy" when uploading photos.
-- Cause: the profile-photos bucket exists but its Storage RLS policies are missing
-- (e.g. the bucket was created from the dashboard, or an older schema was run).
-- Safe to run multiple times. Paste this whole file into Supabase → SQL Editor → Run.

-- 1. Make sure the private bucket exists.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

-- 2. (Re)create the owner-only Storage policies. The folder (first path segment)
--    is the profile id, so a user may only touch photos of profiles they own.
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

-- 3. Verify — this should return the three policies above.
select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'owners %profile photos'
order by policyname;
