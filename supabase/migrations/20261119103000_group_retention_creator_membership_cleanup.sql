begin;

-- Retention cleanup is a separate privileged lifecycle operation from Creator-
-- initiated hard deletion. Keep the normal Creator membership guard intact and
-- grant the scheduled worker a transaction-local, group-scoped exception only
-- while it is processing that exact due group.
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
  if tg_op = 'DELETE' then
    perform 1 from public.akiba_groups where id = old.group_id for update;
    if old.role = 'group_creator' then
      if (
        current_setting('akiba.system_group_hard_delete_group_id', true)
          = old.group_id::text
        and exists (
          select 1 from public.akiba_groups g
          where g.id = old.group_id and g.created_by = auth.uid()
        )
      ) or (
        current_setting('akiba.system_group_retention_group_id', true)
          = old.group_id::text
        and current_setting('akiba.system_group_purge', true) = 'on'
      ) then
        return old;
      end if;
      raise exception 'The Group Creator membership cannot be deleted';
    end if;
    if old.role = 'group_admin' and exists (
      select 1 from public.akiba_withdrawal_requests r
      where r.group_id = old.group_id
        and r.status in ('pending_approval', 'approved', 'processing', 'failed_pending_reconciliation')
    ) then
      raise exception 'Group Admin memberships cannot be deleted while a withdrawal is unresolved';
    end if;
    return old;
  end if;

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

-- Replace the worker without changing its financial gate or retention behavior.
-- The marker is set immediately before membership cleanup for the locked group
-- and cleared before moving to the next group.
create or replace function akiba_private.process_due_group_deletions(p_cutoff timestamptz default clock_timestamp())
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  group_row record;
  deleted_timestamp timestamptz;
  financial_count bigint;
  ledger_count bigint;
  intent_count bigint;
  withdrawal_count bigint;
  processed_count integer := 0;
  safety jsonb;
begin
  for group_row in
    select id, deactivated_at, scheduled_delete_at, group_image_path
    from public.akiba_groups
    where status = 'deactivated' and scheduled_delete_at <= p_cutoff
    order by scheduled_delete_at, id
    for update skip locked
  loop
    safety := akiba_private.group_financial_safety(group_row.id);
    if (safety->>'has_unresolved_financial_activity')::boolean
       or (safety->>'balance_minor')::numeric <> 0
       or (safety->>'held_minor')::numeric <> 0 then
      continue;
    end if;

    select count(*) into financial_count from public.akiba_financial_transactions where group_id = group_row.id;
    select count(*) into ledger_count from public.akiba_financial_ledger_entries where group_id = group_row.id;
    select count(*) into intent_count from public.akiba_contribution_intents where group_id = group_row.id;
    select count(*) into withdrawal_count from public.akiba_withdrawal_requests where group_id = group_row.id;

    perform set_config('akiba.system_group_purge', 'on', true);
    delete from public.akiba_group_invitations where group_id = group_row.id;
    delete from public.akiba_group_blocks where group_id = group_row.id;
    update public.akiba_group_messages set parent_message_id = null where group_id = group_row.id;
    delete from public.akiba_group_messages where group_id = group_row.id;
    delete from public.akiba_group_membership_events where group_id = group_row.id;
    delete from public.akiba_group_activity where group_id = group_row.id;

    -- The trigger permits Creator membership deletion only for this group while
    -- the trusted retention worker's purge marker is active.
    perform set_config('akiba.system_group_retention_group_id', group_row.id::text, true);
    delete from public.akiba_group_memberships where group_id = group_row.id;
    perform set_config('akiba.system_group_retention_group_id', '', true);

    update public.akiba_groups
    set status = 'deleted',
        name = 'Deleted group',
        description = '',
        event_location = null,
        group_image_path = null,
        target_amount = null,
        event_date = null,
        deadline = null,
        contribution_frequency = null,
        updated_at = clock_timestamp()
    where id = group_row.id
    returning deleted_at into deleted_timestamp;

    insert into public.akiba_group_deletion_records
      (group_id, deactivated_at, scheduled_delete_at, deleted_at, image_path_for_cleanup,
       financial_transaction_count, ledger_entry_count, contribution_intent_count, withdrawal_count)
    values
      (group_row.id, group_row.deactivated_at, group_row.scheduled_delete_at, deleted_timestamp,
       group_row.group_image_path, financial_count, ledger_count, intent_count, withdrawal_count)
    on conflict (group_id) do nothing;

    processed_count := processed_count + 1;
  end loop;
  return processed_count;
end;
$fn$;
revoke all on function akiba_private.process_due_group_deletions(timestamptz) from public, anon, authenticated;

commit;
