-- =========================================================
-- MATCHBOOK STORAGE RLS FIX
-- Keeps RLS enabled and supports the current upload path:
-- profile-id/photo-name.jpg
-- =========================================================

-- 1. Create a secure helper function.
-- SECURITY DEFINER allows Storage policies to verify profile ownership
-- without being blocked by the profiles table's own RLS policy.

create or replace function public.user_owns_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_profile_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.user_owns_profile(uuid) from public;
grant execute on function public.user_owns_profile(uuid) to authenticated;


-- 2. Keep RLS enabled.

alter table storage.objects enable row level security;


-- 3. Remove the existing Matchbook storage policies.

drop policy if exists "owners upload profile photos"
on storage.objects;

drop policy if exists "owners read profile photos"
on storage.objects;

drop policy if exists "owners delete profile photos"
on storage.objects;

drop policy if exists "owners update profile photos"
on storage.objects;


-- 4. Allow authenticated owners to upload photos.

create policy "owners upload profile photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-photos'
  and public.user_owns_profile(
    ((storage.foldername(name))[1])::uuid
  )
);


-- 5. Allow owners to view and create signed URLs.

create policy "owners read profile photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-photos'
  and public.user_owns_profile(
    ((storage.foldername(name))[1])::uuid
  )
);


-- 6. Allow owners to delete photos.

create policy "owners delete profile photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-photos'
  and public.user_owns_profile(
    ((storage.foldername(name))[1])::uuid
  )
);


-- 7. Allow owners to update/replace photos if required.

create policy "owners update profile photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-photos'
  and public.user_owns_profile(
    ((storage.foldername(name))[1])::uuid
  )
)
with check (
  bucket_id = 'profile-photos'
  and public.user_owns_profile(
    ((storage.foldername(name))[1])::uuid
  )
);


-- 8. Verify the policies.

select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'owners %profile photos'
order by policyname;