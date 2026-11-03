-- Akiba Finance workflow foundation.
-- Provider-independent workflow records only: no provider credentials, money movement,
-- or client-side mutation surface is introduced by this migration.
begin;

create table public.akiba_payment_providers (
  id uuid primary key default gen_random_uuid(),
  provider_code text not null unique check (provider_code ~ '^[a-z0-9_]{2,40}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  is_enabled boolean not null default false,
  capabilities jsonb not null default '{}'::jsonb check (jsonb_typeof(capabilities) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.akiba_group_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  provider_id uuid not null references public.akiba_payment_providers(id) on delete restrict,
  provider_account_ref text,
  account_status text not null default 'pending'
    check (account_status in ('pending','active','suspended','closed')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, provider_id, provider_account_ref)
);

create table public.akiba_contribution_intents (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  contributor_id uuid not null references auth.users(id) on delete restrict,
  provider_id uuid not null references public.akiba_payment_providers(id) on delete restrict,
  group_payment_account_id uuid references public.akiba_group_payment_accounts(id) on delete restrict,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check (amount_minor > 0),
  akiba_fee_minor bigint not null default 0 check (akiba_fee_minor = 0),
  provider_fee_minor bigint check (provider_fee_minor is null or provider_fee_minor >= 0),
  status text not null default 'created'
    check (status in ('created','awaiting_authorization','processing','succeeded','failed','cancelled','expired')),
  idempotency_key text not null check (char_length(btrim(idempotency_key)) between 8 and 160),
  expires_at timestamptz,
  confirmed_at timestamptz,
  financial_transaction_id uuid references public.akiba_financial_transactions(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, contributor_id, idempotency_key),
  unique (id, group_id, currency_code),
  check ((status = 'succeeded') = (financial_transaction_id is not null))
);

create index akiba_contribution_intents_group_time_idx
  on public.akiba_contribution_intents(group_id, created_at desc);
create index akiba_contribution_intents_status_idx
  on public.akiba_contribution_intents(status, created_at);

create table public.akiba_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  contribution_intent_id uuid not null references public.akiba_contribution_intents(id) on delete restrict,
  provider_id uuid not null references public.akiba_payment_providers(id) on delete restrict,
  provider_attempt_ref text,
  status text not null default 'initiated'
    check (status in ('initiated','pending','succeeded','failed','cancelled','expired','unknown')),
  amount_minor bigint not null check (amount_minor > 0),
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  provider_fee_minor bigint check (provider_fee_minor is null or provider_fee_minor >= 0),
  request_reference text not null unique,
  response_code text,
  response_summary text,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, provider_attempt_ref)
);

create table public.akiba_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  initiator_id uuid not null references auth.users(id) on delete restrict,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  recipient_amount_minor bigint not null check (recipient_amount_minor > 0),
  akiba_fee_minor bigint not null check (akiba_fee_minor >= 0),
  provider_fee_minor bigint not null check (provider_fee_minor >= 0),
  total_debit_minor bigint generated always as
    (recipient_amount_minor + akiba_fee_minor + provider_fee_minor) stored,
  fee_rate_bps integer not null default 0 check (fee_rate_bps between 0 and 10000),
  fee_schedule_version text not null,
  provider_id uuid not null references public.akiba_payment_providers(id) on delete restrict,
  provider_quote_ref text,
  quote_expires_at timestamptz,
  recipient_name text not null check (char_length(btrim(recipient_name)) between 1 and 160),
  destination_token text,
  destination_fingerprint text,
  destination_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(destination_snapshot) = 'object'),
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  status text not null default 'pending_approval'
    check (status in (
      'pending_approval','approved','processing','completed',
      'rejected','cancelled','failed_pending_reconciliation','failed'
    )),
  approval_version integer not null default 1 check (approval_version > 0),
  approved_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  resolved_at timestamptz,
  resolution_note text,
  financial_transaction_id uuid references public.akiba_financial_transactions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, group_id, currency_code),
  check ((status = 'completed') = (financial_transaction_id is not null)),
  check ((status in ('rejected','cancelled','completed','failed')) = (resolved_at is not null))
);

-- The partial unique index is the final concurrency-safe guard: all unresolved
-- states are mutually exclusive per group, irrespective of the initiating admin.
create unique index akiba_one_unresolved_withdrawal_per_group
  on public.akiba_withdrawal_requests(group_id)
  where status in (
    'pending_approval','approved','processing','failed_pending_reconciliation'
  );

create index akiba_withdrawal_requests_group_time_idx
  on public.akiba_withdrawal_requests(group_id, created_at desc);

create table public.akiba_withdrawal_approvals (
  id uuid primary key default gen_random_uuid(),
  withdrawal_request_id uuid not null references public.akiba_withdrawal_requests(id) on delete restrict,
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  approver_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('approved','rejected')),
  approval_version integer not null check (approval_version > 0),
  terms_fingerprint text not null,
  rejection_reason text,
  decided_at timestamptz not null default now(),
  unique (withdrawal_request_id, approver_id, approval_version),
  check ((decision = 'rejected') = (rejection_reason is not null))
);

create index akiba_withdrawal_approvals_request_idx
  on public.akiba_withdrawal_approvals(withdrawal_request_id, approval_version, decided_at);

create table public.akiba_financial_reservations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  withdrawal_request_id uuid not null unique references public.akiba_withdrawal_requests(id) on delete restrict,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check (amount_minor > 0),
  status text not null default 'active'
    check (status in ('active','consumed','released')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (id, group_id, currency_code),
  check ((status = 'active') = (resolved_at is null))
);

create index akiba_financial_reservations_active_group_idx
  on public.akiba_financial_reservations(group_id, currency_code)
  where status = 'active';

create table public.akiba_payout_attempts (
  id uuid primary key default gen_random_uuid(),
  withdrawal_request_id uuid not null references public.akiba_withdrawal_requests(id) on delete restrict,
  provider_id uuid not null references public.akiba_payment_providers(id) on delete restrict,
  provider_payout_ref text,
  status text not null default 'queued'
    check (status in ('queued','submitted','processing','succeeded','failed','cancelled','unknown')),
  request_reference text not null unique,
  provider_fee_minor bigint check (provider_fee_minor is null or provider_fee_minor >= 0),
  submitted_at timestamptz,
  confirmed_at timestamptz,
  reconciliation_status text not null default 'not_required'
    check (reconciliation_status in ('not_required','pending','matched','unmatched','resolved')),
  reconciliation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_id, provider_payout_ref)
);

create table public.akiba_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.akiba_payment_providers(id) on delete restrict,
  provider_event_ref text not null,
  event_type text not null,
  source_reference text,
  payload_digest text not null,
  processing_status text not null default 'received'
    check (processing_status in ('received','processed','ignored','failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_note text,
  unique (provider_id, provider_event_ref)
);

create table public.akiba_finance_activity_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  source_type text not null,
  source_id uuid not null,
  event_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(event_payload) = 'object'),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (group_id, event_type, source_type, source_id)
);

create index akiba_finance_activity_group_time_idx
  on public.akiba_finance_activity_events(group_id, created_at desc);
create index akiba_finance_activity_outbox_idx
  on public.akiba_finance_activity_events(created_at)
  where published_at is null;

-- Currency consistency on group-scoped workflow records.
create or replace function akiba_private.enforce_finance_workflow_currency()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  group_currency text;
begin
  select g.currency_code into group_currency
  from public.akiba_groups g
  where g.id = new.group_id
  for key share;

  if group_currency is null or group_currency <> new.currency_code then
    raise exception 'Workflow currency must match the group currency';
  end if;
  return new;
end;
$fn$;

create trigger akiba_contribution_currency_guard
before insert on public.akiba_contribution_intents
for each row execute function akiba_private.enforce_finance_workflow_currency();

create trigger akiba_withdrawal_currency_guard
before insert on public.akiba_withdrawal_requests
for each row execute function akiba_private.enforce_finance_workflow_currency();

create trigger akiba_reservation_currency_guard
before insert on public.akiba_financial_reservations
for each row execute function akiba_private.enforce_finance_workflow_currency();

-- Serialize request creation against the group row, then enforce the live
-- two-sub-admin prerequisite. The unique partial index independently prevents
-- two unresolved requests from racing into existence.
create or replace function akiba_private.guard_withdrawal_request_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  active_sub_admin_count integer;
  group_currency text;
  posted_group_funds numeric;
  active_reservations numeric;
begin
  perform 1 from public.akiba_groups where id = new.group_id for update;
  if not found then
    raise exception 'Group not found';
  end if;

  select currency_code into group_currency
  from public.akiba_groups where id = new.group_id;

  if new.currency_code <> group_currency then
    raise exception 'Withdrawal currency must match group currency';
  end if;

  if not exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = new.group_id
      and m.user_id = new.initiator_id
      and m.role = 'admin'
      and m.status = 'active'
  ) then
    raise exception 'Only an active group admin may initiate a withdrawal';
  end if;

  select count(*) into active_sub_admin_count
  from public.akiba_group_memberships m
  where m.group_id = new.group_id
    and m.role = 'sub_admin'
    and m.status = 'active';

  if active_sub_admin_count < 2 then
    raise exception 'At least two active sub-admins are required before a withdrawal can be requested';
  end if;

  select coalesce(sum(case when e.direction = 'credit' then e.amount_minor else -e.amount_minor end), 0)
    into posted_group_funds
  from public.akiba_financial_ledger_entries e
  where e.group_id = new.group_id
    and e.currency_code = new.currency_code
    and e.account_code = 'group_funds';

  select coalesce(sum(r.amount_minor), 0)
    into active_reservations
  from public.akiba_financial_reservations r
  where r.group_id = new.group_id
    and r.currency_code = new.currency_code
    and r.status = 'active';

  if posted_group_funds - active_reservations < new.total_debit_minor then
    raise exception 'Insufficient available group funds for this withdrawal and its fees';
  end if;

  return new;
end;
$fn$;

create trigger akiba_withdrawal_request_guard
before insert on public.akiba_withdrawal_requests
for each row execute function akiba_private.guard_withdrawal_request_insert();

-- Approvals are immutable evidence. Only active sub-admins may decide; the
-- initiating admin cannot approve. Approvals bind to the request's current
-- version and immutable terms fingerprint.
create or replace function akiba_private.guard_withdrawal_approval_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  request_row public.akiba_withdrawal_requests%rowtype;
begin
  select * into request_row
  from public.akiba_withdrawal_requests
  where id = new.withdrawal_request_id
  for update;

  if not found then
    raise exception 'Withdrawal request not found';
  end if;

  if new.group_id <> request_row.group_id then
    raise exception 'Approval group does not match the withdrawal request';
  end if;

  if request_row.status <> 'pending_approval'
     or new.approval_version <> request_row.approval_version then
    raise exception 'Withdrawal request is not accepting approvals for this version';
  end if;

  if new.approver_id = request_row.initiator_id then
    raise exception 'The withdrawal initiator cannot approve their own request';
  end if;

  if not exists (
    select 1 from public.akiba_group_memberships m
    where m.group_id = request_row.group_id
      and m.user_id = new.approver_id
      and m.role = 'sub_admin'
      and m.status = 'active'
  ) then
    raise exception 'Only a currently active sub-admin may approve or reject';
  end if;

  if new.terms_fingerprint is distinct from encode(
    digest(convert_to(concat_ws('|',
      request_row.id::text,
      request_row.group_id::text,
      request_row.currency_code,
      request_row.recipient_amount_minor::text,
      request_row.akiba_fee_minor::text,
      request_row.provider_fee_minor::text,
      request_row.recipient_name,
      coalesce(request_row.destination_fingerprint, ''),
      request_row.fee_schedule_version,
      request_row.provider_id::text
    ), 'UTF8'), 'sha256'), 'hex'
  ) then
    raise exception 'Approval terms do not match the current withdrawal request';
  end if;

  return new;
end;
$fn$;

create trigger akiba_withdrawal_approval_guard
before insert on public.akiba_withdrawal_approvals
for each row execute function akiba_private.guard_withdrawal_approval_insert();


-- Once the request row exists, reserve its full group deduction in the same
-- transaction. The group-row lock acquired by the BEFORE trigger serializes
-- competing requests and balance checks for this group.
create or replace function akiba_private.create_withdrawal_reservation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
begin
  insert into public.akiba_financial_reservations
    (group_id, withdrawal_request_id, currency_code, amount_minor)
  values
    (new.group_id, new.id, new.currency_code, new.total_debit_minor);
  return new;
end;
$fn$;

create trigger akiba_withdrawal_reservation_create
after insert on public.akiba_withdrawal_requests
for each row execute function akiba_private.create_withdrawal_reservation();

-- Each rejection terminates the request immediately. Two distinct approvals
-- of the current terms/version authorize payout execution, but do not mark it
-- paid. Provider-confirmed success remains the only completion signal.
create or replace function akiba_private.apply_withdrawal_approval_decision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  approved_count integer;
begin
  if new.decision = 'rejected' then
    update public.akiba_withdrawal_requests
      set status = 'rejected',
          resolved_at = new.decided_at,
          resolution_note = new.rejection_reason,
          updated_at = now()
    where id = new.withdrawal_request_id
      and status = 'pending_approval';
  else
    select count(distinct a.approver_id) into approved_count
    from public.akiba_withdrawal_approvals a
    where a.withdrawal_request_id = new.withdrawal_request_id
      and a.approval_version = new.approval_version
      and a.decision = 'approved';

    if approved_count >= 2 then
      update public.akiba_withdrawal_requests
        set status = 'approved',
            approved_at = now(),
            updated_at = now()
      where id = new.withdrawal_request_id
        and status = 'pending_approval';
    end if;
  end if;

  return new;
end;
$fn$;

create trigger akiba_withdrawal_approval_apply
after insert on public.akiba_withdrawal_approvals
for each row execute function akiba_private.apply_withdrawal_approval_decision();

-- All workflow data is server-written. Active members may read group-scoped
-- records, but authenticated clients receive no INSERT/UPDATE/DELETE privileges.
do $rls$
declare
  table_name text;
begin
  foreach table_name in array array[
    'akiba_group_payment_accounts',
    'akiba_contribution_intents',
    'akiba_withdrawal_requests',
    'akiba_withdrawal_approvals',
    'akiba_financial_reservations',
    'akiba_finance_activity_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (akiba_private.is_active_group_member(group_id))',
      table_name || '_active_members_read', table_name
    );
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant select on public.%I to authenticated', table_name);
  end loop;
end;
$rls$;

-- Provider catalogue is intentionally not exposed until an audited admin
-- configuration surface exists. Attempts/events are also server-only.
alter table public.akiba_payment_providers enable row level security;
alter table public.akiba_payment_attempts enable row level security;
alter table public.akiba_payout_attempts enable row level security;
alter table public.akiba_provider_events enable row level security;
revoke all on public.akiba_payment_providers, public.akiba_payment_attempts,
  public.akiba_payout_attempts, public.akiba_provider_events from anon, authenticated;

revoke all on function akiba_private.enforce_finance_workflow_currency() from public, anon, authenticated;
revoke all on function akiba_private.guard_withdrawal_request_insert() from public, anon, authenticated;
revoke all on function akiba_private.guard_withdrawal_approval_insert() from public, anon, authenticated;
revoke all on function akiba_private.create_withdrawal_reservation() from public, anon, authenticated;
revoke all on function akiba_private.apply_withdrawal_approval_decision() from public, anon, authenticated;

commit;
