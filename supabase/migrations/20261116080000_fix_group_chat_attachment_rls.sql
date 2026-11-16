begin;

-- Qualify the outer row's storage path explicitly. Without this, the
-- unqualified name inside the groups EXISTS subquery resolves to groups.name,
-- causing valid uploads and downloads to fail their Storage RLS checks.
drop policy if exists "active members upload group chat files" on storage.objects;
create policy "active members upload group chat files"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'akiba-group-chat-attachments'
    and (storage.foldername(storage.objects.name))[1] ~* '^[0-9a-f-]{36}$'
    and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
    and akiba_private.is_active_group_member(((storage.foldername(storage.objects.name))[1])::uuid)
    and exists (
      select 1 from public.akiba_groups g
      where g.id = ((storage.foldername(storage.objects.name))[1])::uuid
        and g.status = 'active'
    )
  );

drop policy if exists "active members read group chat files" on storage.objects;
create policy "active members read group chat files"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'akiba-group-chat-attachments'
    and (storage.foldername(storage.objects.name))[1] ~* '^[0-9a-f-]{36}$'
    and akiba_private.is_active_group_member(((storage.foldername(storage.objects.name))[1])::uuid)
    and exists (
      select 1 from public.akiba_groups g
      where g.id = ((storage.foldername(storage.objects.name))[1])::uuid
        and g.status = 'active'
    )
  );

drop policy if exists "uploaders remove orphaned group chat files" on storage.objects;
create policy "uploaders remove orphaned group chat files"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'akiba-group-chat-attachments'
    and (storage.foldername(storage.objects.name))[2] = (select auth.uid())::text
    and (storage.foldername(storage.objects.name))[1] ~* '^[0-9a-f-]{36}$'
    and akiba_private.is_active_group_member(((storage.foldername(storage.objects.name))[1])::uuid)
    and not exists (
      select 1 from public.akiba_group_chat_attachments a
      where a.storage_path = storage.objects.name
    )
  );

-- Ensure metadata can only point to a message in the same group.
drop policy if exists "members attach files to their own messages" on public.akiba_group_chat_attachments;
create policy "members attach files to their own messages"
  on public.akiba_group_chat_attachments
  for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and akiba_private.is_active_group_member(akiba_group_chat_attachments.group_id)
    and exists (
      select 1 from public.akiba_groups g
      where g.id = akiba_group_chat_attachments.group_id
        and g.status = 'active'
    )
    and exists (
      select 1 from public.akiba_group_messages m
      where m.id = akiba_group_chat_attachments.message_id
        and m.group_id = akiba_group_chat_attachments.group_id
        and m.author_id = (select auth.uid())
        and m.deleted_at is null
    )
  );

commit;
