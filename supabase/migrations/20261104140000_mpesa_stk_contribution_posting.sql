-- M-Pesa STK Push collection references and atomic contribution posting.
-- Only the trusted server-side service role may call the posting function.
begin;

alter table public.akiba_payment_attempts
  add column if not exists provider_merchant_ref text,
  add column if not exists provider_receipt_number text,
  add column if not exists provider_result_code text;

create unique index if not exists akiba_one_payment_attempt_per_contribution
  on public.akiba_payment_attempts(contribution_intent_id);

create unique index if not exists akiba_payment_attempts_mpesa_receipt_unique
  on public.akiba_payment_attempts(provider_id, provider_receipt_number)
  where provider_receipt_number is not null;

create or replace function public.post_mpesa_contribution(
  p_checkout_request_id text,
  p_provider_receipt_number text,
  p_amount_minor bigint,
  p_currency_code text,
  p_provider_result_code text
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
  v_transaction_id uuid;
begin
  if p_checkout_request_id is null or length(btrim(p_checkout_request_id)) = 0
     or p_provider_receipt_number is null
     or length(p_provider_receipt_number) <> 10
     or p_provider_receipt_number ~ '[^A-Z0-9]'
     or p_provider_result_code <> '0' then
    raise exception 'A confirmed M-Pesa success with provider references is required';
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

  if v_intent.status = 'succeeded' and v_intent.financial_transaction_id is not null then
    if v_attempt.provider_receipt_number <> p_provider_receipt_number then
      raise exception 'A repeated success callback supplied a different receipt number';
    end if;
    return v_intent.financial_transaction_id;
  end if;

  if v_attempt.status in ('failed', 'cancelled', 'expired') then
    raise exception 'A terminal unsuccessful payment attempt cannot be posted';
  end if;

  if p_currency_code <> 'KES'
     or v_attempt.currency_code <> p_currency_code
     or v_intent.currency_code <> p_currency_code
     or v_attempt.amount_minor <> p_amount_minor
     or v_intent.amount_minor <> p_amount_minor then
    raise exception 'Provider-confirmed amount or currency does not match the contribution';
  end if;

  if exists (
    select 1 from public.akiba_payment_attempts
    where provider_id = v_provider_id
      and provider_receipt_number = p_provider_receipt_number
      and id <> v_attempt.id
  ) then
    raise exception 'M-Pesa receipt number is already linked to another payment attempt';
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
      'contribution_intent_id', v_intent.id
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
      provider_result_code = p_provider_result_code,
      response_code = p_provider_result_code,
      response_summary = 'Safaricom confirmed successful M-Pesa payment.',
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

revoke all on function public.post_mpesa_contribution(text, text, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.post_mpesa_contribution(text, text, bigint, text, text)
  to service_role;

commit;

     or p_provider_result_code <> '0' then
    raise exception 'A confirmed M-Pesa success with provider references is required';
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

  if v_intent.status = 'succeeded' and v_intent.financial_transaction_id is not null then
    if v_attempt.provider_receipt_number <> p_provider_receipt_number then
      raise exception 'A repeated success callback supplied a different receipt number';
    end if;
    return v_intent.financial_transaction_id;
  end if;

  if v_attempt.status in ('failed', 'cancelled', 'expired') then
    raise exception 'A terminal unsuccessful payment attempt cannot be posted';
  end if;

  if p_currency_code <> 'KES'
     or v_attempt.currency_code <> p_currency_code
     or v_intent.currency_code <> p_currency_code
     or v_attempt.amount_minor <> p_amount_minor
     or v_intent.amount_minor <> p_amount_minor then
    raise exception 'Provider-confirmed amount or currency does not match the contribution';
  end if;

  if exists (
    select 1 from public.akiba_payment_attempts
    where provider_id = v_provider_id
      and provider_receipt_number = p_provider_receipt_number
      and id <> v_attempt.id
  ) then
    raise exception 'M-Pesa receipt number is already linked to another payment attempt';
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
      'contribution_intent_id', v_intent.id
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
      provider_result_code = p_provider_result_code,
      response_code = p_provider_result_code,
      response_summary = 'Safaricom confirmed successful M-Pesa payment.',
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

revoke all on function public.post_mpesa_contribution(text, text, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.post_mpesa_contribution(text, text, bigint, text, text)
  to service_role;

commit;
