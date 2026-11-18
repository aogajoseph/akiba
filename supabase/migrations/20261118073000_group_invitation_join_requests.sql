begin;

create table if not exists public.akiba_group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint akiba_group_join_requests_review_state_check check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null and reviewed_by is not null)
  )
);

create unique index if not exists akiba_group_join_requests_one_pending_idx
  on public.akiba_group_join_requests(group_id, user_id)
  where status = 'pending';
create index if not exists akiba_group_join_requests_group_pending_idx
  on public.akiba_group_join_requests(group_id, created_at desc)
  where status = 'pending';

alter table public.akiba_group_join_requests enable row level security;

alter table public.akiba_group_notifications
  drop constraint if exists akiba_group_notifications_event_type_check,
  add constraint akiba_group_notifications_event_type_check check (event_type in (
    'invitation_received', 'invitation_accepted', 'invitation_declined', 'invitation_cancelled',
    'membership_joined', 'membership_left', 'membership_removed',
    'group_admin_appointed', 'group_admin_demoted', 'group_deactivated',
    'membership_request_received', 'membership_request_approved', 'membership_request_rejected'
  ));
drop policy if exists "requesters and group creators read join requests" on public.akiba_group_join_requests;
create policy "requesters and group creators read join requests"
  on public.akiba_group_join_requests for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.akiba_groups g
      where g.id = group_id and g.created_by = (select auth.uid())
    )
  );
revoke all on public.akiba_group_join_requests from public, anon, authenticated;
grant select on public.akiba_group_join_requests to authenticated;

-- Shared invitation links create membership requests, never direct memberships.
create or replace function public.akiba_request_group_join_by_link(p_token_hash text)
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
  existing_request_id uuid;
  request_id uuid;
  active_count integer;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid group invitation link';
  end if;

  select group_id into target_group_id
  from public.akiba_group_invite_links
  where token_hash = p_token_hash;
  if not found then raise exception 'This group invitation link is invalid'; end if;

  select * into group_row from public.akiba_groups
  where id = target_group_id for update;
  if not found or group_row.status <> 'active' then
    raise exception 'This group is no longer accepting membership requests';
  end if;

  if exists (
    select 1 from public.akiba_group_blocks
    where group_id = target_group_id and user_id = actor_id
  ) then raise exception 'You are blocked from joining this group'; end if;

  if exists (
    select 1 from public.akiba_group_memberships
    where group_id = target_group_id and user_id = actor_id and status = 'active'
  ) then raise exception 'You are already a member of this group'; end if;

  select * into plan_row from public.akiba_group_plan_entitlements
  where plan_code = group_row.group_plan_code and is_active = true;
  if not found then raise exception 'The group plan is unavailable'; end if;

  select count(*) into active_count from public.akiba_group_memberships
  where group_id = target_group_id and status = 'active';
  if active_count >= plan_row.max_members then raise exception 'Group capacity reached'; end if;

  select id into existing_request_id
  from public.akiba_group_join_requests
  where group_id = target_group_id and user_id = actor_id and status = 'pending'
  for update;
  if existing_request_id is not null then return existing_request_id; end if;

  insert into public.akiba_group_join_requests(group_id, user_id)
  values (target_group_id, actor_id)
  returning id into request_id;

  insert into public.akiba_group_activity(group_id, actor_id, event_type, summary)
  values (target_group_id, actor_id, 'membership_request_submitted',
    'A person requested to join the group.');

  insert into public.akiba_group_notifications
    (user_id, group_id, actor_id, source_event_id, event_type, title, body, href)
  values
    (group_row.created_by, target_group_id, actor_id, request_id,
     'membership_request_received', 'New membership request',
     'Someone requested to join your group.',
     '/workspace/groups/' || target_group_id::text || '/membership')
  on conflict (user_id, source_event_id) do nothing;

  return request_id;
end;
$fn$;

revoke all on function public.akiba_request_group_join_by_link(text) from public, anon;
grant execute on function public.akiba_request_group_join_by_link(text) to authenticated;

create or replace function public.akiba_decide_group_join_request(
  p_request_id uuid,
  p_decision text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  request_row public.akiba_group_join_requests%rowtype;
  group_row public.akiba_groups%rowtype;
  plan_row public.akiba_group_plan_entitlements%rowtype;
  active_count integer;
begin
  if actor_id is null then raise exception 'Authentication is required'; end if;
  if p_request_id is null or p_decision is null or p_decision not in ('approve', 'reject') then
    raise exception 'Invalid membership request decision';
  end if;

  select * into request_row from public.akiba_group_join_requests
  where id = p_request_id;
  if not found then raise exception 'Membership request not found'; end if;

  select * into group_row from public.akiba_groups
  where id = request_row.group_id for update;
  if not found then raise exception 'Group not found'; end if;
  if group_row.created_by <> actor_id then
    raise exception 'Only the Group Creator can review membership requests';
  end if;
  if group_row.status <> 'active' then
    raise exception 'This group is deactivated and cannot change membership';
  end if;

  select * into request_row from public.akiba_group_join_requests
  where id = p_request_id and group_id = group_row.id
  for update;
  if not found or request_row.status <> 'pending' then
    raise exception 'This membership request has already been reviewed';
  end if;

  if p_decision = 'approve' then
    if exists (
      select 1 from public.akiba_group_blocks
      where group_id = group_row.id and user_id = request_row.user_id
    ) then raise exception 'This person is blocked from joining the group'; end if;

    select * into plan_row from public.akiba_group_plan_entitlements
    where plan_code = group_row.group_plan_code and is_active = true;
    if not found then raise exception 'The group plan is unavailable'; end if;

    select count(*) into active_count from public.akiba_group_memberships
    where group_id = group_row.id and status = 'active';
    if active_count >= plan_row.max_members then raise exception 'Group capacity reached'; end if;

    insert into public.akiba_group_memberships(group_id, user_id, role, status, joined_at, ended_at)
    values (group_row.id, request_row.user_id, 'member', 'active', now(), null)
    on conflict (group_id, user_id) do update
      set role = 'member', status = 'active', joined_at = now(), ended_at = null;

    update public.akiba_group_join_requests
    set status = 'approved', reviewed_at = now(), reviewed_by = actor_id
    where id = p_request_id;

    insert into public.akiba_group_activity(group_id, actor_id, event_type, summary)
    values (group_row.id, actor_id, 'membership_join_request_approved',
      'The Group Creator approved a membership request.');

    insert into public.akiba_group_notifications
      (user_id, group_id, actor_id, source_event_id, event_type, title, body, href)
    values
      (request_row.user_id, group_row.id, actor_id, request_row.id,
       'membership_request_approved', 'Membership request approved',
       'Your request was approved. You are now a member of the group.',
       '/workspace/groups/' || group_row.id::text)
    on conflict (user_id, source_event_id) do nothing;
  else
    update public.akiba_group_join_requests
    set status = 'rejected', reviewed_at = now(), reviewed_by = actor_id
    where id = p_request_id;

    insert into public.akiba_group_activity(group_id, actor_id, event_type, summary)
    values (group_row.id, actor_id, 'membership_join_request_rejected',
      'The Group Creator declined a membership request.');

    insert into public.akiba_group_notifications
      (user_id, group_id, actor_id, source_event_id, event_type, title, body, href)
    values
      (request_row.user_id, group_row.id, actor_id, request_row.id,
       'membership_request_rejected', 'Membership request not approved',
       'Your request to join this group was not approved.',
       '/workspace/groups/' || group_row.id::text)
    on conflict (user_id, source_event_id) do nothing;
  end if;

  return group_row.id;
end;
$fn$;

revoke all on function public.akiba_decide_group_join_request(uuid, text) from public, anon;
grant execute on function public.akiba_decide_group_join_request(uuid, text) to authenticated;

-- Remove the legacy direct-join RPC so an authenticated client cannot bypass
-- the new Group Creator approval requirement using the old endpoint.
revoke all on function public.akiba_join_group_by_link(text) from public, anon, authenticated;

commit;
