-- Trusted withdrawal approval RPC (v1).
-- This exposes approval decisions only. Withdrawal creation is deliberately
-- withheld until trusted fee-quote and provider-destination services exist.
-- No provider call, money movement, ledger posting, or payout completion occurs.

begin;

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
     or p_decision is null
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

-- A rejection resolves the workflow and releases its reservation. A failed
-- payout remains reserved until reconciliation; completion consumes it later.
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

revoke all on function public.akiba_decide_withdrawal_request(uuid, text, text) from public, anon;
grant execute on function public.akiba_decide_withdrawal_request(uuid, text, text) to authenticated;
revoke all on function akiba_private.apply_withdrawal_approval_decision() from public, anon, authenticated;

commit;
