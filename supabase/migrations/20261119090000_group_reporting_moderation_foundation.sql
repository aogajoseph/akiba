begin;

-- Internal reviewer identities are provisioned only by trusted operators
-- (service_role / controlled database administration). No client can self-enrol.
create table if not exists public.akiba_internal_moderators (
  user_id uuid primary key references auth.users(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
alter table public.akiba_internal_moderators enable row level security;
revoke all on public.akiba_internal_moderators from public, anon, authenticated;
grant all on public.akiba_internal_moderators to service_role;

create or replace function akiba_private.is_internal_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select auth.uid() is not null and exists (
    select 1 from public.akiba_internal_moderators m
    where m.user_id = auth.uid() and m.is_active
  );
$fn$;
revoke all on function akiba_private.is_internal_moderator() from public, anon;
grant usage on schema akiba_private to authenticated;
grant execute on function akiba_private.is_internal_moderator() to authenticated;

create table if not exists public.akiba_group_reports (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  reporter_user_id uuid not null references auth.users(id) on delete restrict,
  reason text not null check (reason in (
    'fraud_suspected_scam',
    'impersonation',
    'harassment_abusive_behaviour',
    'inappropriate_content',
    'misleading_group_information',
    'suspicious_financial_activity',
    'other'
  )),
  description text not null default '' check (char_length(description) <= 2000),
  status text not null default 'pending' check (status in ('pending','under_review','resolved','dismissed')),
  assigned_to uuid references public.akiba_internal_moderators(user_id) on delete set null,
  resolution text check (resolution is null or char_length(resolution) <= 2000),
  reviewed_by uuid references public.akiba_internal_moderators(user_id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint akiba_group_report_review_state_check check (
    (status in ('pending','under_review') and reviewed_at is null and reviewed_by is null)
    or (status in ('resolved','dismissed') and reviewed_at is not null and reviewed_by is not null)
  )
);
create index if not exists akiba_group_reports_status_created_idx
  on public.akiba_group_reports(status, created_at desc);
create index if not exists akiba_group_reports_assigned_status_idx
  on public.akiba_group_reports(assigned_to, status, created_at desc);
create index if not exists akiba_group_reports_group_created_idx
  on public.akiba_group_reports(group_id, created_at desc);
create index if not exists akiba_group_reports_reporter_created_idx
  on public.akiba_group_reports(reporter_user_id, created_at desc);

alter table public.akiba_group_reports enable row level security;
revoke all on public.akiba_group_reports from public, anon;
revoke insert, update, delete on public.akiba_group_reports from authenticated;
grant select on public.akiba_group_reports to authenticated;
drop policy if exists "reporters and internal moderators read reports" on public.akiba_group_reports;
create policy "reporters and internal moderators read reports"
  on public.akiba_group_reports
  for select to authenticated
  using (
    reporter_user_id = (select auth.uid())
    or akiba_private.is_internal_moderator()
  );

create table if not exists public.akiba_group_report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.akiba_group_reports(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  file_size bigint not null check (file_size > 0 and file_size <= 5242880),
  created_at timestamptz not null default now(),
  constraint akiba_group_report_evidence_path_check
    check (storage_path like report_id::text || '/' || uploaded_by::text || '/%')
);
create index if not exists akiba_group_report_evidence_report_idx
  on public.akiba_group_report_evidence(report_id, created_at);
alter table public.akiba_group_report_evidence enable row level security;
revoke all on public.akiba_group_report_evidence from public, anon, authenticated;
grant select on public.akiba_group_report_evidence to authenticated;
create policy "internal moderators read report evidence metadata"
  on public.akiba_group_report_evidence
  for select to authenticated
  using (akiba_private.is_internal_moderator());

create table if not exists public.akiba_group_report_audit (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.akiba_group_reports(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('submitted','assigned','status_changed','resolution_recorded')),
  previous_status text,
  new_status text,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);
create index if not exists akiba_group_report_audit_report_time_idx
  on public.akiba_group_report_audit(report_id, created_at);
alter table public.akiba_group_report_audit enable row level security;
revoke all on public.akiba_group_report_audit from public, anon, authenticated;
grant select on public.akiba_group_report_audit to authenticated;
create policy "internal moderators read report audit"
  on public.akiba_group_report_audit
  for select to authenticated
  using (akiba_private.is_internal_moderator());

-- Evidence is private. A reporter may upload only to their own pending report.
-- Only internal moderators can download/list evidence objects.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'akiba-group-report-evidence',
  'akiba-group-report-evidence',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp','application/pdf']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Authenticated clients receive no write policy on this bucket. Evidence is
-- uploaded only by the server after file-signature validation using the
-- server-only Supabase service client. Reads remain reviewer-only.
drop policy if exists "reporters upload evidence for own pending reports" on storage.objects;
drop policy if exists "internal moderators read report evidence objects" on storage.objects;
create policy "internal moderators read report evidence objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'akiba-group-report-evidence' and akiba_private.is_internal_moderator());

drop policy if exists "reporters remove unregistered evidence from pending reports" on storage.objects;

create or replace function public.akiba_submit_group_report(
  p_group_id uuid,
  p_reason text,
  p_description text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := auth.uid();
  v_report_id uuid;
  v_description text := coalesce(trim(p_description), '');
begin
  if v_user_id is null then raise exception 'Authentication is required'; end if;
  if p_reason not in (
    'fraud_suspected_scam','impersonation','harassment_abusive_behaviour',
    'inappropriate_content','misleading_group_information',
    'suspicious_financial_activity','other'
  ) then raise exception 'Select a valid report reason'; end if;
  if char_length(v_description) > 2000 then raise exception 'Report explanation is too long'; end if;
  if not exists (select 1 from public.akiba_groups g where g.id = p_group_id) then
    raise exception 'Group not found';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));
  if (select count(*) from public.akiba_group_reports r
      where r.reporter_user_id = v_user_id
        and r.created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Report submission limit reached. Try again later.';
  end if;
  if exists (select 1 from public.akiba_group_reports r
      where r.reporter_user_id = v_user_id
        and r.group_id = p_group_id
        and r.created_at > now() - interval '24 hours') then
    raise exception 'You have already reported this group recently';
  end if;

  insert into public.akiba_group_reports(group_id, reporter_user_id, reason, description)
  values (p_group_id, v_user_id, p_reason, v_description)
  returning id into v_report_id;

  insert into public.akiba_group_report_audit(report_id, actor_user_id, action, new_status)
  values (v_report_id, v_user_id, 'submitted', 'pending');
  return v_report_id;
end;
$fn$;

create or replace function public.akiba_register_group_report_evidence(
  p_report_id uuid,
  p_evidence jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_count integer := 0;
  v_path text;
  v_name text;
  v_mime text;
  v_size bigint;
begin
  if v_user_id is null then raise exception 'Authentication is required'; end if;
  if jsonb_typeof(p_evidence) <> 'array' or jsonb_array_length(p_evidence) > 5 then
    raise exception 'Choose no more than five evidence files';
  end if;
  if not exists (select 1 from public.akiba_group_reports r
      where r.id = p_report_id and r.reporter_user_id = v_user_id and r.status = 'pending') then
    raise exception 'Pending report not found';
  end if;
  if exists (select 1 from public.akiba_group_report_evidence e where e.report_id = p_report_id) then
    raise exception 'Evidence has already been attached to this report';
  end if;

  for v_item in select value from jsonb_array_elements(p_evidence)
  loop
    v_path := v_item->>'storage_path';
    v_name := v_item->>'file_name';
    v_mime := v_item->>'mime_type';
    v_size := (v_item->>'file_size')::bigint;
    if v_path is null or v_path !~ ('^' || p_report_id::text || '/' || v_user_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$')
      or char_length(v_name) not between 1 and 255
      or v_mime not in ('image/jpeg','image/png','image/webp','application/pdf')
      or v_size not between 1 and 5242880
      or not exists (
        select 1 from storage.objects o
        where o.bucket_id = 'akiba-group-report-evidence' and o.name = v_path
      ) then
      raise exception 'Evidence file validation failed';
    end if;
    insert into public.akiba_group_report_evidence
      (report_id, uploaded_by, storage_path, file_name, mime_type, file_size)
    values (p_report_id, v_user_id, v_path, v_name, v_mime, v_size);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$fn$;

create or replace function public.akiba_delete_incomplete_group_report(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;
  delete from public.akiba_group_reports r
  where r.id = p_report_id
    and r.reporter_user_id = auth.uid()
    and r.status = 'pending'
    and not exists (
      select 1 from public.akiba_group_report_evidence e where e.report_id = r.id
    );
end;
$fn$;

create or replace function public.akiba_moderator_update_group_report(
  p_report_id uuid,
  p_status text,
  p_assigned_to uuid default null,
  p_resolution text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_old_status text;
  v_old_assigned_to uuid;
  v_resolution text := nullif(trim(coalesce(p_resolution, '')), '');
begin
  if auth.uid() is null or not akiba_private.is_internal_moderator() then
    raise exception 'Authorized internal moderator access is required';
  end if;
  if p_status not in ('under_review','resolved','dismissed') then
    raise exception 'Invalid moderation status';
  end if;
  if p_assigned_to is not null and not exists (
    select 1 from public.akiba_internal_moderators m
    where m.user_id = p_assigned_to and m.is_active
  ) then raise exception 'Assigned reviewer is not active'; end if;
  if p_status in ('resolved','dismissed') and v_resolution is null then
    raise exception 'A resolution note is required';
  end if;
  if v_resolution is not null and char_length(v_resolution) > 2000 then
    raise exception 'Resolution note is too long';
  end if;

  select r.status, r.assigned_to into v_old_status, v_old_assigned_to
  from public.akiba_group_reports r where r.id = p_report_id for update;
  if not found then raise exception 'Report not found'; end if;
  if v_old_status in ('resolved','dismissed') then
    raise exception 'This report has already been closed';
  end if;

  update public.akiba_group_reports
  set status = p_status,
      assigned_to = p_assigned_to,
      resolution = case when p_status in ('resolved','dismissed') then v_resolution else null end,
      reviewed_by = case when p_status in ('resolved','dismissed') then auth.uid() else null end,
      reviewed_at = case when p_status in ('resolved','dismissed') then now() else null end
  where id = p_report_id;

  insert into public.akiba_group_report_audit
    (report_id, actor_user_id, action, previous_status, new_status, details)
  values (
    p_report_id, auth.uid(),
    case
      when p_status in ('resolved','dismissed') then 'resolution_recorded'
      when v_old_assigned_to is distinct from p_assigned_to then 'assigned'
      else 'status_changed'
    end,
    v_old_status, p_status,
    jsonb_build_object('previous_assigned_to', v_old_assigned_to, 'assigned_to', p_assigned_to,
                       'resolution', v_resolution)
  );
end;
$fn$;

revoke all on function public.akiba_submit_group_report(uuid,text,text) from public, anon;
revoke all on function public.akiba_register_group_report_evidence(uuid,jsonb) from public, anon;
revoke all on function public.akiba_delete_incomplete_group_report(uuid) from public, anon;
revoke all on function public.akiba_moderator_update_group_report(uuid,text,uuid,text) from public, anon;
grant execute on function public.akiba_submit_group_report(uuid,text,text) to authenticated;
grant execute on function public.akiba_register_group_report_evidence(uuid,jsonb) to authenticated;
grant execute on function public.akiba_delete_incomplete_group_report(uuid) to authenticated;
grant execute on function public.akiba_moderator_update_group_report(uuid,text,uuid,text) to authenticated;

commit;
