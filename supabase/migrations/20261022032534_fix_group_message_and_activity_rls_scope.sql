drop policy if exists "active members read messages" on public.akiba_group_messages;
drop policy if exists "active members post own messages" on public.akiba_group_messages;
drop policy if exists "active members read activity" on public.akiba_group_activity;

create policy "active members read messages"
  on public.akiba_group_messages for select to authenticated
  using (exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = akiba_group_messages.group_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  ));

create policy "active members post own messages"
  on public.akiba_group_messages for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.akiba_group_memberships m
      where m.group_id = akiba_group_messages.group_id
        and m.user_id = (select auth.uid()) and m.status = 'active'
    )
  );

create policy "active members read activity"
  on public.akiba_group_activity for select to authenticated
  using (exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = akiba_group_activity.group_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  ));
