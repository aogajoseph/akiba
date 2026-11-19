\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'authenticated', 'authenticated', 'notification-mute-' || n || '@akiba.test',
       '', now(), now(), now()
from generate_series(501, 503) as n
on conflict (id) do nothing;

insert into public.akiba_groups (id, name, purpose, group_type, currency_code, created_by)
values (
  '10000000-0000-0000-0000-000000000501',
  'Notification mute test', 'goal', 'fundraising', 'KES',
  '00000000-0000-0000-0000-000000000501'
);

insert into public.akiba_group_memberships (group_id, user_id, role, status)
values (
  '10000000-0000-0000-0000-000000000501',
  '00000000-0000-0000-0000-000000000502',
  'member', 'active'
);

-- A member can mute their own group activity, but cannot write preferences directly.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000502', true);
select public.akiba_set_group_notification_mute(
  '10000000-0000-0000-0000-000000000501', true
);

do $test$
begin
  if not exists (
    select 1 from public.akiba_group_notification_preferences
    where user_id = '00000000-0000-0000-0000-000000000502'
      and group_id = '10000000-0000-0000-0000-000000000501'
      and is_muted
  ) then raise exception 'Mute preference was not persisted'; end if;
  if has_table_privilege('authenticated',
    'public.akiba_group_notification_preferences', 'INSERT') then
    raise exception 'Authenticated users can directly insert notification preferences';
  end if;
end;
$test$;

-- Ordinary activity is suppressed while muted.
insert into public.akiba_group_notifications
  (user_id, group_id, source_event_id, event_type, title, body, href)
values
  ('00000000-0000-0000-0000-000000000502',
   '10000000-0000-0000-0000-000000000501',
   '30000000-0000-0000-0000-000000000501',
   'membership_joined', 'New member joined', 'A member joined.',
   '/workspace/groups/10000000-0000-0000-0000-000000000501/membership');

do $test$
begin
  if exists (select 1 from public.akiba_group_notifications
    where source_event_id = '30000000-0000-0000-0000-000000000501') then
    raise exception 'Muted ordinary group activity was not suppressed';
  end if;
end;
$test$;

-- Financial and security alerts are never suppressed by group mute.
insert into public.akiba_group_notifications
  (user_id, group_id, source_event_id, event_type, title, body, href)
values
  ('00000000-0000-0000-0000-000000000502',
   '10000000-0000-0000-0000-000000000501',
   '30000000-0000-0000-0000-000000000502',
   'financial_contribution_received', 'Contribution received', 'A contribution was received.',
   '/workspace/groups/10000000-0000-0000-0000-000000000501/finances'),
  ('00000000-0000-0000-0000-000000000502',
   '10000000-0000-0000-0000-000000000501',
   '30000000-0000-0000-0000-000000000503',
   'security_suspicious_activity', 'Security alert', 'Review recent account activity.',
   '/workspace/groups/10000000-0000-0000-0000-000000000501');

do $test$
begin
  if (select count(*) from public.akiba_group_notifications
      where source_event_id in (
        '30000000-0000-0000-0000-000000000502',
        '30000000-0000-0000-0000-000000000503'
      )) <> 2 then
    raise exception 'Financial or security alerts were incorrectly suppressed';
  end if;
end;
$test$;

-- Unmuting restores ordinary activity delivery.
select public.akiba_set_group_notification_mute(
  '10000000-0000-0000-0000-000000000501', false
);
insert into public.akiba_group_notifications
  (user_id, group_id, source_event_id, event_type, title, body, href)
values
  ('00000000-0000-0000-0000-000000000502',
   '10000000-0000-0000-0000-000000000501',
   '30000000-0000-0000-0000-000000000504',
   'membership_joined', 'New member joined', 'A member joined.',
   '/workspace/groups/10000000-0000-0000-0000-000000000501/membership');

do $test$
begin
  if not exists (select 1 from public.akiba_group_notifications
    where source_event_id = '30000000-0000-0000-0000-000000000504') then
    raise exception 'Ordinary activity did not resume after unmuting';
  end if;
end;
$test$;

-- A non-member cannot change another group's notification preference.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000503', true);
do $test$
declare message text;
begin
  begin
    perform public.akiba_set_group_notification_mute(
      '10000000-0000-0000-0000-000000000501', true
    );
    raise exception 'A non-member unexpectedly changed a group mute preference';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%Active group membership is required%' then raise; end if;
  end;
end;
$test$;

rollback;
