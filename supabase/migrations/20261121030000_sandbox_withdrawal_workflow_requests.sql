-- Sandbox-only withdrawal workflow simulator.
-- Creates a non-money-moving quote source so Creator requests, reservations,
-- approvals, staging and flags can be demonstrated without claiming a payout
-- partner is connected or enabling payout submission.

begin;

alter table public.akiba_withdrawal_requests
  add column if not exists idempotency_key text;
create unique index if not exists akiba_withdrawal_request_idempotency_idx
  on public.akiba_withdrawal_requests(group_id, initiator_id, idempotency_key)
  where idempotency_key is not null;

create or replace function akiba_private.guard_withdrawal_terms_immutable()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
begin
  if row(
    new.approval_version, new.group_id, new.initiator_id, new.currency_code,
    new.recipient_amount_minor, new.akiba_fee_minor, new.provider_fee_minor,
    new.fee_rate_bps, new.fee_schedule_version, new.provider_id,
    new.provider_quote_ref, new.quote_expires_at, new.recipient_name,
    new.destination_token, new.destination_fingerprint,
    new.destination_snapshot, new.reason, new.terms_fingerprint,
    new.idempotency_key
  ) is distinct from row(
    old.approval_version, old.group_id, old.initiator_id, old.currency_code,
    old.recipient_amount_minor, old.akiba_fee_minor, old.provider_fee_minor,
    old.fee_rate_bps, old.fee_schedule_version, old.provider_id,
    old.provider_quote_ref, old.quote_expires_at, old.recipient_name,
    old.destination_token, old.destination_fingerprint,
    old.destination_snapshot, old.reason, old.terms_fingerprint,
    old.idempotency_key
  ) then
    raise exception 'Withdrawal terms are immutable; create a new request for changed terms';
  end if;

  if old.staging_started_at is not null
     and (
       new.staging_started_at is distinct from old.staging_started_at
       or new.staging_deadline_at is distinct from old.staging_deadline_at
     ) then
    raise exception 'The two-hour withdrawal staging deadline cannot be changed or restarted';
  end if;

  if old.approval_roster_frozen_at is not null
     and new.approval_roster_frozen_at is distinct from old.approval_roster_frozen_at then
    raise exception 'The withdrawal approval roster cannot be changed';
  end if;
  return new;
end;
$fn$;

insert into public.akiba_payment_providers (
  provider_code, display_name, is_enabled, capabilities
)
values (
  'sandbox_workflow_simulator',
  'Akiba Sandbox Workflow Simulator',
  true,
  jsonb_build_object(
    'environment', 'sandbox',
    'workflow_simulation', true,
    'collection', false,
    'payout', false,
    'status_inquiry', false,
    'callbacks', false,
    'refunds', false,
    'reversals', false,
    'fee_quotes', true,
    'split_settlement', false,
    'reconciliation_exports', false,
    'idempotency', true
  )
)
on conflict (provider_code) do update
set display_name = excluded.display_name,
    is_enabled = true,
    capabilities = excluded.capabilities,
    updated_at = clock_timestamp();

-- A simulation quote is sufficient to create a workflow request, but it is
-- deliberately NOT a payout capability. The payout-attempt guard continues
-- to require capabilities.payout=true, so this provider can never submit a
-- B2C/payment instruction.
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
begin
  perform 1 from public.akiba_groups where id = new.group_id for update;

  select p.is_enabled, p.provider_code, p.capabilities
    into provider_enabled, provider_code_value, provider_capabilities
  from public.akiba_payment_providers p
  where p.id = new.provider_id;

  is_workflow_simulation := coalesce(provider_capabilities ->> 'workflow_simulation', 'false') = 'true';

  if not found
     or provider_enabled is distinct from true
     or provider_capabilities ->> 'environment' is distinct from 'sandbox'
     or provider_capabilities ->> 'fee_quotes' is distinct from 'true'
     or (
       provider_capabilities ->> 'payout' is distinct from 'true'
       and not is_workflow_simulation
     ) then
    raise exception 'This payment provider is not enabled for sandbox withdrawal requests and trusted quotes';
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

  if nullif(btrim(new.provider_quote_ref), '') is null
     or new.quote_expires_at is null
     or new.quote_expires_at <= clock_timestamp() + interval '2 hours' then
    raise exception 'A provider fee quote must remain valid through the full two-hour staging period';
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
  simulator_provider_id uuid;
  simulator_enabled boolean;
  simulator_capabilities jsonb;
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

  perform akiba_private.assert_group_leadership_ready(p_group_id);

  select id, is_enabled, capabilities
    into simulator_provider_id, simulator_enabled, simulator_capabilities
  from public.akiba_payment_providers
  where provider_code = 'sandbox_workflow_simulator';

  if not found
     or simulator_enabled is distinct from true
     or simulator_capabilities ->> 'environment' is distinct from 'sandbox'
     or simulator_capabilities ->> 'workflow_simulation' is distinct from 'true'
     or simulator_capabilities ->> 'fee_quotes' is distinct from 'true'
     or simulator_capabilities ->> 'payout' is distinct from 'false' then
    raise exception 'Sandbox withdrawal workflow simulation is not enabled';
  end if;

  insert into public.akiba_withdrawal_requests (
    group_id, initiator_id, currency_code, recipient_amount_minor,
    akiba_fee_minor, provider_fee_minor, fee_rate_bps, fee_schedule_version,
    provider_id, provider_quote_ref, quote_expires_at, recipient_name,
    destination_token, destination_fingerprint, destination_snapshot, reason,
    idempotency_key
  ) values (
    p_group_id, actor_id, group_currency, p_recipient_amount_minor,
    0, 0, 0, 'sandbox-simulation-zero-fee-v1',
    simulator_provider_id, 'SIM-' || gen_random_uuid()::text,
    clock_timestamp() + interval '3 hours',
    btrim(p_recipient_name),
    'sandbox:' || destination_fingerprint_value,
    destination_fingerprint_value,
    jsonb_build_object(
      'mode', 'sandbox_workflow_only',
      'destination_label', normalized_destination,
      'payment_execution', 'disabled',
      'provider_code', 'sandbox_workflow_simulator'
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
  'Creates a Creator-authorized sandbox-only withdrawal workflow using a synthetic zero-fee quote and non-routable destination label. It cannot execute a payout or move funds.';

commit;
