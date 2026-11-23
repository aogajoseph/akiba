begin;

-- A per-group staging duration. Normal groups retain the two-hour default;
-- only Globe Technologies HQ is shortened for controlled Preview testing.
alter table public.akiba_groups
  add column if not exists withdrawal_staging_seconds integer not null default 7200;

do $constraint$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'akiba_groups_withdrawal_staging_seconds_check'
      and conrelid = 'public.akiba_groups'::regclass
  ) then
    alter table public.akiba_groups
      add constraint akiba_groups_withdrawal_staging_seconds_check
      check (withdrawal_staging_seconds in (300, 7200));
  end if;
end;
$constraint$;

update public.akiba_groups
set withdrawal_staging_seconds = 300,
    updated_at = clock_timestamp()
where id = 'ff4d3bbf-7d7d-4513-a083-be85d876b908'
  and name = 'Globe Technologies HQ';

-- Quote validity must cover the configured staging period, not a hard-coded
-- two hours. This also preserves the default for all other groups.
create or replace function akiba_private.guard_withdrawal_provider_capability()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  provider_enabled boolean;
  provider_code_value text;
  provider_capabilities jsonb;
  is_workflow_simulation boolean;
  is_synthetic_daraja_quote boolean;
  staging_seconds integer;
begin
  perform 1 from public.akiba_groups where id = new.group_id for update;
  select coalesce(g.withdrawal_staging_seconds, 7200)
    into staging_seconds
  from public.akiba_groups g
  where g.id = new.group_id;

  select p.is_enabled, p.provider_code, p.capabilities
    into provider_enabled, provider_code_value, provider_capabilities
  from public.akiba_payment_providers p
  where p.id = new.provider_id;

  is_workflow_simulation := coalesce(provider_capabilities ->> 'workflow_simulation', 'false') = 'true';
  is_synthetic_daraja_quote :=
    provider_code_value = 'safaricom_daraja'
    and provider_capabilities ->> 'synthetic_sandbox_quotes' = 'true';

  if not found or provider_enabled is distinct from true
     or provider_capabilities ->> 'environment' is distinct from 'sandbox'
     or (provider_capabilities ->> 'payout' is distinct from 'true' and not is_workflow_simulation)
     or (provider_capabilities ->> 'fee_quotes' is distinct from 'true' and not is_synthetic_daraja_quote) then
    raise exception 'This payment provider is not enabled for sandbox withdrawal requests and quotes';
  end if;

  if is_workflow_simulation and (
    provider_code_value <> 'sandbox_workflow_simulator'
    or new.fee_schedule_version <> 'sandbox-simulation-zero-fee-v1'
    or new.akiba_fee_minor <> 0 or new.provider_fee_minor <> 0
    or left(coalesce(new.provider_quote_ref, ''), 4) <> 'SIM-'
  ) then
    raise exception 'Sandbox workflow simulation must use its fixed zero-fee simulation quote';
  end if;

  if is_synthetic_daraja_quote and (
    new.currency_code <> 'KES'
    or new.fee_schedule_version <> 'sandbox-daraja-synthetic-zero-fee-v1'
    or new.akiba_fee_minor <> 0 or new.provider_fee_minor <> 0
    or left(coalesce(new.provider_quote_ref, ''), 13) <> 'SYNTH-DARAJA-'
    or new.destination_snapshot ->> 'quote_type' is distinct from 'synthetic_sandbox_zero_fee'
    or new.destination_snapshot ->> 'fee_source' is distinct from 'akiba_sandbox_fixture_not_safaricom'
  ) then
    raise exception 'Daraja sandbox requests must use the explicitly synthetic KES zero-fee quote';
  end if;

  if nullif(btrim(new.provider_quote_ref), '') is null or new.quote_expires_at is null
     or new.quote_expires_at <= clock_timestamp() + make_interval(secs => staging_seconds) then
    raise exception 'A quote must remain valid through the configured withdrawal staging period';
  end if;
  return new;
end;
$fn$;

-- Start the exact per-group duration when the final Admin approves. If the
-- synthetic quote expired while approvals were pending, fail closed and have
-- the Creator cancel/recreate rather than enter an unpayable staging period.
create or replace function akiba_private.apply_withdrawal_approval_decision()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  roster_count integer;
  approved_count integer;
  v_started_at timestamptz;
  v_quote_expires_at timestamptz;
  v_staging_seconds integer;
  changed_rows integer;
  reservation_rows integer;
begin
  if new.decision = 'rejected' then
    update public.akiba_withdrawal_requests
    set status = 'rejected', resolved_at = new.decided_at,
        resolution_note = new.rejection_reason, updated_at = clock_timestamp()
    where id = new.withdrawal_request_id and status = 'pending_approval';
    get diagnostics changed_rows = row_count;
    if changed_rows <> 1 then raise exception 'Withdrawal request is no longer awaiting approval'; end if;
    update public.akiba_financial_reservations
    set status = 'released', resolved_at = new.decided_at
    where withdrawal_request_id = new.withdrawal_request_id and status = 'active';
    get diagnostics reservation_rows = row_count;
    if reservation_rows <> 1 then raise exception 'Withdrawal rejection requires exactly one active reservation'; end if;
  else
    select count(*) into roster_count from public.akiba_withdrawal_approval_roster
    where withdrawal_request_id = new.withdrawal_request_id;
    select count(distinct a.approver_id) into approved_count
    from public.akiba_withdrawal_approvals a
    join public.akiba_withdrawal_approval_roster roster
      on roster.withdrawal_request_id = a.withdrawal_request_id and roster.admin_user_id = a.approver_id
    where a.withdrawal_request_id = new.withdrawal_request_id
      and a.approval_version = new.approval_version and a.decision = 'approved';
    if roster_count < 3 then raise exception 'Withdrawal approval roster is incomplete'; end if;
    if approved_count = roster_count then
      v_started_at := clock_timestamp();
      select g.withdrawal_staging_seconds, w.quote_expires_at
        into v_staging_seconds, v_quote_expires_at
      from public.akiba_withdrawal_requests w
      join public.akiba_groups g on g.id = w.group_id
      where w.id = new.withdrawal_request_id
      for update of g;
      v_staging_seconds := coalesce(v_staging_seconds, 7200);
      if v_quote_expires_at is null
         or v_quote_expires_at <= v_started_at + make_interval(secs => v_staging_seconds) then
        raise exception 'The sandbox quote expired before staging could begin. Cancel this request and create a fresh one.';
      end if;

      update public.akiba_withdrawal_requests
      set status = 'staging', approved_at = v_started_at,
          staging_started_at = v_started_at,
          staging_deadline_at = v_started_at + make_interval(secs => v_staging_seconds),
          updated_at = v_started_at
      where id = new.withdrawal_request_id and status = 'pending_approval';
      get diagnostics changed_rows = row_count;
      if changed_rows <> 1 then raise exception 'Withdrawal request could not enter staging after final approval'; end if;
      insert into public.akiba_finance_activity_events
        (group_id, actor_id, event_type, source_type, source_id, event_payload)
      select r.group_id, new.approver_id, 'withdrawal_staging_started', 'withdrawal_request', r.id,
        jsonb_build_object(
          'staging_started_at', v_started_at,
          'staging_deadline_at', v_started_at + make_interval(secs => v_staging_seconds),
          'staging_duration_seconds', v_staging_seconds,
          'approval_count', approved_count
        )
      from public.akiba_withdrawal_requests r where r.id = new.withdrawal_request_id;
    end if;
  end if;
  insert into public.akiba_finance_activity_events
    (group_id, actor_id, event_type, source_type, source_id, event_payload)
  select r.group_id, new.approver_id,
    case when new.decision = 'approved' then 'withdrawal_approved' else 'withdrawal_rejected' end,
    'withdrawal_approval', new.id,
    jsonb_build_object('withdrawal_request_id', new.withdrawal_request_id, 'decision', new.decision,
      'approval_version', new.approval_version, 'rejection_reason', new.rejection_reason)
  from public.akiba_withdrawal_requests r where r.id = new.withdrawal_request_id;
  return new;
end;
$fn$;

-- Explicit one-request claim. The worker cannot pick up another queued item,
-- and any existing attempt blocks a second B2C instruction for this request.
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

revoke all on function public.akiba_claim_daraja_sandbox_payout_for_request(uuid)
  from public, anon, authenticated;
grant execute on function public.akiba_claim_daraja_sandbox_payout_for_request(uuid)
  to service_role;

revoke all on function akiba_private.guard_withdrawal_provider_capability()
  from public, anon, authenticated;
revoke all on function akiba_private.apply_withdrawal_approval_decision()
  from public, anon, authenticated;

commit;
