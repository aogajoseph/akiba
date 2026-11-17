begin;

-- Notify every active member's chat when attachment metadata is committed.
-- This is a statement-level trigger so a multi-file message emits one event.
create or replace function akiba_private.broadcast_group_chat_attachments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  attachment_record record;
begin
  for attachment_record in
    select distinct group_id, message_id from inserted_attachments
  loop
    perform realtime.send(
      jsonb_build_object(
        'group_id', attachment_record.group_id,
        'message_id', attachment_record.message_id
      ),
      'attachments_created',
      'group:' || attachment_record.group_id::text || ':chat',
      true
    );
  end loop;
  return null;
end;
$function$;

revoke all on function akiba_private.broadcast_group_chat_attachments() from public, anon, authenticated;

drop trigger if exists akiba_group_chat_attachments_broadcast on public.akiba_group_chat_attachments;
create trigger akiba_group_chat_attachments_broadcast
  after insert on public.akiba_group_chat_attachments
  referencing new table as inserted_attachments
  for each statement
  execute function akiba_private.broadcast_group_chat_attachments();

commit;
