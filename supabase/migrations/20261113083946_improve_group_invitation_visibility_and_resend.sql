alter table public.akiba_group_invitations
  add column if not exists last_resent_by uuid references auth.users(id) on delete set null,
  add column if not exists last_resent_at timestamptz;

drop policy if exists "active members read group invitations" on public.akiba_group_invitations;
create policy "active members read group invitations"
on public.akiba_group_invitations
for select
to authenticated
using (akiba_private.is_active_group_member(group_id));

create or replace function public.akiba_prepare_group_invitation(
  p_group_id uuid,
  p_token_hash text,
  p_expires_at timestamptz,
  p_recipient_email text
)
returns table(invitation_id uuid, was_resent boolean)
language plpgsql
security definer
set search_path = ''
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
  if not exists (
    select 1 from public.akiba_group_memberships
    where group_id = p_group_id and user_id = actor_id and status = 'active'
  ) then raise exception 'Only active group members can invite people'; end if;

  update public.akiba_group_invitations
  set status = 'expired', updated_at = now()
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

  select i.id into existing_id
  from public.akiba_group_invitations i
  where i.group_id = p_group_id and i.status = 'pending'
    and (lower(i.recipient_email) = normalized_email
      or (target_user_id is not null and i.intended_user_id = target_user_id))
  order by i.created_at desc
  limit 1
  for update;

  if existing_id is not null then
    update public.akiba_group_invitations
    set token_hash = p_token_hash, expires_at = p_expires_at,
        last_resent_by = actor_id, last_resent_at = now(), updated_at = now()
    where id = existing_id;
    insert into public.akiba_group_activity(group_id, actor_id, event_type, summary)
    values (p_group_id, actor_id, 'invitation_resent', 'A group member resent a pending invitation.');
    result_id := existing_id;
    resent := true;
  else
    result_id := public.akiba_create_group_invitation(
      p_group_id, p_token_hash, p_expires_at, normalized_email, null
    );
  end if;

  return query select result_id, resent;
end;
$function$;

revoke all on function public.akiba_prepare_group_invitation(uuid,text,timestamptz,text) from public;
grant execute on function public.akiba_prepare_group_invitation(uuid,text,timestamptz,text) to authenticated;