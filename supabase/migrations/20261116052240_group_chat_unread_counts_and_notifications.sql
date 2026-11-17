begin;

-- Per-member, per-group chat read cursor, kept separate from the financial ledger.
create table if not exists public.akiba_group_chat_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.akiba_groups(id) on delete cascade,
  last_read_at timestamptz,
  last_read_message_id uuid references public.akiba_group_messages(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (user_id, group_id),
  check ((last_read_at is null) = (last_read_message_id is null))
);
create index if not exists akiba_group_chat_preferences_group_idx
  on public.akiba_group_chat_preferences(group_id, user_id);
alter table public.akiba_group_chat_preferences enable row level security;
revoke all on public.akiba_group_chat_preferences from public, anon, authenticated;

-- Keep the activity inbox event types limited to app-wide group/account activity.
alter table public.akiba_group_notifications
  drop constraint if exists akiba_group_notifications_event_type_check;
alter table public.akiba_group_notifications
  add constraint akiba_group_notifications_event_type_check
  check (event_type in (
    'invitation_received', 'invitation_accepted', 'invitation_declined', 'invitation_cancelled',
    'membership_joined', 'membership_left', 'membership_removed',
    'group_admin_appointed', 'group_admin_demoted', 'group_deactivated'
  ));

create or replace function public.akiba_mark_group_chat_read(p_group_id uuid, p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_created_at timestamptz;
begin
  if auth.uid() is null or not akiba_private.is_active_group_member(p_group_id) then
    raise exception 'Active group membership is required';
  end if;
  select m.created_at into v_created_at
  from public.akiba_group_messages m
  where m.id = p_message_id and m.group_id = p_group_id;
  if v_created_at is null then
    raise exception 'Message does not belong to this group';
  end if;

  insert into public.akiba_group_chat_preferences
    (user_id, group_id, last_read_at, last_read_message_id, updated_at)
  values (auth.uid(), p_group_id, v_created_at, p_message_id, clock_timestamp())
  on conflict (user_id, group_id) do update
    set last_read_at = excluded.last_read_at,
        last_read_message_id = excluded.last_read_message_id,
        updated_at = excluded.updated_at
    where public.akiba_group_chat_preferences.last_read_at is null
       or (public.akiba_group_chat_preferences.last_read_at,
           public.akiba_group_chat_preferences.last_read_message_id)
          < (excluded.last_read_at, excluded.last_read_message_id);
end;
$fn$;

create or replace function public.akiba_list_my_group_chat_unread_counts()
returns table (group_id uuid, unread_count bigint)
language sql
security definer
set search_path = ''
as $fn$
  select m.group_id, count(*)::bigint
  from public.akiba_group_messages m
  join public.akiba_group_memberships gm
    on gm.group_id = m.group_id
   and gm.user_id = auth.uid()
   and gm.status = 'active'
  left join public.akiba_group_chat_preferences p
    on p.group_id = m.group_id and p.user_id = auth.uid()
  where auth.uid() is not null
    and m.author_id <> auth.uid()
    and m.deleted_at is null
    and exists (
      select 1 from public.akiba_groups g
      where g.id = m.group_id and g.status = 'active'
    )
    and (
      p.last_read_at is null
      or (m.created_at, m.id) > (p.last_read_at, p.last_read_message_id)
    )
  group by m.group_id;
$fn$;

revoke all on function public.akiba_mark_group_chat_read(uuid, uuid) from public, anon;
revoke all on function public.akiba_list_my_group_chat_unread_counts() from public, anon;
grant execute on function public.akiba_mark_group_chat_read(uuid, uuid) to authenticated;
grant execute on function public.akiba_list_my_group_chat_unread_counts() to authenticated;

-- Group messages never enter the app-wide activity notification inbox.
-- Realtime only signals that unread summaries may have changed; clients query
-- the membership-checked summary RPC for counts and group names.
create or replace function akiba_private.broadcast_group_chat_unread_updates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_recipient record;
begin
  for v_recipient in
    select gm.user_id
    from public.akiba_group_memberships gm
    where gm.group_id = new.group_id
      and gm.status = 'active'
      and gm.user_id <> new.author_id
  loop
    begin
      perform realtime.send(
        jsonb_build_object('group_id', new.group_id, 'message_id', new.id),
        'group_unread_updated',
        'user:' || v_recipient.user_id::text || ':notifications',
        true
      );
    exception when others then
      -- Durable unread state remains queryable if Realtime is unavailable.
      raise warning 'Unable to broadcast unread update for group %, user %', new.group_id, v_recipient.user_id;
    end;
  end loop;
  return new;
end;
$fn$;
revoke all on function akiba_private.broadcast_group_chat_unread_updates() from public, anon, authenticated;
drop trigger if exists akiba_group_chat_notifications on public.akiba_group_messages;
drop trigger if exists akiba_group_chat_unread_updates on public.akiba_group_messages;
create trigger akiba_group_chat_unread_updates
after insert or update of deleted_at on public.akiba_group_messages
for each row execute function akiba_private.broadcast_group_chat_unread_updates();

-- One row per group with unread messages. The caller can display summaries
-- without exposing message bodies or mixing chat state with activity alerts.
create or replace function public.akiba_list_my_group_chat_unread_summaries()
returns table (group_id uuid, group_name text, unread_count bigint, latest_unread_at timestamptz)
language sql
security definer
set search_path = ''
as $fn$
  select m.group_id, g.name, count(*)::bigint, max(m.created_at)
  from public.akiba_group_messages m
  join public.akiba_group_memberships gm
    on gm.group_id = m.group_id
   and gm.user_id = auth.uid()
   and gm.status = 'active'
  join public.akiba_groups g
    on g.id = m.group_id and g.status = 'active'
  left join public.akiba_group_chat_preferences p
    on p.group_id = m.group_id and p.user_id = auth.uid()
  where auth.uid() is not null
    and m.author_id <> auth.uid()
    and m.deleted_at is null
    and (p.last_read_at is null
      or (m.created_at, m.id) > (p.last_read_at, p.last_read_message_id))
  group by m.group_id, g.name
  order by max(m.created_at) desc, m.group_id;
$fn$;
revoke all on function public.akiba_list_my_group_chat_unread_summaries() from public, anon;
grant execute on function public.akiba_list_my_group_chat_unread_summaries() to authenticated;

-- User-specific private Broadcast topics. Payloads contain only notification
-- and group identifiers; clients reload durable inbox rows through RLS.
create or replace function akiba_private.broadcast_user_group_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  begin
    perform realtime.send(
      jsonb_build_object(
        'notification_id', new.id,
        'group_id', new.group_id,
        'event_type', new.event_type
      ),
      case when tg_op = 'INSERT' then 'notification_created' else 'notification_updated' end,
      'user:' || new.user_id::text || ':notifications',
      true
    );
  exception when others then
    -- The inbox row is durable; clients will catch up on their next inbox refresh.
    raise warning 'Unable to broadcast notification % to user %', new.id, new.user_id;
  end;
  return new;
end;
$fn$;
revoke all on function akiba_private.broadcast_user_group_notification() from public, anon, authenticated;
drop trigger if exists akiba_group_notification_broadcast on public.akiba_group_notifications;
create trigger akiba_group_notification_broadcast
after insert or update of read_at on public.akiba_group_notifications
for each row execute function akiba_private.broadcast_user_group_notification();

drop policy if exists "users receive their own notification broadcasts" on realtime.messages;
create policy "users receive their own notification broadcasts"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'user:' || (select auth.uid())::text || ':notifications'
  );


-- Accurate inbox badge count and one-step mark-all-read operation.
create or replace function public.akiba_count_my_unread_group_notifications()
returns bigint
language sql
security definer
set search_path = ''
as $fn$
  select count(*)::bigint
  from public.akiba_group_notifications n
  where auth.uid() is not null
    and n.user_id = auth.uid()
    and n.read_at is null;
$fn$;

create or replace function public.akiba_mark_all_my_group_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_updated integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  update public.akiba_group_notifications
  set read_at = clock_timestamp()
  where user_id = auth.uid()
    and read_at is null;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$fn$;

revoke all on function public.akiba_count_my_unread_group_notifications() from public, anon;
revoke all on function public.akiba_mark_all_my_group_notifications_read() from public, anon;
grant execute on function public.akiba_count_my_unread_group_notifications() to authenticated;
grant execute on function public.akiba_mark_all_my_group_notifications_read() to authenticated;

commit;
