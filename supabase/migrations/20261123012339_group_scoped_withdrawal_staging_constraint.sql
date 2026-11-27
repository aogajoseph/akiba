begin;

-- Permit only the two supported review durations, then enforce that each
-- withdrawal's persisted deadline matches its own group's configuration.
alter table public.akiba_withdrawal_requests
  drop constraint if exists akiba_withdrawal_staging_clock_check;

alter table public.akiba_withdrawal_requests
  add constraint akiba_withdrawal_staging_clock_check
  check (
    (staging_started_at is null) = (staging_deadline_at is null)
    and (
      staging_started_at is null
      or staging_deadline_at in (
        staging_started_at + interval '5 minutes',
        staging_started_at + interval '2 hours'
      )
    )
  );

create or replace function akiba_private.guard_withdrawal_staging_duration()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  configured_seconds integer;
begin
  if new.staging_started_at is null then
    return new;
  end if;

  select coalesce(g.withdrawal_staging_seconds, 7200)
    into configured_seconds
  from public.akiba_groups g
  where g.id = new.group_id;

  if not found then
    raise exception 'Withdrawal group was not found while validating its staging deadline';
  end if;

  if new.staging_deadline_at is distinct from
     new.staging_started_at + make_interval(secs => configured_seconds) then
    raise exception 'Withdrawal staging deadline must match the configured group review period';
  end if;

  return new;
end;
$fn$;

revoke all on function akiba_private.guard_withdrawal_staging_duration()
  from public, anon, authenticated;

drop trigger if exists akiba_withdrawal_staging_duration_guard
  on public.akiba_withdrawal_requests;

create trigger akiba_withdrawal_staging_duration_guard
before update of staging_started_at, staging_deadline_at
on public.akiba_withdrawal_requests
for each row
execute function akiba_private.guard_withdrawal_staging_duration();

commit;
