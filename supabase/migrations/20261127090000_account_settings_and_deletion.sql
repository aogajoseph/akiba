begin;

-- Account-level preferences are separate from profile identity and group settings.
create table if not exists public.akiba_user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system'
    check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.akiba_user_settings enable row level security;
drop policy if exists "users read own account settings" on public.akiba_user_settings;
create policy "users read own account settings"
  on public.akiba_user_settings for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "users insert own account settings" on public.akiba_user_settings;
create policy "users insert own account settings"
  on public.akiba_user_settings for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "users update own account settings" on public.akiba_user_settings;
create policy "users update own account settings"
  on public.akiba_user_settings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.akiba_user_settings from public, anon;
grant select, insert, update on public.akiba_user_settings to authenticated;

-- A deleted group remains as a retention/audit record. It must not keep a
-- deleted Akiba user as a required FK owner.
alter table public.akiba_groups alter column created_by drop not null;

-- Preserve group and finance history while removing personal attribution when
-- the account owner requests deletion. The original financial records remain
-- immutable; identity fields are nullable only for anonymisation.
alter table public.akiba_group_messages alter column author_id drop not null;
alter table public.akiba_group_membership_events alter column actor_id drop not null;
alter table public.akiba_group_membership_events alter column subject_user_id drop not null;
alter table public.akiba_group_chat_attachments alter column uploaded_by drop not null;
alter table public.akiba_contribution_intents alter column contributor_id drop not null;
alter table public.akiba_withdrawal_requests alter column initiator_id drop not null;
alter table public.akiba_withdrawal_approvals alter column approver_id drop not null;
alter table public.akiba_group_reports alter column reporter_user_id drop not null;
alter table public.akiba_group_report_evidence alter column uploaded_by drop not null;
alter table public.akiba_group_invite_links alter column created_by drop not null;

-- A reviewed join request remains historical, but its reviewer identity is
-- anonymised. Preserve the review timestamp and outcome.
alter table public.akiba_group_join_requests
  drop constraint if exists akiba_group_join_requests_review_state_check,
  add constraint akiba_group_join_requests_review_state_check check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null)
  );

-- Permit a Group Admin to step down during a group's six-month retention
-- period. Other membership changes remain frozen after deactivation.
create or replace function akiba_private.guard_active_group_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  target_group_id uuid;
  group_status text;
begin
  if current_setting('akiba.system_group_purge', true) = 'on' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;
  target_group_id := case when tg_op = 'DELETE' then old.group_id else new.group_id end;
  select status into group_status
  from public.akiba_groups
  where id = target_group_id
  for update;
  if not found then raise exception 'Group not found'; end if;
  if group_status <> 'active' then
    if tg_op = 'UPDATE'
       and group_status = 'deactivated'
       and old.role = 'group_admin' and new.role = 'member'
       and old.status = 'active' and new.status = 'active'
       and auth.uid() = old.user_id then
      return new;
    end if;
    raise exception 'This group is deactivated and no longer accepts membership changes';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$fn$;

create or replace function public.akiba_step_down_group_admin(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  group_status text;
  member_row public.akiba_group_memberships%rowtype;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  select status into group_status
  from public.akiba_groups
  where id = p_group_id and status in ('active', 'deactivated')
  for update;
  if not found then raise exception 'Group not found or deleted'; end if;

  select * into member_row from public.akiba_group_memberships
  where group_id = p_group_id and user_id = actor_id and status = 'active'
  for update;
  if not found then raise exception 'You are not an active group member'; end if;
  if member_row.role = 'group_creator' then raise exception 'The Group Creator role cannot be changed'; end if;
  if member_row.role = 'member' then return; end if;
  if member_row.role <> 'group_admin' then raise exception 'Only a Group Admin can step down'; end if;

  update public.akiba_group_memberships set role = 'member' where id = member_row.id;
  insert into public.akiba_group_membership_events
    (group_id, actor_id, subject_user_id, event_type, previous_role, new_role)
  values (p_group_id, actor_id, actor_id, 'group_admin_demoted', 'group_admin', 'member');
  insert into public.akiba_group_activity(group_id, actor_id, event_type, summary)
  values (p_group_id, actor_id, 'group_admin_stepped_down',
    case when group_status = 'deactivated'
      then 'A Group Admin stepped down during the six-month retention period.'
      else 'A Group Admin voluntarily stepped down to ordinary Member.'
    end);
end;
$fn$;
revoke all on function public.akiba_step_down_group_admin(uuid) from public, anon;
grant execute on function public.akiba_step_down_group_admin(uuid) to authenticated;

-- This privileged preparation is called only by the server using the service
-- role immediately before Supabase Auth deletes the user. It rechecks the
-- ownership/role gates in the database, then anonymises or removes only
-- identity-dependent references. No financial journal rows are changed.
create or replace function public.akiba_prepare_account_deletion(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role is required for account deletion';
  end if;
  if p_user_id is null or not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'Account was not found';
  end if;

  if exists (
    select 1 from public.akiba_groups g
    where g.created_by = p_user_id and g.status <> 'deleted'
  ) or exists (
    select 1 from public.akiba_group_memberships m
    join public.akiba_groups g on g.id = m.group_id
    where m.user_id = p_user_id and m.role = 'group_creator'
      and g.status <> 'deleted'
  ) then
    raise exception 'Group Creator ownership must be resolved before account deletion';
  end if;

  if exists (
    select 1 from public.akiba_group_memberships m
    join public.akiba_groups g on g.id = m.group_id
    where m.user_id = p_user_id and m.role = 'group_admin'
      and g.status <> 'deleted'
  ) then
    raise exception 'Group Admin role must be relinquished before account deletion';
  end if;

  if exists (select 1 from public.akiba_internal_moderators m where m.user_id = p_user_id) then
    raise exception 'Internal moderator role must be transferred before account deletion';
  end if;

  -- The six-month retention worker should have removed Creator memberships.
  -- Refuse to delete if it has not, rather than bypassing its membership guard.
  if exists (
    select 1 from public.akiba_group_memberships m
    where m.user_id = p_user_id and m.role = 'group_creator'
  ) then
    raise exception 'Group Creator retention cleanup has not completed';
  end if;

  update public.akiba_groups
  set created_by = null
  where created_by = p_user_id and status = 'deleted';

  delete from public.akiba_group_blocks
  where user_id = p_user_id or created_by = p_user_id;

  delete from public.akiba_group_invitations
  where inviter_id = p_user_id
     or intended_user_id = p_user_id
     or accepted_by = p_user_id
     or declined_by = p_user_id;

  update public.akiba_group_invite_links set created_by = null where created_by = p_user_id;
  update public.akiba_group_messages set author_id = null where author_id = p_user_id;
  update public.akiba_group_membership_events set actor_id = null where actor_id = p_user_id;
  update public.akiba_group_membership_events set subject_user_id = null where subject_user_id = p_user_id;
  update public.akiba_group_chat_attachments set uploaded_by = null where uploaded_by = p_user_id;
  update public.akiba_contribution_intents set contributor_id = null where contributor_id = p_user_id;
  update public.akiba_withdrawal_requests set initiator_id = null where initiator_id = p_user_id;
  update public.akiba_withdrawal_approvals set approver_id = null where approver_id = p_user_id;
  update public.akiba_group_reports set reporter_user_id = null where reporter_user_id = p_user_id;
  update public.akiba_group_report_evidence set uploaded_by = null where uploaded_by = p_user_id;
  update public.akiba_group_join_requests set reviewed_by = null where reviewed_by = p_user_id;
  update public.akiba_group_activity set actor_id = null where actor_id = p_user_id;
  update public.akiba_group_notifications set actor_id = null where actor_id = p_user_id;
  update public.akiba_finance_activity_events set actor_id = null where actor_id = p_user_id;
  update public.akiba_group_report_audit set actor_user_id = null where actor_user_id = p_user_id;
  update public.akiba_group_lifecycle_audit
  set actor_user_id = '00000000-0000-0000-0000-000000000000'::uuid
  where actor_user_id = p_user_id;

  -- Account deletion is allowed to remove ordinary memberships from a
  -- deactivated group as well; the trusted purge marker bypasses the normal
  -- frozen-membership trigger after the Creator/Admin gates above have passed.
  perform set_config('akiba.system_group_purge', 'on', true);
  delete from public.akiba_group_memberships where user_id = p_user_id;
  perform set_config('akiba.system_group_purge', 'off', true);
end;
$fn$;

revoke all on function public.akiba_prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.akiba_prepare_account_deletion(uuid) to service_role;

commit;
