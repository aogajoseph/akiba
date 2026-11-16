begin;

-- Per-member chat read cursor and mute preference. This is deliberately separate
-- from the financial ledger and scoped to one user in one group.
create table if not exists public.akiba_group_chat_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.akiba_groups(id) on delete cascade,
  last_read_at timestamptz,
  last_read_message_id uuid references public.akiba_group_messages(id) on delete cascade,
  notifications_muted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, group_id),
  check ((last_read_at is null) = (last_read_message_id is null))
);
create index if not exists akiba_group_chat_preferences_group_idx
  on public.akiba_group_chat_preferences(group_id, user_id);
alter table public.akiba_group_chat_preferences enable row level security;
revoke all on public.akiba_group_chat_preferences from public, anon, authenticated;

-- Extend the existing in-app inbox rather than introducing another notification store.
alter table public.akiba_group_notifications
  drop constraint if exists akiba_group_notifications_event_type_check;
alter table public.akiba_group_notifications
  add constraint akiba_group_notifications_event_type_check
  check (event_type in (
    'invitation_received', 'invitation_accepted', 'invitation_declined', 'invitation_cancelled',
    'membership_joined', 'membership_left', 'membership_removed',
    'group_admin_appointed', 'group_admin_demoted', 'group_deactivated',
    'chat_message'
  ));

create or replace function public.akiba_get_group_chat_preferences(p_group_id uuid)
returns table (notifications_muted boolean)
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if auth.uid() is null or not akiba_private.is_active_group_member(p_group_id) then
    raise exception 'Active group membership is required';
  end if;
  return query
    select coalesce(p.notifications_muted, false)
    from (select 1) seed
    left join public.akiba_group_chat_preferences p
      on p.user_id = auth.uid() and p.group_id = p_group_id;
end;
$fn$;

create or replace function public.akiba_set_group_chat_muted(p_group_id uuid, p_muted boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if auth.uid() is null or not akiba_private.is_active_group_member(p_group_id) then
    raise exception 'Active group membership is required';
  end if;
  insert into public.akiba_group_chat_preferences(user_id, group_id, notifications_muted, updated_at)
  values (auth.uid(), p_group_id, coalesce(p_muted, false), clock_timestamp())
  on conflict (user_id, group_id) do update
    set notifications_muted = excluded.notifications_muted,
        updated_at = excluded.updated_at;
end;
$fn$;

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

revoke all on function public.akiba_get_group_chat_preferences(uuid) from public, anon;
revoke all on function public.akiba_set_group_chat_muted(uuid, boolean) from public, anon;
revoke all on function public.akiba_mark_group_chat_read(uuid, uuid) from public, anon;
revoke all on function public.akiba_list_my_group_chat_unread_counts() from public, anon;
grant execute on function public.akiba_get_group_chat_preferences(uuid) to authenticated;
grant execute on function public.akiba_set_group_chat_muted(uuid, boolean) to authenticated;
grant execute on function public.akiba_mark_group_chat_read(uuid, uuid) to authenticated;
grant execute on function public.akiba_list_my_group_chat_unread_counts() to authenticated;

-- One durable inbox item per eligible active member, excluding the sender and
-- members who muted this group. No message body is copied into the notification.
create or replace function akiba_private.create_group_chat_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_group_name text;
  v_recipient record;
begin
  if new.deleted_at is not null then
    if tg_op = 'UPDATE' and old.deleted_at is null then
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
          raise warning 'Unable to broadcast deleted-message unread update for group %, user %', new.group_id, v_recipient.user_id;
        end;
      end loop;
    end if;
    return new;
  end if;

  select g.name into v_group_name
  from public.akiba_groups g
  where g.id = new.group_id and g.status = 'active';
  if v_group_name is null then
    return new;
  end if;

  for v_recipient in
    select gm.user_id, coalesce(pref.notifications_muted, false) as notifications_muted
    from public.akiba_group_memberships gm
    left join public.akiba_group_chat_preferences pref
      on pref.user_id = gm.user_id and pref.group_id = new.group_id
    where gm.group_id = new.group_id
      and gm.status = 'active'
      and gm.user_id <> new.author_id
  loop
    -- Keep unread badges current even when a member muted this group's inbox alerts.
    begin
      perform realtime.send(
        jsonb_build_object('group_id', new.group_id, 'message_id', new.id),
        'group_unread_updated',
        'user:' || v_recipient.user_id::text || ':notifications',
        true
      );
    exception when others then
      -- Durable unread state remains queryable if Realtime is temporarily unavailable.
      raise warning 'Unable to broadcast unread update for group %, user %', new.group_id, v_recipient.user_id;
    end;

    if not v_recipient.notifications_muted then
      insert into public.akiba_group_notifications
        (user_id, group_id, actor_id, source_event_id, event_type, title, body, href)
      values
        (v_recipient.user_id, new.group_id, new.author_id, new.id,
         'chat_message', 'New message in ' || v_group_name,
         'A group member posted a new message.',
         '/workspace/groups/' || new.group_id::text || '/chat')
      on conflict (user_id, source_event_id) do nothing;
    end if;
  end loop;

  return new;
end;
$fn$;
revoke all on function akiba_private.create_group_chat_notifications() from public, anon, authenticated;
drop trigger if exists akiba_group_chat_notifications on public.akiba_group_messages;
create trigger akiba_group_chat_notifications
after insert or update of deleted_at on public.akiba_group_messages
for each row execute function akiba_private.create_group_chat_notifications();

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

commit;
