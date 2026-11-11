\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'authenticated', 'authenticated', 'membership-test-' || n || '@akiba.test',
       '', now(), now(), now()
from generate_series(1, 104) as n
on conflict (id) do nothing;

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

do $test$
declare
  message text;
  active_total integer;
  admin_total integer;
begin
  select count(*) into active_total
  from public.akiba_group_memberships
  where group_id = '10000000-0000-0000-0000-000000000001' and status = 'active';
  select count(*) into admin_total
  from public.akiba_group_memberships
  where group_id = '10000000-0000-0000-0000-000000000001'
    and status = 'active' and role = 'group_admin';

  if active_total <> 97 or admin_total <> 3 then
    raise exception 'Unexpected leadership/member counts: total %, admins %', active_total, admin_total;
  end if;

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
      '00000000-0000-0000-0000-000000000098', 'member', 'active');
    raise exception 'Unexpectedly accepted member row';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%member limit%' then raise; end if;
  end;

  perform akiba_private.assert_group_leadership_ready('10000000-0000-0000-0000-000000000001');
end;
$test$;

-- A newly created group has its Creator only and must fail the readiness gate.
insert into public.akiba_groups
  (id, name, purpose, group_type, currency_code, created_by)
values
  ('10000000-0000-0000-0000-000000000002', 'Incomplete leadership test', 'goal', 'shared_savings', 'KES',
   '00000000-0000-0000-0000-000000000099');

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
end;
$test$;

rollback;
