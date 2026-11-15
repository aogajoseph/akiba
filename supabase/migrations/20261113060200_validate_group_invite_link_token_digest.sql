create or replace function public.akiba_get_or_create_group_invite_link(
  p_group_id uuid,
  p_token text,
  p_token_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  group_status text;
  existing_token text;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_group_id is null or p_token is null or p_token !~ '^[0-9a-f]{64}$'
     or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$'
     or encode(sha256(convert_to(p_token, 'UTF8')), 'hex') <> p_token_hash then
    raise exception 'Invalid group invitation link';
  end if;

  select status into group_status
  from public.akiba_groups where id = p_group_id for update;
  if not found or group_status <> 'active' then
    raise exception 'This group is not accepting invitations';
  end if;
  if not exists (
    select 1 from public.akiba_group_memberships
    where group_id = p_group_id and user_id = actor_id and status = 'active'
  ) then raise exception 'Only active group members can invite people'; end if;

  select token into existing_token
  from public.akiba_group_invite_links where group_id = p_group_id for update;
  if existing_token is not null then return existing_token; end if;

  insert into public.akiba_group_invite_links(group_id, token, token_hash, created_by)
  values (p_group_id, p_token, p_token_hash, actor_id)
  on conflict (group_id) do nothing;

  select token into existing_token
  from public.akiba_group_invite_links where group_id = p_group_id;
  return existing_token;
end;
$fn$;
