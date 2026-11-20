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

do $leadership$
begin
  begin
    perform akiba_private.assert_group_leadership_ready('10000000-0000-0000-0000-000000000001');
    raise exception 'Two active Group Admins unexpectedly satisfied leadership readiness';
  exception when others then
    if sqlerrm not like '%at least 3 active Group Admins%' then raise; end if;
  end;
end;
$leadership$;

select public.akiba_set_group_admin('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000004','appoint');

do $leadership_ready$
begin
  perform akiba_private.assert_group_leadership_ready('10000000-0000-0000-0000-000000000001');
end;
$leadership_ready$;

-- Muted members must still receive critical financial notifications.
insert into public.akiba_group_notification_preferences (user_id, group_id, is_muted)
values ('00000000-0000-0000-0000-000000000006',
        '10000000-0000-0000-0000-000000000001', true);

-- Simulate a notification table failure. The finance event and contribution
-- intent must still commit; the outbox worker must repair delivery later.
create or replace function public.akiba_test_fail_finance_notification()
returns trigger
language plpgsql
as $fail$
begin
  if new.user_id = '00000000-0000-0000-0000-000000000006'::uuid then
    raise exception 'simulated notification insert outage';
  end if;
  return new;
end;
$fail$;

create trigger akiba_test_fail_finance_notification
before insert on public.akiba_group_notifications
for each row execute function public.akiba_test_fail_finance_notification();

insert into public.akiba_contribution_intents
  (group_id, contributor_id, provider_id, currency_code, amount_minor, idempotency_key)
values
  ('10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000001',
   'KES', 500, 'withdrawal-notification-contribution');

insert into public.akiba_payment_attempts
  (contribution_intent_id, provider_id, amount_minor, currency_code, request_reference)
select id, provider_id, amount_minor, currency_code, 'withdrawal-notification-payment-attempt'
from public.akiba_contribution_intents
where idempotency_key = 'withdrawal-notification-contribution';

do $notification_outage$
declare
  intent_id uuid;
  attempt_id uuid;
  outbox_pending boolean;
begin
  select id into intent_id
  from public.akiba_contribution_intents
  where idempotency_key = 'withdrawal-notification-contribution';
  if intent_id is null then
    raise exception 'Contribution intent was rolled back by notification failure';
  end if;

  select notification_published_at is null and notification_last_error is not null
    into outbox_pending
  from public.akiba_finance_activity_events
  where source_type = 'contribution_intent'
    and source_id = intent_id
    and event_type = 'contribution_initiated';
  if outbox_pending is distinct from true then
    raise exception 'Finance event did not retain retryable notification outbox state';
  end if;

  select id into attempt_id
  from public.akiba_payment_attempts
  where request_reference = 'withdrawal-notification-payment-attempt';
  if attempt_id is null then
    raise exception 'Payment attempt was not created for notification test';
  end if;

  select notification_published_at is null and notification_last_error is not null
    into outbox_pending
  from public.akiba_finance_activity_events
  where source_type = 'payment_attempt'
    and source_id = attempt_id
    and event_type = 'payment_attempt_initiated';
  if outbox_pending is distinct from true then
    raise exception 'Payment-attempt activity event did not retain retryable notification state';
  end if;
end;
$notification_outage$;

drop trigger akiba_test_fail_finance_notification on public.akiba_group_notifications;
drop function public.akiba_test_fail_finance_notification();

select * from public.akiba_process_due_finance_notifications(50, clock_timestamp() + interval '5 minutes');

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
  (id, group_id, initiator_id, currency_code, recipient_amount_minor, total_debit_minor,
   akiba_fee_minor, provider_fee_minor, fee_rate_bps, fee_schedule_version,
   provider_id, provider_quote_ref, quote_expires_at, recipient_name,
   destination_token, destination_fingerprint, destination_snapshot, reason)
values
  ('40000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001', 'KES', 1000, 1000,
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

  select count(*) into notification_count
  from public.akiba_group_notifications
  where group_id = '10000000-0000-0000-0000-000000000001'
    and event_type = 'financial_contribution_initiated';
  if notification_count <> active_member_count then
    raise exception 'Every active member, including a muted contributor, must receive contribution initiation notice';
  end if;

  select count(*) into notification_count
  from public.akiba_group_notifications
  where group_id = '10000000-0000-0000-0000-000000000001'
    and event_type = 'financial_payment_attempt_initiated';
  if notification_count <> active_member_count then
    raise exception 'Every active member must receive payment-attempt initiation notice';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  perform public.akiba_decide_withdrawal_request(
    '40000000-0000-0000-0000-000000000001','approved',null);
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
  perform public.akiba_decide_withdrawal_request(
    '40000000-0000-0000-0000-000000000001','approved',null);

  select status into request_status
  from public.akiba_withdrawal_requests
  where id = '40000000-0000-0000-0000-000000000001';
  if request_status <> 'pending_approval' then
    raise exception 'Withdrawal entered staging before every snapshotted Admin approved';
  end if;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
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
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
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
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true);
  flag_id := public.akiba_flag_withdrawal(
    '40000000-0000-0000-0000-000000000001','I do not recognize this recipient.');
  perform public.akiba_remove_withdrawal_flag(flag_id);

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', true);
  second_flag_id := public.akiba_flag_withdrawal(
    '40000000-0000-0000-0000-000000000001','Please verify the withdrawal purpose.');

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true);
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
    (id, group_id, initiator_id, currency_code, recipient_amount_minor, total_debit_minor,
     akiba_fee_minor, provider_fee_minor, fee_rate_bps, fee_schedule_version,
     provider_id, provider_quote_ref, quote_expires_at, recipient_name,
     destination_token, destination_fingerprint, destination_snapshot, reason)
  values
    ('40000000-0000-0000-0000-000000000002',
     '10000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000001', 'KES', 1000, 1000,
     0, 0, 0, 'test-v1',
     '20000000-0000-0000-0000-000000000001', 'test-quote-2',
     clock_timestamp() + interval '2 hours', 'Test recipient',
     'test-destination-token-2', 'test-destination-fingerprint-2', '{"type":"test"}'::jsonb,
     'No-flag staging regression test');

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  perform public.akiba_decide_withdrawal_request(
    '40000000-0000-0000-0000-000000000002','approved',null);
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
  perform public.akiba_decide_withdrawal_request(
    '40000000-0000-0000-0000-000000000002','approved',null);
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
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
      (group_id, initiator_id, currency_code, recipient_amount_minor, total_debit_minor,
       akiba_fee_minor, provider_fee_minor, fee_rate_bps, fee_schedule_version,
       provider_id, provider_quote_ref, quote_expires_at, recipient_name,
       destination_token, destination_fingerprint, destination_snapshot, reason)
    values
      ('10000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000001', 'KES', 1000, 1000,
       0, 0, 0, 'test-v1',
       '20000000-0000-0000-0000-000000000001', 'test-quote-3',
       clock_timestamp() + interval '2 hours', 'Test recipient',
       'test-destination-token-3', 'test-destination-fingerprint-3', '{"type":"test"}'::jsonb,
       'Duplicate unresolved request test');
    raise exception 'Second unresolved withdrawal unexpectedly succeeded';
  exception when unique_violation then
    null;
  end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  perform public.akiba_cancel_withdrawal_request('40000000-0000-0000-0000-000000000002');
  select status into request_status
  from public.akiba_withdrawal_requests
  where id = '40000000-0000-0000-0000-000000000002';
  select status into reservation_status
  from public.akiba_financial_reservations
  where withdrawal_request_id = '40000000-0000-0000-0000-000000000002';
  if request_status <> 'cancelled' or reservation_status <> 'released' then
    raise exception 'Creator cancellation before payout submission must release the reservation';
  end if;

  if has_table_privilege('authenticated','public.akiba_withdrawal_flags','INSERT')
     or has_table_privilege('authenticated','public.akiba_withdrawal_flags','UPDATE')
     or has_table_privilege('authenticated','public.akiba_withdrawal_flags','DELETE') then
    raise exception 'Authenticated users must use flag RPCs, not direct table writes';
  end if;
end;
$test$;

rollback;
