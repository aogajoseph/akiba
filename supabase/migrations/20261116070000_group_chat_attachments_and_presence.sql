begin;

-- Private group-chat file storage. A message remains the canonical conversation
-- record; attachment rows only point to files shared in that conversation.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'akiba-group-chat-attachments',
  'akiba-group-chat-attachments',
  false,
  15728640,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.akiba_group_chat_attachments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id) on delete cascade,
  message_id uuid not null references public.akiba_group_messages(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 15728640),
  created_at timestamptz not null default now(),
  constraint akiba_group_chat_attachment_path_matches_uploader
    check (storage_path like group_id::text || '/' || uploaded_by::text || '/%'),
  constraint akiba_group_chat_attachment_mime_type_allowed
    check (mime_type in (
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ))
);

create index if not exists akiba_group_chat_attachments_message_idx
  on public.akiba_group_chat_attachments(group_id, message_id, created_at);

alter table public.akiba_group_chat_attachments enable row level security;
revoke all on public.akiba_group_chat_attachments from public, anon;
grant select, insert on public.akiba_group_chat_attachments to authenticated;

drop policy if exists "active group members read chat attachments" on public.akiba_group_chat_attachments;
create policy "active group members read chat attachments"
  on public.akiba_group_chat_attachments
  for select to authenticated
  using (
    akiba_private.is_active_group_member(group_id)
    and exists (select 1 from public.akiba_groups g where g.id = group_id and g.status = 'active')
  );

drop policy if exists "members attach files to their own messages" on public.akiba_group_chat_attachments;
create policy "members attach files to their own messages"
  on public.akiba_group_chat_attachments
  for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and akiba_private.is_active_group_member(group_id)
    and exists (
      select 1 from public.akiba_groups g
      where g.id = group_id and g.status = 'active'
    )
    and exists (
      select 1 from public.akiba_group_messages m
      where m.id = message_id
        and m.group_id = group_id
        and m.author_id = (select auth.uid())
        and m.deleted_at is null
    )
  );

-- Object names are <group UUID>/<uploader UUID>/<random UUID>.<extension>.
-- The private bucket is never readable through an unscoped public URL.
drop policy if exists "active members upload group chat files" on storage.objects;
create policy "active members upload group chat files"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'akiba-group-chat-attachments'
    and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and akiba_private.is_active_group_member(((storage.foldername(name))[1])::uuid)
    and exists (
      select 1 from public.akiba_groups g
      where g.id = ((storage.foldername(name))[1])::uuid and g.status = 'active'
    )
  );

drop policy if exists "active members read group chat files" on storage.objects;
create policy "active members read group chat files"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'akiba-group-chat-attachments'
    and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
    and akiba_private.is_active_group_member(((storage.foldername(name))[1])::uuid)
    and exists (
      select 1 from public.akiba_groups g
      where g.id = ((storage.foldername(name))[1])::uuid and g.status = 'active'
    )
  );

-- Presence is ephemeral in Realtime; this small table only retains the latest
-- best-effort activity timestamp so members can see a useful "last seen" value.
create table if not exists public.akiba_group_chat_presence (
  group_id uuid not null references public.akiba_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
alter table public.akiba_group_chat_presence enable row level security;
revoke all on public.akiba_group_chat_presence from public, anon, authenticated;

create or replace function public.akiba_touch_group_chat_presence(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if auth.uid() is null or not akiba_private.is_active_group_member(p_group_id) then
    raise exception 'Active group membership is required';
  end if;

  insert into public.akiba_group_chat_presence(group_id, user_id, last_seen_at)
  values (p_group_id, auth.uid(), clock_timestamp())
  on conflict (group_id, user_id) do update
    set last_seen_at = excluded.last_seen_at;
end;
$fn$;

create or replace function public.akiba_list_group_chat_presence(p_group_id uuid)
returns table (user_id uuid, last_seen_at timestamptz)
language sql
security definer
set search_path = ''
as $fn$
  select p.user_id, p.last_seen_at
  from public.akiba_group_chat_presence p
  join public.akiba_group_memberships gm
    on gm.group_id = p.group_id
   and gm.user_id = p.user_id
   and gm.status = 'active'
  where p.group_id = p_group_id
    and auth.uid() is not null
    and akiba_private.is_active_group_member(p_group_id);
$fn$;

revoke all on function public.akiba_touch_group_chat_presence(uuid) from public, anon;
revoke all on function public.akiba_list_group_chat_presence(uuid) from public, anon;
grant execute on function public.akiba_touch_group_chat_presence(uuid) to authenticated;
grant execute on function public.akiba_list_group_chat_presence(uuid) to authenticated;

drop policy if exists "active group members receive group chat presence" on realtime.messages;
create policy "active group members receive group chat presence"
  on realtime.messages
  for select to authenticated
  using (
    extension = 'presence'
    and exists (
      select 1 from public.akiba_groups g
      where (select realtime.topic()) = 'group:' || g.id::text || ':presence'
        and g.status = 'active'
        and akiba_private.is_active_group_member(g.id)
    )
  );


-- Permit a client to remove only its own orphaned object when metadata creation
-- fails. Once a metadata row exists, deletion is denied by this policy.
drop policy if exists "uploaders remove orphaned group chat files" on storage.objects;
create policy "uploaders remove orphaned group chat files"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'akiba-group-chat-attachments'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
    and akiba_private.is_active_group_member(((storage.foldername(name))[1])::uuid)
    and not exists (
      select 1 from public.akiba_group_chat_attachments a
      where a.storage_path = storage.objects.name
    )
  );


drop policy if exists "active group members publish group chat presence" on realtime.messages;
create policy "active group members publish group chat presence"
  on realtime.messages
  for insert to authenticated
  with check (
    extension = 'presence'
    and exists (
      select 1 from public.akiba_groups g
      where (select realtime.topic()) = 'group:' || g.id::text || ':presence'
        and g.status = 'active'
        and akiba_private.is_active_group_member(g.id)
    )
  );

commit;
