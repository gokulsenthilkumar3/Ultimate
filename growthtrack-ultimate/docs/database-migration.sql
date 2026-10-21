-- GrowthTrack Ultimate database migration scaffold
-- Target: Supabase / Postgres

create extension if not exists "pgcrypto";

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  display_name text,
  email text,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists user_profiles_updated_at_idx on public.user_profiles (updated_at desc);

alter table public.user_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'allow_user_read_own_profile'
  ) then
    create policy allow_user_read_own_profile
      on public.user_profiles
      for select
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'allow_user_write_own_profile'
  ) then
    create policy allow_user_write_own_profile
      on public.user_profiles
      for all
      using (true)
      with check (true);
  end if;
end $$;

-- Application notes:
-- - `data` stores the normalized app state for each user.
-- - `user_id` is the stable profile key used by the client.
-- - Replace the open policies with authenticated-user filters once real auth is enabled.
