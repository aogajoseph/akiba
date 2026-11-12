begin;

create extension if not exists supabase_vault with schema vault;
create extension if not exists pg_net with schema extensions;

-- In-app membership notifications are durable, recipient-scoped records.
create table if not exists public.akiba_group_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  source_event_id uuid not null,
  event_type text not null check (event_type in (
    'invitation_received', 'invitation_accepted', 'invitation_declined',
    'membership_joined', 'membership_left', 'membership_removed',
    'group_admin_appointed', 'group_admin_demoted', 'group_deactivated'
  )),
  title text not null,
  body text not null,
  href text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, source_event_id),
  check (href ~ '^/workspace(/|$)')
);
create index if not exists akiba_group_notifications_user_created_idx
  on public.akiba_group_notifications(user_id, created_at desc);
create index if not exists akiba_group_notifications_unread_idx
  on public.akiba_group_notifications(user_id, created_at desc)
  where read_at is null;

alter table public.akiba_group_notifications enable row level security;
drop policy if exists "users read their own group notifications" on public.akiba_group_notifications;
create policy "users read their own group notifications"
  on public.akiba_group_notifications for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.akiba_group_notifications from public, anon, authenticated;
grant select on public.akiba_group_notifications to authenticated;

create or replace function akiba_private.create_group_notification(
  p_group_id uuid,
  p_source_event_id uuid,
  p_actor_id uuid,
  p_subject_user_id uuid,
  p_include_subject boolean,
  p_event_type text,
  p_title text,
  p_body text
)
returns void
language sql
security definer
set search_path = ''
as $fn$
  insert into public.akiba_group_notifications
    (user_id, group_id, actor_id, source_event_id, event_type, title, body, href)
  select distinct recipient.user_id, p_group_id, p_actor_id, p_source_event_id,
    p_event_type, p_title, p_body,
    '/workspace/groups/' || p_group_id::text || '/membership'
  from (
    select m.user_id
    from public.akiba_group_memberships m
    where m.group_id = p_group_id and m.status = 'active'
      and m.user_id is distinct from p_actor_id
    union all
    select p_subject_user_id
    where p_include_subject and p_subject_user_id is not null
  ) recipient
  on conflict (user_id, source_event_id) do nothing;
$fn$;
revoke all on function akiba_private.create_group_notification(uuid, uuid, uuid, uuid, boolean, text, text, text)
  from public, anon, authenticated;

create or replace function akiba_private.notify_group_invitation_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  notification_event_id uuid := gen_random_uuid();
begin
  if tg_op = 'INSERT' then
    if new.intended_user_id is not null then
      insert into public.akiba_group_notifications
        (user_id, group_id, actor_id, source_event_id, event_type, title, body, href)
      values
        (new.intended_user_id, new.group_id, new.inviter_id, notification_event_id,
         'invitation_received', 'New group invitation',
         'You have been invited to join a group on Akiba.', '/workspace/invitations')
      on conflict (user_id, source_event_id) do nothing;
    end if;
  elsif tg_op = 'UPDATE' and old.status = 'pending'
      and new.status in ('accepted', 'declined') then
    insert into public.akiba_group_notifications
      (user_id, group_id, actor_id, source_event_id, event_type, title, body, href)
    values
      (new.inviter_id, new.group_id,
       case when new.status = 'accepted' then new.accepted_by else new.declined_by end,
       notification_event_id,
       case when new.status = 'accepted' then 'invitation_accepted' else 'invitation_declined' end,
       case when new.status = 'accepted' then 'Invitation accepted' else 'Invitation declined' end,
       case when new.status = 'accepted'
         then 'The recipient accepted your group invitation.'
         else 'The recipient declined your group invitation.' end,
       '/workspace/groups/' || new.group_id::text || '/membership')
    on conflict (user_id, source_event_id) do nothing;
  end if;
  return new;
end;
$fn$;
revoke all on function akiba_private.notify_group_invitation_changes() from public, anon, authenticated;
drop trigger if exists akiba_group_invitation_notifications on public.akiba_group_invitations;
create trigger akiba_group_invitation_notifications
after insert or update of status on public.akiba_group_invitations
for each row execute function akiba_private.notify_group_invitation_changes();

create or replace function akiba_private.notify_group_membership_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  actor_id uuid := auth.uid();
  event_id uuid := gen_random_uuid();
begin
  if tg_op = 'INSERT' and new.status = 'active'
      and actor_id is not null and actor_id = new.user_id then
    perform akiba_private.create_group_notification(
      new.group_id, event_id, actor_id, null, false,
      'membership_joined', 'New member joined',
      'A new member joined your group.'
    );
  elsif tg_op = 'UPDATE' and old.status = 'active' and new.status in ('left', 'removed') then
    perform akiba_private.create_group_notification(
      old.group_id, event_id, actor_id, old.user_id,
      new.status = 'removed' and actor_id is distinct from old.user_id,
      case when new.status = 'left' then 'membership_left' else 'membership_removed' end,
      case when new.status = 'left' then 'Member left the group' else 'Membership updated' end,
      case when new.status = 'left' then 'A member left your group.'
        else 'A member was removed from your group.' end
    );
  elsif tg_op = 'UPDATE' and new.status = 'active'
      and old.role is distinct from new.role then
    perform akiba_private.create_group_notification(
      new.group_id, event_id, actor_id, new.user_id,
      actor_id is distinct from new.user_id,
      case when new.role = 'group_admin' then 'group_admin_appointed' else 'group_admin_demoted' end,
      case when new.role = 'group_admin' then 'Group Admin appointed' else 'Group Admin role changed' end,
      case when new.role = 'group_admin'
        then 'A member has been appointed Group Admin.'
        else 'A Group Admin has returned to Member.' end
    );
  end if;
  return new;
end;
$fn$;
revoke all on function akiba_private.notify_group_membership_changes() from public, anon, authenticated;
drop trigger if exists akiba_group_membership_notifications on public.akiba_group_memberships;
create trigger akiba_group_membership_notifications
after insert or update of role, status on public.akiba_group_memberships
for each row execute function akiba_private.notify_group_membership_changes();

create or replace function akiba_private.notify_group_deactivation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if old.status = 'active' and new.status = 'deactivated' then
    perform akiba_private.create_group_notification(
      new.id, gen_random_uuid(), auth.uid(), null, false,
      'group_deactivated', 'Group deactivated',
      'The Group Creator has deactivated this group.'
    );
  end if;
  return new;
end;
$fn$;
revoke all on function akiba_private.notify_group_deactivation() from public, anon, authenticated;
drop trigger if exists akiba_group_deactivation_notifications on public.akiba_groups;
create trigger akiba_group_deactivation_notifications
after update of status on public.akiba_groups
for each row execute function akiba_private.notify_group_deactivation();

create or replace function public.akiba_list_my_group_notifications(p_limit integer default 50)
returns table (
  id uuid,
  group_id uuid,
  event_type text,
  title text,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
as $fn$
  select n.id, n.group_id, n.event_type, n.title, n.body, n.href, n.read_at, n.created_at
  from public.akiba_group_notifications n
  where auth.uid() is not null and n.user_id = auth.uid()
  order by n.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$fn$;
revoke all on function public.akiba_list_my_group_notifications(integer) from public, anon;
grant execute on function public.akiba_list_my_group_notifications(integer) to authenticated;

create or replace function public.akiba_mark_group_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  update public.akiba_group_notifications
  set read_at = coalesce(read_at, clock_timestamp())
  where id = p_notification_id and user_id = auth.uid();
  if not found then raise exception 'Notification not found'; end if;
end;
$fn$;
revoke all on function public.akiba_mark_group_notification_read(uuid) from public, anon;
grant execute on function public.akiba_mark_group_notification_read(uuid) to authenticated;

-- Retention classification: retain immutable financial evidence, but remove
-- operational provider identifiers and non-essential metadata after all
-- provider operations are terminal and the six-month group retention elapses.
alter table public.akiba_group_deletion_records
  add column if not exists image_cleanup_status text not null default 'pending',
  add column if not exists image_cleanup_attempts integer not null default 0,
  add column if not exists image_cleanup_last_error text,
  add column if not exists image_cleanup_started_at timestamptz,
  add column if not exists image_cleaned_at timestamptz,
  drop constraint if exists akiba_group_deletion_records_image_cleanup_status_check,
  drop constraint if exists akiba_group_deletion_records_image_cleanup_attempts_check,
  drop constraint if exists akiba_group_deletion_records_image_cleanup_consistency_check;

update public.akiba_group_deletion_records
set image_cleanup_status = case when image_path_for_cleanup is null then 'not_required' else 'pending' end;

alter table public.akiba_group_deletion_records
  add constraint akiba_group_deletion_records_image_cleanup_status_check
    check (image_cleanup_status in ('not_required', 'pending', 'processing', 'completed', 'failed')),
  add constraint akiba_group_deletion_records_image_cleanup_attempts_check
    check (image_cleanup_attempts >= 0),
  add constraint akiba_group_deletion_records_image_cleanup_consistency_check
    check (
      (image_path_for_cleanup is null and image_cleanup_status in ('not_required', 'completed'))
      or (image_path_for_cleanup is not null and image_cleanup_status in ('pending', 'processing', 'failed'))
    );

create or replace function akiba_private.set_group_image_cleanup_state()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  if new.image_path_for_cleanup is null then
    new.image_cleanup_status := 'not_required';
  else
    new.image_cleanup_status := 'pending';
  end if;
  return new;
end;
$fn$;
revoke all on function akiba_private.set_group_image_cleanup_state() from public, anon, authenticated;
drop trigger if exists akiba_group_deletion_image_cleanup_state on public.akiba_group_deletion_records;
create trigger akiba_group_deletion_image_cleanup_state
before insert on public.akiba_group_deletion_records
for each row execute function akiba_private.set_group_image_cleanup_state();

create or replace function akiba_private.minimize_group_data_after_retention()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  delete from public.akiba_group_notifications where group_id = new.group_id;

  update public.akiba_group_payment_accounts
  set provider_account_ref = null,
      account_status = 'closed',
      metadata = '{}'::jsonb,
      updated_at = clock_timestamp()
  where group_id = new.group_id;

  return new;
end;
$fn$;
revoke all on function akiba_private.minimize_group_data_after_retention() from public, anon, authenticated;
drop trigger if exists akiba_group_deletion_data_minimization on public.akiba_group_deletion_records;
create trigger akiba_group_deletion_data_minimization
after insert on public.akiba_group_deletion_records
for each row execute function akiba_private.minimize_group_data_after_retention();

-- A database-generated secret authenticates the scheduled storage-cleanup call.
do $secret$
begin
  if not exists (
    select 1 from vault.secrets where name = 'akiba_group_image_cleanup_secret'
  ) then
    perform vault.create_secret(
      encode(gen_random_bytes(32), 'hex'),
      'akiba_group_image_cleanup_secret',
      'Authenticates the scheduled Akiba group-image storage cleanup worker.'
    );
  end if;
end;
$secret$;

create or replace function public.akiba_verify_group_image_cleanup_secret(p_secret text)
returns boolean
language sql
security definer
set search_path = ''
as $fn$
  select p_secret is not null and exists (
    select 1 from vault.decrypted_secrets
    where name = 'akiba_group_image_cleanup_secret'
      and decrypted_secret = p_secret
  );
$fn$;
revoke all on function public.akiba_verify_group_image_cleanup_secret(text) from public, anon, authenticated;
grant execute on function public.akiba_verify_group_image_cleanup_secret(text) to service_role;

-- Storage objects must be deleted through the Storage API, never by deleting
-- rows from storage.objects. The Edge Function performs that API call.
do $schedule$
begin
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_catalog.pg_extension where extname = 'pg_net') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'akiba-group-image-storage-cleanup';
    perform cron.schedule(
      'akiba-group-image-storage-cleanup',
      '0 * * * *',
      $job$
        select net.http_post(
          url := 'https://grqocvyuszapuszxdqfa.supabase.co/functions/v1/cleanup-group-images',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-akiba-cleanup-secret',
            (select decrypted_secret from vault.decrypted_secrets
             where name = 'akiba_group_image_cleanup_secret')
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 10000
        );
      $job$
    );
  end if;
end;
$schedule$;

commit;
