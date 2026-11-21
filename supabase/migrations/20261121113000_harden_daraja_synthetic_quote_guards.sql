begin;

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
begin
  perform 1 from public.akiba_groups where id = new.group_id for update;
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
     or new.quote_expires_at <= clock_timestamp() + interval '2 hours' then
    raise exception 'A quote must remain valid through the full two-hour staging period';
  end if;
  return new;
end;
$fn$;

create or replace function akiba_private.guard_payout_attempt_insert()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  request_row public.akiba_withdrawal_requests%rowtype;
  roster_count integer;
  approved_count integer;
  provider_capabilities jsonb;
  provider_code_value text;
  synthetic_daraja_quote boolean;
begin
  if new.status is distinct from 'queued' then
    raise exception 'A payout attempt must be created in queued state before provider submission';
  end if;
  select * into request_row from public.akiba_withdrawal_requests
  where id = new.withdrawal_request_id for update;
  if not found or request_row.status <> 'payout_queued' then
    raise exception 'Payout execution requires a withdrawal that completed staging without active flags';
  end if;
  if new.provider_id <> request_row.provider_id then
    raise exception 'Payout provider must match the approved withdrawal provider';
  end if;

  perform 1 from public.akiba_financial_reservations
  where withdrawal_request_id = request_row.id and group_id = request_row.group_id
    and currency_code = request_row.currency_code and amount_minor = request_row.total_debit_minor
    and status = 'active' for update;
  if not found then
    raise exception 'Payout execution requires the exact active withdrawal reservation';
  end if;

  select capabilities, provider_code into provider_capabilities, provider_code_value
  from public.akiba_payment_providers where id = request_row.provider_id and is_enabled = true;
  if not found or provider_capabilities ->> 'payout' is distinct from 'true'
     or provider_capabilities ->> 'payout_submission_enabled' is distinct from 'true'
     or provider_capabilities ->> 'environment' is distinct from 'sandbox' then
    raise exception 'The selected provider is not enabled for sandbox payout submission';
  end if;
  synthetic_daraja_quote :=
    provider_code_value = 'safaricom_daraja'
    and provider_capabilities ->> 'synthetic_sandbox_quotes' = 'true';
  if provider_capabilities ->> 'fee_quotes' is distinct from 'true' and not synthetic_daraja_quote then
    raise exception 'Payout execution requires a supported quote type';
  end if;
  if synthetic_daraja_quote and (
    request_row.fee_schedule_version <> 'sandbox-daraja-synthetic-zero-fee-v1'
    or request_row.akiba_fee_minor <> 0 or request_row.provider_fee_minor <> 0
    or left(coalesce(request_row.provider_quote_ref, ''), 13) <> 'SYNTH-DARAJA-'
    or request_row.destination_snapshot ->> 'quote_type' is distinct from 'synthetic_sandbox_zero_fee'
  ) then
    raise exception 'The Daraja sandbox payout request does not contain a valid synthetic quote';
  end if;

  if exists (select 1 from public.akiba_withdrawal_flags
    where withdrawal_request_id = request_row.id and status = 'active') then
    raise exception 'An active member flag blocks payout submission';
  end if;
  if request_row.quote_expires_at is null or request_row.quote_expires_at <= clock_timestamp() then
    raise exception 'The approved quote has expired; obtain a new quote and a fresh approval cycle';
  end if;

  select count(*) into roster_count from public.akiba_withdrawal_approval_roster
  where withdrawal_request_id = request_row.id;
  select count(distinct a.approver_id) into approved_count
  from public.akiba_withdrawal_approvals a
  join public.akiba_withdrawal_approval_roster roster
    on roster.withdrawal_request_id = a.withdrawal_request_id
   and roster.admin_user_id = a.approver_id
  where a.withdrawal_request_id = request_row.id
    and a.approval_version = request_row.approval_version and a.decision = 'approved';
  if roster_count < 3 or approved_count <> roster_count then
    raise exception 'Every Group Admin in the request-time approval roster must approve';
  end if;
  return new;
end;
$fn$;

commit;