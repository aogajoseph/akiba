-- User profile MVP: location storage and independent privacy preferences.
-- Sensitive values remain owner-readable only. Cross-user disclosure must go
-- through a future server-side projection that enforces these preferences.

alter table public.akiba_user_contacts
  add column if not exists location text;

alter table public.akiba_user_contacts
  add constraint akiba_location_length
    check (location is null or char_length(btrim(location)) between 1 and 120);

grant insert (user_id, phone_number, location, updated_at)
  on public.akiba_user_contacts to authenticated;
grant update (phone_number, location, updated_at)
  on public.akiba_user_contacts to authenticated;

create table if not exists public.akiba_user_privacy_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_visibility text not null default 'only_me',
  phone_visibility text not null default 'only_me',
  location_visibility text not null default 'only_me',
  updated_at timestamptz not null default now(),
  constraint akiba_email_visibility_valid
    check (email_visibility in ('only_me', 'group_members', 'all_akiba_users')),
  constraint akiba_phone_visibility_valid
    check (phone_visibility in ('only_me', 'group_members', 'all_akiba_users')),
  constraint akiba_location_visibility_valid
    check (location_visibility in ('only_me', 'group_members', 'all_akiba_users'))
);

alter table public.akiba_user_privacy_settings enable row level security;

create policy "users read own profile privacy settings"
  on public.akiba_user_privacy_settings
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users create own profile privacy settings"
  on public.akiba_user_privacy_settings
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "users update own profile privacy settings"
  on public.akiba_user_privacy_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.akiba_user_privacy_settings from anon, authenticated;
grant select, insert, update on public.akiba_user_privacy_settings to authenticated;
