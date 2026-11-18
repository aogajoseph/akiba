\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000313', 'authenticated', 'authenticated', 'creator-313@akiba.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000314', 'authenticated', 'authenticated', 'requester-314@akiba.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000315', 'authenticated', 'authenticated', 'requester-315@akiba.test', '', now(), now(), now())
on conflict (id) do nothing;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000313', true);
insert into public.akiba_groups (id, name, purpose, group_type, currency_code, created_by)
values ('10000000-0000-0000-0000-000000000015', 'Approval link test', 'goal', 'shared_savings', 'KES',
        '00000000-0000-0000-0000-000000000313');

insert into public.akiba_group_invite_links(group_id, token, token_hash, created_by)
values ('10000000-0000-0000-0000-000000000015', repeat('a', 64), encode(sha256(convert_to(repeat('a', 64), 'UTF8')), 'hex'),
        '00000000-0000-0000-0000-000000000313');

-- A shared link creates a pending request, not an active membership.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000314', true);
select public.akiba_request_group_join_by_link(encode(sha256(convert_to(repeat('a', 64), 'UTF8')), 'hex'));

do $test$
declare request_count integer; active_membership_count integer;
begin
  select count(*) into request_count from public.akiba_group_join_requests
  where group_id = '10000000-0000-0000-0000-000000000015'
    and user_id = '00000000-0000-0000-0000-000000000314' and status = 'pending';
  select count(*) into active_membership_count from public.akiba_group_memberships
  where group_id = '10000000-0000-0000-0000-000000000015'
    and user_id = '00000000-0000-0000-0000-000000000314' and status = 'active';
  if request_count <> 1 then raise exception 'Shared link did not create exactly one pending join request'; end if;
  if active_membership_count <> 0 then raise exception 'Shared link incorrectly created an active membership before approval'; end if;
end;
$test$;

-- Repeated submission reuses the pending request.
do $test$
declare first_id uuid; second_id uuid;
begin
  select id into first_id from public.akiba_group_join_requests
  where group_id = '10000000-0000-0000-0000-000000000015'
    and user_id = '00000000-0000-0000-0000-000000000314' and status = 'pending';
  second_id := public.akiba_request_group_join_by_link(encode(sha256(convert_to(repeat('a', 64), 'UTF8')), 'hex'));
  if first_id <> second_id then raise exception 'Duplicate submission created a second pending request'; end if;
end;
$test$;

-- Only the Group Creator can approve, and approval creates ordinary membership.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000313', true);
select public.akiba_decide_group_join_request(
  (select id from public.akiba_group_join_requests
   where group_id = '10000000-0000-0000-0000-000000000015'
     and user_id = '00000000-0000-0000-0000-000000000314'),
  'approve'
);

do $test$
begin
  if not exists (
    select 1 from public.akiba_group_memberships
    where group_id = '10000000-0000-0000-0000-000000000015'
      and user_id = '00000000-0000-0000-0000-000000000314'
      and role = 'member' and status = 'active'
  ) then raise exception 'Approved request did not create active membership'; end if;
  if not exists (
    select 1 from public.akiba_group_join_requests
    where group_id = '10000000-0000-0000-0000-000000000015'
      and user_id = '00000000-0000-0000-0000-000000000314'
      and status = 'approved' and reviewed_by = '00000000-0000-0000-0000-000000000313'
  ) then raise exception 'Approved request did not record reviewer and status'; end if;
  if not exists (select 1 from public.akiba_group_notifications where user_id = '00000000-0000-0000-0000-000000000314' and event_type = 'membership_request_approved') then raise exception 'Applicant was not notified that the request was approved'; end if;
end;
$test$;

-- A non-creator cannot decide another person's request.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000315', true);
do $test$
declare message text;
begin
  begin
    perform public.akiba_decide_group_join_request(
      (select id from public.akiba_group_join_requests
       where group_id = '10000000-0000-0000-0000-000000000015'
         and user_id = '00000000-0000-0000-0000-000000000314'),
      'reject'
    );
    raise exception 'A non-creator unexpectedly reviewed a membership request';
  exception when others then
    get stacked diagnostics message = message_text;
    if message not like '%Only the Group Creator%' then raise; end if;
  end;
end;
$test$;

-- A second applicant can request and be declined without receiving membership.
select public.akiba_request_group_join_by_link(encode(sha256(convert_to(repeat('a', 64), 'UTF8')), 'hex'));
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000313', true);
select public.akiba_decide_group_join_request(
  (select id from public.akiba_group_join_requests
   where group_id = '10000000-0000-0000-0000-000000000015'
     and user_id = '00000000-0000-0000-0000-000000000315'),
  'reject'
);

do $test$
begin
  if exists (
    select 1 from public.akiba_group_memberships
    where group_id = '10000000-0000-0000-0000-000000000015'
      and user_id = '00000000-0000-0000-0000-000000000315' and status = 'active'
  ) then raise exception 'Declined request created an active membership'; end if;
  if not exists (
    select 1 from public.akiba_group_join_requests
    where group_id = '10000000-0000-0000-0000-000000000015'
      and user_id = '00000000-0000-0000-0000-000000000315' and status = 'rejected'
  ) then raise exception 'Declined request status was not persisted'; end if;
  if not exists (select 1 from public.akiba_group_notifications where user_id = '00000000-0000-0000-0000-000000000315' and event_type = 'membership_request_rejected') then raise exception 'Applicant was not notified that the request was declined'; end if;
end;
$test$;

do $test$
begin
  if has_function_privilege('anon', 'public.akiba_request_group_join_by_link(text)', 'EXECUTE') then
    raise exception 'Anonymous users can submit join requests';
  end if;
  if has_function_privilege('authenticated', 'public.akiba_join_group_by_link(text)', 'EXECUTE') then
    raise exception 'Legacy direct-join RPC remains executable by authenticated users';
  end if;
end;
$test$;

rollback;
