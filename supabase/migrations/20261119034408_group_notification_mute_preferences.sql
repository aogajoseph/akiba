begin;

-- Notification preferences are personal to each active group member.
create table if not exists public.akiba_group_notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.akiba_groups(id) on delete cascade,
  is_muted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

alter table public.akiba_group_notification_preferences enable row level security;
drop policy if exists "users read their own group notification preferences"
  on public.akiba_group_notification_preferences;
create policy "users read their own group notification preferences"
  on public.akiba_group_notification_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.akiba_group_notification_preferences from public, anon, authenticated;
grant select on public.akiba_group_notification_preferences to authenticated;

-- Financial and security event families are intentionally permitted even though
-- no current notification producer emits them yet. Muting only suppresses the
-- explicit ordinary-activity allowlist below; new/unknown event types fail open.
alter table public.akiba_group_notifications
  drop constraint if exists akiba_group_notifications_event_type_check,
  add constraint akiba_group_notifications_event_type_check check (
    event_type in (
      'invitation_received', 'invitation_accepted', 'invitation_declined', 'invitation_cancelled',
      'membership_joined', 'membership_left', 'membership_removed',
      'group_admin_appointed', 'group_admin_demoted', 'group_deactivated',
      'membership_request_received', 'membership_request_approved', 'membership_request_rejected'
    )
    or event_type ~ '^(financial|security)_[a-z0-9_]+$'
  );

create or replace function public.akiba_set_group_notification_mute(
  p_group_id uuid,
  p_is_muted boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;
  if p_group_id is null or p_is_muted is null then
    raise exception 'A group and mute preference are required';
  end if;
  if not exists (
    select 1
    from public.akiba_group_memberships m
    where m.group_id = p_group_id
      and m.user_id = actor_id
      and m.status = 'active'
  ) then
    raise exception 'Active group membership is required';
  end if;

  insert into public.akiba_group_notification_preferences
    (user_id, group_id, is_muted, updated_at)
  values (actor_id, p_group_id, p_is_muted, clock_timestamp())
  on conflict (user_id, group_id) do update
    set is_muted = excluded.is_muted,
        updated_at = excluded.updated_at;

  return p_is_muted;
end;
$fn$;

revoke all on function public.akiba_set_group_notification_mute(uuid, boolean)
  from public, anon;
grant execute on function public.akiba_set_group_notification_mute(uuid, boolean)
  to authenticated;

create or replace function akiba_private.suppress_muted_group_activity_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if new.event_type in (
    'invitation_received', 'invitation_accepted', 'invitation_declined', 'invitation_cancelled',
    'membership_joined', 'membership_left', 'membership_removed',
    'group_admin_appointed', 'group_admin_demoted',
    'membership_request_received', 'membership_request_approved', 'membership_request_rejected'
  ) and exists (
    select 1
    from public.akiba_group_notification_preferences p
    where p.user_id = new.user_id
      and p.group_id = new.group_id
      and p.is_muted = true
  ) then
    return null;
  end if;

  -- group_deactivated, financial_*, security_*, and unknown future event
  -- types are deliberately not suppressed by a group mute preference.
  return new;
end;
$fn$;

revoke all on function akiba_private.suppress_muted_group_activity_notification()
  from public, anon, authenticated;

drop trigger if exists akiba_suppress_muted_group_activity on public.akiba_group_notifications;
create trigger akiba_suppress_muted_group_activity
before insert on public.akiba_group_notifications
for each row execute function akiba_private.suppress_muted_group_activity_notification();

commit;
