\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
select ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'authenticated', 'authenticated', 'withdrawal-test-' || n || '@akiba.test',
       '', now(), now(), now()
from generate_series(1, 8) as n
on conflict (id) do nothing;

insert into public.akiba_payment_providers
  (id, provider_code, display_name, is_enabled, capabilities)
values
  ('20000000-0000-0000-0000-000000000001', 'withdrawal_test', 'Withdrawal Test', true,
   '{"payout":true,"fee_quotes":true,"collection":true}'::jsonb)
on conflict (id) do update
set is_enabled = excluded.is_enabled, capabilities = excluded.capabilities;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

insert into public.akiba_groups
  (id, name, purpose, group_type, currency_code, created_by)
values
  ('10000000-0000-0000-0000-000000000001', 'Withdrawal staging test', 'goal', 'shared_savings', 'KES',
   '00000000-0000-0000-0000-000000000001');

insert into public.akiba_group_memberships (group_id, user_id, role, status)
select '10000000-0000-0000-0000-000000000001',
       ('00000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'member', 'active'
from generate_series(2, 6) as n;

select public.akiba_set_group_admin('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','appoint');
select public.akiba_set_group_admin('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','appoint');
select public.akiba_set_group_admin('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','appoint');

insert into public.akiba_financial_transactions
  (id, group_id, currency_code, transaction_type, reference, description, effective_at, created_by, metadata)
values
  ('30000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001', 'KES', 'contribution',
   'withdrawal-test-funding', 'Test group funding', clock_timestamp(),
   '00000000-0000-0000-0000-000000000001', '{}'::jsonb);

insert into public.akiba_financial_ledger_entries
  (transaction_id, group_id, currency_code, line_number, account_code, direction, amount_minor)
values
  ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','KES',1,'provider_clearing','debit',100000),
  ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','KES',2,'group_funds','credit',100000);

insert into public.akiba_withdrawal_requests
  (id, group_id, initiator_id, currency_code, recipient_amount_minor,
   akiba_fee_minor, provider_fee_minor, fee_rate_bps, fee_schedule_version,
   provider_id, provider_quote_ref, quote_expires_at, recipient_name,
   destination_token, destination_fingerprint, destination_snapshot, reason)
values
  ('40000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001', 'KES', 1000,
   0, 0, 0, 'test-v1',
   '20000000-0000-0000-0000-000000000001', 'test-quote-1',
   clock_timestamp() + interval '2 hours', 'Test recipient',
   'test-destination-token', 'test-destination-fingerprint', '{"type":"test"}'::jsonb,
   'Withdrawal staging regression test');

do $test$
declare
  roster_count integer;
  message text;
  staging_start timestamptz;
  staging_deadline timestamptz;
  flag_id uuid;
  second_flag_id uuid;
  request_status text;
  reservation_status text;
  flag_status text;
  notification_count integer;
  active_member_count integer;
begin
  select count(*) into roster_count
  from public.akiba_withdrawal_approval_roster
  where withdrawal_request_id = '40000000-0000-0000-0000-000000000001';
  if roster_count <> 3 then
    raise exception 'Expected three Admins in immutable approval roster, got %', roster_count;
  end if;

  select count(*) into active_member_count
  from public.akiba_group_memberships
  where group_id = '10000000-0000-0000-0000-000000000001'
    and status = 'active';
  if active_member_count <> 6 then
    raise exception 'Expected six active members in notification test group, got %', active_member_count;
  end if;

  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  perform public.akiba_decide_withdrawal_request(
    '40000000-0000-0000-0000-000000000001','approved',null);
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
  perform public.akiba_decide_withdrawal_request(
    '40000000-0000-0000-0000-000000000001','approved',null);

  select status into request_status
  from public.akiba_withdrawal_requests
  where id = '40000000-0000-0000-0000-000000000001';
  if request_status <> 'pending_approval' then
    raise exception 'Withdrawal entered staging before every snapshotted Admin approved';
  end if;

  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
  perform public.akiba_decide_withdrawal_request(
    '40000000-0000-0000-0000-000000000001','approved',null);

  select status, staging_started_at, staging_deadline_at
    into request_status, staging_start, staging_deadline
  from public.akiba_withdrawal_requests
  where id = '40000000-0000-0000-0000-000000000001';
  if request_status <> 'staging' then
    raise exception 'Final approval did not transition the withdrawal into staging';
  end if;
  if staging_deadline - staging_start <> interval '2 hours' then
    raise exception 'Staging deadline must be exactly two hours after final approval';
  end if;

  -- Admin demotion is blocked for the full unresolved lifecycle.
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  begin
    perform public.akiba_set_group_admin(
      '10000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      'demote'
    );
    raise exception 'Admin demotion unexpectedly succeeded during active withdrawal';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%while a withdrawal is unresolved%' then raise; end if;
  end;

  -- A member can flag and remove only their own flag before the fixed deadline.
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true);
  flag_id := public.akiba_flag_withdrawal(
    '40000000-0000-0000-0000-000000000001','I do not recognize this recipient.');
  perform public.akiba_remove_withdrawal_flag(flag_id);

  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', true);
  second_flag_id := public.akiba_flag_withdrawal(
    '40000000-0000-0000-0000-000000000001','Please verify the withdrawal purpose.');

  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true);
  begin
    perform public.akiba_remove_withdrawal_flag(second_flag_id);
    raise exception 'A member unexpectedly removed another member flag';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%only a flag that you created%' then raise; end if;
  end;

  -- Simulate the due time using the service-only processor's explicit clock.
  perform * from public.akiba_process_due_withdrawal_staging(10, staging_deadline + interval '1 second');

  select status into request_status
  from public.akiba_withdrawal_requests
  where id = '40000000-0000-0000-0000-000000000001';
  select status into reservation_status
  from public.akiba_financial_reservations
  where withdrawal_request_id = '40000000-0000-0000-0000-000000000001';
  select status into flag_status
  from public.akiba_withdrawal_flags
  where id = second_flag_id;

  if request_status <> 'cancelled_flagged' then
    raise exception 'One active flag at the deadline did not cancel the withdrawal';
  end if;
  if reservation_status <> 'released' then
    raise exception 'Flagged withdrawal reservation was not released';
  end if;
  if flag_status <> 'closed_by_system' then
    raise exception 'Active flag was not automatically closed by the system';
  end if;

  select count(*) into notification_count
  from public.akiba_group_notifications n
  where n.group_id = '10000000-0000-0000-0000-000000000001'
    and n.event_type = 'financial_withdrawal_cancelled_flagged';
  if notification_count <> active_member_count then
    raise exception 'Every active member should receive the flagged-cancellation notification; expected %, got %',
      active_member_count, notification_count;
  end if;

  -- A second request with no active flags reaches payout_queued and keeps its
  -- reservation. It must not be treated as paid or release the reservation.
  insert into public.akiba_withdrawal_requests
    (id, group_id, initiator_id, currency_code, recipient_amount_minor,
     akiba_fee_minor, provider_fee_minor, fee_rate_bps, fee_schedule_version,
     provider_id, provider_quote_ref, quote_expires_at, recipient_name,
     destination_token, destination_fingerprint, destination_snapshot, reason)
  values
    ('40000000-0000-0000-0000-000000000002',
     '10000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000001', 'KES', 1000,
     0, 0, 0, 'test-v1',
     '20000000-0000-0000-0000-000000000001', 'test-quote-2',
     clock_timestamp() + interval '2 hours', 'Test recipient',
     'test-destination-token-2', 'test-destination-fingerprint-2', '{"type":"test"}'::jsonb,
     'No-flag staging regression test');

  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  perform public.akiba_decide_withdrawal_request(
    '40000000-0000-0000-0000-000000000002','approved',null);
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
  perform public.akiba_decide_withdrawal_request(
    '40000000-0000-0000-0000-000000000002','approved',null);
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
  perform public.akiba_decide_withdrawal_request(
    '40000000-0000-0000-0000-000000000002','approved',null);

  select staging_deadline_at into staging_deadline
  from public.akiba_withdrawal_requests
  where id = '40000000-0000-0000-0000-000000000002';
  perform * from public.akiba_process_due_withdrawal_staging(10, staging_deadline + interval '1 second');

  select status into request_status
  from public.akiba_withdrawal_requests
  where id = '40000000-0000-0000-0000-000000000002';
  select status into reservation_status
  from public.akiba_financial_reservations
  where withdrawal_request_id = '40000000-0000-0000-0000-000000000002';
  if request_status <> 'payout_queued' then
    raise exception 'An unflagged withdrawal did not reach payout_queued';
  end if;
  if reservation_status <> 'active' then
    raise exception 'Payout-queued withdrawal reservation must remain active';
  end if;

  -- One unresolved withdrawal per group remains a database-enforced invariant.
  begin
    insert into public.akiba_withdrawal_requests
      (group_id, initiator_id, currency_code, recipient_amount_minor,
       akiba_fee_minor, provider_fee_minor, fee_rate_bps, fee_schedule_version,
       provider_id, provider_quote_ref, quote_expires_at, recipient_name,
       destination_token, destination_fingerprint, destination_snapshot, reason)
    values
      ('10000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000001', 'KES', 1000,
       0, 0, 0, 'test-v1',
       '20000000-0000-0000-0000-000000000001', 'test-quote-3',
       clock_timestamp() + interval '2 hours', 'Test recipient',
       'test-destination-token-3', 'test-destination-fingerprint-3', '{"type":"test"}'::jsonb,
       'Duplicate unresolved request test');
    raise exception 'Second unresolved withdrawal unexpectedly succeeded';
  exception when unique_violation then
    null;
  end;

  if has_table_privilege('authenticated','public.akiba_withdrawal_flags','INSERT')
     or has_table_privilege('authenticated','public.akiba_withdrawal_flags','UPDATE')
     or has_table_privilege('authenticated','public.akiba_withdrawal_flags','DELETE') then
    raise exception 'Authenticated users must use flag RPCs, not direct table writes';
  end if;
end;
$test$;

rollback;
