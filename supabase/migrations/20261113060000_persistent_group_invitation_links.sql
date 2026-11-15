begin;

create table if not exists public.akiba_group_invite_links (
  group_id uuid primary key references public.akiba_groups(id) on delete cascade,
  token text not null unique check (token ~ '^[0-9a-f]{64}$'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.akiba_group_invite_links enable row level security;
revoke all on public.akiba_group_invite_links from public, anon, authenticated;

create or replace function public.akiba_get_or_create_group_invite_link(
  p_group_id uuid, p_token text, p_token_hash text
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
revoke all on function public.akiba_get_or_create_group_invite_link(uuid, text, text) from public, anon;
grant execute on function public.akiba_get_or_create_group_invite_link(uuid, text, text) to authenticated;

create or replace function public.akiba_join_group_by_link(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  target_group_id uuid;
  group_row public.akiba_groups%rowtype;
  plan_row public.akiba_group_plan_entitlements%rowtype;
  active_count integer;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid group invitation link';
  end if;

  select group_id into target_group_id
  from public.akiba_group_invite_links where token_hash = p_token_hash;
  if not found then raise exception 'This group invitation link is invalid'; end if;

  select * into group_row from public.akiba_groups
  where id = target_group_id for update;
  if not found or group_row.status <> 'active' then
    raise exception 'This group is no longer accepting members';
  end if;

  if exists (
    select 1 from public.akiba_group_blocks
    where group_id = target_group_id and user_id = actor_id
  ) then raise exception 'You are blocked from joining this group'; end if;

  if exists (
    select 1 from public.akiba_group_memberships
    where group_id = target_group_id and user_id = actor_id and status = 'active'
  ) then return target_group_id; end if;

  select * into plan_row from public.akiba_group_plan_entitlements
  where plan_code = group_row.group_plan_code and is_active = true;
  if not found then raise exception 'The group plan is unavailable'; end if;

  select count(*) into active_count from public.akiba_group_memberships
  where group_id = target_group_id and status = 'active';
  if active_count >= plan_row.max_members then raise exception 'Group capacity reached'; end if;

  insert into public.akiba_group_memberships(group_id, user_id, role, status, joined_at, ended_at)
  values (target_group_id, actor_id, 'member', 'active', now(), null)
  on conflict (group_id, user_id) do update
    set role = 'member', status = 'active', joined_at = now(), ended_at = null;

  insert into public.akiba_group_activity(group_id, actor_id, event_type, summary)
  values (target_group_id, actor_id, 'member_joined', 'A person joined the group using the group invitation link.');

  return target_group_id;
end;
$fn$;
revoke all on function public.akiba_join_group_by_link(text) from public, anon;
grant execute on function public.akiba_join_group_by_link(text) to authenticated;

update public.akiba_group_invitations
set status = 'cancelled', updated_at = now()
where status = 'pending'
  and recipient_email is null
  and recipient_username is null
  and intended_user_id is null;

commit;
