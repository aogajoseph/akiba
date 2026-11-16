begin;

-- Index the auth.users foreign key for efficient user deletion and FK checks.
create index if not exists akiba_group_message_reactions_user_idx
  on public.akiba_group_message_reactions(user_id);

-- Only allow clients to publish private typing events as themselves.
-- Message and reaction notifications are emitted by trusted database triggers.
drop policy if exists "active group members publish group chat broadcasts" on realtime.messages;
create policy "active group members publish group chat broadcasts"
  on realtime.messages
  for insert to authenticated
  with check (
    extension = 'broadcast'
    and private is true
    and event in ('typing', 'typing_stopped')
    and payload ->> 'user_id' = (select auth.uid())::text
    and payload ->> 'group_id' = substring((select realtime.topic()) from '^group:([0-9a-f-]{36}):chat$')
    and exists (
      select 1 from public.akiba_groups g
      where (select realtime.topic()) = 'group:' || g.id::text || ':chat'
        and g.status = 'active'
        and akiba_private.is_active_group_member(g.id)
    )
  );

commit;