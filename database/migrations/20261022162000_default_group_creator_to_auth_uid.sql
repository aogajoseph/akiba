-- Derive Group ownership from the authenticated Supabase request.
-- The RLS WITH CHECK policy remains in place as a second authorization guard.
alter table public.akiba_groups
  alter column created_by set default auth.uid();
