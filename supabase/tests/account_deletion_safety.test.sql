\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000910', 'authenticated', 'authenticated', 'account-delete-owner@akiba.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000911', 'authenticated', 'authenticated', 'account-delete-member@akiba.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000912', 'authenticated', 'authenticated', 'account-delete-admin@akiba.test', '', now(), now(), now())
on conflict (id) do nothing;

-- Create a group through the authenticated Creator path so its immutable
-- Creator membership is installed by the normal database trigger.
insert into public.akiba_profiles (user_id, username, display_name)
values ('00000000-0000-0000-0000-000000000910', 'delete_owner_910', 'Deletion Owner')
on conflict (user_id) do nothing;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000910', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000910"}', true);
set local role authenticated;
insert into public.akiba_groups (id, name, purpose, group_type, currency_code, created_by)
values ('00000000-0000-0000-0000-000000000920', 'Account deletion gate group', 'goal', 'shared_savings', 'KES', '00000000-0000-0000-0000-000000000910')
on conflict (id) do nothing;
insert into public.akiba_groups (id, name, purpose, group_type, currency_code, created_by)
values ('00000000-0000-0000-0000-000000000930', 'Deactivated admin stepdown test', 'goal', 'shared_savings', 'KES', '00000000-0000-0000-0000-000000000910')
on conflict (id) do nothing;
reset role;

-- An Admin must be able to step down even after the Creator deactivates a
-- group, otherwise account deletion would be blocked for the full retention.
insert into public.akiba_group_memberships (group_id, user_id, role, status)
values ('00000000-0000-0000-0000-000000000930', '00000000-0000-0000-0000-000000000912', 'member', 'active')
on conflict (group_id, user_id) do nothing;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000910', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000910"}', true);
set local role authenticated;
select public.akiba_set_group_admin('00000000-0000-0000-0000-000000000930', '00000000-0000-0000-0000-000000000912', 'appoint');
select public.akiba_deactivate_group('00000000-0000-0000-0000-000000000930');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000912', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"role":"authenticated","sub":"00000000-0000-0000-0000-000000000912"}', true);
set local role authenticated;
select public.akiba_step_down_group_admin('00000000-0000-0000-0000-000000000930');
do $test$
begin
  if not exists (
    select 1 from public.akiba_group_memberships
    where group_id = '00000000-0000-0000-0000-000000000930'
      and user_id = '00000000-0000-0000-0000-000000000912'
      and role = 'member' and status = 'active'
  ) then raise exception 'Group Admin could not step down during retention'; end if;
end;
$test$;
reset role;

-- Creator ownership is an authoritative deletion gate.
select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;
do $test$
begin
  begin
    perform public.akiba_prepare_account_deletion('00000000-0000-0000-0000-000000000910');
    raise exception 'Account deletion unexpectedly passed while the user owns an active group';
  exception when others then
    if sqlerrm not ilike '%Group Creator ownership%' then raise; end if;
  end;
end;
$test$;
reset role;

-- An ordinary member may delete their account. Chat authorship is anonymised,
-- while the message and group financial history remain intact.
insert into public.akiba_group_memberships (group_id, user_id, role, status)
values ('00000000-0000-0000-0000-000000000920', '00000000-0000-0000-0000-000000000911', 'member', 'active')
on conflict (group_id, user_id) do nothing;

insert into public.akiba_group_messages (id, group_id, author_id, body)
values ('00000000-0000-0000-0000-000000000921', '00000000-0000-0000-0000-000000000920', '00000000-0000-0000-0000-000000000911', 'Account deletion anonymisation test')
on conflict (id) do nothing;

insert into public.akiba_group_membership_events
  (id, group_id, actor_id, subject_user_id, event_type, previous_role, new_role)
values
  ('00000000-0000-0000-0000-000000000922', '00000000-0000-0000-0000-000000000920', '00000000-0000-0000-0000-000000000911', '00000000-0000-0000-0000-000000000912', 'group_admin_demoted', 'group_admin', 'member')
on conflict (id) do nothing;

set local role service_role;
select public.akiba_prepare_account_deletion('00000000-0000-0000-000000000911');
select public.akiba_prepare_account_deletion('00000000-0000-0000-000000000912');

do $test$
begin
  if exists (
    select 1 from public.akiba_group_messages
    where id = '00000000-0000-0000-0000-000000000921' and author_id is not null
  ) then raise exception 'Deleted account message attribution was not anonymised'; end if;
  if exists (
    select 1 from public.akiba_group_memberships
    where user_id = '00000000-0000-0000-0000-000000000911'
  ) then raise exception 'Deleted account memberships were not removed'; end if;
  if exists (
    select 1 from public.akiba_group_membership_events
    where id = '00000000-0000-0000-0000-000000000922'
      and (actor_id is not null or subject_user_id is not null)
  ) then raise exception 'Historical leadership-event identities were not anonymised'; end if;
  if exists (
    select 1 from public.akiba_group_memberships
    where user_id = '00000000-0000-0000-0000-000000000912'
  ) then raise exception 'Account deletion did not remove a deactivated-group membership'; end if;
  if not exists (
    select 1 from public.akiba_group_messages
    where id = '00000000-0000-0000-0000-000000000921'
  ) then raise exception 'Historical group message was not preserved'; end if;
end;
$test$;

reset role;
rollback;
