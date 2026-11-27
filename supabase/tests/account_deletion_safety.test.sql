\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000910', 'authenticated', 'authenticated', 'account-delete-owner@akiba.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000911', 'authenticated', 'authenticated', 'account-delete-member@akiba.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000912', 'authenticated', 'authenticated', 'account-delete-admin@akiba.test', '', now(), now(), now())
on conflict (id) do nothing;

select set_config('request.jwt.claim.role', 'service_role', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
set local role service_role;

-- Creator ownership is an authoritative deletion gate.
insert into public.akiba_groups (id, name, purpose, group_type, currency_code, created_by)
values ('00000000-0000-0000-0000-000000000920', 'Account deletion gate group', 'goal', 'shared_savings', 'KES', '00000000-0000-0000-0000-000000000910')
on conflict (id) do nothing;

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

select public.akiba_prepare_account_deletion('00000000-0000-0000-0000-000000000911');

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
  if not exists (
    select 1 from public.akiba_group_messages
    where id = '00000000-0000-0000-0000-000000000921'
  ) then raise exception 'Historical group message was not preserved'; end if;
end;
$test$;

reset role;
rollback;
