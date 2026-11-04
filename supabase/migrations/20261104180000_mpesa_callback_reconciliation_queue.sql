-- Durable, retryable storage for M-Pesa callback facts.
-- The callback remains untrusted: only a fresh Daraja STK Query success can post funds.
begin;

alter table public.akiba_provider_events
  add column if not exists provider_result_code text,
  add column if not exists provider_result_description text,
  add column if not exists amount_minor bigint,
  add column if not exists currency_code text,
  add column if not exists provider_receipt_number text,
  add column if not exists retryable boolean not null default true,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists next_retry_at timestamptz not null default now(),
  add column if not exists last_attempt_at timestamptz;

alter table public.akiba_provider_events
  drop constraint if exists akiba_provider_events_processing_status_check;

alter table public.akiba_provider_events
  add constraint akiba_provider_events_processing_status_check
  check (processing_status = any (array[
    'received'::text,
    'processing'::text,
    'processed'::text,
    'ignored'::text,
    'failed'::text
  ]));

alter table public.akiba_provider_events
  add constraint akiba_provider_events_attempt_count_check
  check (attempt_count >= 0);

create index if not exists akiba_provider_events_mpesa_reconciliation_due_idx
  on public.akiba_provider_events (next_retry_at, received_at)
  where event_type = 'mpesa_stk_callback'
    and retryable = true
    and processed_at is null;

commit;
