\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000701', 'authenticated', 'authenticated', 'report-creator@akiba.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000702', 'authenticated', 'authenticated', 'reporter-one@akiba.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000703', 'authenticated', 'authenticated', 'reporter-two@akiba.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000704', 'authenticated', 'authenticated', 'moderator-one@akiba.test', '', now(), now(), now())
on conflict (id) do nothing;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000701', true);
insert into public.akiba_groups (id, name, purpose, group_type, currency_code, created_by)
values ('10000000-0000-0000-0000-000000000701', 'Report privacy test', 'goal', 'fundraising', 'KES',
        '00000000-0000-0000-0000-000000000701');

insert into public.akiba_internal_moderators(user_id, is_active)
values ('00000000-0000-0000-0000-000000000704', true)
on conflict (user_id) do update set is_active = true;

-- Reporter submits a report. No membership or group-creator privilege is required.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000702', true);
set local role authenticated;
select public.akiba_submit_group_report(
  '10000000-0000-0000-0000-000000000701',
  'fraud_suspected_scam',
  'The group appears to be collecting money under misleading claims.'
);

do $test$
declare v_report_id uuid;
begin
  select id into v_report_id from public.akiba_group_reports
  where group_id = '10000000-0000-0000-0000-000000000701'
    and reporter_user_id = '00000000-0000-0000-0000-000000000702';
  if v_report_id is null then raise exception 'Report was not created'; end if;
  if (select status from public.akiba_group_reports where id = v_report_id) <> 'pending' then
    raise exception 'New report did not start as pending';
  end if;
  if has_table_privilege('authenticated', 'public.akiba_group_reports', 'INSERT') then
    raise exception 'Authenticated users can insert report rows directly';
  end if;
  if has_table_privilege('authenticated', 'public.akiba_group_report_evidence', 'INSERT') then
    raise exception 'Authenticated users can insert evidence metadata directly';
  end if;
end;
$test$;

-- A second reporter and the reported Group Creator cannot read someone else's report.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000703', true);
do $test$
begin
  if (select count(*) from public.akiba_group_reports) <> 0 then
    raise exception 'A different reporter can read another user report';
  end if;
end;
$test$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000701', true);
do $test$
begin
  if (select count(*) from public.akiba_group_reports) <> 0 then
    raise exception 'The reported Group Creator can read the reporter identity';
  end if;
end;
$test$;

-- The reporter can read only their own report.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000702', true);
do $test$
begin
  if (select count(*) from public.akiba_group_reports) <> 1 then
    raise exception 'Reporter cannot read their own report';
  end if;
end;
$test$;

-- Duplicate submissions for the same group within 24 hours are blocked.
do $test$
declare message text;
begin
  begin
    perform public.akiba_submit_group_report(
      '10000000-0000-0000-0000-000000000701', 'other', ''
    );
    raise exception 'Duplicate report unexpectedly succeeded';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%already reported this group recently%' then raise; end if;
  end;
end;
$test$;

reset role;

-- Internal moderator can read reports, evidence metadata and audit history,
-- and can assign/review without exposing any of it to the reported group.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000704', true);
set local role authenticated;
do $test$
declare v_report_id uuid;
begin
  select id into v_report_id from public.akiba_group_reports
  where group_id = '10000000-0000-0000-0000-000000000701';
  if v_report_id is null then raise exception 'Authorized moderator cannot read report'; end if;
  if not exists (select 1 from public.akiba_group_report_audit where report_id = v_report_id and action = 'submitted') then
    raise exception 'Moderator cannot read report audit trail';
  end if;
  perform public.akiba_moderator_update_group_report(v_report_id, 'under_review', '00000000-0000-0000-0000-000000000704', null);
  perform public.akiba_moderator_update_group_report(v_report_id, 'resolved', '00000000-0000-0000-0000-000000000704', 'Reviewed and action taken.');
  if (select status from public.akiba_group_reports where id = v_report_id) <> 'resolved' then
    raise exception 'Moderator resolution was not persisted';
  end if;
  if (select count(*) from public.akiba_group_report_audit where report_id = v_report_id) <> 3 then
    raise exception 'Moderation actions were not recorded in the audit trail';
  end if;
end;
$test$;

-- Inactive/non-moderator users cannot call reviewer operations.
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000703', true);
set local role authenticated;
do $test$
declare message text; v_report_id uuid;
begin
  select id into v_report_id from public.akiba_group_reports limit 1;
  begin
    perform public.akiba_moderator_update_group_report(v_report_id, 'under_review', null, null);
    raise exception 'Non-moderator unexpectedly updated a report';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%Authorized internal moderator access is required%' then raise; end if;
  end;
end;
$test$;

reset role;
do $test$
begin
  if (select public from storage.buckets where id = 'akiba-group-report-evidence') then
    raise exception 'Report evidence bucket must be private';
  end if;
  if has_function_privilege('anon', 'public.akiba_submit_group_report(uuid,text,text)', 'EXECUTE') then
    raise exception 'Anonymous users can submit reports';
  end if;
end;
$test$;

rollback;
