-- Group Creator / Group Admin governance and plan-based membership limits.
-- Forward-only migration. Existing creator identities are reconciled from
-- akiba_groups.created_by; historical membership rows and IDs are preserved.
begin;

create table if not exists public.akiba_group_plan_entitlements (
  plan_code text primary key check (plan_code ~ '^[a-z][a-z0-9_]{1,39}$'),
  max_members integer not null check (max_members >= 1),
  required_group_admins integer not null check (required_group_admins >= 1),
  max_group_admins integer not null check (max_group_admins >= required_group_admins),
  constraint akiba_group_plan_entitlements_minimum_leadership_capacity
    check (max_members >= required_group_admins + 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.akiba_group_plan_entitlements enable row level security;
drop policy if exists "authenticated users read active group plans" on public.akiba_group_plan_entitlements;
create policy "authenticated users read active group plans"
  on public.akiba_group_plan_entitlements for select to authenticated
  using (is_active = true);
grant select on public.akiba_group_plan_entitlements to authenticated;
revoke all on public.akiba_group_plan_entitlements from anon;

insert into public.akiba_group_plan_entitlements
  (plan_code, max_members, required_group_admins, max_group_admins)
values ('free', 100, 3, 3)
on conflict (plan_code) do update set
  max_members = excluded.max_members,
  required_group_admins = excluded.required_group_admins,
  max_group_admins = excluded.max_group_admins,
  is_active = true,
  updated_at = now();

alter table public.akiba_groups
  add column if not exists group_plan_code text not null default 'free';

alter table public.akiba_groups
  drop constraint if exists akiba_groups_group_plan_code_fkey;
alter table public.akiba_groups
  add constraint akiba_groups_group_plan_code_fkey
  foreign key (group_plan_code)
  references public.akiba_group_plan_entitlements(plan_code)
  on update restrict on delete restrict;

-- Normalize roles using the immutable group creator identity, never by
-- blindly renaming legacy 'admin' rows.
alter table public.akiba_group_memberships
  drop constraint if exists akiba_group_memberships_role_check;

update public.akiba_group_memberships m
set role = case
  when m.user_id = g.created_by then 'group_creator'
  when m.role = 'sub_admin' then 'group_admin'
  else 'member'
end,
status = case when m.user_id = g.created_by then 'active' else m.status end,
ended_at = case when m.user_id = g.created_by then null else m.ended_at end
from public.akiba_groups g
where g.id = m.group_id
  and (m.role in ('admin', 'sub_admin') or m.user_id = g.created_by);

-- Repair a missing creator membership without changing any existing row.
insert into public.akiba_group_memberships (group_id, user_id, role, status)
select g.id, g.created_by, 'group_creator', 'active'
from public.akiba_groups g
where not exists (
  select 1 from public.akiba_group_memberships m
  where m.group_id = g.id and m.user_id = g.created_by
)
on conflict (group_id, user_id) do update
set role = 'group_creator', status = 'active', ended_at = null;

alter table public.akiba_group_memberships
  add constraint akiba_group_memberships_role_check
  check (role in ('group_creator', 'group_admin', 'member'));

create unique index if not exists akiba_one_active_group_creator
  on public.akiba_group_memberships(group_id)
  where role = 'group_creator' and status = 'active';

do $preflight$
begin
  if exists (
    select 1
    from public.akiba_groups g
    join public.akiba_group_plan_entitlements e on e.plan_code = g.group_plan_code
    left join lateral (
      select count(*) filter (where m.status = 'active') as active_members,
             count(*) filter (where m.status = 'active' and m.role = 'group_admin') as active_admins,
             count(*) filter (where m.status = 'active' and m.role = 'group_creator') as active_creators
      from public.akiba_group_memberships m
      where m.group_id = g.id
    ) counts on true
    where counts.active_members > e.max_members
       or counts.active_admins > e.max_group_admins
       or counts.active_creators <> 1
  ) then
    raise exception 'Existing group memberships do not satisfy the new Creator/Admin plan limits; reconcile the affected groups before applying this migration';
  end if;
end;
$preflight$;

create or replace function akiba_private.create_group_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if new.created_by is distinct from (select auth.uid()) then
    raise exception 'Group creator must be the authenticated user';
  end if;
  insert into public.akiba_group_memberships (group_id, user_id, role, status)
  values (new.id, new.created_by, 'group_creator', 'active');
  return new;
end;
$fn$;
revoke all on function akiba_private.create_group_owner_membership() from public, anon, authenticated;

create or replace function akiba_private.guard_group_membership_entitlements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  creator_id uuid;
  plan_row public.akiba_group_plan_entitlements%rowtype;
  active_count integer;
  active_admin_count integer;
  old_role text;
  old_status text;
  excluded_membership_id uuid;
begin
  if tg_op = 'UPDATE' then
    old_role := old.role;
    old_status := old.status;
    excluded_membership_id := old.id;
    if new.group_id is distinct from old.group_id or new.user_id is distinct from old.user_id then
      raise exception 'A membership cannot be moved to another group or user';
    end if;
    if old.role = 'group_creator'
       and (new.role is distinct from old.role
         or new.status is distinct from old.status
         or new.user_id is distinct from old.user_id
         or new.group_id is distinct from old.group_id) then
      raise exception 'The Group Creator identity cannot be changed or removed';
    end if;
  end if;

  select g.created_by into creator_id
  from public.akiba_groups g
  where g.id = new.group_id
  for update;
  select e.* into plan_row
  from public.akiba_group_plan_entitlements e
  join public.akiba_groups g on g.group_plan_code = e.plan_code
  where g.id = new.group_id and e.is_active = true;

  if creator_id is null or plan_row.plan_code is null then
    raise exception 'Group or active group plan was not found';
  end if;

  if new.role = 'group_creator' and new.user_id <> creator_id then
    raise exception 'Only the recorded group creator may hold the Group Creator role';
  end if;
  if new.user_id = creator_id and new.role <> 'group_creator' then
    raise exception 'The recorded group creator must retain the Group Creator role';
  end if;

  if tg_op = 'UPDATE'
     and (old.role is distinct from new.role or old.status is distinct from new.status)
     and (old.role = 'group_admin' or new.role = 'group_admin')
     and exists (
       select 1 from public.akiba_withdrawal_requests r
       where r.group_id = old.group_id
         and r.status in ('pending_approval', 'approved', 'processing', 'failed_pending_reconciliation')
     ) then
    raise exception 'Group Admin appointments cannot change while a withdrawal is unresolved';
  end if;

  select count(*) into active_count
  from public.akiba_group_memberships m
  where m.group_id = new.group_id
    and m.status = 'active'
    and m.id is distinct from excluded_membership_id;

  select count(*) into active_admin_count
  from public.akiba_group_memberships m
  where m.group_id = new.group_id
    and m.status = 'active'
    and m.role = 'group_admin'
    and (tg_op <> 'UPDATE' or m.id <> old.id);

  if new.status = 'active' and active_count >= plan_row.max_members then
    raise exception 'This group has reached its plan member limit of %', plan_row.max_members;
  end if;

  if new.status = 'active' and new.role = 'group_admin'
     and active_admin_count >= plan_row.max_group_admins then
    raise exception 'This group has reached its plan Group Admin limit of %', plan_row.max_group_admins;
  end if;

  return new;
end;
$fn$;

drop trigger if exists akiba_group_membership_entitlement_guard on public.akiba_group_memberships;
create trigger akiba_group_membership_entitlement_guard
before insert or update
on public.akiba_group_memberships
for each row execute function akiba_private.guard_group_membership_entitlements();

create or replace function akiba_private.guard_group_plan_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  plan_row public.akiba_group_plan_entitlements%rowtype;
  member_count integer;
  admin_count integer;
begin
  if new.group_plan_code is not distinct from old.group_plan_code then
    return new;
  end if;

  select * into plan_row
  from public.akiba_group_plan_entitlements
  where plan_code = new.group_plan_code and is_active = true;
  if not found then
    raise exception 'The selected group plan is unavailable';
  end if;

  select count(*) into member_count
  from public.akiba_group_memberships
  where group_id = new.id and status = 'active';
  select count(*) into admin_count
  from public.akiba_group_memberships
  where group_id = new.id and status = 'active' and role = 'group_admin';

  if member_count > plan_row.max_members or admin_count > plan_row.max_group_admins then
    raise exception 'The selected plan does not support the current group membership';
  end if;
  return new;
end;
$fn$;

drop trigger if exists akiba_group_plan_entitlement_guard on public.akiba_groups;
create trigger akiba_group_plan_entitlement_guard
before update of group_plan_code on public.akiba_groups
for each row execute function akiba_private.guard_group_plan_change();

-- Plan configuration changes cannot silently invalidate existing groups.
create or replace function akiba_private.guard_group_plan_entitlement_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  group_row record;
  member_count integer;
  admin_count integer;
begin
  if not new.is_active and exists (
    select 1 from public.akiba_groups where group_plan_code = old.plan_code
  ) then
    raise exception 'A group plan assigned to existing groups cannot be deactivated';
  end if;

  for group_row in
    select id from public.akiba_groups
    where group_plan_code = old.plan_code
    order by id
    for update
  loop
    select count(*) into member_count
    from public.akiba_group_memberships
    where group_id = group_row.id and status = 'active';
    select count(*) into admin_count
    from public.akiba_group_memberships
    where group_id = group_row.id and status = 'active' and role = 'group_admin';

    if member_count > new.max_members or admin_count > new.max_group_admins then
      raise exception 'Updated plan limits would invalidate group %', group_row.id;
    end if;
  end loop;
  return new;
end;
$fn$;

drop trigger if exists akiba_group_plan_entitlement_update_guard on public.akiba_group_plan_entitlements;
create trigger akiba_group_plan_entitlement_update_guard
before update on public.akiba_group_plan_entitlements
for each row execute function akiba_private.guard_group_plan_entitlement_update();

-- Immutable audit trail for Group Admin appointment and demotion.
create table if not exists public.akiba_group_membership_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  subject_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null check (event_type in ('group_admin_appointed', 'group_admin_demoted')),
  previous_role text not null check (previous_role in ('member', 'group_admin')),
  new_role text not null check (new_role in ('member', 'group_admin')),
  created_at timestamptz not null default now()
);
create index if not exists akiba_group_membership_events_group_time_idx
  on public.akiba_group_membership_events(group_id, created_at desc);
alter table public.akiba_group_membership_events enable row level security;
drop policy if exists "active members read membership events" on public.akiba_group_membership_events;
create policy "active members read membership events"
  on public.akiba_group_membership_events for select to authenticated
  using (akiba_private.is_active_group_member(group_id));
revoke all on public.akiba_group_membership_events from anon, authenticated;
grant select on public.akiba_group_membership_events to authenticated;

-- Only the recorded Group Creator may appoint or demote an existing active
-- member. Invitations and joining remain separate workflows.
create or replace function public.akiba_set_group_admin(
  p_group_id uuid,
  p_user_id uuid,
  p_action text
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  group_creator_id uuid;
  target_role text;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_group_id is null or p_user_id is null or p_action is null or p_action not in ('appoint', 'demote') then
    raise exception 'Invalid Group Admin change';
  end if;

  select created_by into group_creator_id
  from public.akiba_groups where id = p_group_id for update;
  if not found then raise exception 'Group not found'; end if;
  if group_creator_id <> actor_id then
    raise exception 'Only the Group Creator may appoint or demote Group Admins';
  end if;

  if exists (
    select 1 from public.akiba_withdrawal_requests r
    where r.group_id = p_group_id
      and r.status in ('pending_approval', 'approved', 'processing', 'failed_pending_reconciliation')
  ) then
    raise exception 'Group Admin appointments cannot change while a withdrawal is unresolved';
  end if;

  select role into target_role
  from public.akiba_group_memberships
  where group_id = p_group_id and user_id = p_user_id and status = 'active'
  for update;
  if not found then raise exception 'The selected person must already be an active group member'; end if;
  if p_user_id = group_creator_id then raise exception 'The Group Creator cannot be appointed as a Group Admin'; end if;

  if p_action = 'appoint' then
    if target_role = 'group_admin' then return; end if;
    if target_role <> 'member' then raise exception 'Only an ordinary member can be appointed'; end if;
    update public.akiba_group_memberships set role = 'group_admin'
    where group_id = p_group_id and user_id = p_user_id and status = 'active';
    insert into public.akiba_group_membership_events
      (group_id, actor_id, subject_user_id, event_type, previous_role, new_role)
    values (p_group_id, actor_id, p_user_id, 'group_admin_appointed', 'member', 'group_admin');
  else
    if target_role = 'member' then return; end if;
    if target_role <> 'group_admin' then raise exception 'Only a Group Admin can be demoted'; end if;
    update public.akiba_group_memberships set role = 'member'
    where group_id = p_group_id and user_id = p_user_id and status = 'active';
    insert into public.akiba_group_membership_events
      (group_id, actor_id, subject_user_id, event_type, previous_role, new_role)
    values (p_group_id, actor_id, p_user_id, 'group_admin_demoted', 'group_admin', 'member');
  end if;
end;
$fn$;
revoke all on function public.akiba_set_group_admin(uuid, uuid, text) from public, anon;
grant execute on function public.akiba_set_group_admin(uuid, uuid, text) to authenticated;

create or replace function akiba_private.assert_group_leadership_ready(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  required_count integer;
  active_admin_count integer;
begin
  select e.required_group_admins into required_count
  from public.akiba_groups g
  join public.akiba_group_plan_entitlements e on e.plan_code = g.group_plan_code
  where g.id = p_group_id;
  if required_count is null then raise exception 'Group or group plan was not found'; end if;

  select count(*) into active_admin_count
  from public.akiba_group_memberships
  where group_id = p_group_id and role = 'group_admin' and status = 'active';

  if active_admin_count < required_count then
    raise exception 'Group leadership is incomplete: appoint at least % active Group Admins before contributions or withdrawals', required_count;
  end if;
end;
$fn$;
revoke all on function akiba_private.assert_group_leadership_ready(uuid) from public, anon, authenticated;

-- Locking the group row serializes membership changes against contribution
-- creation and payment posting.
create or replace function akiba_private.guard_contribution_leadership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  perform 1 from public.akiba_groups where id = new.group_id for update;
  if not found then raise exception 'Group not found'; end if;
  perform akiba_private.assert_group_leadership_ready(new.group_id);
  return new;
end;
$fn$;

drop trigger if exists akiba_contribution_leadership_guard on public.akiba_contribution_intents;
create trigger akiba_contribution_leadership_guard
before insert on public.akiba_contribution_intents
for each row execute function akiba_private.guard_contribution_leadership();

-- Also gate the final ledger posting: an old pending STK intent cannot settle
-- after group leadership has become incomplete.
drop trigger if exists akiba_financial_transaction_leadership_guard on public.akiba_financial_transactions;
create trigger akiba_financial_transaction_leadership_guard
before insert on public.akiba_financial_transactions
for each row
when (new.transaction_type = 'contribution')
execute function akiba_private.guard_contribution_leadership();

create or replace function akiba_private.guard_withdrawal_request_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  group_currency text;
  posted_group_funds numeric;
  active_reservations numeric;
begin
  perform 1 from public.akiba_groups where id = new.group_id for update;
  if not found then raise exception 'Group not found'; end if;

  select currency_code into group_currency
  from public.akiba_groups where id = new.group_id;
  if new.currency_code <> group_currency then
    raise exception 'Withdrawal currency must match group currency';
  end if;

  if not exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = new.group_id
      and m.user_id = new.initiator_id
      and m.role = 'group_creator'
      and m.status = 'active'
  ) then
    raise exception 'Only the Group Creator may initiate a withdrawal';
  end if;

  perform akiba_private.assert_group_leadership_ready(new.group_id);

  select coalesce(sum(case when e.direction = 'credit' then e.amount_minor else -e.amount_minor end), 0)
    into posted_group_funds
  from public.akiba_financial_ledger_entries e
  where e.group_id = new.group_id
    and e.currency_code = new.currency_code
    and e.account_code = 'group_funds';

  select coalesce(sum(r.amount_minor), 0)
    into active_reservations
  from public.akiba_financial_reservations r
  where r.group_id = new.group_id
    and r.currency_code = new.currency_code
    and r.status = 'active';

  if posted_group_funds - active_reservations < new.total_debit_minor then
    raise exception 'Insufficient available group funds for this withdrawal and its fees';
  end if;
  return new;
end;
$fn$;

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
  if new.terms_fingerprint is distinct from encode(
    extensions.digest(convert_to(concat_ws('|',
      request_row.id::text, request_row.group_id::text, request_row.currency_code,
      request_row.recipient_amount_minor::text, request_row.akiba_fee_minor::text,
      request_row.provider_fee_minor::text, request_row.recipient_name,
      coalesce(request_row.destination_fingerprint, ''), request_row.fee_schedule_version,
      request_row.provider_id::text
    ), 'UTF8'), 'sha256'), 'hex'
  ) then
    raise exception 'Approval terms do not match the current withdrawal request';
  end if;
  return new;
end;
$fn$;

create or replace function akiba_private.apply_withdrawal_approval_decision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  approved_count integer;
  active_admin_count integer;
begin
  if new.decision = 'rejected' then
    update public.akiba_withdrawal_requests
      set status = 'rejected', resolved_at = new.decided_at,
          resolution_note = new.rejection_reason, updated_at = now()
    where id = new.withdrawal_request_id and status = 'pending_approval';

    update public.akiba_financial_reservations
      set status = 'released', resolved_at = new.decided_at
    where withdrawal_request_id = new.withdrawal_request_id and status = 'active';
  else
    select count(*) into active_admin_count
    from public.akiba_group_memberships m
    join public.akiba_withdrawal_requests r on r.group_id = m.group_id
    where r.id = new.withdrawal_request_id
      and m.role = 'group_admin' and m.status = 'active';

    select count(distinct a.approver_id) into approved_count
    from public.akiba_withdrawal_approvals a
    where a.withdrawal_request_id = new.withdrawal_request_id
      and a.approval_version = new.approval_version
      and a.decision = 'approved';

    if active_admin_count >= 1 and approved_count = active_admin_count then
      update public.akiba_withdrawal_requests
        set status = 'approved', approved_at = now(), updated_at = now()
      where id = new.withdrawal_request_id and status = 'pending_approval';
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
  from public.akiba_withdrawal_requests r where r.id = new.withdrawal_request_id;
  return new;
end;
$fn$;

create or replace function akiba_private.guard_payout_attempt_insert()
returns trigger
language plpgsql
set search_path = ''
as $fn$
declare
  request_row public.akiba_withdrawal_requests%rowtype;
  approved_count integer;
  active_admin_count integer;
begin
  select * into request_row
  from public.akiba_withdrawal_requests
  where id = new.withdrawal_request_id for update;
  if not found or request_row.status <> 'approved' then
    raise exception 'Payout execution requires an approved withdrawal request';
  end if;
  if new.provider_id <> request_row.provider_id then
    raise exception 'Payout provider must match the approved withdrawal provider';
  end if;

  select count(*) into active_admin_count
  from public.akiba_group_memberships
  where group_id = request_row.group_id and role = 'group_admin' and status = 'active';
  select count(distinct approver_id) into approved_count
  from public.akiba_withdrawal_approvals
  where withdrawal_request_id = request_row.id
    and approval_version = request_row.approval_version and decision = 'approved';

  if active_admin_count < 1 or approved_count <> active_admin_count then
    raise exception 'Every active Group Admin must approve before payout execution';
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
  where id = p_withdrawal_request_id for update;
  if not found then raise exception 'Withdrawal request not found'; end if;
  if request_row.status <> 'pending_approval' then
    raise exception 'This withdrawal request is no longer accepting decisions';
  end if;
  if not exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = request_row.group_id and m.user_id = actor_id
      and m.role = 'group_admin' and m.status = 'active'
  ) then
    raise exception 'Only an active Group Admin may approve or reject';
  end if;
  if actor_id = request_row.initiator_id then
    raise exception 'The withdrawal initiator cannot approve their own request';
  end if;

  fingerprint := encode(extensions.digest(convert_to(concat_ws('|',
    request_row.id::text, request_row.group_id::text, request_row.currency_code,
    request_row.recipient_amount_minor::text, request_row.akiba_fee_minor::text,
    request_row.provider_fee_minor::text, request_row.recipient_name,
    coalesce(request_row.destination_fingerprint, ''), request_row.fee_schedule_version,
    request_row.provider_id::text
  ), 'UTF8'), 'sha256'), 'hex');

  insert into public.akiba_withdrawal_approvals (
    withdrawal_request_id, group_id, approver_id, decision,
    approval_version, terms_fingerprint, rejection_reason
  ) values (
    request_row.id, request_row.group_id, actor_id, p_decision,
    request_row.approval_version, fingerprint,
    case when p_decision = 'rejected' then btrim(p_rejection_reason) else null end
  ) returning id into approval_id;
  return approval_id;
end;
$fn$;

revoke all on function public.akiba_decide_withdrawal_request(uuid, text, text) from public, anon;
grant execute on function public.akiba_decide_withdrawal_request(uuid, text, text) to authenticated;

commit;
