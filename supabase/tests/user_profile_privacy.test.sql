\\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000801', 'authenticated', 'authenticated', 'profile-owner@akiba.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000802', 'authenticated', 'authenticated', 'profile-other@akiba.test', '', now(), now(), now())
on conflict (id) do nothing;

insert into public.akiba_profiles (user_id, username, display_name)
values
  ('00000000-0000-0000-0000-000000000801', 'profile_owner_801', 'Profile Owner'),
  ('00000000-0000-0000-0000-000000000802', 'profile_other_802', 'Other Person')
on conflict (user_id) do nothing;

insert into public.akiba_user_contacts (user_id, phone_number, location)
values
  ('00000000-0000-0000-0000-000000000801', '+254700000801', 'Nairobi, Kenya'),
  ('00000000-0000-0000-0000-000000000802', '+254700000802', 'Mombasa, Kenya')
on conflict (user_id) do update
set phone_number = excluded.phone_number, location = excluded.location;

insert into public.akiba_user_privacy_settings (user_id)
values
  ('00000000-0000-0000-0000-000000000801'),
  ('00000000-0000-0000-0000-000000000802')
on conflict (user_id) do nothing;

-- Authenticated users can read and update their own contact and privacy records only.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000801', true);

do $test$
declare own_contacts integer; other_contacts integer; own_privacy integer; other_privacy integer; affected integer;
begin
  select count(*) into own_contacts from public.akiba_user_contacts
  where user_id = '00000000-0000-0000-0000-000000000801';
  select count(*) into other_contacts from public.akiba_user_contacts
  where user_id = '00000000-0000-0000-0000-000000000802';
  select count(*) into own_privacy from public.akiba_user_privacy_settings
  where user_id = '00000000-0000-0000-0000-000000000801';
  select count(*) into other_privacy from public.akiba_user_privacy_settings
  where user_id = '00000000-0000-0000-0000-000000000802';

  if own_contacts <> 1 or other_contacts <> 0 then
    raise exception 'Contact RLS failed: owner %, other %', own_contacts, other_contacts;
  end if;
  if own_privacy <> 1 or other_privacy <> 0 then
    raise exception 'Privacy RLS failed: owner %, other %', own_privacy, other_privacy;
  end if;

  update public.akiba_user_contacts
  set location = 'Nairobi County, Kenya'
  where user_id = '00000000-0000-0000-0000-000000000802';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Owner updated another user contact record'; end if;

  update public.akiba_user_privacy_settings
  set phone_visibility = 'all_akiba_users'
  where user_id = '00000000-0000-0000-0000-000000000802';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Owner updated another user privacy record'; end if;

  update public.akiba_user_contacts
  set location = 'Nairobi County, Kenya'
  where user_id = '00000000-0000-0000-0000-000000000801';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner could not update own location'; end if;

  update public.akiba_user_privacy_settings
  set phone_visibility = 'group_members'
  where user_id = '00000000-0000-0000-0000-000000000801';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner could not update own privacy preferences'; end if;
end;
$test$;

-- Users cannot forge phone verification state through the Data API.
do $test$
begin
  if has_column_privilege('authenticated', 'public.akiba_user_contacts', 'phone_verified_at', 'UPDATE') then
    raise exception 'Authenticated users can modify phone_verified_at';
  end if;
end;
$test$;

rollback;
