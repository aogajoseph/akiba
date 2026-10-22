-- Profile onboarding. Run once in the dedicated Akiba Supabase project.
create table if not exists public.akiba_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint akiba_username_format check (username ~ '^[a-z][a-z0-9_]{2,19}$')
);
alter table public.akiba_profiles enable row level security;
create policy "profiles readable by authenticated users" on public.akiba_profiles for select to authenticated using (true);
create policy "users create own profile" on public.akiba_profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "users update own profile" on public.akiba_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update on public.akiba_profiles to authenticated;
revoke all on public.akiba_profiles from anon;
-- Atomic unique constraint, not a client-side availability check, is authoritative.
