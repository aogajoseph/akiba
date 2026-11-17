begin;

-- The existing message-body CHECK constraint requires non-empty text.
-- Soft deletion therefore replaces the original body with a fixed tombstone.
-- The client never supplies or retains the original message text after deletion.
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
    if new.deleted_at is null or new.body <> '[deleted]' or new.edited_at is distinct from old.edited_at then
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

commit;
