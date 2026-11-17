begin;

-- Durable message reactions. Reactions are conversation metadata, not financial
-- activity, and are visible only to active members of the message's group.
create table if not exists public.akiba_group_message_reactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id) on delete cascade,
  message_id uuid not null references public.akiba_group_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('👍', '❤️', '😂', '😮', '🙏', '🎉')),
  created_at timestamptz not null default now(),
  constraint akiba_group_message_reactions_unique
    unique (message_id, user_id, reaction)
);

create index if not exists akiba_group_message_reactions_message_idx
  on public.akiba_group_message_reactions(group_id, message_id, created_at);

alter table public.akiba_group_message_reactions enable row level security;
revoke all on public.akiba_group_message_reactions from public, anon;
grant select, insert, delete on public.akiba_group_message_reactions to authenticated;

drop policy if exists "active members read group message reactions" on public.akiba_group_message_reactions;
create policy "active members read group message reactions"
  on public.akiba_group_message_reactions
  for select to authenticated
  using (
    akiba_private.is_active_group_member(group_id)
    and exists (
      select 1 from public.akiba_groups g
      where g.id = group_id and g.status = 'active'
    )
    and exists (
      select 1 from public.akiba_group_messages m
      where m.id = message_id
        and m.group_id = akiba_group_message_reactions.group_id
        and m.deleted_at is null
    )
  );

drop policy if exists "active members add group message reactions" on public.akiba_group_message_reactions;
create policy "active members add group message reactions"
  on public.akiba_group_message_reactions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and akiba_private.is_active_group_member(group_id)
    and exists (
      select 1 from public.akiba_groups g
      where g.id = group_id and g.status = 'active'
    )
    and exists (
      select 1 from public.akiba_group_messages m
      where m.id = message_id
        and m.group_id = akiba_group_message_reactions.group_id
        and m.deleted_at is null
    )
  );

drop policy if exists "users remove their own group message reactions" on public.akiba_group_message_reactions;
create policy "users remove their own group message reactions"
  on public.akiba_group_message_reactions
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and akiba_private.is_active_group_member(group_id)
  );

-- Typing is intentionally ephemeral: clients send small Broadcast events on
-- the existing private chat topic; no typing rows or chat messages are stored.
drop policy if exists "active group members receive group chat broadcasts" on realtime.messages;
create policy "active group members receive group chat broadcasts"
  on realtime.messages
  for select to authenticated
  using (
    extension = 'broadcast'
    and exists (
      select 1 from public.akiba_groups g
      where (select realtime.topic()) = 'group:' || g.id::text || ':chat'
        and g.status = 'active'
        and akiba_private.is_active_group_member(g.id)
    )
  );

drop policy if exists "active group members publish group chat broadcasts" on realtime.messages;
create policy "active group members publish group chat broadcasts"
  on realtime.messages
  for insert to authenticated
  with check (
    extension = 'broadcast'
    and exists (
      select 1 from public.akiba_groups g
      where (select realtime.topic()) = 'group:' || g.id::text || ':chat'
        and g.status = 'active'
        and akiba_private.is_active_group_member(g.id)
    )
  );

create or replace function akiba_private.broadcast_group_chat_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_group_id uuid;
  v_message_id uuid;
begin
  if tg_op = 'DELETE' then
    v_group_id := old.group_id;
    v_message_id := old.message_id;
  else
    v_group_id := new.group_id;
    v_message_id := new.message_id;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'group_id', v_group_id,
      'message_id', v_message_id
    ),
    'reaction_changed',
    'group:' || v_group_id::text || ':chat',
    true
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

revoke all on function akiba_private.broadcast_group_chat_reaction() from public, anon, authenticated;
drop trigger if exists akiba_group_message_reaction_broadcast on public.akiba_group_message_reactions;
create trigger akiba_group_message_reaction_broadcast
  after insert or delete on public.akiba_group_message_reactions
  for each row execute function akiba_private.broadcast_group_chat_reaction();

commit;
