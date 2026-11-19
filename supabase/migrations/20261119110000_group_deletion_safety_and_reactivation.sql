begin;

-- Lifecycle audit is deliberately independent of the group row so hard deletion
-- does not erase evidence that the Group Creator requested and confirmed it.
create table if not exists public.akiba_group_lifecycle_audit (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  actor_user_id uuid not null,
  action text not null check (action in ('deactivated','reactivated','hard_deleted')),
  group_name_snapshot text not null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists akiba_group_lifecycle_audit_group_time_idx
  on public.akiba_group_lifecycle_audit(group_id, created_at desc);
alter table public.akiba_group_lifecycle_audit enable row level security;
revoke all on public.akiba_group_lifecycle_audit from public, anon, authenticated;

-- Storage cleanup is asynchronous because Storage objects must be removed through
-- the Storage API, never by deleting storage.objects rows in SQL.
create table if not exists public.akiba_group_deletion_storage_jobs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null,
  bucket_id text not null check (bucket_id in (
    'group-images', 'akiba-group-chat-attachments', 'akiba-group-report-evidence'
  )),
  object_path text not null,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  completed_at timestamptz,
  unique(bucket_id, object_path)
);
create index if not exists akiba_group_deletion_storage_jobs_pending_idx
  on public.akiba_group_deletion_storage_jobs(status, created_at)
  where status in ('pending','failed');
alter table public.akiba_group_deletion_storage_jobs enable row level security;
revoke all on public.akiba_group_deletion_storage_jobs from public, anon, authenticated;

-- One authoritative financial snapshot is shared by deactivation, hard deletion,
-- reactivation decisions and the six-month retention worker.
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
      select 1 from public.akiba_withdrawal_requests w
      where w.group_id = p_group_id
        and w.status in ('pending_approval','approved','processing','failed_pending_reconciliation')
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
revoke all on function akiba_private.group_financial_safety(uuid) from public, anon, authenticated;

-- Creator-only preview. It is advisory UI data; the destructive RPC repeats all
-- checks under a row lock immediately before doing any work.
create or replace function public.akiba_group_deletion_eligibility(p_group_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  group_row public.akiba_groups%rowtype;
  safety jsonb;
  can_delete boolean;
  reasons jsonb := '[]'::jsonb;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  select * into group_row from public.akiba_groups where id = p_group_id;
  if not found then raise exception 'Group not found'; end if;
  if group_row.created_by <> actor_id or not exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = p_group_id and m.user_id = actor_id
      and m.role = 'group_creator' and m.status = 'active'
  ) then raise exception 'Only the Group Creator can manage group deletion'; end if;
  if group_row.status = 'deleted' then raise exception 'This group has already been deleted'; end if;

  safety := akiba_private.group_financial_safety(p_group_id);
  if (safety->>'has_financial_history')::boolean then
    reasons := reasons || jsonb_build_array('financial_history');
  end if;
  if (safety->>'has_unresolved_financial_activity')::boolean then
    reasons := reasons || jsonb_build_array('unresolved_financial_activity');
  end if;
  if (safety->>'balance_minor')::numeric <> 0 then
    reasons := reasons || jsonb_build_array('nonzero_group_balance');
  end if;
  if (safety->>'held_minor')::numeric <> 0 then
    reasons := reasons || jsonb_build_array('held_funds');
  end if;

  can_delete := jsonb_array_length(reasons) = 0;
  return safety || jsonb_build_object(
    'can_hard_delete', can_delete,
    'reasons', reasons,
    'group_status', group_row.status,
    'group_name', group_row.name
  );
end;
$fn$;
revoke all on function public.akiba_group_deletion_eligibility(uuid) from public, anon;
grant execute on function public.akiba_group_deletion_eligibility(uuid) to authenticated;

-- Allow only this server-authorized RPC to reverse an unpurged deactivation.
create or replace function akiba_private.guard_group_lifecycle_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if current_setting('akiba.system_group_purge', true) = 'on'
     and old.status = 'deactivated' and new.status = 'deleted' then
    new.deleted_at := greatest(clock_timestamp(), new.scheduled_delete_at);
    return new;
  end if;

  if current_setting('akiba.system_group_reactivation', true) = 'on'
     and old.status = 'deactivated' and new.status = 'active'
     and auth.uid() is not null and auth.uid() = old.created_by then
    new.deactivated_at := null;
    new.scheduled_delete_at := null;
    new.deleted_at := null;
    return new;
  end if;

  if old.status is distinct from new.status then
    if old.status <> 'active' or new.status <> 'deactivated'
       or auth.uid() is distinct from old.created_by then
      raise exception 'Only the Group Creator may deactivate an active group or reactivate a deactivated group';
    end if;
    new.deactivated_at := clock_timestamp();
    new.scheduled_delete_at := new.deactivated_at + interval '6 months';
  elsif old.status <> 'active'
      and (new.deactivated_at is distinct from old.deactivated_at
        or new.scheduled_delete_at is distinct from old.scheduled_delete_at) then
    raise exception 'A deactivated group retention deadline cannot be changed';
  end if;
  return new;
end;
$fn$;

-- Deactivation is not allowed while a payment, payout, withdrawal, reservation,
-- held amount or group balance remains unsettled.
create or replace function public.akiba_deactivate_group(p_group_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  group_row public.akiba_groups%rowtype;
  delete_at timestamptz;
  safety jsonb;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_group_id is null then raise exception 'Group is required'; end if;

  select * into group_row from public.akiba_groups where id = p_group_id for update;
  if not found then raise exception 'Group not found'; end if;
  if group_row.created_by <> actor_id or not exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = p_group_id and m.user_id = actor_id
      and m.role = 'group_creator' and m.status = 'active'
  ) then raise exception 'Only the Group Creator can deactivate this group'; end if;
  if group_row.status = 'deactivated' then return group_row.scheduled_delete_at; end if;
  if group_row.status <> 'active' then raise exception 'This group is already deleted'; end if;

  safety := akiba_private.group_financial_safety(p_group_id);
  if (safety->>'has_unresolved_financial_activity')::boolean
     or (safety->>'balance_minor')::numeric <> 0
     or (safety->>'held_minor')::numeric <> 0 then
    raise exception 'Resolve all pending transactions, withdrawals, payout reconciliation, held funds and group balance before deactivating the group';
  end if;

  update public.akiba_groups set status = 'deactivated', updated_at = clock_timestamp()
  where id = p_group_id returning scheduled_delete_at into delete_at;

  update public.akiba_group_invitations
  set status = 'cancelled', updated_at = now()
  where group_id = p_group_id and status = 'pending';

  insert into public.akiba_group_activity(group_id, actor_id, event_type, summary)
  values (p_group_id, actor_id, 'group_deactivated',
    'The Group Creator deactivated this group. It is scheduled for deletion after the six-month retention period.');
  insert into public.akiba_group_lifecycle_audit(group_id, actor_user_id, action, group_name_snapshot, details)
  values (p_group_id, actor_id, 'deactivated', group_row.name,
    jsonb_build_object('financial_history_preserved', (safety->>'has_financial_history')::boolean));
  return delete_at;
end;
$fn$;
revoke all on function public.akiba_deactivate_group(uuid) from public, anon;
grant execute on function public.akiba_deactivate_group(uuid) to authenticated;

create or replace function public.akiba_reactivate_group(p_group_id uuid)
returns boolean
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
  ) then raise exception 'Only the Group Creator can reactivate this group'; end if;
  if group_row.status <> 'deactivated' then raise exception 'Only a deactivated group can be reactivated'; end if;

  safety := akiba_private.group_financial_safety(p_group_id);
  perform set_config('akiba.system_group_reactivation', 'on', true);
  update public.akiba_groups
  set status = 'active', deactivated_at = null, scheduled_delete_at = null,
      updated_at = clock_timestamp()
  where id = p_group_id;

  insert into public.akiba_group_activity(group_id, actor_id, event_type, summary)
  values (p_group_id, actor_id, 'group_reactivated',
    'The Group Creator reactivated this group so outstanding financial matters can be reviewed and settled.');
  insert into public.akiba_group_lifecycle_audit(group_id, actor_user_id, action, group_name_snapshot, details)
  values (p_group_id, actor_id, 'reactivated', group_row.name, safety);
  return true;
end;
$fn$;
revoke all on function public.akiba_reactivate_group(uuid) from public, anon;
grant execute on function public.akiba_reactivate_group(uuid) to authenticated;

-- Permanently delete only a group with no financial history and no unsettled
-- money. The exact-name confirmation is checked again under the group row lock.
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
  delete from public.akiba_group_messages where group_id = p_group_id;
  delete from public.akiba_group_join_requests where group_id = p_group_id;
  delete from public.akiba_group_invitations where group_id = p_group_id;
  delete from public.akiba_group_blocks where group_id = p_group_id;
  delete from public.akiba_group_membership_events where group_id = p_group_id;
  delete from public.akiba_group_activity where group_id = p_group_id;
  delete from public.akiba_group_notifications where group_id = p_group_id;
  delete from public.akiba_group_memberships where group_id = p_group_id;
  delete from public.akiba_groups where id = p_group_id;
end;
$fn$;
revoke all on function public.akiba_hard_delete_group(uuid,text) from public, anon;
grant execute on function public.akiba_hard_delete_group(uuid,text) to authenticated;

-- Retention scrub preserves every financial row and waits for all unsettled
-- activity, held funds and a zero balance. Replace the existing scheduled worker.
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
    delete from public.akiba_group_messages where group_id = group_row.id;
    delete from public.akiba_group_membership_events where group_id = group_row.id;
    delete from public.akiba_group_activity where group_id = group_row.id;
    delete from public.akiba_group_memberships where group_id = group_row.id;

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
