begin;

-- The Group Creator identity is immutable during ordinary membership operations.
-- The only exception is the Creator-authorized hard-delete RPC, which sets a
-- transaction-local group-scoped marker immediately before removing memberships.
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
      if current_setting('akiba.system_group_hard_delete_group_id', true)
           = old.group_id::text
         and exists (
           select 1 from public.akiba_groups g
           where g.id = old.group_id and g.created_by = auth.uid()
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

-- Recreate the hard-delete RPC with the scoped marker. Authorization, exact-name
-- confirmation and the financial checks remain server-side and unchanged.
create or replace function public.akiba_hard_delete_group(p_group_id uuid, p_confirm_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  group_row public.akiba_groups%rowtype;
  safety jsonb;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  select * into group_row from public.akiba_groups where id = p_group_id for update;
  if not found then raise exception 'Group not found'; end if;
  if group_row.created_by <> actor_id or not exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = p_group_id and m.user_id = actor_id
      and m.role = 'group_creator' and m.status = 'active'
  ) then raise exception 'Only the Group Creator can permanently delete this group'; end if;
  if group_row.status = 'deleted' then raise exception 'This group has already been deleted'; end if;
  if p_confirm_name is distinct from group_row.name then
    raise exception 'The group name confirmation does not match';
  end if;

  safety := akiba_private.group_financial_safety(p_group_id);
  if (safety->>'has_financial_history')::boolean then
    raise exception 'This group has financial history. Its financial records must be preserved; hard deletion is not allowed.';
  end if;
  if (safety->>'has_unresolved_financial_activity')::boolean
     or (safety->>'balance_minor')::numeric <> 0
     or (safety->>'held_minor')::numeric <> 0 then
    raise exception 'Resolve all pending financial activity, held funds and group balance before deleting this group';
  end if;

  insert into public.akiba_group_lifecycle_audit(group_id, actor_user_id, action, group_name_snapshot, details)
  values (p_group_id, actor_id, 'hard_deleted', group_row.name,
    jsonb_build_object('financial_history', false, 'balance_minor', 0, 'held_minor', 0));

  if group_row.group_image_path is not null then
    insert into public.akiba_group_deletion_storage_jobs(group_id, bucket_id, object_path)
    values (p_group_id, 'group-images', group_row.group_image_path)
    on conflict (bucket_id, object_path) do nothing;
  end if;
  insert into public.akiba_group_deletion_storage_jobs(group_id, bucket_id, object_path)
  select p_group_id, 'akiba-group-chat-attachments', a.storage_path
  from public.akiba_group_chat_attachments a
  where a.group_id = p_group_id
  on conflict (bucket_id, object_path) do nothing;
  insert into public.akiba_group_deletion_storage_jobs(group_id, bucket_id, object_path)
  select p_group_id, 'akiba-group-report-evidence', e.storage_path
  from public.akiba_group_report_evidence e
  join public.akiba_group_reports r on r.id = e.report_id
  where r.group_id = p_group_id
  on conflict (bucket_id, object_path) do nothing;

  delete from public.akiba_group_report_evidence e
  using public.akiba_group_reports r
  where e.report_id = r.id and r.group_id = p_group_id;
  delete from public.akiba_group_reports where group_id = p_group_id;
  delete from public.akiba_group_chat_attachments where group_id = p_group_id;
  delete from public.akiba_group_message_reactions where group_id = p_group_id;
  update public.akiba_group_messages set parent_message_id = null where group_id = p_group_id;
  delete from public.akiba_group_messages where group_id = p_group_id;
  delete from public.akiba_group_join_requests where group_id = p_group_id;
  delete from public.akiba_group_invitations where group_id = p_group_id;
  delete from public.akiba_group_blocks where group_id = p_group_id;
  delete from public.akiba_group_membership_events where group_id = p_group_id;
  delete from public.akiba_group_activity where group_id = p_group_id;
  delete from public.akiba_group_notifications where group_id = p_group_id;

  -- Scope the protected Creator-membership exception to this group and this
  -- transaction; the trigger also verifies auth.uid() against groups.created_by.
  perform set_config('akiba.system_group_hard_delete_group_id', p_group_id::text, true);
  delete from public.akiba_group_memberships where group_id = p_group_id;
  delete from public.akiba_groups where id = p_group_id;
end;
$fn$;

revoke all on function public.akiba_hard_delete_group(uuid,text) from public, anon;
grant execute on function public.akiba_hard_delete_group(uuid,text) to authenticated;

commit;
