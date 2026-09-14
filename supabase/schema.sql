create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, date_of_birth text, gender text, mother_tongue text, languages text,
  education text, job text, height text, weight text, religion text, originally_from text,
  residence text, family_details text, hobbies text, phone text, marital_status text,
  partner_preference text, raw_text text, status text not null default 'review'
    check (status in ('review','shortlisted','contacted','not_interested')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.profile_photos (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique, file_name text, created_at timestamptz not null default now()
);

create table public.profile_comments (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null, created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profile_photos enable row level security;
alter table public.profile_comments enable row level security;

create policy "owners manage profiles" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owners manage photos" on public.profile_photos for all using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())) with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));
create policy "owners manage comments" on public.profile_comments for all using (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid())) with check (exists (select 1 from public.profiles p where p.id = profile_id and p.user_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy "owners upload profile photos" on storage.objects for insert to authenticated with check (bucket_id = 'profile-photos' and exists (select 1 from public.profiles p where p.id::text = (storage.foldername(name))[1] and p.user_id = auth.uid()));
create policy "owners read profile photos" on storage.objects for select to authenticated using (bucket_id = 'profile-photos' and exists (select 1 from public.profiles p where p.id::text = (storage.foldername(name))[1] and p.user_id = auth.uid()));
create policy "owners delete profile photos" on storage.objects for delete to authenticated using (bucket_id = 'profile-photos' and exists (select 1 from public.profiles p where p.id::text = (storage.foldername(name))[1] and p.user_id = auth.uid()));
