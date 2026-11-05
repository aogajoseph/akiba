-- Minimal Supabase-compatible PostgreSQL surface for exercising the real migrations.
-- This is an isolated CI database, not a copy of or connection to Supabase production.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key,
  email text
);
create or replace function auth.uid()
returns uuid
language sql stable
as $$ select null::uuid $$;

create schema extensions;
create extension pgcrypto with schema extensions;

create schema if not exists akiba_private;
create table public.akiba_groups (
  id uuid primary key,
  name text not null,
  purpose text not null,
  description text not null default '',
  currency_code text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.akiba_group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('admin','member')),
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (group_id,user_id)
);
create or replace function akiba_private.is_active_group_member(p_group_id uuid)
returns boolean
language sql stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = p_group_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  )
$$;
