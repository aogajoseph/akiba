-- Finance review revision: member-only flags, explicit unresolved-request lock,
-- synchronized review countdown support, and conversational username-based alerts.
begin;

alter table public.akiba_finance_activity_events
  add column if not exists actor_username_snapshot text;

create or replace function akiba_private.snapshot_finance_event_actor_username()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
begin
  if new.actor_id is not null and new.actor_username_snapshot is null then
    select nullif(btrim(p.username), '')
      into new.actor_username_snapshot
    from public.akiba_profiles p
    where p.user_id = new.actor_id;
  end if;
  return new;
end;
$fn$;

revoke all on function akiba_private.snapshot_finance_event_actor_username() from public, anon, authenticated;
drop trigger if exists akiba_finance_event_actor_username_snapshot on public.akiba_finance_activity_events;
create trigger akiba_finance_event_actor_username_snapshot
before insert on public.akiba_finance_activity_events
for each row execute function akiba_private.snapshot_finance_event_actor_username();

-- Rejections were previously emitting two finance events for one Admin action.
-- Keep the single canonical approval event so inbox notifications are not duplicated.
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
  changed_rows integer;
  reservation_rows integer;
begin
  if new.decision = 'rejected' then
    update public.akiba_withdrawal_requests
    set status = 'rejected',
        resolved_at = new.decided_at,
        resolution_note = new.rejection_reason,
        updated_at = clock_timestamp()
    where id = new.withdrawal_request_id
      and status = 'pending_approval';
    get diagnostics changed_rows = row_count;
    if changed_rows <> 1 then
      raise exception 'Withdrawal request is no longer awaiting approval';
    end if;

    update public.akiba_financial_reservations
    set status = 'released',
        resolved_at = new.decided_at
    where withdrawal_request_id = new.withdrawal_request_id
      and status = 'active';
    get diagnostics reservation_rows = row_count;
    if reservation_rows <> 1 then
      raise exception 'Withdrawal rejection requires exactly one active reservation';
    end if;
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
      get diagnostics changed_rows = row_count;
      if changed_rows <> 1 then
        raise exception 'Withdrawal request could not enter staging after final approval';
      end if;

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

-- The Group Creator and Group Admins have approval/creation authority, not
-- member flagging authority. Enforce the role distinction in PostgreSQL.
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
      and m.role not in ('group_creator','group_admin')
  ) then
    raise exception 'Only active ordinary group members may flag a withdrawal';
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

-- Keep the partial unique index as the final concurrency barrier, and add an
-- explicit group-locked guard for a clear failure before any second request is inserted.
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
  if actor_id is null then raise exception 'Authentication is required'; end if;

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
  if not found then raise exception 'Group not found'; end if;
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

  if exists (
    select 1 from public.akiba_withdrawal_requests w
    where w.group_id = p_group_id
      and w.status in (
        'pending_approval','approved','staging','payout_queued',
        'payout_submitted','payout_processing','reconciliation_required',
        'processing','failed_pending_reconciliation'
      )
  ) then
    raise exception 'This group already has an unresolved withdrawal. Resolve it before creating another.';
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

-- Build notification copy from the immutable event-time username and the
-- withdrawal's immutable request details. Notification retries reuse the same snapshot.
create or replace function akiba_private.fanout_finance_activity_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  event_row public.akiba_finance_activity_events%rowtype;
  request_row public.akiba_withdrawal_requests%rowtype;
  request_id uuid;
  actor_label text;
  notification_title text;
  notification_body text;
  notification_type text;
  amount_label text;
  recipient_label text;
  reason_label text;
  flag_reason text;
begin
  select * into event_row
  from public.akiba_finance_activity_events
  where id = p_event_id
  for update;
  if not found then raise exception 'Finance activity event not found'; end if;
  if event_row.notification_published_at is not null then return; end if;

  actor_label := case
    when nullif(btrim(event_row.actor_username_snapshot), '') is not null
      then '@' || btrim(event_row.actor_username_snapshot)
    else 'A group member'
  end;

  notification_type := 'financial_' ||
    regexp_replace(lower(event_row.event_type), '[^a-z0-9_]+', '_', 'g');

  request_id := case
    when event_row.source_type = 'withdrawal_request' then event_row.source_id
    else nullif(event_row.event_payload ->> 'withdrawal_request_id', '')::uuid
  end;

  if request_id is not null then
    select * into request_row
    from public.akiba_withdrawal_requests
    where id = request_id;
    if found then
      amount_label := request_row.currency_code || ' ' ||
        regexp_replace(to_char(request_row.recipient_amount_minor::numeric / 100, 'FM999,999,999,990.00'), '\.00$', '');
      recipient_label := request_row.recipient_name;
      reason_label := request_row.reason;
    end if;
  end if;

  notification_title := case event_row.event_type
    when 'contribution_initiated' then 'Contribution started'
    when 'contribution_received' then 'Contribution received'
    when 'contribution_failed' then 'Contribution failed'
    when 'contribution_cancelled' then 'Contribution cancelled'
    when 'contribution_expired' then 'Contribution expired'
    when 'contribution_manual_review' then 'Contribution needs review'
    when 'payment_attempt_initiated' then 'Payment attempt started'
    when 'payment_attempt_submitted' then 'Payment request sent'
    when 'payment_attempt_succeeded' then 'Payment confirmed'
    when 'payment_attempt_failed' then 'Payment attempt failed'
    when 'payment_attempt_cancelled' then 'Payment attempt cancelled'
    when 'payment_attempt_expired' then 'Payment attempt expired'
    when 'withdrawal_requested' then 'Withdrawal requested'
    when 'withdrawal_approved' then 'Withdrawal approved'
    when 'withdrawal_rejected' then 'Withdrawal rejected'
    when 'withdrawal_staging_started' then 'Withdrawal staged'
    when 'withdrawal_flagged' then 'Withdrawal flagged'
    when 'withdrawal_flag_removed' then 'Withdrawal flag removed'
    when 'withdrawal_flag_closed' then 'Withdrawal flag closed'
    when 'withdrawal_cancelled_flagged' then 'Withdrawal cancelled'
    when 'withdrawal_cancelled_by_creator' then 'Withdrawal cancelled'
    when 'withdrawal_payout_queued' then 'Withdrawal cleared for payout'
    when 'withdrawal_payout_attempt_queued' then 'Payout attempt queued'
    when 'withdrawal_payout_attempt_submitted' then 'Payout submitted'
    when 'withdrawal_payout_attempt_processing' then 'Payout processing'
    when 'withdrawal_payout_attempt_succeeded' then 'Payout confirmed'
    when 'withdrawal_payout_attempt_failed' then 'Payout failed'
    when 'withdrawal_payout_attempt_cancelled' then 'Queued payout cancelled'
    when 'withdrawal_payout_attempt_unknown' then 'Payout outcome uncertain'
    else 'Group financial activity'
  end;

  flag_reason := nullif(btrim(event_row.event_payload ->> 'reason'), '');
  notification_body := actor_label || ' · ' || replace(event_row.event_type, '_', ' ');

  if request_id is not null and amount_label is not null then
    case event_row.event_type
      when 'withdrawal_requested' then
        notification_body := actor_label || ' requested a ' || amount_label ||
          ' withdrawal for ' || coalesce(reason_label, 'the group') ||
          '. Recipient: ' || coalesce(recipient_label, 'Not specified') || '.';
      when 'withdrawal_approved' then
        notification_body := actor_label || ' approved the ' || amount_label ||
          ' withdrawal request for ' || coalesce(reason_label, 'the group') ||
          '. Recipient: ' || coalesce(recipient_label, 'Not specified') || '.';
      when 'withdrawal_rejected' then
        notification_body := actor_label || ' rejected the ' || amount_label ||
          ' withdrawal request for ' || coalesce(reason_label, 'the group') ||
          '. Recipient: ' || coalesce(recipient_label, 'Not specified') ||
          '. The reserved funds have been released back to the group.';
      when 'withdrawal_staging_started' then
        notification_body := 'The ' || amount_label || ' withdrawal request for ' ||
          coalesce(reason_label, 'the group') || ', recipient ' ||
          coalesce(recipient_label, 'Not specified') ||
          ', has been staged for review by group members. Review closes in two hours.';
      when 'withdrawal_flagged' then
        notification_body := actor_label || ' flagged the ' || amount_label ||
          ' withdrawal request for ' || coalesce(reason_label, 'the group') ||
          '. Recipient: ' || coalesce(recipient_label, 'Not specified') ||
          case when flag_reason is not null then '. Reason: ' || flag_reason else '.' end;
      when 'withdrawal_flag_removed' then
        notification_body := actor_label || ' removed their flag from the ' ||
          amount_label || ' withdrawal request for ' || coalesce(reason_label, 'the group') ||
          '. Recipient: ' || coalesce(recipient_label, 'Not specified') || '.';
      when 'withdrawal_flag_closed' then
        notification_body := 'An active flag on the ' || amount_label ||
          ' withdrawal request for ' || coalesce(reason_label, 'the group') ||
          ' was automatically closed when the review period ended.';
      when 'withdrawal_cancelled_flagged' then
        notification_body := 'The ' || amount_label || ' withdrawal request for ' ||
          coalesce(reason_label, 'the group') ||
          ' was cancelled because member flags remained at the review deadline. ' ||
          'The reserved funds have been released back to the group.';
      when 'withdrawal_cancelled_by_creator' then
        notification_body := actor_label || ' cancelled the ' || amount_label ||
          ' withdrawal request for ' || coalesce(reason_label, 'the group') ||
          '. The reserved funds have been released back to the group.';
      when 'withdrawal_payout_queued' then
        notification_body := 'The ' || amount_label || ' withdrawal request for ' ||
          coalesce(reason_label, 'the group') ||
          ' passed member review and is queued for payout. Funds remain reserved until the payment provider confirms the payout.';
      else
        null;
    end case;
  end if;

  if event_row.notification_recipients_snapshotted_at is null then
    raise exception 'Finance notification recipients were not snapshotted at event time';
  end if;

  insert into public.akiba_group_notifications
    (user_id, group_id, actor_id, source_event_id, event_type, title, body, href)
  select r.recipient_user_id, event_row.group_id, event_row.actor_id, event_row.id,
    notification_type, notification_title, notification_body,
    '/workspace/groups/' || event_row.group_id::text || '/finances'
  from public.akiba_finance_notification_recipients r
  where r.event_id = event_row.id
  on conflict (user_id, source_event_id) do nothing;

  update public.akiba_finance_activity_events
  set notification_published_at = clock_timestamp(),
      notification_attempt_count = notification_attempt_count + 1,
      notification_next_attempt_at = clock_timestamp(),
      notification_last_error = null
  where id = event_row.id;
end;
$fn$;

revoke all on function akiba_private.fanout_finance_activity_event(uuid) from public, anon, authenticated;

commit;
