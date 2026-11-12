\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'authenticated', 'authenticated', 'member-' || n || '@akiba.test',
       '', now(), now(), now()
from generate_series(201, 310) as n
on conflict (id) do nothing;

-- Fill a Free group to its full 100-person capacity.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
insert into public.akiba_groups (id, name, purpose, group_type, currency_code, created_by)
values ('10000000-0000-0000-0000-000000000011', 'Membership capacity test', 'goal', 'shared_savings', 'KES',
        '00000000-0000-0000-0000-000000000201');

insert into public.akiba_group_memberships (group_id, user_id, role, status)
select '10000000-0000-0000-0000-000000000011',
       ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'member', 'active'
from generate_series(202, 300) as n;

do $test$
declare message text;
begin
  begin
    perform public.akiba_create_group_invitation(
      '10000000-0000-0000-0000-000000000011', repeat('a', 64), now() + interval '7 days', null, null
    );
    raise exception 'Invitation creation unexpectedly succeeded at capacity';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%Group capacity reached%' then raise; end if;
  end;

  begin
    perform public.akiba_leave_group('10000000-0000-0000-0000-000000000011');
    raise exception 'Group Creator unexpectedly left the group';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%Group Creator cannot leave%' then raise; end if;
  end;
end;
$test$;

-- A Creator removal frees a slot; any active member can then invite.
select public.akiba_remove_group_member(
  '10000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000300',
  false
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000202', true);
select public.akiba_create_group_invitation(
  '10000000-0000-0000-0000-000000000011',
  repeat('b', 64), now() + interval '7 days', null, null
);

-- A valid link invitation is accepted by the authenticated recipient and
-- produces one ordinary active membership.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000301', true);
select public.akiba_accept_group_invitation(repeat('b', 64));

do $test$
declare active_count integer;
begin
  select count(*) into active_count from public.akiba_group_memberships
  where group_id = '10000000-0000-0000-0000-000000000011' and status = 'active';
  if active_count <> 100 then raise exception 'Expected 100 active members after invitation acceptance, got %', active_count; end if;
  if not exists (
    select 1 from public.akiba_group_memberships
    where group_id = '10000000-0000-0000-0000-000000000011'
      and user_id = '00000000-0000-0000-0000-000000000301'
      and role = 'member' and status = 'active'
  ) then raise exception 'Invitation acceptance did not create an ordinary member'; end if;
end;
$test$;

-- Leaving frees a slot. A removed, non-blocked member can rejoin using a
-- fresh email-bound invitation.
select public.akiba_leave_group('10000000-0000-0000-0000-000000000011');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000202', true);
select public.akiba_create_group_invitation(
  '10000000-0000-0000-0000-000000000011',
  repeat('c', 64), now() + interval '7 days', 'member-300@akiba.test', null
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000300', true);
select public.akiba_accept_group_invitation(repeat('c', 64));

do $test$
begin
  if not exists (
    select 1 from public.akiba_group_memberships
    where group_id = '10000000-0000-0000-0000-000000000011'
      and user_id = '00000000-0000-0000-0000-000000000300'
      and role = 'member' and status = 'active' and ended_at is null
  ) then raise exception 'Removed member did not rejoin as an ordinary active member'; end if;
end;
$test$;

-- A Creator block prevents invitations to, and rejoining by, that person.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
select public.akiba_remove_group_member(
  '10000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000299',
  true
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000202', true);
do $test$
declare message text;
begin
  begin
    perform public.akiba_create_group_invitation(
      '10000000-0000-0000-0000-000000000011',
      repeat('d', 64), now() + interval '7 days', 'member-299@akiba.test', null
    );
    raise exception 'Invitation to a blocked user unexpectedly succeeded';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%blocked from joining%' then raise; end if;
  end;
end;
$test$;

-- An Admin voluntarily leaves by stepping down to Member and ending membership.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000302', true);
insert into public.akiba_groups (id, name, purpose, group_type, currency_code, created_by)
values ('10000000-0000-0000-0000-000000000012', 'Admin departure test', 'goal', 'shared_savings', 'KES',
        '00000000-0000-0000-0000-000000000302');
insert into public.akiba_group_memberships (group_id, user_id, role, status)
select '10000000-0000-0000-0000-000000000012',
       ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'member', 'active'
from generate_series(303, 305) as n;
select public.akiba_set_group_admin('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000303', 'appoint');
select public.akiba_set_group_admin('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000304', 'appoint');
select public.akiba_set_group_admin('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000305', 'appoint');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000303', true);
select public.akiba_step_down_group_admin('10000000-0000-0000-0000-000000000012');

do $test$
begin
  if not exists (
    select 1 from public.akiba_group_memberships
    where group_id = '10000000-0000-0000-0000-000000000012'
      and user_id = '00000000-0000-0000-0000-000000000303'
      and role = 'member' and status = 'active'
  ) then raise exception 'Admin did not become an ordinary active Member after stepping down'; end if;
end;
$test$;

select public.akiba_leave_group('10000000-0000-0000-0000-000000000012');

do $test$
begin
  if not exists (
    select 1 from public.akiba_group_memberships
    where group_id = '10000000-0000-0000-0000-000000000012'
      and user_id = '00000000-0000-0000-0000-000000000303'
      and role = 'member' and status = 'left'
  ) then raise exception 'Former Admin could not leave after becoming a regular Member'; end if;
end;
$test$;

-- Email-bound invitations cannot be accepted by a different account.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000306', true);
insert into public.akiba_groups (id, name, purpose, group_type, currency_code, created_by)
values ('10000000-0000-0000-0000-000000000013', 'Email identity test', 'goal', 'shared_savings', 'KES',
        '00000000-0000-0000-0000-000000000306');
select public.akiba_create_group_invitation(
  '10000000-0000-0000-0000-000000000013',
  repeat('e', 64), now() + interval '7 days', 'member-307@akiba.test', null
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000308', true);
do $test$
declare message text;
begin
  begin
    perform public.akiba_accept_group_invitation(repeat('e', 64));
    raise exception 'An unintended account accepted an email-bound invitation';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%sent to another Akiba account%' then raise; end if;
  end;
end;
$test$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000307', true);
do $test$
declare v_invitation_id uuid;
begin
  select id into v_invitation_id from public.akiba_group_invitations where token_hash = repeat('e', 64);
  if not exists (select 1 from public.akiba_list_my_group_invitations() i where i.invitation_id = v_invitation_id) then
    raise exception 'Email-bound invitation was not visible in the recipient inbox';
  end if;
  perform public.akiba_accept_group_invitation_by_id(v_invitation_id);
end;
$test$;

-- Declining terminates the invitation.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000309', true);
insert into public.akiba_groups (id, name, purpose, group_type, currency_code, created_by)
values ('10000000-0000-0000-0000-000000000014', 'Decline invitation test', 'goal', 'shared_savings', 'KES',
        '00000000-0000-0000-0000-000000000309');
select public.akiba_create_group_invitation(
  '10000000-0000-0000-0000-000000000014',
  repeat('f', 64), now() + interval '7 days', 'member-310@akiba.test', null
);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000310', true);
do $test$
declare v_invitation_id uuid;
begin
  select id into v_invitation_id from public.akiba_group_invitations where token_hash = repeat('f', 64);
  perform public.akiba_decline_group_invitation_by_id(v_invitation_id);
end;
$test$;

do $test$
begin
  if not exists (
    select 1 from public.akiba_group_invitations
    where token_hash = repeat('f', 64) and status = 'declined'
      and declined_by = '00000000-0000-0000-0000-000000000310'
  ) then raise exception 'Declined invitation was not terminated'; end if;
end;
$test$;

-- Deactivation begins the retention period immediately and blocks invitations.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000302', true);
do $test$
declare delete_at timestamptz; message text;
begin
  delete_at := public.akiba_deactivate_group('10000000-0000-0000-0000-000000000012');
  if not exists (
    select 1 from public.akiba_groups
    where id = '10000000-0000-0000-0000-000000000012'
      and status = 'deactivated'
      and scheduled_delete_at = deactivated_at + interval '6 months'
      and scheduled_delete_at = delete_at
  ) then raise exception 'Deactivation did not start the six-month retention period immediately'; end if;

  begin
    perform public.akiba_create_group_invitation(
      '10000000-0000-0000-0000-000000000012',
      repeat('1', 64), now() + interval '7 days', null, null
    );
    raise exception 'Invitation unexpectedly succeeded for a deactivated group';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%deactivated%' then raise; end if;
  end;
end;
$test$;

-- Simulate the passage of the six-month retention interval. The scheduled
-- worker removes group membership/content and keeps the financial anchor.
do $test$
declare deleted_count integer;
begin
  deleted_count := akiba_private.process_due_group_deletions(now() + interval '7 months');
  if deleted_count <> 1 then
    raise exception 'Expected one due group to be processed, got %', deleted_count;
  end if;
  if not exists (
    select 1 from public.akiba_groups
    where id = '10000000-0000-0000-0000-000000000012'
      and status = 'deleted'
      and deleted_at >= scheduled_delete_at
      and name = 'Deleted group'
  ) then raise exception 'Due group was not scrubbed and marked deleted'; end if;
  if exists (
    select 1 from public.akiba_group_memberships
    where group_id = '10000000-0000-0000-0000-000000000012'
  ) then raise exception 'Deleted group still has active or historical membership rows'; end if;
  if not exists (
    select 1 from public.akiba_group_deletion_records
    where group_id = '10000000-0000-0000-0000-000000000012'
  ) then raise exception 'Group deletion record was not written'; end if;
end;
$test$;

rollback;
