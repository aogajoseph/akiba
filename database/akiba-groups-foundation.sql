-- Akiba Groups persistence foundation.
-- REVIEW ONLY: do not apply to Globe HQ. Run in a dedicated Akiba Supabase project.
-- This file is a reviewed schema proposal, not an applied migration.
create extension if not exists pgcrypto;

create table if not exists public.akiba_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  purpose text not null check (purpose in ('event','goal')),
  description text not null default '',
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.akiba_group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('admin','member')),
  status text not null default 'active' check (status in ('active','left','removed')),
  joined_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (group_id,user_id),
  check ((status = 'active' and ended_at is null) or (status <> 'active' and ended_at is not null))
);

create index if not exists akiba_group_memberships_user_status_idx
  on public.akiba_group_memberships(user_id,status);
create index if not exists akiba_group_memberships_group_status_idx
  on public.akiba_group_memberships(group_id,status);

create table if not exists public.akiba_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  author_id uuid not null references auth.users(id),
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists akiba_group_messages_group_time_idx
  on public.akiba_group_messages(group_id,created_at desc);

create table if not exists public.akiba_group_activity (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  actor_id uuid references auth.users(id),
  event_type text not null,
  summary text not null,
  occurred_at timestamptz not null default now()
);
create index if not exists akiba_group_activity_group_time_idx
  on public.akiba_group_activity(group_id,occurred_at desc);

alter table public.akiba_groups enable row level security;
alter table public.akiba_group_memberships enable row level security;
alter table public.akiba_group_messages enable row level security;
alter table public.akiba_group_activity enable row level security;

-- Membership SELECT is self-only: avoids recursive RLS dependencies.
create policy "memberships read own"
  on public.akiba_group_memberships for select to authenticated
  using (user_id = (select auth.uid()));

-- A creator can establish their own admin membership, but not create membership for others.
-- Invite acceptance and role management will use separately audited server workflows later.
create policy "creator establishes own membership"
  on public.akiba_group_memberships for insert to authenticated
  with check (
    user_id = (select auth.uid()) and role = 'admin' and status = 'active'
    and exists (
      select 1 from public.akiba_groups g
      where g.id = group_id and g.created_by = (select auth.uid())
    )
  );

create policy "read groups as active member or creator"
  on public.akiba_groups for select to authenticated
  using (
    (created_by = (select auth.uid()) and not exists (
      select 1 from public.akiba_group_memberships own
      where own.group_id = id and own.user_id = (select auth.uid())
    ))
    or exists (
      select 1 from public.akiba_group_memberships m
      where m.group_id = id and m.user_id = (select auth.uid()) and m.status = 'active'
    )
  );

create policy "create own group"
  on public.akiba_groups for insert to authenticated
  with check (created_by = (select auth.uid()));

-- No public UPDATE/DELETE policies for groups or memberships.
-- The following policies allow only active members to read or post messages.
create policy "active members read messages"
  on public.akiba_group_messages for select to authenticated
  using (
    exists (
      select 1 from public.akiba_group_memberships m
      where m.group_id = group_id and m.user_id = (select auth.uid()) and m.status = 'active'
    )
  );
create policy "active members post own messages"
  on public.akiba_group_messages for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.akiba_group_memberships m
      where m.group_id = group_id and m.user_id = (select auth.uid()) and m.status = 'active'
    )
  );

-- Timeline is read-only from the public Data API. Trusted server workflows
-- will eventually append canonical events with appropriate auditing.
create policy "active members read activity"
  on public.akiba_group_activity for select to authenticated
  using (
    exists (
      select 1 from public.akiba_group_memberships m
      where m.group_id = group_id and m.user_id = (select auth.uid()) and m.status = 'active'
    )
  );

-- Explicit grants for installations with restrictive Data API defaults.
revoke all on public.akiba_groups, public.akiba_group_memberships,
  public.akiba_group_messages, public.akiba_group_activity from anon;
grant select, insert on public.akiba_groups to authenticated;
grant select, insert on public.akiba_group_memberships to authenticated;
grant select, insert on public.akiba_group_messages to authenticated;
grant select on public.akiba_group_activity to authenticated;

-- Important: creator + admin membership currently require two client requests.
-- This is NOT an atomic production create-group flow. Before launch, replace
-- with an audited transactional workflow that cannot leave orphaned groups.
