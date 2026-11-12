-- Expire stale pending invitations before checking for duplicates.
-- Group row locking in this RPC serializes concurrent invitation creation.
create or replace function public.akiba_create_group_invitation(
  p_group_id uuid,
  p_token_hash text,
  p_expires_at timestamptz,
  p_recipient_email text default null,
  p_recipient_username text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  group_row public.akiba_groups%rowtype;
  plan_row public.akiba_group_plan_entitlements%rowtype;
  target_user_id uuid;
  target_email text;
  normalized_email text := nullif(lower(btrim(coalesce(p_recipient_email, ''))), '');
  normalized_username text := nullif(lower(btrim(coalesce(p_recipient_username, ''))), '');
  recipient_key_value text;
  invitation_id uuid;
  active_count integer;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_group_id is null or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$'
     or p_expires_at is null or p_expires_at <= now()
     or p_expires_at > now() + interval '30 days'
     or (normalized_email is not null and normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
     or (normalized_username is not null and normalized_username !~ '^[a-z][a-z0-9_]{2,19}$')
     or (normalized_email is not null and normalized_username is not null) then
    raise exception 'Invalid invitation details';
  end if;

  select * into group_row from public.akiba_groups where id = p_group_id for update;
  if not found then raise exception 'Group not found'; end if;
  if group_row.status <> 'active' then raise exception 'This group is deactivated and cannot accept invitations'; end if;
  if not exists (
    select 1 from public.akiba_group_memberships
    where group_id = p_group_id and user_id = actor_id and status = 'active'
  ) then raise exception 'Only active group members can invite people'; end if;

  -- Expired invitations must no longer occupy the pending-recipient unique
  -- indexes or block a fresh invitation to the same person.
  update public.akiba_group_invitations
  set status = 'expired', updated_at = now()
  where group_id = p_group_id
    and status = 'pending'
    and expires_at <= now();

  select * into plan_row from public.akiba_group_plan_entitlements
  where plan_code = group_row.group_plan_code and is_active = true;
  if not found then raise exception 'The group plan is unavailable'; end if;

  select count(*) into active_count from public.akiba_group_memberships
  where group_id = p_group_id and status = 'active';
  if active_count >= plan_row.max_members then raise exception 'Group capacity reached'; end if;

  if normalized_username is not null then
    select user_id into target_user_id from public.akiba_profiles
    where username = normalized_username;
    if target_user_id is null then raise exception 'No Akiba account was found for that username'; end if;
  elsif normalized_email is not null then
    select id into target_user_id from auth.users
    where lower(email) = normalized_email
    limit 1;
  end if;

  if target_user_id is not null then
    select lower(email) into target_email from auth.users where id = target_user_id;
    if exists (
      select 1 from public.akiba_group_invitations
      where group_id = p_group_id and status = 'pending'
        and (
          intended_user_id = target_user_id
          or (target_email is not null and recipient_email = target_email)
        )
    ) then
      raise exception 'A pending invitation already exists for this person';
    end if;
    if exists (select 1 from public.akiba_group_blocks where group_id = p_group_id and user_id = target_user_id) then
      raise exception 'This person is blocked from joining the group';
    end if;
    if exists (select 1 from public.akiba_group_memberships
      where group_id = p_group_id and user_id = target_user_id and status = 'active') then
      raise exception 'This person is already a group member';
    end if;
  end if;

  recipient_key_value := case
    when target_user_id is not null then 'user:' || target_user_id::text
    when normalized_email is not null then 'email:' || normalized_email
    else 'link:' || gen_random_uuid()::text
  end;

  insert into public.akiba_group_invitations
    (group_id, inviter_id, intended_user_id, recipient_email, recipient_username,
     recipient_key, token_hash, expires_at)
  values
    (p_group_id, actor_id, target_user_id, normalized_email, normalized_username,
     recipient_key_value, p_token_hash, p_expires_at)
  returning id into invitation_id;

  insert into public.akiba_group_activity(group_id, actor_id, event_type, summary)
  values (p_group_id, actor_id, 'invitation_created', 'A group member created an invitation.');

  return invitation_id;
end;
$fn$;

revoke all on function public.akiba_create_group_invitation(uuid, text, timestamptz, text, text) from public, anon;
grant execute on function public.akiba_create_group_invitation(uuid, text, timestamptz, text, text) to authenticated;


-- Record invitation cancellation in the same shared group activity history.
-- Deactivated groups must reject leadership changes just as they reject
-- membership changes. Locking the group row serializes this with deactivation.
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
  group_status text;
  target_role text;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_group_id is null or p_user_id is null or p_action is null or p_action not in ('appoint', 'demote') then
    raise exception 'Invalid Group Admin change';
  end if;

  select created_by, status into group_creator_id, group_status
  from public.akiba_groups where id = p_group_id for update;
  if not found then raise exception 'Group not found'; end if;
  if group_status <> 'active' then raise exception 'This group is deactivated'; end if;
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

create or replace function public.akiba_cancel_group_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  invitation_row public.akiba_group_invitations%rowtype;
  creator_id uuid;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  select * into invitation_row from public.akiba_group_invitations
  where id = p_invitation_id;
  if not found then raise exception 'Invitation not found'; end if;
  perform 1 from public.akiba_groups where id = invitation_row.group_id for update;
  select created_by into creator_id from public.akiba_groups where id = invitation_row.group_id;
  if actor_id <> invitation_row.inviter_id and actor_id <> creator_id then
    raise exception 'Only the inviter or Group Creator may cancel this invitation';
  end if;
  update public.akiba_group_invitations set status = 'cancelled', updated_at = now()
  where id = p_invitation_id and status = 'pending';
  if found then
    insert into public.akiba_group_activity(group_id, actor_id, event_type, summary)
    values (invitation_row.group_id, actor_id, 'invitation_cancelled', 'A group invitation was cancelled.');
  end if;
end;
$fn$;
revoke all on function public.akiba_cancel_group_invitation(uuid) from public, anon;
grant execute on function public.akiba_cancel_group_invitation(uuid) to authenticated;
