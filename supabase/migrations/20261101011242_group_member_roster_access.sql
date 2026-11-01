-- Allow active group members to read the active member roster for their own group.
-- A SECURITY DEFINER helper avoids recursive RLS when the membership policy
-- checks whether the requesting user is already an active member.
create or replace function akiba_private.is_active_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $akiba_fn$
  select exists (
    select 1
    from public.akiba_group_memberships m
    where m.group_id = p_group_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  );
$akiba_fn$;

revoke all on function akiba_private.is_active_group_member(uuid) from public, anon;
grant execute on function akiba_private.is_active_group_member(uuid) to authenticated;

drop policy if exists "active members read group roster" on public.akiba_group_memberships;
create policy "active members read group roster"
  on public.akiba_group_memberships
  for select
  to authenticated
  using (
    status = 'active'
    and akiba_private.is_active_group_member(group_id)
  );
