-- Privileged lookup for login messaging; do not grant to anon/authenticated.
create or replace function public.akiba_email_exists(check_email text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(trim(check_email))
  );
$$;
revoke all on function public.akiba_email_exists(text) from public, anon, authenticated;
grant execute on function public.akiba_email_exists(text) to service_role;
