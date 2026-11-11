-- Fix password-reset throttling: avoid colliding with PostgreSQL's CURRENT_TIME keyword.
-- Preserve the existing per-email limit, cleanup window, hashing, and service-role-only execution.

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
  v_now timestamptz := clock_timestamp();
begin
  if normalized_email = '' or length(normalized_email) > 320 then
    return false;
  end if;

  email_digest := encode(extensions.digest(normalized_email, 'sha256'), 'hex');

  -- Keep the private table from accumulating old one-off addresses forever.
  delete from private.auth_password_reset_limits
  where window_started_at < v_now - interval '1 day';

  insert into private.auth_password_reset_limits (email_hash, window_started_at, attempts)
  values (email_digest, v_now, 1)
  on conflict (email_hash) do update
  set
    window_started_at = case
      when private.auth_password_reset_limits.window_started_at < v_now - interval '15 minutes'
        then v_now
      else private.auth_password_reset_limits.window_started_at
    end,
    attempts = case
      when private.auth_password_reset_limits.window_started_at < v_now - interval '15 minutes'
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
