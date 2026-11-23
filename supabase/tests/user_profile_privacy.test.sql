\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000801', 'authenticated', 'authenticated', 'profile-owner@akiba.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000802', 'authenticated', 'authenticated', 'profile-other@akiba.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000803', 'authenticated', 'authenticated', 'profile-unrelated@akiba.test', '', now(), now(), now())
on conflict (id) do nothing;

insert into public.akiba_profiles (user_id, username, display_name)
values
  ('00000000-0000-0000-0000-000000000801', 'profile_owner_801', 'Profile Owner'),
  ('00000000-0000-0000-0000-000000000802', 'profile_other_802', 'Other Person'),
  ('00000000-0000-0000-0000-000000000803', 'profile_else_803', 'Unrelated Person')
on conflict (user_id) do nothing;

insert into public.akiba_user_contacts (user_id, phone_number, location)
values
  ('00000000-0000-0000-0000-000000000801', '+254700000801', 'Nairobi, Kenya'),
  ('00000000-0000-0000-0000-000000000802', '+254700000802', 'Mombasa, Kenya'),
  ('00000000-0000-0000-0000-000000000803', '+254700000803', 'Kisumu, Kenya')
on conflict (user_id) do update
set phone_number = excluded.phone_number, location = excluded.location;

insert into public.akiba_user_privacy_settings (user_id)
values
  ('00000000-0000-0000-0000-000000000801'),
  ('00000000-0000-0000-0000-000000000802'),
  ('00000000-0000-0000-0000-000000000803')
on conflict (user_id) do nothing;

-- A shared active group is required for group_members visibility.
insert into public.akiba_groups (id, name, purpose, group_type, currency_code, created_by)
values ('00000000-0000-0000-0000-000000000880', 'Profile privacy test group', 'goal', 'shared_savings', 'KES', '00000000-0000-0000-0000-000000000801')
on conflict (id) do nothing;

insert into public.akiba_group_memberships (id, group_id, user_id, role, status, joined_at, ended_at)
values
  ('00000000-0000-0000-0000-000000000881', '00000000-0000-0000-0000-000000000880', '00000000-0000-0000-0000-000000000801', 'group_creator', 'active', now(), null),
  ('00000000-0000-0000-0000-000000000882', '00000000-0000-0000-0000-000000000880', '00000000-0000-0000-0000-000000000802', 'member', 'active', now(), null)
on conflict (id) do nothing;

update public.akiba_user_privacy_settings
set email_visibility = 'group_members',
    phone_visibility = 'group_members',
    location_visibility = 'group_members'
where user_id = '00000000-0000-0000-0000-000000000801';

update public.akiba_user_privacy_settings
set email_visibility = 'all_akiba_users',
    phone_visibility = 'group_members',
    location_visibility = 'only_me'
where user_id = '00000000-0000-0000-0000-000000000802';

update public.akiba_user_privacy_settings
set email_visibility = 'group_members',
    phone_visibility = 'group_members',
    location_visibility = 'group_members'
where user_id = '00000000-0000-0000-0000-000000000803';

-- Authenticated users can read and update their own contact and privacy records only.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000801', true);

do $test$
declare own_contacts integer; other_contacts integer; own_privacy integer; other_privacy integer; affected integer; public_profile record; unrelated_profile record; preview_profile record;
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

  select * into public_profile
  from public.akiba_get_profile_by_username('profile_other_802');
  if not public_profile.email_visible or public_profile.email_address <> 'profile-other@akiba.test' then
    raise exception 'All Akiba users email visibility was not enforced';
  end if;
  if not public_profile.phone_visible or public_profile.phone_number <> '+254700000802' then
    raise exception 'Shared group phone visibility was not enforced';
  end if;
  if public_profile.location_visible or public_profile.location is not null then
    raise exception 'Private location was disclosed';
  end if;

  select * into unrelated_profile
  from public.akiba_get_profile_by_username('profile_else_803');
  if unrelated_profile.email_visible or unrelated_profile.email_address is not null
     or unrelated_profile.phone_visible or unrelated_profile.phone_number is not null
     or unrelated_profile.location_visible or unrelated_profile.location is not null then
    raise exception 'Group-only contact details were disclosed to a non-member';
  end if;

  begin
    perform * from public.akiba_get_profile_by_username('profile_other_802', true);
    raise exception 'A viewer previewed another member profile';
  exception when insufficient_privilege then
    null;
  end;

  select * into preview_profile
  from public.akiba_get_profile_by_username('profile_owner_801', true);
  if not preview_profile.phone_visible or preview_profile.phone_number <> '+254700000801' then
    raise exception 'Owner preview did not model group-member visibility';
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
  if has_function_privilege('anon', 'public.akiba_get_profile_by_username(text,boolean)', 'EXECUTE') then
    raise exception 'Anonymous users can execute the profile projection';
  end if;
  if not has_function_privilege('authenticated', 'public.akiba_get_profile_by_username(text,boolean)', 'EXECUTE') then
    raise exception 'Authenticated users cannot execute the profile projection';
  end if;
  if has_column_privilege('authenticated', 'public.akiba_user_contacts', 'phone_verified_at', 'UPDATE') then
    raise exception 'Authenticated users can modify phone_verified_at';
  end if;
end;
$test$;

rollback;
