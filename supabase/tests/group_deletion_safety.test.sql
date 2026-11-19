\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000901', 'authenticated', 'authenticated', 'deletion-creator@akiba.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000902', 'authenticated', 'authenticated', 'deletion-other@akiba.test', '', now(), now(), now())
on conflict (id) do nothing;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000901', true);

-- A group with no financial footprint can be hard-deleted after exact-name confirmation.
insert into public.akiba_groups (id, name, purpose, group_type, currency_code, created_by, group_image_path)
values (
  '10000000-0000-0000-0000-000000000901',
  'Empty test group',
  'goal',
  'fundraising',
  'KES',
  '00000000-0000-0000-0000-000000000901',
  '00000000-0000-0000-0000-000000000901/10000000-0000-0000-0000-000000000901.jpg'
);

do $test$
declare eligibility jsonb; message text;
begin
  eligibility := public.akiba_group_deletion_eligibility('10000000-0000-0000-0000-000000000901');
  if eligibility->>'can_hard_delete' <> 'true' then
    raise exception 'A group with no financial history should be eligible: %', eligibility;
  end if;

  begin
    perform public.akiba_hard_delete_group('10000000-0000-0000-0000-000000000901', 'Wrong name');
    raise exception 'Hard deletion unexpectedly accepted an incorrect group-name confirmation';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%confirmation does not match%' then raise; end if;
  end;

  perform public.akiba_hard_delete_group('10000000-0000-0000-0000-000000000901', 'Empty test group');
  if exists (select 1 from public.akiba_groups where id = '10000000-0000-0000-0000-000000000901') then
    raise exception 'Eligible group row was not permanently deleted';
  end if;
  if not exists (
    select 1 from public.akiba_group_lifecycle_audit
    where group_id = '10000000-0000-0000-0000-000000000901'
      and action = 'hard_deleted'
      and group_name_snapshot = 'Empty test group'
  ) then raise exception 'Hard deletion audit evidence was not retained'; end if;
  if not exists (
    select 1 from public.akiba_group_deletion_storage_jobs
    where group_id = '10000000-0000-0000-0000-000000000901'
      and bucket_id = 'group-images'
      and object_path = '00000000-0000-0000-0000-000000000901/10000000-0000-0000-0000-000000000901.jpg'
      and status = 'pending'
  ) then raise exception 'Group image was not queued for Storage API cleanup'; end if;
end;
$test$;

-- A settled financial history permanently blocks hard deletion, but allows
-- deactivation once the balance and all unresolved operations are zero.
insert into public.akiba_groups (id, name, purpose, group_type, currency_code, created_by)
values (
  '10000000-0000-0000-0000-000000000902',
  'Settled finance history group',
  'goal',
  'fundraising',
  'KES',
  '00000000-0000-0000-0000-000000000901'
);
insert into public.akiba_finance_activity_events
  (group_id, actor_id, event_type, source_type, event_payload)
values (
  '10000000-0000-0000-0000-000000000902',
  '00000000-0000-0000-0000-000000000901',
  'test_financial_setup',
  'test',
  '{"test":true}'::jsonb
);

do $test$
declare eligibility jsonb; message text; delete_at timestamptz;
begin
  eligibility := public.akiba_group_deletion_eligibility('10000000-0000-0000-0000-000000000902');
  if eligibility->>'can_hard_delete' <> 'false'
     or not (eligibility->'reasons' @> '["financial_history"]'::jsonb) then
    raise exception 'Any financial history must permanently disqualify hard deletion: %', eligibility;
  end if;

  begin
    perform public.akiba_hard_delete_group('10000000-0000-0000-0000-000000000902', 'Settled finance history group');
    raise exception 'Hard deletion unexpectedly accepted a group with financial history';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%financial history%' then raise; end if;
  end;

  delete_at := public.akiba_deactivate_group('10000000-0000-0000-0000-000000000902');
  if not exists (
    select 1 from public.akiba_groups
    where id = '10000000-0000-0000-0000-000000000902'
      and status = 'deactivated'
      and scheduled_delete_at = delete_at
  ) then raise exception 'Settled finance history group should be deactivated'; end if;

  if public.akiba_reactivate_group('10000000-0000-0000-0000-000000000902') is not true then
    raise exception 'Creator reactivation did not return success';
  end if;
  if not exists (
    select 1 from public.akiba_groups
    where id = '10000000-0000-0000-0000-000000000902'
      and status = 'active' and deactivated_at is null and scheduled_delete_at is null
  ) then raise exception 'Reactivation did not restore active group lifecycle state'; end if;
  if not exists (
    select 1 from public.akiba_group_lifecycle_audit
    where group_id = '10000000-0000-0000-0000-000000000902'
      and action = 'reactivated'
  ) then raise exception 'Reactivation audit evidence was not recorded'; end if;

  perform public.akiba_deactivate_group('10000000-0000-0000-0000-000000000902');
  perform akiba_private.process_due_group_deletions(now() + interval '7 months');
  if not exists (
    select 1 from public.akiba_groups
    where id = '10000000-0000-0000-0000-000000000902'
      and status = 'deleted' and name = 'Deleted group'
  ) then raise exception 'Six-month retention did not scrub the settled group profile'; end if;
  if not exists (
    select 1 from public.akiba_finance_activity_events
    where group_id = '10000000-0000-0000-0000-000000000902'
      and event_type = 'test_financial_setup'
  ) then raise exception 'Retention scrub deleted financial evidence'; end if;
end;
$test$;

-- A non-zero ledger balance blocks both deactivation and hard deletion.
insert into public.akiba_groups (id, name, purpose, group_type, currency_code, created_by)
values (
  '10000000-0000-0000-0000-000000000903',
  'Outstanding balance group',
  'goal',
  'fundraising',
  'KES',
  '00000000-0000-0000-0000-000000000901'
);
insert into public.akiba_financial_transactions
  (id, group_id, currency_code, transaction_type, reference, description, effective_at, created_by)
values (
  '20000000-0000-0000-0000-000000000903',
  '10000000-0000-0000-0000-000000000903',
  'KES',
  'contribution',
  'deletion-safety-balance-test',
  'Deletion safety balance fixture',
  now(),
  '00000000-0000-0000-0000-000000000901'
);
insert into public.akiba_financial_ledger_entries
  (transaction_id, group_id, currency_code, line_number, account_code, direction, amount_minor)
values
  ('20000000-0000-0000-0000-000000000903', '10000000-0000-0000-0000-000000000903', 'KES', 1, 'provider_clearing', 'debit', 500),
  ('20000000-0000-0000-0000-000000000903', '10000000-0000-0000-0000-000000000903', 'KES', 2, 'group_funds', 'credit', 500);

do $test$
declare message text; eligibility jsonb;
begin
  eligibility := public.akiba_group_deletion_eligibility('10000000-0000-0000-0000-000000000903');
  if eligibility->>'can_hard_delete' <> 'false'
     or (eligibility->>'balance_minor')::numeric <> 500 then
    raise exception 'Non-zero group balance was not detected: %', eligibility;
  end if;

  begin
    perform public.akiba_deactivate_group('10000000-0000-0000-0000-000000000903');
    raise exception 'Deactivation unexpectedly succeeded with a non-zero group balance';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%Resolve all pending%' then raise; end if;
  end;

  begin
    perform public.akiba_hard_delete_group('10000000-0000-0000-0000-000000000903', 'Outstanding balance group');
    raise exception 'Hard deletion unexpectedly succeeded with financial history';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%financial history%' then raise; end if;
  end;
end;
$test$;

-- Only the Group Creator may inspect eligibility or reactivate a deactivated group.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000902', true);
do $test$
declare message text;
begin
  begin
    perform public.akiba_group_deletion_eligibility('10000000-0000-0000-0000-000000000903');
    raise exception 'A non-creator unexpectedly accessed deletion eligibility';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%Only the Group Creator%' then raise; end if;
  end;
end;
$test$;

rollback;
