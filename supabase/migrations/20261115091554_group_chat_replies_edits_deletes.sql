begin;

alter table public.akiba_group_messages
  add column if not exists parent_message_id uuid null
    references public.akiba_group_messages(id) on delete restrict,
  add column if not exists edited_at timestamptz null,
  add column if not exists deleted_at timestamptz null;

create index if not exists akiba_group_messages_parent_idx
  on public.akiba_group_messages (parent_message_id)
  where parent_message_id is not null;

-- A reply must point to a different message in the same group.
create or replace function akiba_private.validate_group_chat_message()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  parent_group_id uuid;
begin
  if tg_op = 'INSERT' then
    if new.parent_message_id is not null then
      if new.parent_message_id = new.id then
        raise exception 'A message cannot reply to itself' using errcode = '23514';
      end if;
      select m.group_id into parent_group_id
      from public.akiba_group_messages m
      where m.id = new.parent_message_id;
      if parent_group_id is null or parent_group_id <> new.group_id then
        raise exception 'Reply parent must belong to the same group' using errcode = '23514';
      end if;
    end if;
    if new.deleted_at is not null or new.edited_at is not null then
      raise exception 'New messages cannot be pre-edited or pre-deleted' using errcode = '23514';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.group_id is distinct from old.group_id
    or new.author_id is distinct from old.author_id
    or new.created_at is distinct from old.created_at
    or new.parent_message_id is distinct from old.parent_message_id then
    raise exception 'Message identity and reply reference are immutable' using errcode = '23514';
  end if;

  if old.deleted_at is not null then
    raise exception 'Deleted messages cannot be changed' using errcode = '23514';
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    if new.deleted_at is null or new.body <> '' or new.edited_at is distinct from old.edited_at then
      raise exception 'Invalid message deletion operation' using errcode = '23514';
    end if;
    new.deleted_at := statement_timestamp();
    return new;
  end if;

  if new.body is distinct from old.body then
    if length(new.body) > 1000 or length(btrim(new.body)) = 0 then
      raise exception 'Message body must contain 1 to 1000 characters' using errcode = '23514';
    end if;
    new.edited_at := statement_timestamp();
    return new;
  end if;

  if new.edited_at is distinct from old.edited_at then
    raise exception 'Edited timestamp is managed by the database' using errcode = '23514';
  end if;

  return new;
end;
$function$;

drop trigger if exists akiba_group_chat_message_validate on public.akiba_group_messages;
create trigger akiba_group_chat_message_validate
  before insert or update on public.akiba_group_messages
  for each row execute function akiba_private.validate_group_chat_message();

drop policy if exists "authors edit own active messages" on public.akiba_group_messages;
create policy "authors edit own active messages"
  on public.akiba_group_messages
  for update
  to authenticated
  using (
    author_id = (select auth.uid())
    and deleted_at is null
    and akiba_private.is_active_group_member(group_id)
    and exists (select 1 from public.akiba_groups g where g.id = group_id and g.status = 'active')
  )
  with check (
    author_id = (select auth.uid())
    and akiba_private.is_active_group_member(group_id)
    and exists (select 1 from public.akiba_groups g where g.id = group_id and g.status = 'active')
  );

-- Replace the insert broadcast with an operation-aware trigger function.
create or replace function akiba_private.broadcast_group_chat_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  event_name text;
begin
  if tg_op = 'INSERT' then
    event_name := 'message_created';
  elsif new.deleted_at is distinct from old.deleted_at then
    event_name := 'message_deleted';
  else
    event_name := 'message_updated';
  end if;

  perform realtime.send(
    jsonb_build_object('group_id', new.group_id, 'message_id', new.id),
    event_name,
    'group:' || new.group_id::text || ':chat',
    true
  );
  return new;
end;
$function$;

drop trigger if exists akiba_group_message_broadcast on public.akiba_group_messages;
create trigger akiba_group_message_broadcast
  after insert or update on public.akiba_group_messages
  for each row execute function akiba_private.broadcast_group_chat_message();

commit;
