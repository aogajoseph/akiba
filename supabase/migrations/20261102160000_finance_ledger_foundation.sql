-- Akiba Finance foundation: elevated membership role and immutable double-entry ledger.
-- This migration establishes the accounting substrate only. It does not move money,
-- integrate a provider, create withdrawals, or alter production balances.

begin;

-- Stage 1: recognize sub-admins as a first-class group role.
alter table public.akiba_group_memberships
  drop constraint if exists akiba_group_memberships_role_check;

alter table public.akiba_group_memberships
  add constraint akiba_group_memberships_role_check
  check (role in ('admin', 'sub_admin', 'member'));

create index if not exists akiba_group_memberships_active_sub_admin_idx
  on public.akiba_group_memberships(group_id)
  where role = 'sub_admin' and status = 'active';

-- Stage 2: immutable financial journal.
-- A transaction is a posted accounting event, not a payment attempt or withdrawal
-- request. Pending/failed provider attempts will live in dedicated workflow tables.
create table public.akiba_financial_transactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.akiba_groups(id) on delete restrict,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  transaction_type text not null check (transaction_type in (
    'contribution', 'withdrawal', 'refund', 'fee', 'adjustment', 'reversal'
  )),
  reference text not null check (char_length(btrim(reference)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  effective_at timestamptz not null,
  recorded_at timestamptz not null default clock_timestamp(),
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique (group_id, reference),
  unique (id, group_id, currency_code)
);

create index akiba_financial_transactions_group_time_idx
  on public.akiba_financial_transactions(group_id, effective_at desc, recorded_at desc);

create table public.akiba_financial_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  group_id uuid not null,
  currency_code text not null check (currency_code ~ '^[A-Z]{3}$'),
  line_number smallint not null check (line_number > 0),
  account_code text not null check (account_code in (
    'provider_clearing', 'group_funds', 'payout_payable',
    'provider_fees', 'adjustments'
  )),
  direction text not null check (direction in ('debit', 'credit')),
  amount_minor bigint not null check (amount_minor > 0),
  created_at timestamptz not null default clock_timestamp(),
  constraint akiba_financial_ledger_transaction_fk
    foreign key (transaction_id, group_id, currency_code)
    references public.akiba_financial_transactions(id, group_id, currency_code)
    on delete restrict,
  unique (transaction_id, line_number)
);

create index akiba_financial_ledger_group_account_idx
  on public.akiba_financial_ledger_entries(group_id, currency_code, account_code, created_at);

-- Ledger entries are append-only. Corrections must be new compensating entries.
create or replace function akiba_private.prevent_financial_ledger_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $akiba_fn$
begin
  raise exception 'Financial ledger entries are immutable; post a compensating transaction';
end;
$akiba_fn$;

create trigger akiba_financial_ledger_entries_immutable
before update or delete on public.akiba_financial_ledger_entries
for each row execute function akiba_private.prevent_financial_ledger_mutation();

-- Validate the complete journal at transaction commit. Each posted transaction
-- must contain at least two lines and total debits must equal total credits.
create or replace function akiba_private.validate_financial_journal()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $akiba_fn$
declare
  entry_count bigint;
  debit_total numeric;
  credit_total numeric;
begin
  select
    count(*),
    coalesce(sum(amount_minor) filter (where direction = 'debit'), 0),
    coalesce(sum(amount_minor) filter (where direction = 'credit'), 0)
  into entry_count, debit_total, credit_total
  from public.akiba_financial_ledger_entries
  where transaction_id = new.transaction_id;

  if entry_count < 2 or debit_total <> credit_total then
    raise exception 'Unbalanced financial journal for transaction %', new.transaction_id;
  end if;
  return null;
end;
$akiba_fn$;

create constraint trigger akiba_financial_journal_balanced
after insert on public.akiba_financial_ledger_entries
deferrable initially deferred
for each row execute function akiba_private.validate_financial_journal();

-- The journal header and its entries are read-only to clients. Only trusted
-- server-side workflows (service role) may post accounting events.
alter table public.akiba_financial_transactions enable row level security;
alter table public.akiba_financial_ledger_entries enable row level security;

create policy "active group members read financial transactions"
  on public.akiba_financial_transactions
  for select to authenticated
  using (akiba_private.is_active_group_member(group_id));

create policy "active group members read financial ledger"
  on public.akiba_financial_ledger_entries
  for select to authenticated
  using (akiba_private.is_active_group_member(group_id));

revoke all on public.akiba_financial_transactions,
  public.akiba_financial_ledger_entries from anon, authenticated;
grant select on public.akiba_financial_transactions,
  public.akiba_financial_ledger_entries to authenticated;

revoke all on function akiba_private.prevent_financial_ledger_mutation() from public, anon, authenticated;
revoke all on function akiba_private.validate_financial_journal() from public, anon, authenticated;

commit;
