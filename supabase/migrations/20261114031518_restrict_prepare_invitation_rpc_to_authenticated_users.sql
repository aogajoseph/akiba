revoke execute on function public.akiba_prepare_group_invitation(uuid, text, timestamp with time zone, text) from public, anon;
grant execute on function public.akiba_prepare_group_invitation(uuid, text, timestamp with time zone, text) to authenticated;
