-- Trusted withdrawal workflow entry points (v1).
-- These RPCs create auditable requests and approval decisions only.
-- They do not call a provider, move money, or mark a payout complete.

begin;

create or replace function public.akiba_create_withdrawal_request(
  p_group_id uuid,
  p_recipient_amount_minor bigint,
  p_akiba_fee_minor bigint,
  p_provider_fee_minor bigint,
  p_fee_rate_bps integer,
  p_fee_schedule_version text,
  p_provider_id uuid,
  p_provider_quote_ref text,
  p_quote_expires_at timestamptz,
  p_recipient_name text,
  p_destination_token text,
  p_destination_fingerprint text,
  p_destination_snapshot jsonb,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  request_id uuid;
  group_currency text;
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_group_id is null
     or p_recipient_amount_minor is null or p_recipient_amount_minor <= 0
     or p_akiba_fee_minor is null or p_akiba_fee_minor < 0
     or p_provider_fee_minor is null or p_provider_fee_minor < 0
     or p_fee_rate_bps is null or p_fee_rate_bps not between 0 and 10000
     or p_fee_schedule_version is null or char_length(btrim(p_fee_schedule_version)) not between 1 and 80
     or p_provider_id is null
     or p_recipient_name is null or char_length(btrim(p_recipient_name)) not between 1 and 160
     or p_reason is null or char_length(btrim(p_reason)) not between 1 and 500
     or (p_destination_snapshot is not null and jsonb_typeof(p_destination_snapshot) <> 'object') then
    raise exception 'Invalid withdrawal request details';
  end if;

  if p_quote_expires_at is not null and p_quote_expires_at <= now() then
    raise exception 'The provider quote has expired; request a new quote';
  end if;

  select g.currency_code into group_currency
  from public.akiba_groups g
  where g.id = p_group_id;

  if group_currency is null then
    raise exception 'Group not found';
  end if;

  if not exists (
    select 1 from public.akiba_payment_providers p
    where p.id = p_provider_id and p.is_enabled
  ) then
    raise exception 'The selected payment provider is not enabled';
  end if;

  insert into public.akiba_withdrawal_requests (
    group_id, initiator_id, currency_code,
    recipient_amount_minor, akiba_fee_minor, provider_fee_minor,
    fee_rate_bps, fee_schedule_version, provider_id,
    provider_quote_ref, quote_expires_at,
    recipient_name, destination_token, destination_fingerprint,
    destination_snapshot, reason
  ) values (
    p_group_id, actor_id, group_currency,
    p_recipient_amount_minor, p_akiba_fee_minor, p_provider_fee_minor,
    p_fee_rate_bps, btrim(p_fee_schedule_version), p_provider_id,
    nullif(btrim(coalesce(p_provider_quote_ref, '')), ''),
    p_quote_expires_at,
    btrim(p_recipient_name), nullif(btrim(coalesce(p_destination_token, '')), ''),
    nullif(btrim(coalesce(p_destination_fingerprint, '')), ''),
    coalesce(p_destination_snapshot, '{}'::jsonb), btrim(p_reason)
  )
  returning id into request_id;

  return request_id;
end;
$fn$;

create or replace function public.akiba_decide_withdrawal_request(
  p_withdrawal_request_id uuid,
  p_decision text,
  p_rejection_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  request_row public.akiba_withdrawal_requests%rowtype;
  fingerprint text;
  approval_id uuid;
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;

  if p_withdrawal_request_id is null
     or p_decision not in ('approved', 'rejected')
     or (p_decision = 'rejected' and char_length(btrim(coalesce(p_rejection_reason, ''))) not between 1 and 500)
     or (p_decision = 'approved' and nullif(btrim(coalesce(p_rejection_reason, '')), '') is not null) then
    raise exception 'Invalid withdrawal decision';
  end if;

  select * into request_row
  from public.akiba_withdrawal_requests
  where id = p_withdrawal_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found';
  end if;

  if request_row.status <> 'pending_approval' then
    raise exception 'This withdrawal request is no longer accepting decisions';
  end if;

  if not exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = request_row.group_id
      and m.user_id = actor_id
      and m.role = 'sub_admin'
      and m.status = 'active'
  ) then
    raise exception 'Only a currently active sub-admin may approve or reject';
  end if;

  if actor_id = request_row.initiator_id then
    raise exception 'The withdrawal initiator cannot approve their own request';
  end if;

  fingerprint := encode(
    extensions.digest(convert_to(concat_ws('|',
      request_row.id::text,
      request_row.group_id::text,
      request_row.currency_code,
      request_row.recipient_amount_minor::text,
      request_row.akiba_fee_minor::text,
      request_row.provider_fee_minor::text,
      request_row.recipient_name,
      coalesce(request_row.destination_fingerprint, ''),
      request_row.fee_schedule_version,
      request_row.provider_id::text
    ), 'UTF8'), 'sha256'), 'hex'
  );

  insert into public.akiba_withdrawal_approvals (
    withdrawal_request_id, group_id, approver_id, decision,
    approval_version, terms_fingerprint, rejection_reason
  ) values (
    request_row.id, request_row.group_id, actor_id, p_decision,
    request_row.approval_version, fingerprint,
    case when p_decision = 'rejected' then btrim(p_rejection_reason) else null end
  )
  returning id into approval_id;

  return approval_id;
end;
$fn$;

-- Rejections resolve the workflow and must release the associated reservation.
-- Completed requests consume it; failed requests retain it until reconciliation.
create or replace function akiba_private.apply_withdrawal_approval_decision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  approved_count integer;
begin
  if new.decision = 'rejected' then
    update public.akiba_withdrawal_requests
      set status = 'rejected',
          resolved_at = new.decided_at,
          resolution_note = new.rejection_reason,
          updated_at = now()
    where id = new.withdrawal_request_id
      and status = 'pending_approval';

    update public.akiba_financial_reservations
      set status = 'released',
          resolved_at = new.decided_at
    where withdrawal_request_id = new.withdrawal_request_id
      and status = 'active';
  else
    select count(distinct a.approver_id) into approved_count
    from public.akiba_withdrawal_approvals a
    where a.withdrawal_request_id = new.withdrawal_request_id
      and a.approval_version = new.approval_version
      and a.decision = 'approved';

    if approved_count >= 2 then
      update public.akiba_withdrawal_requests
        set status = 'approved',
            approved_at = now(),
            updated_at = now()
      where id = new.withdrawal_request_id
        and status = 'pending_approval';
    end if;
  end if;

  insert into public.akiba_finance_activity_events
    (group_id, actor_id, event_type, source_type, source_id, event_payload)
  select r.group_id, new.approver_id,
    case when new.decision = 'approved' then 'withdrawal_approved' else 'withdrawal_rejected' end,
    'withdrawal_approval', new.id,
    jsonb_build_object('withdrawal_request_id', new.withdrawal_request_id,
      'decision', new.decision, 'approval_version', new.approval_version,
      'rejection_reason', new.rejection_reason)
  from public.akiba_withdrawal_requests r
  where r.id = new.withdrawal_request_id;

  return new;
end;
$fn$;

revoke all on function public.akiba_create_withdrawal_request(
  uuid, bigint, bigint, bigint, integer, text, uuid, text, timestamptz,
  text, text, text, jsonb, text
) from public, anon;
revoke all on function public.akiba_decide_withdrawal_request(uuid, text, text) from public, anon;
grant execute on function public.akiba_create_withdrawal_request(
  uuid, bigint, bigint, bigint, integer, text, uuid, text, timestamptz,
  text, text, text, jsonb, text
) to authenticated;
grant execute on function public.akiba_decide_withdrawal_request(uuid, text, text) to authenticated;

revoke all on function akiba_private.apply_withdrawal_approval_decision() from public, anon, authenticated;

commit;
