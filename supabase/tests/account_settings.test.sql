\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000901', 'authenticated', 'authenticated', 'account-settings-owner@akiba.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000902', 'authenticated', 'authenticated', 'account-settings-other@akiba.test', '', now(), now(), now())
on conflict (id) do nothing;

insert into public.akiba_user_settings (user_id, theme)
values
  ('00000000-0000-0000-0000-000000000901', 'dark'),
  ('00000000-0000-0000-0000-000000000902', 'light')
on conflict (user_id) do update set theme = excluded.theme;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000901', true);

do $test$
declare own_count integer; other_count integer; own_theme text;
begin
  select count(*), max(theme) into own_count, own_theme
  from public.akiba_user_settings
  where user_id = '00000000-0000-0000-0000-000000000901';
  select count(*) into other_count
  from public.akiba_user_settings
  where user_id = '00000000-0000-0000-0000-000000000902';
  if own_count <> 1 or own_theme <> 'dark' or other_count <> 0 then
    raise exception 'Account settings owner-only RLS failed';
  end if;

  update public.akiba_user_settings
  set theme = 'system'
  where user_id = '00000000-0000-0000-0000-000000000902';
  if exists (
    select 1 from public.akiba_user_settings
    where user_id = '00000000-0000-0000-0000-000000000902' and theme <> 'light'
  ) then
    raise exception 'A user updated another account theme';
  end if;
end;
$test$;

rollback;
