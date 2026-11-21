-- Connect new sandbox withdrawal requests to Safaricom Daraja.
-- The quote is explicitly synthetic and no payout submission is enabled here.
begin;

insert into public.akiba_payment_providers (
  provider_code, display_name, is_enabled, capabilities
)
values (
  'safaricom_daraja',
  'Safaricom Daraja (Sandbox)',
  true,
  jsonb_build_object(
    'environment', 'sandbox',
    'collection', true,
    'payout', true,
    'payout_submission_enabled', false,
    'status_inquiry', true,
    'callbacks', true,
    'refunds', false,
    'reversals', false,
    'fee_quotes', false,
    'synthetic_sandbox_quotes', true,
    'fee_quote_mode', 'synthetic_sandbox_zero_fee',
    'split_settlement', false,
    'reconciliation_exports', false,
    'idempotency', false
  )
)
on conflict (provider_code) do update
set display_name = excluded.display_name,
    is_enabled = excluded.is_enabled,
    capabilities = excluded.capabilities,
    updated_at = clock_timestamp();

-- A synthetic Akiba sandbox quote is not a Safaricom fee quote. Keep it
-- explicitly distinguishable in the immutable request terms and provider row.
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

  if not found
     or provider_enabled is distinct from true
     or provider_capabilities ->> 'environment' is distinct from 'sandbox'
     or (
       provider_capabilities ->> 'payout' is distinct from 'true'
       and not is_workflow_simulation
     )
     or (
       provider_capabilities ->> 'fee_quotes' is distinct from 'true'
       and not is_synthetic_daraja_quote
     ) then
    raise exception 'This payment provider is not enabled for sandbox withdrawal requests and quotes';
  end if;

  if is_workflow_simulation and (
    provider_code_value <> 'sandbox_workflow_simulator'
    or new.fee_schedule_version <> 'sandbox-simulation-zero-fee-v1'
    or new.akiba_fee_minor <> 0
    or new.provider_fee_minor <> 0
    or left(coalesce(new.provider_quote_ref, ''), 4) <> 'SIM-'
  ) then
    raise exception 'Sandbox workflow simulation must use its fixed zero-fee simulation quote';
  end if;

  if is_synthetic_daraja_quote and (
    new.currency_code <> 'KES'
    or new.fee_schedule_version <> 'sandbox-daraja-synthetic-zero-fee-v1'
    or new.akiba_fee_minor <> 0
    or new.provider_fee_minor <> 0
    or left(coalesce(new.provider_quote_ref, ''), 13) <> 'SYNTH-DARAJA-'
    or new.destination_snapshot ->> 'quote_type' is distinct from 'synthetic_sandbox_zero_fee'
    or new.destination_snapshot ->> 'fee_source' is distinct from 'akiba_sandbox_fixture_not_safaricom'
  ) then
    raise exception 'Daraja sandbox requests must use the explicitly synthetic KES zero-fee quote';
  end if;

  if nullif(btrim(new.provider_quote_ref), '') is null
     or new.quote_expires_at is null
     or new.quote_expires_at <= clock_timestamp() + interval '2 hours' then
    raise exception 'A quote must remain valid through the full two-hour staging period';
  end if;

  return new;
end;
$fn$;

-- Do not allow queued payout attempts until a later, separately reviewed
-- execution step enables this capability after the worker and callbacks exist.
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

  select * into request_row
  from public.akiba_withdrawal_requests
  where id = new.withdrawal_request_id
  for update;
  if not found or request_row.status <> 'payout_queued' then
    raise exception 'Payout execution requires a withdrawal that completed staging without active flags';
  end if;
  if new.provider_id <> request_row.provider_id then
    raise exception 'Payout provider must match the approved withdrawal provider';
  end if;

  perform 1 from public.akiba_financial_reservations
  where withdrawal_request_id = request_row.id
    and group_id = request_row.group_id
    and currency_code = request_row.currency_code
    and amount_minor = request_row.total_debit_minor
    and status = 'active'
  for update;
  if not found then
    raise exception 'Payout execution requires the exact active withdrawal reservation';
  end if;

  select capabilities, provider_code
    into provider_capabilities, provider_code_value
  from public.akiba_payment_providers
  where id = request_row.provider_id
    and is_enabled = true;
  if not found
     or provider_capabilities ->> 'payout' is distinct from 'true'
     or provider_capabilities ->> 'payout_submission_enabled' is distinct from 'true'
     or provider_capabilities ->> 'environment' is distinct from 'sandbox' then
    raise exception 'The selected provider is not enabled for sandbox payout submission';
  end if;

  synthetic_daraja_quote :=
    provider_code_value = 'safaricom_daraja'
    and provider_capabilities ->> 'synthetic_sandbox_quotes' = 'true';

  if provider_capabilities ->> 'fee_quotes' is distinct from 'true'
     and not synthetic_daraja_quote then
    raise exception 'Payout execution requires a supported quote type';
  end if;

  if synthetic_daraja_quote and (
    request_row.fee_schedule_version <> 'sandbox-daraja-synthetic-zero-fee-v1'
    or request_row.akiba_fee_minor <> 0
    or request_row.provider_fee_minor <> 0
    or left(coalesce(request_row.provider_quote_ref, ''), 13) <> 'SYNTH-DARAJA-'
    or request_row.destination_snapshot ->> 'quote_type' is distinct from 'synthetic_sandbox_zero_fee'
  ) then
    raise exception 'The Daraja sandbox payout request does not contain a valid synthetic quote';
  end if;

  if exists (
    select 1 from public.akiba_withdrawal_flags
    where withdrawal_request_id = request_row.id
      and status = 'active'
  ) then
    raise exception 'An active member flag blocks payout submission';
  end if;

  if request_row.quote_expires_at is null
     or request_row.quote_expires_at <= clock_timestamp() then
    raise exception 'The approved quote has expired; obtain a new quote and a fresh approval cycle';
  end if;

  select count(*) into roster_count
  from public.akiba_withdrawal_approval_roster
  where withdrawal_request_id = request_row.id;
  select count(distinct a.approver_id) into approved_count
  from public.akiba_withdrawal_approvals a
  join public.akiba_withdrawal_approval_roster roster
    on roster.withdrawal_request_id = a.withdrawal_request_id
   and roster.admin_user_id = a.approver_id
  where a.withdrawal_request_id = request_row.id
    and a.approval_version = request_row.approval_version
    and a.decision = 'approved';

  if roster_count < 3 or approved_count <> roster_count then
    raise exception 'Every Group Admin in the request-time approval roster must approve';
  end if;
  return new;
end;
$fn$;

create or replace function public.akiba_create_sandbox_withdrawal_request(
  p_group_id uuid,
  p_recipient_amount_minor bigint,
  p_recipient_name text,
  p_destination_label text,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  actor_id uuid := auth.uid();
  group_currency text;
  group_status text;
  daraja_provider_id uuid;
  daraja_enabled boolean;
  daraja_capabilities jsonb;
  request_id uuid;
  normalized_destination text;
  destination_fingerprint_value text;
  existing_request public.akiba_withdrawal_requests%rowtype;
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_group_id is null
     or p_recipient_amount_minor is null
     or p_recipient_amount_minor < 100
     or p_recipient_amount_minor > 25000000
     or char_length(btrim(coalesce(p_recipient_name, ''))) not between 1 and 160
     or char_length(btrim(coalesce(p_destination_label, ''))) not between 3 and 48
     or btrim(coalesce(p_destination_label, '')) !~ '^[A-Za-z0-9][A-Za-z0-9 _.-]{2,47}$'
     or char_length(btrim(coalesce(p_reason, ''))) not between 1 and 500
     or char_length(btrim(coalesce(p_idempotency_key, ''))) not between 8 and 160 then
    raise exception 'Enter a valid amount, recipient, sandbox destination label and withdrawal purpose';
  end if;

  normalized_destination := upper(btrim(p_destination_label));
  destination_fingerprint_value := encode(
    extensions.digest(convert_to(normalized_destination, 'UTF8'), 'sha256'), 'hex'
  );

  select currency_code, status
    into group_currency, group_status
  from public.akiba_groups
  where id = p_group_id
  for update;

  if not found then
    raise exception 'Group not found';
  end if;
  if group_status <> 'active' then
    raise exception 'Withdrawals are unavailable for a deactivated group';
  end if;

  if not exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = p_group_id
      and m.user_id = actor_id
      and m.role = 'group_creator'
      and m.status = 'active'
  ) then
    raise exception 'Only the active Group Creator may request a withdrawal';
  end if;

  select * into existing_request
  from public.akiba_withdrawal_requests
  where group_id = p_group_id
    and initiator_id = actor_id
    and idempotency_key = btrim(p_idempotency_key)
  for update;

  if found then
    if existing_request.recipient_amount_minor = p_recipient_amount_minor
       and existing_request.recipient_name = btrim(p_recipient_name)
       and existing_request.destination_fingerprint = destination_fingerprint_value
       and existing_request.reason = btrim(p_reason) then
      return existing_request.id;
    end if;
    raise exception 'Withdrawal idempotency key was already used with different request terms';
  end if;

  if exists (
    select 1 from public.akiba_withdrawal_requests w
    where w.group_id = p_group_id
      and w.status in (
        'pending_approval','approved','staging','payout_queued',
        'payout_submitted','payout_processing','reconciliation_required',
        'processing','failed_pending_reconciliation'
      )
  ) then
    raise exception 'This group already has an unresolved withdrawal. Resolve it before creating another.';
  end if;

  perform akiba_private.assert_group_leadership_ready(p_group_id);

  select id, is_enabled, capabilities
    into daraja_provider_id, daraja_enabled, daraja_capabilities
  from public.akiba_payment_providers
  where provider_code = 'safaricom_daraja';

  if not found
     or daraja_enabled is distinct from true
     or daraja_capabilities ->> 'environment' is distinct from 'sandbox'
     or daraja_capabilities ->> 'payout' is distinct from 'true'
     or daraja_capabilities ->> 'synthetic_sandbox_quotes' is distinct from 'true' then
    raise exception 'Safaricom Daraja sandbox withdrawal requests are not enabled';
  end if;

  if group_currency <> 'KES' then
    raise exception 'Safaricom Daraja sandbox withdrawals currently support KES groups only';
  end if;

  insert into public.akiba_withdrawal_requests (
    group_id, initiator_id, currency_code, recipient_amount_minor,
    akiba_fee_minor, provider_fee_minor, fee_rate_bps, fee_schedule_version,
    provider_id, provider_quote_ref, quote_expires_at, recipient_name,
    destination_token, destination_fingerprint, destination_snapshot, reason,
    idempotency_key
  ) values (
    p_group_id, actor_id, group_currency, p_recipient_amount_minor,
    0, 0, 0, 'sandbox-daraja-synthetic-zero-fee-v1',
    daraja_provider_id, 'SYNTH-DARAJA-' || gen_random_uuid()::text,
    clock_timestamp() + interval '3 hours',
    btrim(p_recipient_name),
    'sandbox:' || destination_fingerprint_value,
    destination_fingerprint_value,
    jsonb_build_object(
      'mode', 'sandbox_daraja',
      'destination_label', normalized_destination,
      'destination_routing', 'server_configured_test_recipient',
      'recipient_phone_source', 'server_environment',
      'quote_type', 'synthetic_sandbox_zero_fee',
      'fee_source', 'akiba_sandbox_fixture_not_safaricom',
      'payment_execution', 'disabled_until_payout_worker',
      'provider_code', 'safaricom_daraja'
    ),
    btrim(p_reason),
    btrim(p_idempotency_key)
  )
  returning id into request_id;

  return request_id;
end;
$fn$;

revoke all on function public.akiba_create_sandbox_withdrawal_request(uuid,bigint,text,text,text,text) from public, anon;
grant execute on function public.akiba_create_sandbox_withdrawal_request(uuid,bigint,text,text,text,text) to authenticated;

comment on function public.akiba_create_sandbox_withdrawal_request(uuid,bigint,text,text,text,text) is
  'Creates a Creator-authorized Daraja sandbox withdrawal request using an explicitly synthetic KES zero-fee quote and a non-routable destination label. Payout submission remains disabled until the separately reviewed payout worker is enabled.';

commit;