begin;

-- Return every active group member, including members with no prior presence
-- record. A NULL last_seen_at means they have not yet opened this group's chat.
drop function if exists public.akiba_list_group_chat_presence(uuid);

create function public.akiba_list_group_chat_presence(p_group_id uuid)
returns table (user_id uuid, last_seen_at timestamptz)
language sql
security definer
set search_path = ''
as $fn$
  select gm.user_id, p.last_seen_at
  from public.akiba_group_memberships gm
  left join public.akiba_group_chat_presence p
    on p.group_id = gm.group_id
   and p.user_id = gm.user_id
  where gm.group_id = p_group_id
    and gm.status = 'active'
    and auth.uid() is not null
    and akiba_private.is_active_group_member(p_group_id)
  order by gm.joined_at asc;
$fn$;

revoke all on function public.akiba_list_group_chat_presence(uuid) from public, anon;
grant execute on function public.akiba_list_group_chat_presence(uuid) to authenticated;

commit;
