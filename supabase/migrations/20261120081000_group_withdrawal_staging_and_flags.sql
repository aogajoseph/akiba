-- Complete Creator/Admin withdrawal governance, two-hour staging, member flags,
-- durable finance notifications, and server-side deadline processing.
-- This migration is committed to the feature branch only; it is not applied here.
begin;

alter table public.akiba_withdrawal_requests
  add column if not exists staging_started_at timestamptz,
  add column if not exists staging_deadline_at timestamptz;

alter table public.akiba_withdrawal_requests
  drop constraint if exists akiba_withdrawal_requests_status_check,
  drop constraint if exists akiba_withdrawal_requests_check1;

alter table public.akiba_withdrawal_requests
  add constraint akiba_withdrawal_requests_status_check
  check (status = any (array[
    'pending_approval'::text,
    'approved'::text,
    'staging'::text,
    'payout_queued'::text,
    'payout_submitted'::text,
    'payout_processing'::text,
    'reconciliation_required'::text,
    'processing'::text,
    'completed'::text,
    'rejected'::text,
    'cancelled'::text,
    'cancelled_flagged'::text,
    'failed_pending_reconciliation'::text,
    'failed'::text
  ]));

alter table public.akiba_withdrawal_requests
  add constraint akiba_withdrawal_requests_resolved_status_check
  check (
    (status = any (array[
      'rejected'::text,
      'cancelled'::text,
      'cancelled_flagged'::text,
      'completed'::text,
      'failed'::text
    ])) = (resolved_at is not null)
  ),
  add constraint akiba_withdrawal_requests_staging_timestamps_pair_check
  check ((staging_started_at is null) = (staging_deadline_at is null)),
  add constraint akiba_withdrawal_requests_staging_deadline_check
  check (
    staging_deadline_at is null
    or staging_deadline_at = staging_started_at + interval '2 hours'
  ),
  add constraint akiba_withdrawal_requests_staging_state_check
  check (status <> 'staging' or staging_started_at is not null);

drop index if exists public.akiba_one_unresolved_withdrawal_per_group;
create unique index akiba_one_unresolved_withdrawal_per_group
  on public.akiba_withdrawal_requests(group_id)
  where status in (
    'pending_approval',
    'approved',
    'staging',
    'payout_queued',
    'payout_submitted',
    'payout_processing',
    'reconciliation_required',
    'processing',
    'failed_pending_reconciliation'
  );

create table if not exists public.akiba_withdrawal_approval_roster (
  id uuid primary key default gen_random_uuid(),
  withdrawal_request_id uuid not null
    references public.akiba_withdrawal_requests(id) on delete restrict,
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  admin_user_id uuid not null references auth.users(id) on delete restrict,
  approval_version integer not null check (approval_version > 0),
  snapshotted_at timestamptz not null default clock_timestamp(),
  unique (withdrawal_request_id, admin_user_id, approval_version)
);

create index if not exists akiba_withdrawal_approval_roster_group_idx
  on public.akiba_withdrawal_approval_roster(group_id, withdrawal_request_id);

alter table public.akiba_withdrawal_approval_roster enable row level security;
drop policy if exists akiba_withdrawal_approval_roster_active_members_read
  on public.akiba_withdrawal_approval_roster;
create policy akiba_withdrawal_approval_roster_active_members_read
  on public.akiba_withdrawal_approval_roster
  for select to authenticated
  using (akiba_private.is_active_group_member(group_id));
revoke all on public.akiba_withdrawal_approval_roster from public, anon, authenticated, service_role;
grant select on public.akiba_withdrawal_approval_roster to authenticated;

create or replace function akiba_private.guard_withdrawal_approval_roster_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  raise exception 'The request-time Group Admin approval roster is immutable';
end;
$fn$;

drop trigger if exists akiba_withdrawal_approval_roster_immutable
  on public.akiba_withdrawal_approval_roster;
create trigger akiba_withdrawal_approval_roster_immutable
before update or delete on public.akiba_withdrawal_approval_roster
for each row execute function akiba_private.guard_withdrawal_approval_roster_immutable();

create table if not exists public.akiba_withdrawal_flags (
  id uuid primary key default gen_random_uuid(),
  withdrawal_request_id uuid not null
    references public.akiba_withdrawal_requests(id) on delete restrict,
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  member_id uuid not null references auth.users(id) on delete restrict,
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  status text not null default 'active'
    check (status in ('active', 'removed_by_member', 'closed_by_system')),
  created_at timestamptz not null default clock_timestamp(),
  removed_at timestamptz,
  closed_at timestamptz,
  closure_actor uuid references auth.users(id) on delete restrict,
  closure_reason text,
  constraint akiba_withdrawal_flags_lifecycle_check check (
    (status = 'active' and removed_at is null and closed_at is null)
    or (status = 'removed_by_member' and removed_at is not null and closed_at is null)
    or (status = 'closed_by_system' and closed_at is not null and removed_at is null)
  )
);

create unique index if not exists akiba_one_active_withdrawal_flag_per_member
  on public.akiba_withdrawal_flags(withdrawal_request_id, member_id)
  where status = 'active';

create index if not exists akiba_withdrawal_flags_request_status_idx
  on public.akiba_withdrawal_flags(withdrawal_request_id, status, created_at);

alter table public.akiba_withdrawal_flags enable row level security;
drop policy if exists akiba_withdrawal_flags_active_members_read
  on public.akiba_withdrawal_flags;
create policy akiba_withdrawal_flags_active_members_read
  on public.akiba_withdrawal_flags
  for select to authenticated
  using (akiba_private.is_active_group_member(group_id));
revoke all on public.akiba_withdrawal_flags from public, anon, authenticated, service_role;
grant select on public.akiba_withdrawal_flags to authenticated;

-- A request is created only when there are at least three active Admins and
-- the configured provider supports sandbox payouts and trusted fee quotes.
create or replace function akiba_private.guard_withdrawal_payout_capability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  active_admin_count integer;
  provider_capabilities jsonb;
begin
  perform 1 from public.akiba_groups where id = new.group_id for update;
  if not found then raise exception 'Group not found'; end if;

  select count(*) into active_admin_count
  from public.akiba_group_memberships
  where group_id = new.group_id
    and role = 'group_admin'
    and status = 'active';

  if active_admin_count < 3 then
    raise exception 'A withdrawal requires at least three active Group Admins';
  end if;

  select capabilities into provider_capabilities
  from public.akiba_payment_providers
  where id = new.provider_id;

  if coalesce(provider_capabilities->>'payout', 'false') <> 'true'
     or coalesce(provider_capabilities->>'fee_quotes', 'false') <> 'true'
     or coalesce(provider_capabilities->>'environment', '') <> 'sandbox'
     or new.provider_quote_ref is null
     or new.quote_expires_at is null
     or new.quote_expires_at <= clock_timestamp() + interval '2 hours' then
    raise exception 'A verified sandbox payout capability and unexpired provider fee quote are required';
  end if;

  return new;
end;
$fn$;

drop trigger if exists akiba_withdrawal_payout_capability_guard
  on public.akiba_withdrawal_requests;
create trigger akiba_withdrawal_payout_capability_guard
before insert on public.akiba_withdrawal_requests
for each row execute function akiba_private.guard_withdrawal_payout_capability();

-- Snapshot all active Admins at request creation. Later appointments do not
-- join the approval set; Admin demotions are blocked until the request resolves.
create or replace function akiba_private.snapshot_withdrawal_approval_roster()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  roster_count integer;
begin
  insert into public.akiba_withdrawal_approval_roster (
    withdrawal_request_id, group_id, admin_user_id, approval_version
  )
  select new.id, new.group_id, m.user_id, new.approval_version
  from public.akiba_group_memberships m
  where m.group_id = new.group_id
    and m.role = 'group_admin'
    and m.status = 'active';

  get diagnostics roster_count = row_count;
  if roster_count < 3 then
    raise exception 'A withdrawal requires at least three active Group Admins';
  end if;

  return new;
end;
$fn$;

drop trigger if exists akiba_withdrawal_approval_roster_snapshot
  on public.akiba_withdrawal_requests;
create trigger akiba_withdrawal_approval_roster_snapshot
after insert on public.akiba_withdrawal_requests
for each row execute function akiba_private.snapshot_withdrawal_approval_roster();

-- The request-time roster, not the current Admin count, is authoritative.
create or replace function akiba_private.guard_withdrawal_approval_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
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
    raise exception 'The withdrawal initiator cannot approve their own request';
  end if;
  if not exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = request_row.group_id
      and m.user_id = new.approver_id
      and m.role = 'group_admin'
      and m.status = 'active'
  ) then
    raise exception 'Only a currently active Group Admin may approve or reject';
  end if;
  if not exists (
    select 1 from public.akiba_withdrawal_approval_roster roster
    where roster.withdrawal_request_id = request_row.id
      and roster.group_id = request_row.group_id
      and roster.admin_user_id = new.approver_id
      and roster.approval_version = request_row.approval_version
  ) then
    raise exception 'Approver was not in the request-time approval roster';
  end if;
  if new.terms_fingerprint is distinct from encode(
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
  ) then
    raise exception 'Approval terms do not match the current withdrawal request';
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
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  request_row public.akiba_withdrawal_requests%rowtype;
  fingerprint text;
  approval_id uuid;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
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
  if not found then raise exception 'Withdrawal request not found'; end if;
  if request_row.status <> 'pending_approval' then
    raise exception 'This withdrawal request is no longer accepting decisions';
  end if;
  if actor_id = request_row.initiator_id then
    raise exception 'The withdrawal initiator cannot approve their own request';
  end if;
  if not exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = request_row.group_id
      and m.user_id = actor_id
      and m.role = 'group_admin'
      and m.status = 'active'
  ) then
    raise exception 'Only an active Group Admin may approve or reject';
  end if;
  if not exists (
    select 1 from public.akiba_withdrawal_approval_roster roster
    where roster.withdrawal_request_id = request_row.id
      and roster.admin_user_id = actor_id
      and roster.approval_version = request_row.approval_version
  ) then
    raise exception 'Only an active Group Admin in the request-time approval roster may decide this withdrawal';
  end if;

  fingerprint := encode(extensions.digest(convert_to(concat_ws('|',
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
  ), 'UTF8'), 'sha256'), 'hex');

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

revoke all on function public.akiba_decide_withdrawal_request(uuid, text, text)
  from public, anon;
grant execute on function public.akiba_decide_withdrawal_request(uuid, text, text)
  to authenticated;

create or replace function akiba_private.apply_withdrawal_approval_decision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  required_count integer;
  approved_count integer;
  request_row public.akiba_withdrawal_requests%rowtype;
  stage_started_at timestamptz;
begin
  select * into request_row
  from public.akiba_withdrawal_requests
  where id = new.withdrawal_request_id
  for update;

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
  else
    select count(*) into required_count
    from public.akiba_withdrawal_approval_roster
    where withdrawal_request_id = new.withdrawal_request_id
      and approval_version = new.approval_version;

    select count(distinct approver_id) into approved_count
    from public.akiba_withdrawal_approvals
    where withdrawal_request_id = new.withdrawal_request_id
      and approval_version = new.approval_version
      and decision = 'approved';

    if required_count < 3 then
      raise exception 'The request-time approval roster must contain at least three Group Admins';
    end if;

    if approved_count = required_count then
      stage_started_at := clock_timestamp();
      update public.akiba_withdrawal_requests
        set status = 'staging',
            approved_at = stage_started_at,
            staging_started_at = stage_started_at,
            staging_deadline_at = stage_started_at + interval '2 hours',
            updated_at = stage_started_at
      where id = new.withdrawal_request_id
        and status = 'pending_approval';

      insert into public.akiba_finance_activity_events
        (group_id, actor_id, event_type, source_type, source_id, event_payload)
      values (
        request_row.group_id,
        new.approver_id,
        'withdrawal_staging_started',
        'withdrawal_request',
        request_row.id,
        jsonb_build_object(
          'staging_started_at', stage_started_at,
          'staging_deadline_at', stage_started_at + interval '2 hours',
          'duration_seconds', 7200
        )
      )
      on conflict (group_id, event_type, source_type, source_id) do nothing;
    end if;
  end if;

  insert into public.akiba_finance_activity_events
    (group_id, actor_id, event_type, source_type, source_id, event_payload)
  values (
    request_row.group_id,
    new.approver_id,
    case when new.decision = 'approved' then 'withdrawal_approved' else 'withdrawal_rejected' end,
    'withdrawal_approval',
    new.id,
    jsonb_build_object(
      'withdrawal_request_id', new.withdrawal_request_id,
      'decision', new.decision,
      'approval_version', new.approval_version,
      'rejection_reason', new.rejection_reason
    )
  )
  on conflict (group_id, event_type, source_type, source_id) do nothing;

  return new;
end;
$fn$;

-- A Group Admin cannot be demoted, deactivated or removed while any withdrawal
-- workflow could still require their approval or hold funds.
create or replace function akiba_private.guard_payout_attempt_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  request_row public.akiba_withdrawal_requests%rowtype;
  required_count integer;
  approved_count integer;
  provider_capabilities jsonb;
begin
  select * into request_row
  from public.akiba_withdrawal_requests
  where id = new.withdrawal_request_id
  for update;

  if not found
     or request_row.status <> 'payout_queued'
     or request_row.staging_deadline_at is null
     or request_row.staging_deadline_at > clock_timestamp()
     or request_row.provider_quote_ref is null
     or request_row.quote_expires_at is null
     or request_row.quote_expires_at <= clock_timestamp() then
    raise exception 'Payout submission requires a staging period that has elapsed without an active flag';
  end if;

  if exists (
    select 1 from public.akiba_withdrawal_flags
    where withdrawal_request_id = request_row.id
      and status = 'active'
  ) then
    raise exception 'An active member flag blocks payout submission';
  end if;

  if new.provider_id <> request_row.provider_id then
    raise exception 'Payout provider must match the approved withdrawal provider';
  end if;

  select count(*) into required_count
  from public.akiba_withdrawal_approval_roster
  where withdrawal_request_id = request_row.id
    and approval_version = request_row.approval_version;

  select count(distinct approver_id) into approved_count
  from public.akiba_withdrawal_approvals
  where withdrawal_request_id = request_row.id
    and approval_version = request_row.approval_version
    and decision = 'approved';

  if required_count < 3 or approved_count <> required_count then
    raise exception 'Every Group Admin in the request-time approval roster must approve before payout';
  end if;

  select capabilities into provider_capabilities
  from public.akiba_payment_providers
  where id = new.provider_id;

  if coalesce(provider_capabilities->>'payout', 'false') <> 'true'
     or coalesce(provider_capabilities->>'fee_quotes', 'false') <> 'true'
     or coalesce(provider_capabilities->>'environment', '') <> 'sandbox' then
    raise exception 'A verified sandbox payout provider is required';
  end if;

  return new;
end;
$fn$;

create or replace function akiba_private.guard_admin_change_during_unresolved_withdrawal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  target_group_id uuid;
  target_role text;
begin
  if tg_op = 'DELETE' then
    target_group_id := old.group_id;
    target_role := old.role;
  else
    target_group_id := old.group_id;
    target_role := old.role;
    if old.role <> 'group_admin'
       or (new.role is not distinct from old.role and new.status is not distinct from old.status) then
      return new;
    end if;
  end if;

  if target_role = 'group_admin' and exists (
    select 1 from public.akiba_withdrawal_requests r
    where r.group_id = target_group_id
      and r.status in (
        'pending_approval', 'approved', 'staging', 'payout_queued',
        'payout_submitted', 'payout_processing', 'reconciliation_required',
        'processing', 'failed_pending_reconciliation'
      )
  ) then
    raise exception 'Group Admin memberships cannot change while a withdrawal is unresolved';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$fn$;

drop trigger if exists akiba_admin_unresolved_withdrawal_update_guard
  on public.akiba_group_memberships;
create trigger akiba_admin_unresolved_withdrawal_update_guard
before update of role, status on public.akiba_group_memberships
for each row execute function akiba_private.guard_admin_change_during_unresolved_withdrawal();

drop trigger if exists akiba_admin_unresolved_withdrawal_delete_guard
  on public.akiba_group_memberships;
create trigger akiba_admin_unresolved_withdrawal_delete_guard
before delete on public.akiba_group_memberships
for each row execute function akiba_private.guard_admin_change_during_unresolved_withdrawal();

create or replace function public.akiba_flag_withdrawal(
  p_withdrawal_request_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  request_row public.akiba_withdrawal_requests%rowtype;
  flag_id uuid;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_withdrawal_request_id is null
     or char_length(btrim(coalesce(p_reason, ''))) not between 1 and 500 then
    raise exception 'A valid withdrawal and flag reason are required';
  end if;

  select * into request_row
  from public.akiba_withdrawal_requests
  where id = p_withdrawal_request_id
  for update;
  if not found then raise exception 'Withdrawal request not found'; end if;
  if request_row.status <> 'staging'
     or request_row.staging_deadline_at is null
     or request_row.staging_deadline_at <= clock_timestamp() then
    raise exception 'The two-hour flagging period has ended';
  end if;
  if not exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = request_row.group_id
      and m.user_id = actor_id
      and m.status = 'active'
  ) then
    raise exception 'Only active group members may flag a withdrawal';
  end if;

  insert into public.akiba_withdrawal_flags (
    withdrawal_request_id, group_id, member_id, reason
  ) values (
    request_row.id, request_row.group_id, actor_id, btrim(p_reason)
  )
  returning id into flag_id;

  insert into public.akiba_finance_activity_events (
    group_id, actor_id, event_type, source_type, source_id, event_payload
  ) values (
    request_row.group_id, actor_id, 'withdrawal_flagged',
    'withdrawal_flag', flag_id,
    jsonb_build_object('withdrawal_request_id', request_row.id, 'reason', btrim(p_reason))
  )
  on conflict (group_id, event_type, source_type, source_id) do nothing;

  return flag_id;
end;
$fn$;

create or replace function public.akiba_remove_withdrawal_flag(p_flag_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  flag_row public.akiba_withdrawal_flags%rowtype;
  request_row public.akiba_withdrawal_requests%rowtype;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_flag_id is null then raise exception 'Flag is required'; end if;

  select * into flag_row
  from public.akiba_withdrawal_flags
  where id = p_flag_id;
  if not found then raise exception 'Withdrawal flag not found'; end if;

  select * into request_row
  from public.akiba_withdrawal_requests
  where id = flag_row.withdrawal_request_id
  for update;
  if not found then raise exception 'Withdrawal request not found'; end if;

  select * into flag_row
  from public.akiba_withdrawal_flags
  where id = p_flag_id
  for update;

  if flag_row.member_id <> actor_id then
    raise exception 'You may remove only a flag that you created';
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
  if request_row.status <> 'staging'
     or request_row.staging_deadline_at is null
     or request_row.staging_deadline_at <= clock_timestamp() then
    raise exception 'The two-hour flagging period has ended';
  end if;

  update public.akiba_withdrawal_flags
  set status = 'removed_by_member',
      removed_at = clock_timestamp()
  where id = p_flag_id and status = 'active';

  insert into public.akiba_finance_activity_events (
    group_id, actor_id, event_type, source_type, source_id, event_payload
  ) values (
    request_row.group_id, actor_id, 'withdrawal_flag_removed',
    'withdrawal_flag', flag_row.id,
    jsonb_build_object(
      'withdrawal_request_id', request_row.id,
      'flag_created_at', flag_row.created_at
    )
  )
  on conflict (group_id, event_type, source_type, source_id) do nothing;

  return p_flag_id;
end;
$fn$;

create or replace function public.akiba_cancel_withdrawal_request(p_withdrawal_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  request_row public.akiba_withdrawal_requests%rowtype;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_withdrawal_request_id is null then raise exception 'Withdrawal request is required'; end if;

  select * into request_row
  from public.akiba_withdrawal_requests
  where id = p_withdrawal_request_id
  for update;
  if not found then raise exception 'Withdrawal request not found'; end if;

  if request_row.initiator_id <> actor_id or not exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = request_row.group_id
      and m.user_id = actor_id
      and m.role = 'group_creator'
      and m.status = 'active'
  ) then
    raise exception 'Only the active Group Creator who requested this withdrawal may cancel it';
  end if;

  if request_row.status not in ('pending_approval', 'staging', 'payout_queued') then
    raise exception 'This withdrawal can no longer be cancelled because its outcome may be uncertain';
  end if;

  if exists (
    select 1 from public.akiba_payout_attempts p
    where p.withdrawal_request_id = request_row.id
  ) then
    raise exception 'A payout attempt exists; cancellation is blocked until its outcome is reconciled';
  end if;

  update public.akiba_withdrawal_requests
  set status = 'cancelled',
      resolved_at = clock_timestamp(),
      resolution_note = 'Cancelled by the initiating Group Creator before payout submission.',
      updated_at = clock_timestamp()
  where id = request_row.id;

  update public.akiba_financial_reservations
  set status = 'released',
      resolved_at = clock_timestamp()
  where withdrawal_request_id = request_row.id
    and status = 'active';

  insert into public.akiba_finance_activity_events (
    group_id, actor_id, event_type, source_type, source_id, event_payload
  ) values (
    request_row.group_id, actor_id, 'withdrawal_cancelled',
    'withdrawal_request', request_row.id,
    jsonb_build_object(
      'currency_code', request_row.currency_code,
      'total_debit_minor', request_row.total_debit_minor
    )
  )
  on conflict (group_id, event_type, source_type, source_id) do nothing;

  return request_row.id;
end;
$fn$;

-- Deadline worker: the original deadline is immutable. Any active flag at
-- the deadline cancels the request, releases the reservation and closes all
-- active flags. With no active flags, the request is queued for payout.
create or replace function akiba_private.process_due_withdrawal_staging(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  request_row public.akiba_withdrawal_requests%rowtype;
  flag_row record;
  processed_count integer := 0;
  worker_now timestamptz := clock_timestamp();
begin
  for request_row in
    select *
    from public.akiba_withdrawal_requests
    where status = 'staging'
      and staging_deadline_at <= worker_now
    order by staging_deadline_at, id
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    for update skip locked
  loop
    if exists (
      select 1 from public.akiba_withdrawal_flags f
      where f.withdrawal_request_id = request_row.id
        and f.status = 'active'
    ) then
      update public.akiba_withdrawal_requests
      set status = 'cancelled_flagged',
          resolved_at = worker_now,
          resolution_note = 'An active member flag remained at the original two-hour staging deadline.',
          updated_at = worker_now
      where id = request_row.id and status = 'staging';

      update public.akiba_financial_reservations
      set status = 'released', resolved_at = worker_now
      where withdrawal_request_id = request_row.id and status = 'active';

      for flag_row in
        update public.akiba_withdrawal_flags
        set status = 'closed_by_system',
            closed_at = worker_now,
            closure_actor = null,
            closure_reason = 'Automatically closed because the withdrawal was cancelled at the staging deadline.'
        where withdrawal_request_id = request_row.id
          and status = 'active'
        returning id, member_id, reason
      loop
        insert into public.akiba_finance_activity_events (
          group_id, actor_id, event_type, source_type, source_id, event_payload
        ) values (
          request_row.group_id, null, 'withdrawal_flag_closed_by_system',
          'withdrawal_flag', flag_row.id,
          jsonb_build_object(
            'withdrawal_request_id', request_row.id,
            'member_id', flag_row.member_id,
            'reason', flag_row.reason
          )
        )
        on conflict (group_id, event_type, source_type, source_id) do nothing;
      end loop;

      insert into public.akiba_finance_activity_events (
        group_id, actor_id, event_type, source_type, source_id, event_payload
      ) values (
        request_row.group_id, null, 'withdrawal_cancelled_flagged',
        'withdrawal_request', request_row.id,
        jsonb_build_object(
          'currency_code', request_row.currency_code,
          'total_debit_minor', request_row.total_debit_minor,
          'reservation_released', true,
          'staging_deadline_at', request_row.staging_deadline_at
        )
      )
      on conflict (group_id, event_type, source_type, source_id) do nothing;
    else
      update public.akiba_withdrawal_requests
      set status = 'payout_queued',
          updated_at = worker_now
      where id = request_row.id and status = 'staging';

      insert into public.akiba_finance_activity_events (
        group_id, actor_id, event_type, source_type, source_id, event_payload
      ) values (
        request_row.group_id, null, 'withdrawal_staging_cleared',
        'withdrawal_request', request_row.id,
        jsonb_build_object(
          'currency_code', request_row.currency_code,
          'total_debit_minor', request_row.total_debit_minor,
          'staging_deadline_at', request_row.staging_deadline_at,
          'payout_status', 'queued_for_provider_submission'
        )
      )
      on conflict (group_id, event_type, source_type, source_id) do nothing;
    end if;

    processed_count := processed_count + 1;
  end loop;

  return processed_count;
end;
$fn$;

-- Snapshot every active member as a durable recipient in the same transaction
-- as the finance event. A separate worker creates inbox notifications with retry.
create table if not exists public.akiba_finance_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.akiba_finance_activity_events(id) on delete restrict,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'delivered')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default clock_timestamp(),
  last_error text,
  created_at timestamptz not null default clock_timestamp(),
  delivered_at timestamptz,
  unique (event_id, recipient_user_id),
  check ((status = 'delivered') = (delivered_at is not null))
);

create index if not exists akiba_finance_notification_outbox_due_idx
  on public.akiba_finance_notification_outbox(next_attempt_at, created_at)
  where status = 'pending';

alter table public.akiba_finance_notification_outbox enable row level security;
revoke all on public.akiba_finance_notification_outbox
  from public, anon, authenticated, service_role;

create or replace function akiba_private.enqueue_finance_activity_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  insert into public.akiba_finance_notification_outbox(event_id, recipient_user_id)
  select new.id, m.user_id
  from public.akiba_group_memberships m
  where m.group_id = new.group_id
    and m.status = 'active'
  on conflict (event_id, recipient_user_id) do nothing;

  return new;
end;
$fn$;

drop trigger if exists akiba_finance_activity_notify_members
  on public.akiba_finance_activity_events;
drop trigger if exists akiba_finance_activity_enqueue_notifications
  on public.akiba_finance_activity_events;
create trigger akiba_finance_activity_enqueue_notifications
after insert on public.akiba_finance_activity_events
for each row execute function akiba_private.enqueue_finance_activity_notifications();

create or replace function akiba_private.process_finance_notification_outbox(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  outbox_row public.akiba_finance_notification_outbox%rowtype;
  event_row public.akiba_finance_activity_events%rowtype;
  processed_count integer := 0;
begin
  for outbox_row in
    select *
    from public.akiba_finance_notification_outbox
    where status = 'pending'
      and next_attempt_at <= clock_timestamp()
    order by next_attempt_at, created_at
    limit greatest(1, least(coalesce(p_limit, 100), 500))
    for update skip locked
  loop
    begin
      select * into event_row
      from public.akiba_finance_activity_events
      where id = outbox_row.event_id;

      if not found then
        raise exception 'Finance activity event is missing';
      end if;

      insert into public.akiba_group_notifications (
        user_id, group_id, actor_id, source_event_id,
        event_type, title, body, href
      )
      values (
        outbox_row.recipient_user_id,
        event_row.group_id,
        event_row.actor_id,
        event_row.id,
        'financial_action',
        'Group financial activity',
        initcap(replace(event_row.event_type, '_', ' ')),
        '/workspace/groups/' || event_row.group_id::text || '/finances'
      )
      on conflict (user_id, source_event_id) do nothing;

      update public.akiba_finance_notification_outbox
      set status = 'delivered',
          delivered_at = clock_timestamp(),
          last_error = null
      where id = outbox_row.id
        and status = 'pending';
    exception when others then
      update public.akiba_finance_notification_outbox
      set attempt_count = attempt_count + 1,
          next_attempt_at = clock_timestamp()
            + make_interval(mins => least(60, power(2, least(attempt_count, 6))::integer)),
          last_error = left(sqlerrm, 500)
      where id = outbox_row.id
        and status = 'pending';
    end;

    processed_count := processed_count + 1;
  end loop;

  return processed_count;
end;
$fn$;

-- Keep deactivation blocked for every newly introduced unresolved state.
create or replace function akiba_private.group_financial_safety(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  has_history boolean := false;
  has_unresolved boolean := false;
  balance_minor numeric := 0;
  held_minor numeric := 0;
begin
  select coalesce(sum(case when e.direction = 'credit' then e.amount_minor else -e.amount_minor end), 0)
    into balance_minor
  from public.akiba_financial_ledger_entries e
  where e.group_id = p_group_id and e.account_code = 'group_funds';

  select coalesce(sum(r.amount_minor), 0)
    into held_minor
  from public.akiba_financial_reservations r
  where r.group_id = p_group_id and r.status = 'active';

  has_history :=
    exists (select 1 from public.akiba_financial_transactions where group_id = p_group_id)
    or exists (select 1 from public.akiba_financial_ledger_entries where group_id = p_group_id)
    or exists (select 1 from public.akiba_contribution_intents where group_id = p_group_id)
    or exists (
      select 1 from public.akiba_payment_attempts p
      join public.akiba_contribution_intents i on i.id = p.contribution_intent_id
      where i.group_id = p_group_id
    )
    or exists (select 1 from public.akiba_withdrawal_requests where group_id = p_group_id)
    or exists (select 1 from public.akiba_withdrawal_approvals where group_id = p_group_id)
    or exists (
      select 1 from public.akiba_payout_attempts p
      join public.akiba_withdrawal_requests w on w.id = p.withdrawal_request_id
      where w.group_id = p_group_id
    )
    or exists (select 1 from public.akiba_financial_reservations where group_id = p_group_id)
    or exists (select 1 from public.akiba_finance_activity_events where group_id = p_group_id)
    or exists (select 1 from public.akiba_group_payment_accounts where group_id = p_group_id);

  has_unresolved :=
    exists (
      select 1 from public.akiba_contribution_intents i
      where i.group_id = p_group_id
        and i.status not in ('succeeded','failed','cancelled','expired')
    )
    or exists (
      select 1 from public.akiba_payment_attempts p
      join public.akiba_contribution_intents i on i.id = p.contribution_intent_id
      where i.group_id = p_group_id and p.status in ('initiated','pending','unknown')
    )
    or exists (
      select 1
      from public.akiba_provider_events e
      join public.akiba_payment_attempts p
        on e.provider_id = p.provider_id
       and e.source_reference in (p.provider_merchant_ref, p.provider_attempt_ref, p.request_reference)
      join public.akiba_contribution_intents i on i.id = p.contribution_intent_id
      where i.group_id = p_group_id
        and (
          e.processing_status in ('received','processing')
          or (e.processing_status = 'failed' and e.retryable)
        )
    )
    or exists (
      select 1 from public.akiba_withdrawal_requests w
      where w.group_id = p_group_id
        and w.status in (
          'pending_approval','approved','staging','payout_queued',
          'payout_submitted','payout_processing','reconciliation_required',
          'processing','failed_pending_reconciliation'
        )
    )
    or exists (
      select 1 from public.akiba_payout_attempts p
      join public.akiba_withdrawal_requests w on w.id = p.withdrawal_request_id
      where w.group_id = p_group_id
        and (
          p.status in ('queued','submitted','processing','unknown')
          or p.reconciliation_status in ('pending','unmatched')
        )
    )
    or exists (
      select 1 from public.akiba_financial_reservations r
      where r.group_id = p_group_id and r.status = 'active'
    );

  return jsonb_build_object(
    'has_financial_history', has_history,
    'has_unresolved_financial_activity', has_unresolved,
    'balance_minor', balance_minor,
    'held_minor', held_minor
  );
end;
$fn$;

revoke all on function public.akiba_flag_withdrawal(uuid, text) from public, anon;
grant execute on function public.akiba_flag_withdrawal(uuid, text) to authenticated;
revoke all on function public.akiba_remove_withdrawal_flag(uuid) from public, anon;
grant execute on function public.akiba_remove_withdrawal_flag(uuid) to authenticated;
revoke all on function public.akiba_cancel_withdrawal_request(uuid) from public, anon;
grant execute on function public.akiba_cancel_withdrawal_request(uuid) to authenticated;
revoke all on function akiba_private.process_due_withdrawal_staging(integer)
  from public, anon, authenticated, service_role;
revoke all on function akiba_private.process_finance_notification_outbox(integer)
  from public, anon, authenticated, service_role;

do $schedule$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'akiba-process-withdrawal-staging'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'akiba-process-withdrawal-staging',
    '* * * * *',
    'select akiba_private.process_due_withdrawal_staging(100);'
  );

  select jobid into existing_job_id
  from cron.job
  where jobname = 'akiba-process-finance-notification-outbox'
  limit 1;
  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'akiba-process-finance-notification-outbox',
    '* * * * *',
    'select akiba_private.process_finance_notification_outbox(100);'
  );
end;
$schedule$;

commit;
