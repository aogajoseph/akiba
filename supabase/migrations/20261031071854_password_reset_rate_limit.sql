-- Per-email throttling for password recovery requests.
-- Supabase Auth's own IP-based limits remain enabled as a separate layer.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.auth_password_reset_limits (
  email_hash text primary key,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0)
);

revoke all on table private.auth_password_reset_limits from public, anon, authenticated, service_role;

create or replace function public.akiba_consume_password_reset_limit(check_email text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, private, extensions
as $$
declare
  normalized_email text := lower(trim(coalesce(check_email, '')));
  email_digest text;
  allowed boolean;
  current_time timestamptz := clock_timestamp();
begin
  if normalized_email = '' or length(normalized_email) > 320 then
    return false;
  end if;

  email_digest := encode(extensions.digest(normalized_email, 'sha256'), 'hex');

  -- Keep the private table from accumulating old one-off addresses forever.
  delete from private.auth_password_reset_limits
  where window_started_at < current_time - interval '1 day';

  insert into private.auth_password_reset_limits (email_hash, window_started_at, attempts)
  values (email_digest, current_time, 1)
  on conflict (email_hash) do update
  set
    window_started_at = case
      when private.auth_password_reset_limits.window_started_at < current_time - interval '15 minutes'
        then current_time
      else private.auth_password_reset_limits.window_started_at
    end,
    attempts = case
      when private.auth_password_reset_limits.window_started_at < current_time - interval '15 minutes'
        then 1
      else private.auth_password_reset_limits.attempts + 1
    end;

  select attempts <= 3 into allowed
  from private.auth_password_reset_limits
  where email_hash = email_digest;

  return coalesce(allowed, false);
end;
$$;

revoke all on function public.akiba_consume_password_reset_limit(text) from public, anon, authenticated;
grant execute on function public.akiba_consume_password_reset_limit(text) to service_role;
