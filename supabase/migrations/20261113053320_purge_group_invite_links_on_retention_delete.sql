begin;

create or replace function akiba_private.purge_deleted_group_invite_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if new.status = 'deleted' and old.status is distinct from new.status then
    delete from public.akiba_group_invite_links where group_id = new.id;
  end if;
  return new;
end;
$fn$;
revoke all on function akiba_private.purge_deleted_group_invite_link() from public, anon, authenticated;
drop trigger if exists akiba_group_invite_link_retention_cleanup on public.akiba_groups;
create trigger akiba_group_invite_link_retention_cleanup
after update of status on public.akiba_groups
for each row execute function akiba_private.purge_deleted_group_invite_link();

commit;
