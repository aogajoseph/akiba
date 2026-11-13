create or replace function public.akiba_accept_group_invitation(p_token_hash text)
returns uuid language plpgsql security definer set search_path to ''
as $function$
declare
  actor_id uuid := auth.uid();
  invitation_group_id uuid;
  group_row public.akiba_groups%rowtype;
  invitation_row public.akiba_group_invitations%rowtype;
  plan_row public.akiba_group_plan_entitlements%rowtype;
  actor_email text;
  active_count integer;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid invitation'; end if;
  select group_id into invitation_group_id from public.akiba_group_invitations where token_hash = p_token_hash;
  if not found then raise exception 'Invitation not found'; end if;
  select * into group_row from public.akiba_groups where id = invitation_group_id for update;
  if not found or group_row.status <> 'active' then raise exception 'This group is no longer accepting members'; end if;
  select * into invitation_row from public.akiba_group_invitations where token_hash = p_token_hash and group_id = invitation_group_id for update;
  if not found then raise exception 'Invitation not found'; end if;
  if invitation_row.status <> 'pending' then raise exception 'This invitation is no longer available'; end if;
  if invitation_row.expires_at <= now() then
    update public.akiba_group_invitations set status = 'expired', updated_at = now() where id = invitation_row.id;
    return null;
  end if;
  select lower(email) into actor_email from auth.users where id = actor_id;
  if invitation_row.intended_user_id is not null and invitation_row.intended_user_id <> actor_id then
    raise exception 'This invitation was sent to another Akiba account';
  end if;
  if invitation_row.recipient_email is not null and actor_email is distinct from lower(btrim(invitation_row.recipient_email)) then
    raise exception 'This invitation belongs to a different email address. Switch to the invited email to continue.';
  end if;
  if exists (select 1 from public.akiba_group_blocks where group_id = invitation_group_id and user_id = actor_id) then
    raise exception 'You are blocked from joining this group';
  end if;
  if exists (select 1 from public.akiba_group_memberships where group_id = invitation_group_id and user_id = actor_id and status = 'active') then
    update public.akiba_group_invitations set status = 'accepted', accepted_by = actor_id, accepted_at = now(), updated_at = now() where id = invitation_row.id;
    return invitation_group_id;
  end if;
  select * into plan_row from public.akiba_group_plan_entitlements where plan_code = group_row.group_plan_code and is_active = true;
  if not found then raise exception 'The group plan is unavailable'; end if;
  select count(*) into active_count from public.akiba_group_memberships where group_id = invitation_group_id and status = 'active';
  if active_count >= plan_row.max_members then raise exception 'Group capacity reached'; end if;
  insert into public.akiba_group_memberships(group_id, user_id, role, status, joined_at, ended_at)
  values (invitation_group_id, actor_id, 'member', 'active', now(), null)
  on conflict (group_id, user_id) do update set role = 'member', status = 'active', joined_at = now(), ended_at = null;
  update public.akiba_group_invitations set status = 'accepted', accepted_by = actor_id, accepted_at = now(), updated_at = now() where id = invitation_row.id;
  insert into public.akiba_group_activity(group_id, actor_id, event_type, summary)
  values (invitation_group_id, actor_id, 'member_joined', 'A person joined the group using an invitation.');
  return invitation_group_id;
end;
$function$;

create or replace function public.akiba_decline_group_invitation(p_token_hash text)
returns void language plpgsql security definer set search_path to ''
as $function$
declare
  actor_id uuid := auth.uid();
  invitation_group_id uuid;
  invitation_row public.akiba_group_invitations%rowtype;
  actor_email text;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  select group_id into invitation_group_id from public.akiba_group_invitations where token_hash = p_token_hash;
  if not found then raise exception 'Invitation not found'; end if;
  perform 1 from public.akiba_groups where id = invitation_group_id for update;
  select * into invitation_row from public.akiba_group_invitations where token_hash = p_token_hash and group_id = invitation_group_id for update;
  if invitation_row.status <> 'pending' then raise exception 'This invitation is no longer available'; end if;
  if invitation_row.expires_at <= now() then
    update public.akiba_group_invitations set status = 'expired', updated_at = now() where id = invitation_row.id;
    return;
  end if;
  select lower(email) into actor_email from auth.users where id = actor_id;
  if invitation_row.intended_user_id is not null and invitation_row.intended_user_id <> actor_id then
    raise exception 'This invitation was sent to another Akiba account';
  end if;
  if invitation_row.recipient_email is not null and actor_email is distinct from lower(btrim(invitation_row.recipient_email)) then
    raise exception 'This invitation belongs to a different email address. Switch to the invited email to continue.';
  end if;
  update public.akiba_group_invitations set status = 'declined', declined_by = actor_id, declined_at = now(), updated_at = now() where id = invitation_row.id;
  insert into public.akiba_group_activity(group_id, actor_id, event_type, summary)
  values (invitation_group_id, actor_id, 'invitation_declined', 'A group invitation was declined.');
end;
$function$;

create or replace function public.akiba_prepare_group_invitation(
  p_group_id uuid, p_token_hash text, p_expires_at timestamptz, p_recipient_email text
)
returns table(invitation_id uuid, was_resent boolean)
language plpgsql security definer set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  normalized_email text := nullif(lower(btrim(coalesce(p_recipient_email, ''))), '');
  target_user_id uuid;
  existing_id uuid;
  result_id uuid;
  resent boolean := false;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_group_id is null or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$'
     or p_expires_at is null or p_expires_at <= now()
     or p_expires_at > now() + interval '30 days'
     or normalized_email is null
     or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid invitation details';
  end if;
  perform 1 from public.akiba_groups where id = p_group_id for update;
  if not found then raise exception 'Group not found'; end if;
  if not exists (select 1 from public.akiba_groups where id = p_group_id and status = 'active') then
    raise exception 'This group is deactivated and cannot accept invitations';
  end if;
  if not exists (select 1 from public.akiba_group_memberships where group_id = p_group_id and user_id = actor_id and status = 'active') then
    raise exception 'Only active group members can invite people';
  end if;
  update public.akiba_group_invitations set status = 'expired', updated_at = now()
  where group_id = p_group_id and status = 'pending' and expires_at <= now();
  select id into target_user_id from auth.users where lower(email) = normalized_email limit 1;
  if target_user_id is not null then
    if exists (select 1 from public.akiba_group_blocks where group_id = p_group_id and user_id = target_user_id) then
      raise exception 'This person is blocked from joining the group';
    end if;
    if exists (select 1 from public.akiba_group_memberships where group_id = p_group_id and user_id = target_user_id and status = 'active') then
      raise exception 'This person is already a group member';
    end if;
  end if;
  select i.id into existing_id from public.akiba_group_invitations i
  where i.group_id = p_group_id and i.status = 'pending'
    and (lower(i.recipient_email) = normalized_email or (target_user_id is not null and i.intended_user_id = target_user_id))
  order by i.created_at desc limit 1 for update;
  if existing_id is not null then
    update public.akiba_group_invitations
    set token_hash = p_token_hash, recipient_email = normalized_email, expires_at = p_expires_at,
        last_resent_by = actor_id, last_resent_at = now(), updated_at = now()
    where id = existing_id;
    insert into public.akiba_group_activity(group_id, actor_id, event_type, summary)
    values (p_group_id, actor_id, 'invitation_resent', 'A group member resent a pending invitation.');
    result_id := existing_id;
    resent := true;
  else
    result_id := public.akiba_create_group_invitation(p_group_id, p_token_hash, p_expires_at, normalized_email, null);
  end if;
  return query select result_id, resent;
end;
$function$;

revoke all on function public.akiba_prepare_group_invitation(uuid,text,timestamptz,text) from public;
grant execute on function public.akiba_prepare_group_invitation(uuid,text,timestamptz,text) to authenticated;