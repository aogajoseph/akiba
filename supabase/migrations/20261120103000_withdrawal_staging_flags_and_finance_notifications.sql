-- Creator/Admin withdrawal approval snapshot, two-hour staging, member flags,
-- durable finance notifications, and server-side staging processing.
-- Feature-branch migration only. Do not apply to production without separate approval.

begin;

alter table public.akiba_withdrawal_requests
  add column if not exists staging_started_at timestamptz,
  add column if not exists staging_deadline_at timestamptz,
  add column if not exists terms_fingerprint text,
  add column if not exists approval_roster_frozen_at timestamptz;

alter table public.akiba_withdrawal_requests
  drop constraint if exists akiba_withdrawal_requests_status_check;
alter table public.akiba_withdrawal_requests
  add constraint akiba_withdrawal_requests_status_check
  check (status = any (array[
    'pending_approval','approved','staging','payout_queued','payout_submitted',
    'payout_processing','reconciliation_required','processing','completed',
    'rejected','cancelled','cancelled_flagged','failed_pending_reconciliation','failed'
  ]::text[]));

alter table public.akiba_withdrawal_requests
  drop constraint if exists akiba_withdrawal_requests_check1;
alter table public.akiba_withdrawal_requests
  add constraint akiba_withdrawal_requests_check1
  check (
    (status = any (array[
      'rejected','cancelled','cancelled_flagged','completed','failed'
    ]::text[])) = (resolved_at is not null)
  );

alter table public.akiba_withdrawal_requests
  drop constraint if exists akiba_withdrawal_staging_clock_check;
alter table public.akiba_withdrawal_requests
  add constraint akiba_withdrawal_staging_clock_check
  check (
    (staging_started_at is null) = (staging_deadline_at is null)
    and (
      staging_started_at is null
      or staging_deadline_at = staging_started_at + interval '2 hours'
    )
  );

drop index if exists public.akiba_one_unresolved_withdrawal_per_group;
create unique index akiba_one_unresolved_withdrawal_per_group
  on public.akiba_withdrawal_requests(group_id)
  where status = any (array[
    'pending_approval','approved','staging','payout_queued','payout_submitted',
    'payout_processing','reconciliation_required','processing','failed_pending_reconciliation'
  ]::text[]);

create table public.akiba_withdrawal_approval_roster (
  id uuid primary key default gen_random_uuid(),
  withdrawal_request_id uuid not null references public.akiba_withdrawal_requests(id) on delete restrict,
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  membership_id uuid not null references public.akiba_group_memberships(id) on delete restrict,
  snapshotted_at timestamptz not null default clock_timestamp(),
  unique (withdrawal_request_id, admin_user_id),
  unique (withdrawal_request_id, membership_id)
);

create index akiba_withdrawal_approval_roster_group_idx
  on public.akiba_withdrawal_approval_roster(group_id, withdrawal_request_id);

alter table public.akiba_withdrawal_approval_roster enable row level security;
revoke all on public.akiba_withdrawal_approval_roster from public, anon, authenticated;
grant select on public.akiba_withdrawal_approval_roster to authenticated;
create policy akiba_withdrawal_approval_roster_active_members_read
  on public.akiba_withdrawal_approval_roster
  for select to authenticated
  using (akiba_private.is_active_group_member(group_id));

create table public.akiba_withdrawal_flags (
  id uuid primary key default gen_random_uuid(),
  withdrawal_request_id uuid not null references public.akiba_withdrawal_requests(id) on delete restrict,
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  member_id uuid not null references auth.users(id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  status text not null default 'active'
    check (status in ('active','removed_by_member','closed_by_system')),
  created_at timestamptz not null default clock_timestamp(),
  removed_at timestamptz,
  closed_at timestamptz,
  closure_reason text,
  check (
    (status = 'active' and removed_at is null and closed_at is null and closure_reason is null)
    or (status = 'removed_by_member' and removed_at is not null and closed_at is null)
    or (status = 'closed_by_system' and removed_at is null and closed_at is not null
        and closure_reason is not null)
  )
);

create unique index akiba_one_active_withdrawal_flag_per_member
  on public.akiba_withdrawal_flags(withdrawal_request_id, member_id)
  where status = 'active';
create index akiba_withdrawal_flags_due_idx
  on public.akiba_withdrawal_flags(withdrawal_request_id, status);

alter table public.akiba_withdrawal_flags enable row level security;
revoke all on public.akiba_withdrawal_flags from public, anon, authenticated;
grant select on public.akiba_withdrawal_flags to authenticated;
create policy akiba_withdrawal_flags_active_members_read
  on public.akiba_withdrawal_flags
  for select to authenticated
  using (akiba_private.is_active_group_member(group_id));

-- Enforce at least three active Group Admins, even if a legacy plan row
-- contains a lower required_group_admins value.
create or replace function akiba_private.assert_group_leadership_ready(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  required_count integer;
  active_admin_count integer;
begin
  select greatest(e.required_group_admins, 3) into required_count
  from public.akiba_groups g
  join public.akiba_group_plan_entitlements e on e.plan_code = g.group_plan_code
  where g.id = p_group_id;
  if required_count is null then
    raise exception 'Group or group plan was not found';
  end if;

  select count(*) into active_admin_count
  from public.akiba_group_memberships
  where group_id = p_group_id
    and role = 'group_admin'
    and status = 'active';

  if active_admin_count < required_count then
    raise exception 'Group leadership is incomplete: appoint at least % active Group Admins before contributions or withdrawals',
      required_count;
  end if;
end;
$fn$;

-- Freeze the request terms and approval roster at creation.
create or replace function akiba_private.set_withdrawal_terms_fingerprint()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
begin
  new.terms_fingerprint := encode(extensions.digest(convert_to(concat_ws('|',
    new.id::text, new.group_id::text, new.currency_code,
    new.recipient_amount_minor::text, new.akiba_fee_minor::text,
    new.provider_fee_minor::text, new.recipient_name,
    coalesce(new.destination_fingerprint, ''), new.fee_schedule_version,
    new.provider_id::text, coalesce(new.provider_quote_ref, '')
  ), 'UTF8'), 'sha256'), 'hex');
  return new;
end;
$fn$;

drop trigger if exists akiba_withdrawal_terms_fingerprint on public.akiba_withdrawal_requests;
create trigger akiba_withdrawal_terms_fingerprint
before insert on public.akiba_withdrawal_requests
for each row execute function akiba_private.set_withdrawal_terms_fingerprint();

-- Preserve a deterministic fingerprint for any legacy request already present.
update public.akiba_withdrawal_requests r
set terms_fingerprint = encode(extensions.digest(convert_to(concat_ws('|',
  r.id::text, r.group_id::text, r.currency_code,
  r.recipient_amount_minor::text, r.akiba_fee_minor::text,
  r.provider_fee_minor::text, r.recipient_name,
  coalesce(r.destination_fingerprint, ''), r.fee_schedule_version,
  r.provider_id::text, coalesce(r.provider_quote_ref, '')
), 'UTF8'), 'sha256'), 'hex')
where r.terms_fingerprint is null;

create or replace function akiba_private.guard_withdrawal_terms_immutable()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
begin
  if row(
    new.group_id, new.initiator_id, new.currency_code,
    new.recipient_amount_minor, new.akiba_fee_minor, new.provider_fee_minor,
    new.fee_rate_bps, new.fee_schedule_version, new.provider_id,
    new.provider_quote_ref, new.quote_expires_at, new.recipient_name,
    new.destination_token, new.destination_fingerprint,
    new.destination_snapshot, new.reason, new.terms_fingerprint
  ) is distinct from row(
    old.group_id, old.initiator_id, old.currency_code,
    old.recipient_amount_minor, old.akiba_fee_minor, old.provider_fee_minor,
    old.fee_rate_bps, old.fee_schedule_version, old.provider_id,
    old.provider_quote_ref, old.quote_expires_at, old.recipient_name,
    old.destination_token, old.destination_fingerprint,
    old.destination_snapshot, old.reason, old.terms_fingerprint
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

drop trigger if exists akiba_withdrawal_terms_immutable on public.akiba_withdrawal_requests;
create trigger akiba_withdrawal_terms_immutable
before update on public.akiba_withdrawal_requests
for each row execute function akiba_private.guard_withdrawal_terms_immutable();

-- New withdrawal requests are refused unless the selected provider is enabled
-- and explicitly supports both payout execution and trusted fee quotes.
create or replace function akiba_private.guard_withdrawal_provider_capability()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  provider_enabled boolean;
  provider_capabilities jsonb;
begin
  select is_enabled, capabilities
    into provider_enabled, provider_capabilities
  from public.akiba_payment_providers
  where id = new.provider_id;

  if not found
     or provider_enabled is distinct from true
     or provider_capabilities ->> 'payout' is distinct from 'true'
     or provider_capabilities ->> 'fee_quotes' is distinct from 'true' then
    raise exception 'This payment provider is not enabled for verified payout and fee-quote processing';
  end if;

  if nullif(btrim(new.provider_quote_ref), '') is null
     or new.quote_expires_at is null
     or new.quote_expires_at <= clock_timestamp() then
    raise exception 'A valid, unexpired provider fee quote is required';
  end if;
  return new;
end;
$fn$;

drop trigger if exists akiba_withdrawal_provider_capability_guard on public.akiba_withdrawal_requests;
create trigger akiba_withdrawal_provider_capability_guard
before insert on public.akiba_withdrawal_requests
for each row execute function akiba_private.guard_withdrawal_provider_capability();

create or replace function akiba_private.snapshot_withdrawal_approval_roster()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  roster_count integer;
begin
  insert into public.akiba_withdrawal_approval_roster
    (withdrawal_request_id, group_id, admin_user_id, membership_id)
  select new.id, new.group_id, m.user_id, m.id
  from public.akiba_group_memberships m
  where m.group_id = new.group_id
    and m.role = 'group_admin'
    and m.status = 'active'
  order by m.user_id;

  get diagnostics roster_count = row_count;
  if roster_count < 3 then
    raise exception 'At least three active Group Admins must be snapshotted for a withdrawal';
  end if;

  update public.akiba_withdrawal_requests
  set approval_roster_frozen_at = clock_timestamp()
  where id = new.id;

  return new;
end;
$fn$;

drop trigger if exists akiba_withdrawal_snapshot_admin_roster on public.akiba_withdrawal_requests;
create trigger akiba_withdrawal_snapshot_admin_roster
after insert on public.akiba_withdrawal_requests
for each row execute function akiba_private.snapshot_withdrawal_approval_roster();

-- Backfill the immutable roster for any request still awaiting decisions.
insert into public.akiba_withdrawal_approval_roster
  (withdrawal_request_id, group_id, admin_user_id, membership_id)
select r.id, r.group_id, m.user_id, m.id
from public.akiba_withdrawal_requests r
join public.akiba_group_memberships m
  on m.group_id = r.group_id
 and m.role = 'group_admin'
 and m.status = 'active'
where r.status in ('pending_approval','approved')
  and not exists (
    select 1 from public.akiba_withdrawal_approval_roster roster
    where roster.withdrawal_request_id = r.id
  )
on conflict do nothing;

update public.akiba_withdrawal_requests r
set approval_roster_frozen_at = coalesce(r.approval_roster_frozen_at, clock_timestamp())
where r.status in ('pending_approval','approved')
  and r.approval_roster_frozen_at is null
  and exists (
    select 1 from public.akiba_withdrawal_approval_roster roster
    where roster.withdrawal_request_id = r.id
  );

-- Legacy approved requests receive a fresh two-hour staging window after this
-- migration, rather than being released immediately on deployment.
update public.akiba_withdrawal_requests
set status = 'staging',
    staging_started_at = now(),
    staging_deadline_at = now() + interval '2 hours',
    updated_at = now()
where status = 'approved'
  and staging_started_at is null;

-- The approver must be both currently active and part of the immutable roster.
create or replace function akiba_private.guard_withdrawal_approval_insert()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  request_row public.akiba_withdrawal_requests%rowtype;
begin
  select * into request_row
  from public.akiba_withdrawal_requests
  where id = new.withdrawal_request_id
  for update;
  if not found then raise exception 'Withdrawal request not found'; end if;
  if new.group_id <> request_row.group_id then
    raise exception 'Approval group does not match the withdrawal request';
  end if;
  if request_row.status <> 'pending_approval'
     or new.approval_version <> request_row.approval_version then
    raise exception 'Withdrawal request is not accepting approvals for this version';
  end if;
  if new.approver_id = request_row.initiator_id then
    raise exception 'The Group Creator cannot approve their own withdrawal request';
  end if;
  if not exists (
    select 1
    from public.akiba_group_memberships m
    join public.akiba_withdrawal_approval_roster roster
      on roster.membership_id = m.id
     and roster.withdrawal_request_id = request_row.id
     and roster.admin_user_id = m.user_id
    where m.group_id = request_row.group_id
      and m.user_id = new.approver_id
      and m.role = 'group_admin'
      and m.status = 'active'
  ) then
    raise exception 'Only an active Group Admin in the request-time approval roster may decide this withdrawal';
  end if;
  if new.terms_fingerprint is distinct from request_row.terms_fingerprint then
    raise exception 'Approval terms do not match the immutable withdrawal request';
  end if;
  return new;
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
set search_path to ''
as $fn$
declare
  actor_id uuid := auth.uid();
  request_row public.akiba_withdrawal_requests%rowtype;
  approval_id uuid;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_withdrawal_request_id is null
     or p_decision is null
     or p_decision not in ('approved','rejected')
     or (p_decision = 'rejected' and char_length(btrim(coalesce(p_rejection_reason,''))) not between 1 and 500)
     or (p_decision = 'approved' and nullif(btrim(coalesce(p_rejection_reason,'')), '') is not null) then
    raise exception 'Invalid withdrawal decision';
  end if;

  select * into request_row
  from public.akiba_withdrawal_requests
  where id = p_withdrawal_request_id
  for update;
  if not found then raise exception 'Withdrawal request not found'; end if;
  if request_row.status <> 'pending_approval' then
    raise exception 'This withdrawal request is no longer accepting decisions';
  end if;
  if actor_id = request_row.initiator_id then
    raise exception 'The Group Creator cannot approve their own withdrawal request';
  end if;
  if not exists (
    select 1
    from public.akiba_group_memberships m
    join public.akiba_withdrawal_approval_roster roster
      on roster.withdrawal_request_id = request_row.id
     and roster.admin_user_id = actor_id
     and roster.membership_id = m.id
    where m.group_id = request_row.group_id
      and m.user_id = actor_id
      and m.role = 'group_admin'
      and m.status = 'active'
  ) then
    raise exception 'Only an active Group Admin in the request-time approval roster may decide this withdrawal';
  end if;

  insert into public.akiba_withdrawal_approvals (
    withdrawal_request_id, group_id, approver_id, decision,
    approval_version, terms_fingerprint, rejection_reason
  ) values (
    request_row.id, request_row.group_id, actor_id, p_decision,
    request_row.approval_version, request_row.terms_fingerprint,
    case when p_decision = 'rejected' then btrim(p_rejection_reason) else null end
  ) returning id into approval_id;
  return approval_id;
end;
$fn$;

revoke all on function public.akiba_decide_withdrawal_request(uuid,text,text) from public, anon;
grant execute on function public.akiba_decide_withdrawal_request(uuid,text,text) to authenticated;

-- Final approval starts the fixed two-hour staging clock. The roster, not
-- the current membership count, determines the complete approval set.
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
begin
  if new.decision = 'rejected' then
    update public.akiba_withdrawal_requests
    set status = 'rejected',
        resolved_at = new.decided_at,
        resolution_note = new.rejection_reason,
        updated_at = clock_timestamp()
    where id = new.withdrawal_request_id
      and status = 'pending_approval';

    update public.akiba_financial_reservations
    set status = 'released',
        resolved_at = new.decided_at
    where withdrawal_request_id = new.withdrawal_request_id
      and status = 'active';

    insert into public.akiba_finance_activity_events
      (group_id, actor_id, event_type, source_type, source_id, event_payload)
    select r.group_id, new.approver_id, 'withdrawal_rejected',
      'withdrawal_request', r.id,
      jsonb_build_object('approval_id', new.id, 'rejection_reason', new.rejection_reason)
    from public.akiba_withdrawal_requests r
    where r.id = new.withdrawal_request_id;
  else
    select count(*) into roster_count
    from public.akiba_withdrawal_approval_roster
    where withdrawal_request_id = new.withdrawal_request_id;

    select count(distinct a.approver_id) into approved_count
    from public.akiba_withdrawal_approvals a
    join public.akiba_withdrawal_approval_roster roster
      on roster.withdrawal_request_id = a.withdrawal_request_id
     and roster.admin_user_id = a.approver_id
    where a.withdrawal_request_id = new.withdrawal_request_id
      and a.approval_version = new.approval_version
      and a.decision = 'approved';

    if roster_count < 3 then
      raise exception 'Withdrawal approval roster is incomplete';
    end if;

    if approved_count = roster_count then
      v_started_at := clock_timestamp();
      update public.akiba_withdrawal_requests
      set status = 'staging',
          approved_at = v_started_at,
          staging_started_at = v_started_at,
          staging_deadline_at = v_started_at + interval '2 hours',
          updated_at = v_started_at
      where id = new.withdrawal_request_id
        and status = 'pending_approval';

      insert into public.akiba_finance_activity_events
        (group_id, actor_id, event_type, source_type, source_id, event_payload)
      select r.group_id, new.approver_id, 'withdrawal_staging_started',
        'withdrawal_request', r.id,
        jsonb_build_object(
          'staging_started_at', v_started_at,
          'staging_deadline_at', v_started_at + interval '2 hours',
          'approval_count', approved_count
        )
      from public.akiba_withdrawal_requests r
      where r.id = new.withdrawal_request_id;
    end if;
  end if;

  insert into public.akiba_finance_activity_events
    (group_id, actor_id, event_type, source_type, source_id, event_payload)
  select r.group_id, new.approver_id,
    case when new.decision = 'approved' then 'withdrawal_approved' else 'withdrawal_rejected' end,
    'withdrawal_approval', new.id,
    jsonb_build_object(
      'withdrawal_request_id', new.withdrawal_request_id,
      'decision', new.decision,
      'approval_version', new.approval_version,
      'rejection_reason', new.rejection_reason
    )
  from public.akiba_withdrawal_requests r
  where r.id = new.withdrawal_request_id;

  return new;
end;
$fn$;

-- Only unresolved requests lock the Admin roster. A Creator cannot demote or
-- remove an Admin until the request reaches a terminal state.
create or replace function akiba_private.guard_group_admin_unresolved_withdrawal()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  membership_role text;
  target_group_id uuid;
begin
  if tg_op = 'DELETE' then
    membership_role := old.role;
    target_group_id := old.group_id;
  else
    membership_role := old.role;
    target_group_id := old.group_id;
    if old.role <> 'group_admin'
       or (new.role is not distinct from old.role and new.status is not distinct from old.status) then
      return new;
    end if;
  end if;

  if membership_role = 'group_admin' and exists (
    select 1 from public.akiba_withdrawal_requests r
    where r.group_id = target_group_id
      and r.status = any (array[
        'pending_approval','approved','staging','payout_queued','payout_submitted',
        'payout_processing','reconciliation_required','processing','failed_pending_reconciliation'
      ]::text[])
  ) then
    raise exception 'Group Admin memberships cannot be demoted or removed while a withdrawal is unresolved';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$fn$;

drop trigger if exists akiba_group_admin_unresolved_withdrawal on public.akiba_group_memberships;
create trigger akiba_group_admin_unresolved_withdrawal
before update of role, status or delete on public.akiba_group_memberships
for each row execute function akiba_private.guard_group_admin_unresolved_withdrawal();

-- Keep the existing payout-attempt table guard aligned with the new state
-- machine and request-time approval snapshot. This does not enable payouts.
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
begin
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

  select capabilities into provider_capabilities
  from public.akiba_payment_providers
  where id = request_row.provider_id
    and is_enabled = true;
  if not found or provider_capabilities ->> 'payout' is distinct from 'true' then
    raise exception 'The selected provider does not currently support payout execution';
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

-- A flag is a durable member-owned record. No direct client writes are granted.
create or replace function public.akiba_flag_withdrawal(
  p_withdrawal_request_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  actor_id uuid := auth.uid();
  request_row public.akiba_withdrawal_requests%rowtype;
  flag_id uuid;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_withdrawal_request_id is null
     or char_length(btrim(coalesce(p_reason,''))) not between 1 and 500 then
    raise exception 'A withdrawal and a reason for flagging are required';
  end if;

  select * into request_row
  from public.akiba_withdrawal_requests
  where id = p_withdrawal_request_id
  for update;
  if not found then raise exception 'Withdrawal request not found'; end if;
  if request_row.status <> 'staging'
     or request_row.staging_deadline_at <= clock_timestamp() then
    raise exception 'This withdrawal is no longer in its flagging period';
  end if;
  if not exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = request_row.group_id
      and m.user_id = actor_id
      and m.status = 'active'
  ) then
    raise exception 'Only active group members may flag a withdrawal';
  end if;

  insert into public.akiba_withdrawal_flags
    (withdrawal_request_id, group_id, member_id, reason)
  values
    (request_row.id, request_row.group_id, actor_id, btrim(p_reason))
  returning id into flag_id;

  insert into public.akiba_finance_activity_events
    (group_id, actor_id, event_type, source_type, source_id, event_payload)
  values
    (request_row.group_id, actor_id, 'withdrawal_flagged',
     'withdrawal_flag', flag_id,
     jsonb_build_object('withdrawal_request_id', request_row.id, 'reason', btrim(p_reason)));
  return flag_id;
exception
  when unique_violation then
    raise exception 'You already have an active flag on this withdrawal';
end;
$fn$;

create or replace function public.akiba_remove_withdrawal_flag(p_flag_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  actor_id uuid := auth.uid();
  flag_request_id uuid;
  flag_row public.akiba_withdrawal_flags%rowtype;
  request_row public.akiba_withdrawal_requests%rowtype;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_flag_id is null then raise exception 'A withdrawal flag is required'; end if;

  -- Lock order is always withdrawal request first, then its flags. The staging
  -- worker uses the same order, preventing flag-removal/deadline deadlocks.
  select withdrawal_request_id into flag_request_id
  from public.akiba_withdrawal_flags
  where id = p_flag_id;
  if not found then raise exception 'Withdrawal flag not found'; end if;

  select * into request_row
  from public.akiba_withdrawal_requests
  where id = flag_request_id
  for update;
  if not found
     or request_row.status <> 'staging'
     or request_row.staging_deadline_at <= clock_timestamp() then
    raise exception 'The withdrawal flagging period has ended';
  end if;

  select * into flag_row
  from public.akiba_withdrawal_flags
  where id = p_flag_id
  for update;
  if not found then raise exception 'Withdrawal flag not found'; end if;
  if flag_row.member_id <> actor_id then
    raise exception 'You can remove only a flag that you created';
  end if;
  if flag_row.status <> 'active' then
    raise exception 'This withdrawal flag is no longer active';
  end if;
  if not exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = request_row.group_id
      and m.user_id = actor_id
      and m.status = 'active'
  ) then
    raise exception 'Only active group members may remove their own flag';
  end if;

  update public.akiba_withdrawal_flags
  set status = 'removed_by_member',
      removed_at = clock_timestamp()
  where id = flag_row.id;

  insert into public.akiba_finance_activity_events
    (group_id, actor_id, event_type, source_type, source_id, event_payload)
  values
    (request_row.group_id, actor_id, 'withdrawal_flag_removed',
     'withdrawal_flag', flag_row.id,
     jsonb_build_object('withdrawal_request_id', request_row.id));
end;
$fn$;

revoke all on function public.akiba_flag_withdrawal(uuid,text) from public, anon;
grant execute on function public.akiba_flag_withdrawal(uuid,text) to authenticated;
revoke all on function public.akiba_remove_withdrawal_flag(uuid) from public, anon;
grant execute on function public.akiba_remove_withdrawal_flag(uuid) to authenticated;

create or replace function public.akiba_cancel_withdrawal_request(p_withdrawal_request_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  actor_id uuid := auth.uid();
  request_row public.akiba_withdrawal_requests%rowtype;
  flag_row public.akiba_withdrawal_flags%rowtype;
  payout_attempt_exists boolean;
  reservation_rows integer;
  payout_row record;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_withdrawal_request_id is null then raise exception 'A withdrawal request is required'; end if;

  select * into request_row
  from public.akiba_withdrawal_requests
  where id = p_withdrawal_request_id
  for update;
  if not found then raise exception 'Withdrawal request not found'; end if;
  if request_row.initiator_id <> actor_id
     or not exists (
       select 1 from public.akiba_group_memberships m
       where m.group_id = request_row.group_id
         and m.user_id = actor_id
         and m.role = 'group_creator'
         and m.status = 'active'
     ) then
    raise exception 'Only the active Group Creator who requested this withdrawal may cancel it';
  end if;
  if request_row.status not in ('pending_approval','staging','payout_queued') then
    raise exception 'This withdrawal can no longer be cancelled';
  end if;

  select exists (
    select 1 from public.akiba_payout_attempts p
    where p.withdrawal_request_id = request_row.id
      and p.status in ('submitted','processing','unknown')
  ) into payout_attempt_exists;
  if payout_attempt_exists then
    raise exception 'A payout has already been submitted or has an uncertain outcome; reconciliation is required';
  end if;

  update public.akiba_withdrawal_requests
  set status = 'cancelled',
      resolved_at = clock_timestamp(),
      resolution_note = 'Cancelled by the Group Creator before payout submission.',
      updated_at = clock_timestamp()
  where id = request_row.id;

  update public.akiba_financial_reservations
  set status = 'released',
      resolved_at = clock_timestamp()
  where withdrawal_request_id = request_row.id
    and status = 'active';
  get diagnostics reservation_rows = row_count;
  if reservation_rows <> 1 then
    raise exception 'The active withdrawal reservation is missing; cancellation was rolled back';
  end if;

  for payout_row in
    select id from public.akiba_payout_attempts
    where withdrawal_request_id = request_row.id
      and status = 'queued'
    for update
  loop
    update public.akiba_payout_attempts
    set status = 'cancelled',
        updated_at = clock_timestamp()
    where id = payout_row.id;

    insert into public.akiba_finance_activity_events
      (group_id, actor_id, event_type, source_type, source_id, event_payload)
    values
      (request_row.group_id, actor_id, 'withdrawal_payout_attempt_cancelled',
       'payout_attempt', payout_row.id,
       jsonb_build_object('withdrawal_request_id', request_row.id));
  end loop;

  for flag_row in
    select * from public.akiba_withdrawal_flags
    where withdrawal_request_id = request_row.id
      and status = 'active'
    for update
  loop
    update public.akiba_withdrawal_flags
    set status = 'closed_by_system',
        closed_at = clock_timestamp(),
        closure_reason = 'Automatically closed because the Group Creator cancelled the withdrawal.'
    where id = flag_row.id;

    insert into public.akiba_finance_activity_events
      (group_id, actor_id, event_type, source_type, source_id, event_payload)
    values
      (request_row.group_id, actor_id, 'withdrawal_flag_closed',
       'withdrawal_flag', flag_row.id,
       jsonb_build_object('withdrawal_request_id', request_row.id, 'closure_reason', 'creator_cancelled'));
  end loop;

  insert into public.akiba_finance_activity_events
    (group_id, actor_id, event_type, source_type, source_id, event_payload)
  values
    (request_row.group_id, actor_id, 'withdrawal_cancelled_by_creator',
     'withdrawal_request', request_row.id,
     jsonb_build_object('currency_code', request_row.currency_code,
       'amount_minor', request_row.total_debit_minor));
end;
$fn$;

revoke all on function public.akiba_cancel_withdrawal_request(uuid) from public, anon;
grant execute on function public.akiba_cancel_withdrawal_request(uuid) to authenticated;

-- Process staging deadlines atomically. A flag still active at the deadline
-- cancels the withdrawal and releases the reservation. No flag queues payout,
-- but the reservation remains until a payout-capable provider is available.
create or replace function public.akiba_process_due_withdrawal_staging(
  p_batch_size integer default 25,
  p_now timestamptz default clock_timestamp()
)
returns table(processed_count integer, cancelled_count integer, payout_queued_count integer)
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  request_row public.akiba_withdrawal_requests%rowtype;
  flag_row public.akiba_withdrawal_flags%rowtype;
  released_rows integer;
begin
  processed_count := 0;
  cancelled_count := 0;
  payout_queued_count := 0;

  if p_now is null then raise exception 'A staging processing time is required'; end if;

  for request_row in
    select * from public.akiba_withdrawal_requests
    where status = 'staging'
      and staging_deadline_at <= p_now
    order by staging_deadline_at, id
    limit least(greatest(coalesce(p_batch_size,25),1),100)
    for update skip locked
  loop
    if exists (
      select 1 from public.akiba_withdrawal_flags f
      where f.withdrawal_request_id = request_row.id
        and f.status = 'active'
    ) then
      update public.akiba_withdrawal_requests
      set status = 'cancelled_flagged',
          resolved_at = p_now,
          resolution_note = 'An active member flag remained at the end of the two-hour staging period.',
          updated_at = p_now
      where id = request_row.id
        and status = 'staging';

      update public.akiba_financial_reservations
      set status = 'released',
          resolved_at = p_now
      where withdrawal_request_id = request_row.id
        and status = 'active';
      get diagnostics released_rows = row_count;
      if released_rows <> 1 then
        raise exception 'The active withdrawal reservation is missing; staging cancellation was rolled back';
      end if;

      for flag_row in
        select * from public.akiba_withdrawal_flags
        where withdrawal_request_id = request_row.id
          and status = 'active'
        for update
      loop
        update public.akiba_withdrawal_flags
        set status = 'closed_by_system',
            closed_at = p_now,
            closure_reason = 'Automatically closed because an active flag blocked payout at the staging deadline.'
        where id = flag_row.id;

        insert into public.akiba_finance_activity_events
          (group_id, actor_id, event_type, source_type, source_id, event_payload)
        values
          (request_row.group_id, null, 'withdrawal_flag_closed',
           'withdrawal_flag', flag_row.id,
           jsonb_build_object('withdrawal_request_id', request_row.id, 'closure_reason', 'staging_deadline_flagged'));
      end loop;

      insert into public.akiba_finance_activity_events
        (group_id, actor_id, event_type, source_type, source_id, event_payload)
      values
        (request_row.group_id, null, 'withdrawal_cancelled_flagged',
         'withdrawal_request', request_row.id,
         jsonb_build_object('currency_code', request_row.currency_code,
           'amount_minor', request_row.total_debit_minor,
           'reason', 'An active member flag remained at the staging deadline.'));
      cancelled_count := cancelled_count + 1;
    else
      update public.akiba_withdrawal_requests
      set status = 'payout_queued',
          updated_at = p_now
      where id = request_row.id
        and status = 'staging';

      insert into public.akiba_finance_activity_events
        (group_id, actor_id, event_type, source_type, source_id, event_payload)
      values
        (request_row.group_id, null, 'withdrawal_payout_queued',
         'withdrawal_request', request_row.id,
         jsonb_build_object('currency_code', request_row.currency_code,
           'amount_minor', request_row.total_debit_minor,
           'staging_deadline_at', request_row.staging_deadline_at,
           'note', 'No active flags remained; payout awaits a verified payout-capable provider.'));
      payout_queued_count := payout_queued_count + 1;
    end if;

    processed_count := processed_count + 1;
  end loop;

  return next;
end;
$fn$;

revoke all on function public.akiba_process_due_withdrawal_staging(integer,timestamptz)
  from public, anon, authenticated;
grant execute on function public.akiba_process_due_withdrawal_staging(integer,timestamptz)
  to service_role;

-- Create one durable inbox notification per active member for every finance
-- activity event. The existing inbox trigger handles realtime broadcasts;
-- financial_* events are never suppressed by group mute preferences.
create or replace function akiba_private.notify_finance_activity_event()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  actor_label text;
  notification_title text;
  notification_body text;
  amount_text text;
  currency_text text;
  notification_type text;
begin
  select nullif(btrim(p.display_name), '') into actor_label
  from public.akiba_profiles p
  where p.user_id = new.actor_id;
  actor_label := coalesce(actor_label, 'A group member');

  notification_type := 'financial_' ||
    regexp_replace(lower(new.event_type), '[^a-z0-9_]+', '_', 'g');

  notification_title := case new.event_type
    when 'contribution_received' then 'Contribution received'
    when 'withdrawal_requested' then 'Withdrawal requested'
    when 'withdrawal_approved' then 'Withdrawal approval received'
    when 'withdrawal_rejected' then 'Withdrawal rejected'
    when 'withdrawal_staging_started' then 'Withdrawal entered the review period'
    when 'withdrawal_flagged' then 'A withdrawal was flagged'
    when 'withdrawal_flag_removed' then 'A withdrawal flag was removed'
    when 'withdrawal_flag_closed' then 'Withdrawal flag automatically closed'
    when 'withdrawal_cancelled_flagged' then 'Withdrawal cancelled'
    when 'withdrawal_payout_queued' then 'Withdrawal cleared for payout'
    else 'Group financial activity'
  end;

  amount_text := coalesce(new.event_payload ->> 'amount_minor',
                          new.event_payload ->> 'total_debit_minor',
                          new.event_payload ->> 'recipient_amount_minor');
  currency_text := new.event_payload ->> 'currency_code';

  notification_body := actor_label || ' · ' || replace(new.event_type, '_', ' ');
  if amount_text ~ '^[0-9]+$' and currency_text ~ '^[A-Z]{3}$' then
    notification_body := notification_body || ' · ' || amount_text || ' ' || currency_text || ' minor units';
  end if;

  insert into public.akiba_group_notifications
    (user_id, group_id, actor_id, source_event_id, event_type, title, body, href)
  select m.user_id, new.group_id, new.actor_id, new.id,
    notification_type, notification_title, notification_body,
    '/workspace/groups/' || new.group_id::text || '/finances'
  from public.akiba_group_memberships m
  where m.group_id = new.group_id
    and m.status = 'active'
  on conflict (user_id, source_event_id) do nothing;

  return new;
end;
$fn$;

drop trigger if exists akiba_finance_activity_notify_members on public.akiba_finance_activity_events;
create trigger akiba_finance_activity_notify_members
after insert on public.akiba_finance_activity_events
for each row execute function akiba_private.notify_finance_activity_event();

revoke all on function akiba_private.set_withdrawal_terms_fingerprint() from public, anon, authenticated;
revoke all on function akiba_private.guard_withdrawal_terms_immutable() from public, anon, authenticated;
revoke all on function akiba_private.guard_withdrawal_provider_capability() from public, anon, authenticated;
revoke all on function akiba_private.snapshot_withdrawal_approval_roster() from public, anon, authenticated;
revoke all on function akiba_private.guard_withdrawal_approval_insert() from public, anon, authenticated;
revoke all on function akiba_private.apply_withdrawal_approval_decision() from public, anon, authenticated;
revoke all on function akiba_private.guard_group_admin_unresolved_withdrawal() from public, anon, authenticated;
revoke all on function akiba_private.guard_payout_attempt_insert() from public, anon, authenticated;
revoke all on function akiba_private.notify_finance_activity_event() from public, anon, authenticated;

-- Run the staging processor every minute inside Postgres. It never submits
-- payouts; it only resolves flags and moves unflagged requests to payout_queued.
do $cron$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'akiba-withdrawal-staging-every-minute'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'akiba-withdrawal-staging-every-minute',
    '* * * * *',
    'select * from public.akiba_process_due_withdrawal_staging(25, clock_timestamp());'
  );
end;
$cron$;

commit;
