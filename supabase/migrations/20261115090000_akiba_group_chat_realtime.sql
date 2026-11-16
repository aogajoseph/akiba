begin;

-- Keep message reads and writes aligned with the active group lifecycle.
drop policy if exists "active members read messages" on public.akiba_group_messages;
create policy "active members read messages"
  on public.akiba_group_messages
  for select
  to authenticated
  using (
    akiba_private.is_active_group_member(akiba_group_messages.group_id)
    and exists (
      select 1
      from public.akiba_groups g
      where g.id = akiba_group_messages.group_id
        and g.status = 'active'
    )
  );

drop policy if exists "active members post own messages" on public.akiba_group_messages;
create policy "active members post own messages"
  on public.akiba_group_messages
  for insert
  to authenticated
  with check (
    akiba_group_messages.author_id = (select auth.uid())
    and akiba_private.is_active_group_member(akiba_group_messages.group_id)
    and exists (
      select 1
      from public.akiba_groups g
      where g.id = akiba_group_messages.group_id
        and g.status = 'active'
    )
  );

create index if not exists akiba_group_messages_group_cursor_idx
  on public.akiba_group_messages (group_id, created_at desc, id desc);

-- A private group topic is readable only by active members of an active group.
drop policy if exists "active group members receive chat broadcasts" on realtime.messages;
create policy "active group members receive chat broadcasts"
  on realtime.messages
  for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and exists (
      select 1
      from public.akiba_groups g
      where (select realtime.topic()) = 'group:' || g.id::text || ':chat'
        and g.status = 'active'
        and akiba_private.is_active_group_member(g.id)
    )
  );

-- Broadcast only identifiers. Clients must fetch the canonical row through
-- akiba_group_messages, where the normal table RLS policies are enforced.
create or replace function akiba_private.broadcast_group_chat_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform realtime.send(
    jsonb_build_object(
      'group_id', new.group_id,
      'message_id', new.id
    ),
    'message_created',
    'group:' || new.group_id::text || ':chat',
    true
  );
  return new;
end;
$function$;

revoke all on function akiba_private.broadcast_group_chat_message() from public, anon, authenticated;

drop trigger if exists akiba_group_message_broadcast on public.akiba_group_messages;
create trigger akiba_group_message_broadcast
  after insert on public.akiba_group_messages
  for each row
  execute function akiba_private.broadcast_group_chat_message();

commit;
