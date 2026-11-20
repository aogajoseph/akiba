-- Persist callback authentication and independent Safaricom STK Query evidence.
-- The posting boundary requires both records and validates their relationship.
begin;

alter table public.akiba_provider_events
  add column if not exists callback_authenticated_at timestamptz,
  add column if not exists callback_auth_method text;

alter table public.akiba_provider_events
  drop constraint if exists akiba_provider_events_callback_auth_method_check;

alter table public.akiba_provider_events
  add constraint akiba_provider_events_callback_auth_method_check
  check (
    callback_auth_method is null
    or callback_auth_method = 'shared_url_token'
  );

create table if not exists public.akiba_provider_verifications (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.akiba_payment_providers(id) on delete restrict,
  payment_attempt_id uuid not null references public.akiba_payment_attempts(id) on delete restrict,
  callback_event_id uuid not null references public.akiba_provider_events(id) on delete restrict,
  checkout_request_id text not null,
  merchant_request_id text,
  result_code text,
  result_description text,
  verification_status text not null
    check (verification_status in ('success', 'pending', 'failure')),
  response_digest text not null
    check (response_digest ~ '^[0-9a-f]{64}$'),
  verified_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint akiba_provider_verifications_attempt_digest_unique
    unique (payment_attempt_id, response_digest)
);

create index if not exists akiba_provider_verifications_callback_event_idx
  on public.akiba_provider_verifications(callback_event_id, verified_at desc);

create index if not exists akiba_provider_verifications_attempt_latest_idx
  on public.akiba_provider_verifications(payment_attempt_id, verified_at desc);

alter table public.akiba_provider_verifications enable row level security;
revoke all on table public.akiba_provider_verifications from public, anon, authenticated;
grant select, insert on table public.akiba_provider_verifications to service_role;

-- Retire the callback-only posting signature. All callers must supply the
-- authenticated callback row and the independently verified Safaricom query.
drop function if exists public.post_mpesa_contribution(text, text, bigint, text, text);

create function public.post_mpesa_contribution(
  p_checkout_request_id text,
  p_provider_receipt_number text,
  p_amount_minor bigint,
  p_currency_code text,
  p_callback_event_id uuid,
  p_provider_verification_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_provider_id uuid;
  v_attempt public.akiba_payment_attempts%rowtype;
  v_intent public.akiba_contribution_intents%rowtype;
  v_callback public.akiba_provider_events%rowtype;
  v_verification public.akiba_provider_verifications%rowtype;
  v_transaction_id uuid;
  v_existing_metadata jsonb;
begin
  if p_checkout_request_id is null
     or length(btrim(p_checkout_request_id)) = 0
     or p_provider_receipt_number is null
     or p_provider_receipt_number !~ '^[A-Z0-9]{10}$'
     or p_amount_minor is null
     or p_amount_minor <= 0
     or p_currency_code <> 'KES' then
    raise exception 'A valid M-Pesa contribution amount, currency and receipt are required';
  end if;

  if p_callback_event_id is null or p_provider_verification_id is null then
    raise exception 'Both authenticated callback and provider verification evidence are required';
  end if;

  select id into v_provider_id
  from public.akiba_payment_providers
  where provider_code = 'safaricom_daraja';

  if v_provider_id is null then
    raise exception 'M-Pesa provider is not registered';
  end if;

  select * into v_attempt
  from public.akiba_payment_attempts
  where provider_id = v_provider_id
    and provider_attempt_ref = p_checkout_request_id
  for update;

  if not found then
    raise exception 'M-Pesa checkout request does not match a payment attempt';
  end if;

  select * into v_intent
  from public.akiba_contribution_intents
  where id = v_attempt.contribution_intent_id
  for update;

  if not found then
    raise exception 'Contribution intent was not found';
  end if;

  select * into v_callback
  from public.akiba_provider_events
  where id = p_callback_event_id
    and provider_id = v_provider_id
    and provider_event_ref = p_checkout_request_id
    and event_type = 'mpesa_stk_callback'
  for update;

  if not found
     or v_callback.callback_authenticated_at is null
     or v_callback.callback_auth_method <> 'shared_url_token'
     or v_callback.payload_digest like 'callback-missing:%'
     or v_callback.provider_result_code <> '0'
     or v_callback.provider_receipt_number <> p_provider_receipt_number
     or v_callback.amount_minor <> p_amount_minor
     or v_callback.currency_code <> p_currency_code then
    raise exception 'Authenticated successful callback evidence is missing or does not match';
  end if;

  select * into v_verification
  from public.akiba_provider_verifications
  where id = p_provider_verification_id
    and provider_id = v_provider_id
    and payment_attempt_id = v_attempt.id
    and callback_event_id = v_callback.id
  for update;

  if not found
     or v_verification.verification_status <> 'success'
     or v_verification.result_code <> '0'
     or v_verification.checkout_request_id <> p_checkout_request_id
     or v_verification.response_digest !~ '^[0-9a-f]{64}$'
     or v_verification.verified_at is null then
    raise exception 'Independent successful Safaricom verification evidence is missing or does not match';
  end if;

  if v_attempt.provider_merchant_ref is not null
     and v_callback.source_reference is distinct from v_attempt.provider_merchant_ref then
    raise exception 'Callback merchant reference does not match the payment attempt';
  end if;

  if v_verification.merchant_request_id is not null
     and v_attempt.provider_merchant_ref is not null
     and v_verification.merchant_request_id <> v_attempt.provider_merchant_ref then
    raise exception 'Safaricom merchant reference does not match the payment attempt';
  end if;

  if v_callback.source_reference is not null
     and v_verification.merchant_request_id is not null
     and v_callback.source_reference <> v_verification.merchant_request_id then
    raise exception 'Callback and Safaricom merchant references disagree';
  end if;

  if v_attempt.status in ('failed', 'cancelled', 'expired') then
    raise exception 'A terminal unsuccessful payment attempt cannot be posted';
  end if;

  if v_attempt.currency_code <> p_currency_code
     or v_intent.currency_code <> p_currency_code
     or v_attempt.amount_minor <> p_amount_minor
     or v_intent.amount_minor <> p_amount_minor then
    raise exception 'Verified amount or currency does not match the contribution';
  end if;

  if exists (
    select 1
    from public.akiba_payment_attempts
    where provider_id = v_provider_id
      and provider_receipt_number = p_provider_receipt_number
      and id <> v_attempt.id
  ) then
    raise exception 'M-Pesa receipt number is already linked to another payment attempt';
  end if;

  if v_intent.status = 'succeeded'
     and v_intent.financial_transaction_id is not null then
    select metadata into v_existing_metadata
    from public.akiba_financial_transactions
    where id = v_intent.financial_transaction_id
      and group_id = v_intent.group_id
      and transaction_type = 'contribution';

    if v_existing_metadata ->> 'callback_event_id' = p_callback_event_id::text
       and v_existing_metadata ->> 'provider_verification_id' = p_provider_verification_id::text
       and v_attempt.provider_receipt_number = p_provider_receipt_number then
      return v_intent.financial_transaction_id;
    end if;

    raise exception 'Contribution was already posted with different evidence';
  end if;

  if v_intent.financial_transaction_id is not null then
    raise exception 'Contribution already has a financial transaction link';
  end if;

  insert into public.akiba_financial_transactions (
    group_id, currency_code, transaction_type, reference,
    description, effective_at, created_by, metadata
  )
  values (
    v_intent.group_id,
    p_currency_code,
    'contribution',
    'mpesa:' || p_checkout_request_id,
    'M-Pesa group contribution',
    clock_timestamp(),
    v_intent.contributor_id,
    jsonb_build_object(
      'provider_code', 'safaricom_daraja',
      'provider_receipt_number', p_provider_receipt_number,
      'checkout_request_id', p_checkout_request_id,
      'contribution_intent_id', v_intent.id,
      'callback_event_id', v_callback.id,
      'callback_payload_digest', v_callback.payload_digest,
      'provider_verification_id', v_verification.id,
      'provider_verification_digest', v_verification.response_digest,
      'provider_verified_at', v_verification.verified_at
    )
  )
  returning id into v_transaction_id;

  insert into public.akiba_financial_ledger_entries (
    transaction_id, group_id, currency_code, line_number,
    account_code, direction, amount_minor
  )
  values
    (v_transaction_id, v_intent.group_id, p_currency_code, 1,
     'provider_clearing', 'debit', p_amount_minor),
    (v_transaction_id, v_intent.group_id, p_currency_code, 2,
     'group_funds', 'credit', p_amount_minor);

  update public.akiba_payment_attempts
  set status = 'succeeded',
      provider_receipt_number = p_provider_receipt_number,
      provider_result_code = v_verification.result_code,
      response_code = v_verification.result_code,
      response_summary = 'Safaricom independently verified the authenticated M-Pesa callback.',
      confirmed_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = v_attempt.id;

  update public.akiba_contribution_intents
  set status = 'succeeded',
      financial_transaction_id = v_transaction_id,
      confirmed_at = clock_timestamp(),
      updated_at = clock_timestamp()
  where id = v_intent.id;

  insert into public.akiba_finance_activity_events (
    group_id, actor_id, event_type, source_type, source_id, event_payload
  )
  values (
    v_intent.group_id,
    v_intent.contributor_id,
    'contribution_received',
    'contribution_intent',
    v_intent.id,
    jsonb_build_object(
      'financial_transaction_id', v_transaction_id,
      'currency_code', p_currency_code,
      'amount_minor', p_amount_minor,
      'provider_code', 'safaricom_daraja',
      'provider_receipt_number', p_provider_receipt_number
    )
  )
  on conflict (group_id, event_type, source_type, source_id) do nothing;

  return v_transaction_id;
end;
$function$;

revoke all on function public.post_mpesa_contribution(
  text, text, bigint, text, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.post_mpesa_contribution(
  text, text, bigint, text, uuid, uuid
) to service_role;

commit;
