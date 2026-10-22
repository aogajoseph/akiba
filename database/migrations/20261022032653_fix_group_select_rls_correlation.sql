-- Applied to dedicated Akiba Supabase project as migration
-- 20261022032653_fix_group_select_rls_correlation.
drop policy if exists "read groups as active member or creator" on public.akiba_groups;
create policy "read groups as active member or creator"
  on public.akiba_groups for select to authenticated
  using (exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = akiba_groups.id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  ));
