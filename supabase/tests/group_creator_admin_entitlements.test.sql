\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'authenticated', 'authenticated', 'membership-test-' || n || '@akiba.test',
       '', now(), now(), now()
from generate_series(1, 104) as n
on conflict (id) do nothing;

insert into public.akiba_payment_providers (id, provider_code, display_name)
values ('20000000-0000-0000-0000-000000000001', 'governance_test', 'Governance Test');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

insert into public.akiba_groups
  (id, name, purpose, group_type, currency_code, created_by)
values
  ('10000000-0000-0000-0000-000000000001', 'Governance test', 'goal', 'shared_savings', 'KES',
   '00000000-0000-0000-0000-000000000001');

insert into public.akiba_group_memberships (group_id, user_id, role, status)
select '10000000-0000-0000-0000-000000000001',
       ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'member', 'active'
from generate_series(2, 97) as n;

select public.akiba_set_group_admin(
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'appoint'
);
select public.akiba_set_group_admin(
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000003',
  'appoint'
);
select public.akiba_set_group_admin(
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000004',
  'appoint'
);

insert into public.akiba_group_memberships (group_id, user_id, role, status)
select '10000000-0000-0000-0000-000000000001',
       ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'member', 'active'
from generate_series(98, 100) as n;

do $test$
declare
  message text;
  active_total integer;
  admin_total integer;
  creator_role text;
  audit_event_total integer;
begin
  select count(*) into active_total
  from public.akiba_group_memberships
  where group_id = '10000000-0000-0000-0000-000000000001' and status = 'active';
  select count(*) into admin_total
  from public.akiba_group_memberships
  where group_id = '10000000-0000-0000-0000-000000000001'
    and status = 'active' and role = 'group_admin';

  if active_total <> 100 or admin_total <> 3 then
    raise exception 'Unexpected leadership/member counts: total %, admins %', active_total, admin_total;
  end if;
  select role into creator_role from public.akiba_group_memberships
  where group_id = '10000000-0000-0000-0000-000000000001'
    and user_id = '00000000-0000-0000-0000-000000000001';
  if creator_role <> 'group_creator' then raise exception 'Creator role was not established'; end if;
  select count(*) into audit_event_total from public.akiba_group_membership_events
  where group_id = '10000000-0000-0000-0000-000000000001'
    and event_type = 'group_admin_appointed';
  if audit_event_total <> 3 then raise exception 'Expected three immutable appointment audit events, got %', audit_event_total; end if;

  begin
    perform public.akiba_set_group_admin(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000005',
      'appoint'
    );
    raise exception 'Fourth Group Admin appointment unexpectedly succeeded';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%Group Admin limit%' then raise; end if;
  end;

  begin
    insert into public.akiba_group_memberships (group_id, user_id, role, status)
    values ('10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000101', 'member', 'active');
    raise exception 'Unexpectedly accepted member row';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%member limit%' then raise; end if;
  end;

  perform akiba_private.assert_group_leadership_ready('10000000-0000-0000-0000-000000000001');
  insert into public.akiba_contribution_intents
    (group_id, contributor_id, provider_id, currency_code, amount_minor, idempotency_key)
  values ('10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001', 'KES', 100, 'ready-test-1');
end;
$test$;

-- A newly created group has its Creator only and must fail the readiness gate.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000104', true);
insert into public.akiba_groups
  (id, name, purpose, group_type, currency_code, created_by)
values
  ('10000000-0000-0000-0000-000000000002', 'Incomplete leadership test', 'goal', 'shared_savings', 'KES',
   '00000000-0000-0000-0000-000000000104');

do $test$
declare
  message text;
begin
  begin
    perform akiba_private.assert_group_leadership_ready('10000000-0000-0000-0000-000000000002');
    raise exception 'Leadership readiness unexpectedly passed with no Group Admins';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%appoint at least 3 active Group Admins%' then raise; end if;
  end;
  begin
    insert into public.akiba_contribution_intents
      (group_id, contributor_id, provider_id, currency_code, amount_minor, idempotency_key)
    values ('10000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000104',
      '20000000-0000-0000-0000-000000000001', 'KES', 100, 'not-ready-test');
    raise exception 'Contribution intent unexpectedly succeeded before leadership readiness';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%appoint at least 3 active Group Admins%' then raise; end if;
  end;
end;
$test$;


-- The Event catalogue's Meeting option must be accepted by the database constraint.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
insert into public.akiba_groups
  (id, name, purpose, group_type, currency_code, created_by)
values
  ('10000000-0000-0000-0000-000000000003', 'Meeting category test', 'event', 'meeting', 'KES',
   '00000000-0000-0000-0000-000000000103');

do $test$
begin
  if not exists (
    select 1 from public.akiba_groups
    where id = '10000000-0000-0000-0000-000000000003'
      and purpose = 'event' and group_type = 'meeting'
  ) then
    raise exception 'Meeting Event group type was not persisted';
  end if;
end;
$test$;

rollback;
