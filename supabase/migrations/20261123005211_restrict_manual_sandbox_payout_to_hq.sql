begin;

-- The operator trigger is deliberately limited to the designated Globe HQ
-- test group. No other group's queued withdrawal can be claimed by this route.
create or replace function public.akiba_claim_daraja_sandbox_payout_for_request(
  p_withdrawal_request_id uuid
)
returns table (
  payout_attempt_id uuid,
  withdrawal_request_id uuid,
  request_reference text,
  recipient_amount_minor bigint,
  currency_code text,
  provider_id uuid
)
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  request_row public.akiba_withdrawal_requests%rowtype;
  provider_row public.akiba_payment_providers%rowtype;
  attempt_id uuid;
  reference_value text;
  active_reservations integer;
  roster_count integer;
  approved_count integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Service role is required to claim sandbox payouts';
  end if;
  if p_withdrawal_request_id is null then
    raise exception 'A withdrawal request ID is required';
  end if;

  select * into provider_row
  from public.akiba_payment_providers
  where provider_code = 'safaricom_daraja' and is_enabled = true
  for share;

  if not found
     or provider_row.capabilities ->> 'environment' is distinct from 'sandbox'
     or provider_row.capabilities ->> 'payout_submission_enabled' is distinct from 'true' then
    return;
  end if;

  select r.* into request_row
  from public.akiba_withdrawal_requests r
  where r.id = p_withdrawal_request_id
    and r.group_id = 'ff4d3bbf-7d7d-4513-a083-be85d876b908'::uuid
    and r.provider_id = provider_row.id
    and r.status = 'payout_queued'
    and r.currency_code = 'KES'
    and r.fee_schedule_version = 'sandbox-daraja-synthetic-zero-fee-v1'
    and r.akiba_fee_minor = 0
    and r.provider_fee_minor = 0
    and r.provider_quote_ref like 'SYNTH-DARAJA-%'
    and r.destination_snapshot ->> 'quote_type' = 'synthetic_sandbox_zero_fee'
    and r.destination_snapshot ->> 'fee_source' = 'akiba_sandbox_fixture_not_safaricom'
    and r.quote_expires_at > clock_timestamp()
    and not exists (
      select 1 from public.akiba_withdrawal_flags f
      where f.withdrawal_request_id = r.id and f.status = 'active'
    )
    and not exists (
      select 1 from public.akiba_payout_attempts a
      where a.withdrawal_request_id = r.id
    )
  for update of r skip locked;
  if not found then return; end if;

  select count(*) into active_reservations
  from public.akiba_financial_reservations fr
  where fr.withdrawal_request_id = request_row.id
    and fr.group_id = request_row.group_id
    and fr.currency_code = request_row.currency_code
    and fr.amount_minor = request_row.total_debit_minor
    and fr.status = 'active';
  if active_reservations <> 1 then
    raise exception 'Payout claim requires exactly one matching active reservation';
  end if;

  select count(*) into roster_count
  from public.akiba_withdrawal_approval_roster ar
  where ar.withdrawal_request_id = request_row.id;
  select count(distinct a.approver_id) into approved_count
  from public.akiba_withdrawal_approvals a
  join public.akiba_withdrawal_approval_roster ar
    on ar.withdrawal_request_id = a.withdrawal_request_id
   and ar.admin_user_id = a.approver_id
  where a.withdrawal_request_id = request_row.id
    and a.approval_version = request_row.approval_version
    and a.decision = 'approved';
  if roster_count < 3 or approved_count <> roster_count then
    raise exception 'Payout claim requires every Group Admin in the frozen approval roster';
  end if;

  reference_value := replace(request_row.id::text, '-', '');
  insert into public.akiba_payout_attempts (
    withdrawal_request_id, provider_id, status, request_reference,
    provider_fee_minor, reconciliation_status
  ) values (
    request_row.id, provider_row.id, 'queued', reference_value,
    request_row.provider_fee_minor, 'pending'
  ) returning id into attempt_id;

  update public.akiba_payout_attempts
  set status = 'submitted', submitted_at = clock_timestamp(),
      updated_at = clock_timestamp(),
      reconciliation_note = 'Manual Preview sandbox submission claimed; provider response pending.'
  where id = attempt_id and status = 'queued';

  update public.akiba_withdrawal_requests
  set status = 'payout_submitted',
      submitted_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = request_row.id and status = 'payout_queued';

  payout_attempt_id := attempt_id;
  withdrawal_request_id := request_row.id;
  request_reference := reference_value;
  recipient_amount_minor := request_row.recipient_amount_minor;
  currency_code := request_row.currency_code;
  provider_id := provider_row.id;
  return next;
end;
$fn$;


commit;
