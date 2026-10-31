-- Extend Akiba profiles with public identity fields and isolate private contact data.
alter table public.akiba_profiles
  add column if not exists display_name text,
  add column if not exists avatar_path text,
  add column if not exists bio text;

alter table public.akiba_profiles
  add constraint akiba_display_name_length
    check (display_name is null or char_length(btrim(display_name)) between 1 and 60),
  add constraint akiba_bio_length
    check (bio is null or char_length(bio) <= 160),
  add constraint akiba_avatar_path_user_scoped
    check (avatar_path is null or split_part(avatar_path, '/', 1) = user_id::text);

create table if not exists public.akiba_user_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_number text,
  phone_verified_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint akiba_phone_e164_format
    check (phone_number is null or phone_number ~ '^\+[1-9][0-9]{7,14}$')
);

alter table public.akiba_user_contacts enable row level security;

create policy "users read own contact details"
  on public.akiba_user_contacts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users create own contact details"
  on public.akiba_user_contacts for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "users update own contact details"
  on public.akiba_user_contacts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "users delete own contact details"
  on public.akiba_user_contacts for delete to authenticated
  using (user_id = (select auth.uid()));

-- The authenticated role must not be able to set or forge phone verification state.
grant select, delete on public.akiba_user_contacts to authenticated;
grant insert (user_id, phone_number, updated_at) on public.akiba_user_contacts to authenticated;
grant update (phone_number, updated_at) on public.akiba_user_contacts to authenticated;

create or replace function public.akiba_clear_phone_verification_on_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $
begin
  if old.phone_number is distinct from new.phone_number then
    new.phone_verified_at := null;
  end if;
  return new;
end;
$;

revoke all on function public.akiba_clear_phone_verification_on_change() from public, anon, authenticated;

create trigger akiba_clear_phone_verification_on_change
before update of phone_number on public.akiba_user_contacts
for each row execute function public.akiba_clear_phone_verification_on_change();

revoke all on public.akiba_user_contacts from anon;

-- Avatars are intended to be visible wherever a user's public identity appears.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "users update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "users delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
