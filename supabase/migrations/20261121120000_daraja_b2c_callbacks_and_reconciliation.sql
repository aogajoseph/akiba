begin;

alter table public.akiba_payout_attempts
  add column if not exists provider_transaction_id text,
  add column if not exists provider_receipt_number text,
  add column if not exists status_query_originator_id text,
  add column if not exists status_query_conversation_id text,
  add column if not exists status_query_submitted_at timestamptz,
  add column if not exists provider_status text,
  add column if not exists provider_status_digest text;

create unique index if not exists akiba_daraja_payout_transaction_unique
  on public.akiba_payout_attempts(provider_id, provider_transaction_id)
  where provider_transaction_id is not null;

create unique index if not exists akiba_daraja_status_query_originator_unique
  on public.akiba_payout_attempts(provider_id, status_query_originator_id)
  where status_query_originator_id is not null;

create or replace function public.akiba_record_daraja_status_query_submission(
  p_payout_attempt_id uuid,
  p_originator_conversation_id text,
  p_conversation_id text,
  p_response_code text,
  p_response_digest text
) returns boolean
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  attempt_row public.akiba_payout_attempts%rowtype;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Service role is required';
  end if;
  if p_originator_conversation_id is null or p_originator_conversation_id = ''
     or p_response_digest is null or p_response_digest !~ '^[a-f0-9]{64}
    raise exception 'A valid status-query response is required';
  end if;

  select * into attempt_row from public.akiba_payout_attempts
  where id = p_payout_attempt_id for update;
  if not found or attempt_row.status not in ('processing','unknown') then
    return false;
  end if;
  if attempt_row.provider_transaction_id is null or attempt_row.provider_receipt_number is null then
    return false;
  end if;
  if attempt_row.status_query_originator_id is not null then
    return attempt_row.status_query_originator_id = p_originator_conversation_id;
  end if;

  update public.akiba_payout_attempts
  set status_query_originator_id = p_originator_conversation_id,
      status_query_conversation_id = nullif(p_conversation_id, ''),
      status_query_submitted_at = clock_timestamp(),
      reconciliation_note = 'Independent Daraja transaction-status inquiry submitted; awaiting its authenticated result callback.',
      updated_at = clock_timestamp()
  where id = attempt_row.id;
  return true;
end;
$fn$;

create or replace function public.akiba_record_daraja_sandbox_b2c_callback(
  p_event_kind text,
  p_originator_conversation_id text,
  p_conversation_id text,
  p_transaction_id text,
  p_result_code text,
  p_result_description text,
  p_amount_minor bigint,
  p_receipt text,
  p_transaction_status text,
  p_response_digest text
) returns boolean
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  provider_row public.akiba_payment_providers%rowtype;
  attempt_row public.akiba_payout_attempts%rowtype;
  request_row public.akiba_withdrawal_requests%rowtype;
  event_ref text;
  event_id uuid;
  status_value text := lower(coalesce(p_transaction_status, ''));
  transaction_row_id uuid;
  reservation_count integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Service role is required';
  end if;
  if p_event_kind not in ('payout_result','payout_timeout','status_result','status_timeout')
     or nullif(btrim(p_originator_conversation_id), '') is null
     or p_response_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid Daraja B2C callback evidence';
  end if;

  select * into provider_row from public.akiba_payment_providers
  where provider_code = 'safaricom_daraja' and is_enabled = true;
  if not found or provider_row.capabilities ->> 'environment' <> 'sandbox' then
    raise exception 'Daraja sandbox provider is not enabled';
  end if;

  if p_event_kind in ('payout_result','payout_timeout') then
    select * into attempt_row from public.akiba_payout_attempts
    where provider_id = provider_row.id
      and provider_payout_ref = p_originator_conversation_id
    for update;
  else
    select * into attempt_row from public.akiba_payout_attempts
    where provider_id = provider_row.id
      and status_query_originator_id = p_originator_conversation_id
    for update;
  end if;
  if not found then
    raise exception 'Daraja callback does not match a known payout or status inquiry';
  end if;

  select * into request_row from public.akiba_withdrawal_requests
  where id = attempt_row.withdrawal_request_id for update;
  if not found or request_row.provider_id <> provider_row.id
     or request_row.currency_code <> 'KES'
     or request_row.fee_schedule_version <> 'sandbox-daraja-synthetic-zero-fee-v1'
     or request_row.destination_snapshot ->> 'quote_type' <> 'synthetic_sandbox_zero_fee'
     or request_row.destination_snapshot ->> 'fee_source' <> 'akiba_sandbox_fixture_not_safaricom' then
    raise exception 'Callback does not match an eligible Daraja sandbox withdrawal';
  end if;

  if p_event_kind in ('payout_result','payout_timeout')
     and attempt_row.provider_conversation_id is not null
     and p_conversation_id is distinct from attempt_row.provider_conversation_id then
    raise exception 'B2C payout conversation reference mismatch';
  end if;
  if p_event_kind in ('status_result','status_timeout')
     and attempt_row.status_query_conversation_id is not null
     and p_conversation_id is distinct from attempt_row.status_query_conversation_id then
    raise exception 'B2C status-query conversation reference mismatch';
  end if;

  event_ref := 'daraja-b2c:' || p_event_kind || ':' || p_originator_conversation_id;
  insert into public.akiba_provider_events(
    provider_id, provider_event_ref, event_type, source_reference, payload_digest,
    provider_result_code, amount_minor, currency_code, provider_receipt_number,
    callback_authenticated_at, callback_auth_method, retryable, attempt_count,
    next_retry_at, processing_status, processing_note
  ) values (
    provider_row.id, event_ref, 'mpesa_b2c_' || p_event_kind,
    nullif(p_conversation_id,''), p_response_digest,
    nullif(p_result_code,''), p_amount_minor,
    case when p_amount_minor is not null then 'KES' else null end,
    nullif(p_receipt,''), clock_timestamp(), 'shared_url_token',
    false, 0, clock_timestamp(), 'received', null
  ) on conflict (provider_id, provider_event_ref) do nothing
  returning id into event_id;

  if event_id is null then
    select id into event_id from public.akiba_provider_events
    where provider_id = provider_row.id and provider_event_ref = event_ref
      and payload_digest = p_response_digest;
    if event_id is null then
      raise exception 'A conflicting duplicate Daraja callback was received; manual review required';
    end if;
    return true;
  end if;

  if p_event_kind = 'payout_timeout' then
    update public.akiba_payout_attempts
    set status = 'unknown', reconciliation_status = 'pending',
        reconciliation_note = 'Daraja B2C queue timeout callback received; outcome remains unknown and reservation is retained.',
        updated_at = clock_timestamp()
    where id = attempt_row.id and status in ('submitted','processing','unknown');
    update public.akiba_withdrawal_requests
    set status = 'reconciliation_required',
        resolution_note = 'Daraja B2C queue timeout received; awaiting independent provider verification.',
        updated_at = clock_timestamp()
    where id = request_row.id and status in ('payout_submitted','payout_processing','reconciliation_required');
    return true;
  elsif p_event_kind = 'payout_result' then
    if p_result_code = '0'
       and p_transaction_id ~ '^[A-Z0-9]{8,20}$'
       and p_receipt ~ '^[A-Z0-9]{10}$'
       and p_amount_minor = request_row.recipient_amount_minor then
      update public.akiba_payout_attempts
      set provider_transaction_id = p_transaction_id,
          provider_receipt_number = p_receipt,
          response_code = p_result_code,
          response_summary = left(coalesce(p_result_description,'Daraja B2C result callback received.'),500),
          response_digest = p_response_digest,
          reconciliation_status = 'pending',
          reconciliation_note = 'Authenticated B2C result received; independent transaction-status inquiry required.',
          updated_at = clock_timestamp()
      where id = attempt_row.id and status in ('submitted','processing','unknown');
      update public.akiba_provider_events set processing_status='processed', processed_at=clock_timestamp()
      where id=event_id;
    else
      update public.akiba_payout_attempts
      set status='unknown', reconciliation_status='unmatched',
          reconciliation_note='B2C result callback was incomplete, unsuccessful, or did not match the approved amount. Reservation retained for manual review.',
          updated_at=clock_timestamp()
      where id=attempt_row.id and status in ('submitted','processing','unknown');
      update public.akiba_withdrawal_requests
      set status='reconciliation_required',
          resolution_note='B2C callback evidence did not satisfy payout matching requirements.',
          updated_at=clock_timestamp()
      where id=request_row.id and status in ('payout_submitted','payout_processing','reconciliation_required');
      update public.akiba_provider_events set processing_status='failed',
        processing_note='Callback did not contain matching success evidence; no funds released.'
      where id=event_id;
    end if;
    return true;
  elsif p_event_kind = 'status_timeout' then
    update public.akiba_payout_attempts
    set status='unknown', reconciliation_status='pending',
        reconciliation_note='Daraja transaction-status inquiry timed out; reservation retained.',
        updated_at=clock_timestamp()
    where id=attempt_row.id and status in ('processing','unknown');
    update public.akiba_withdrawal_requests
    set status='reconciliation_required',
        resolution_note='Daraja status inquiry timed out; manual or later independent verification required.',
        updated_at=clock_timestamp()
    where id=request_row.id and status in ('payout_processing','reconciliation_required');
    return true;
  end if;

  -- A status-query result is the independent second evidence source. Only
  -- explicit Completed/Failed outcomes with matching transaction identity
  -- are actionable. All other provider statuses remain unresolved.
  if p_result_code is distinct from '0'
     or p_transaction_id is distinct from attempt_row.provider_transaction_id then
    update public.akiba_payout_attempts
    set status='unknown', reconciliation_status='unmatched',
        reconciliation_note='Status-query callback did not match the original provider transaction.',
        provider_status_digest=p_response_digest, updated_at=clock_timestamp()
    where id=attempt_row.id;
    update public.akiba_withdrawal_requests
    set status='reconciliation_required',
        resolution_note='Independent Daraja status evidence did not match the payout transaction.',
        updated_at=clock_timestamp()
    where id=request_row.id;
    update public.akiba_provider_events set processing_status='failed',
      processing_note='Status-query evidence mismatch; no reservation or ledger mutation performed.'
    where id=event_id;
    return true;
  end if;

  if status_value = 'completed' then
    if p_amount_minor <> request_row.recipient_amount_minor
       or p_receipt is distinct from attempt_row.provider_receipt_number
       or p_receipt !~ '^[A-Z0-9]{10}$' then
      update public.akiba_payout_attempts
      set status='unknown', reconciliation_status='unmatched',
          reconciliation_note='Independent status callback amount or receipt did not match the original B2C result.',
          provider_status_digest=p_response_digest, updated_at=clock_timestamp()
      where id=attempt_row.id;
      update public.akiba_withdrawal_requests
      set status='reconciliation_required',
          resolution_note='Independent Daraja status evidence amount or receipt mismatch.',
          updated_at=clock_timestamp()
      where id=request_row.id;
      update public.akiba_provider_events set processing_status='failed',
        processing_note='Amount/receipt mismatch; reservation retained.'
      where id=event_id;
      return true;
    end if;

    select count(*) into reservation_count from public.akiba_financial_reservations
    where withdrawal_request_id=request_row.id and group_id=request_row.group_id
      and currency_code='KES' and amount_minor=request_row.total_debit_minor and status='active';
    if reservation_count <> 1 then
      raise exception 'Verified payout requires exactly one matching active reservation';
    end if;
    perform 1 from public.akiba_financial_reservations
    where withdrawal_request_id=request_row.id and group_id=request_row.group_id
      and currency_code='KES' and amount_minor=request_row.total_debit_minor and status='active'
    for update;

    insert into public.akiba_financial_transactions(
      group_id,currency_code,transaction_type,reference,description,effective_at,created_by,metadata
    ) values (
      request_row.group_id,'KES','withdrawal',
      'daraja-b2c:' || p_transaction_id,
      'Verified Safaricom Daraja sandbox group withdrawal',
      clock_timestamp(),request_row.initiator_id,
      jsonb_build_object('provider_code','safaricom_daraja',
        'provider_transaction_id',p_transaction_id,
        'provider_receipt_number',p_receipt,
        'payout_attempt_id',attempt_row.id,
        'withdrawal_request_id',request_row.id,
        'verification','authenticated_b2c_result_plus_status_query',
        'quote_type','synthetic_sandbox_zero_fee')
    ) returning id into transaction_row_id;

    insert into public.akiba_financial_ledger_entries(
      transaction_id,group_id,currency_code,line_number,account_code,direction,amount_minor
    ) values
      (transaction_row_id,request_row.group_id,'KES',1,'group_funds','debit',request_row.total_debit_minor),
      (transaction_row_id,request_row.group_id,'KES',2,'provider_clearing','credit',request_row.recipient_amount_minor);

    update public.akiba_financial_reservations
    set status='consumed',resolved_at=clock_timestamp()
    where withdrawal_request_id=request_row.id and status='active';

    update public.akiba_payout_attempts
    set status='succeeded',confirmed_at=clock_timestamp(),
        reconciliation_status='resolved',provider_status='Completed',
        provider_status_digest=p_response_digest,
        reconciliation_note='Safaricom B2C result and independent transaction-status callback matched.',
        updated_at=clock_timestamp()
    where id=attempt_row.id;

    update public.akiba_withdrawal_requests
    set status='completed',financial_transaction_id=transaction_row_id,
        completed_at=clock_timestamp(),resolved_at=clock_timestamp(),
        resolution_note='Payout confirmed by authenticated B2C result and independent transaction-status inquiry.',
        updated_at=clock_timestamp()
    where id=request_row.id;

    insert into public.akiba_finance_activity_events(
      group_id,actor_id,event_type,source_type,source_id,event_payload
    ) values (
      request_row.group_id,request_row.initiator_id,'withdrawal_completed',
      'withdrawal_request',request_row.id,
      jsonb_build_object('financial_transaction_id',transaction_row_id,
        'payout_attempt_id',attempt_row.id,'currency_code','KES',
        'amount_minor',request_row.total_debit_minor,
        'provider_receipt_number',p_receipt,'provider_code','safaricom_daraja')
    ) on conflict (group_id,event_type,source_type,source_id) do nothing;
  elsif status_value = 'failed' then
    update public.akiba_payout_attempts
    set status='failed',confirmed_at=clock_timestamp(),
        reconciliation_status='resolved',provider_status='Failed',
        provider_status_digest=p_response_digest,
        reconciliation_note='Independent Safaricom transaction-status callback confirmed failure.',
        updated_at=clock_timestamp()
    where id=attempt_row.id;

    update public.akiba_financial_reservations
    set status='released',resolved_at=clock_timestamp()
    where withdrawal_request_id=request_row.id and status='active';

    update public.akiba_withdrawal_requests
    set status='failed',resolved_at=clock_timestamp(),
        resolution_note='Safaricom independently confirmed that the B2C transaction failed.',
        updated_at=clock_timestamp()
    where id=request_row.id;

    insert into public.akiba_finance_activity_events(
      group_id,actor_id,event_type,source_type,source_id,event_payload
    ) values (
      request_row.group_id,request_row.initiator_id,'withdrawal_failed',
      'withdrawal_request',request_row.id,
      jsonb_build_object('payout_attempt_id',attempt_row.id,
        'currency_code','KES','amount_minor',request_row.total_debit_minor,
        'provider_code','safaricom_daraja')
    ) on conflict (group_id,event_type,source_type,source_id) do nothing;
  else
    update public.akiba_payout_attempts
    set provider_status=left(p_transaction_status,100),
        provider_status_digest=p_response_digest,
        reconciliation_note='Safaricom status is not final; reservation remains active.',
        updated_at=clock_timestamp()
    where id=attempt_row.id;
  end if;

  update public.akiba_provider_events set processing_status='processed',
    processed_at=clock_timestamp(),
    processing_note='Independent status callback recorded.'
  where id=event_id;
  return true;
end;
$fn$;

revoke all on function public.akiba_record_daraja_status_query_submission(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.akiba_record_daraja_status_query_submission(uuid,text,text,text,text) to service_role;
revoke all on function public.akiba_record_daraja_sandbox_b2c_callback(text,text,text,text,text,text,bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.akiba_record_daraja_sandbox_b2c_callback(text,text,text,text,text,text,bigint,text,text,text) to service_role;

comment on function public.akiba_record_daraja_sandbox_b2c_callback(text,text,text,text,text,text,bigint,text,text,text) is
  'Stores authenticated Daraja B2C callbacks and only settles a sandbox withdrawal after matching original result evidence with an independent transaction-status callback.';

commit;
 then
    raise exception 'A valid status-query response is required';
  end if;

  select * into attempt_row from public.akiba_payout_attempts
  where id = p_payout_attempt_id for update;
  if not found or attempt_row.status not in ('processing','unknown') then
    return false;
  end if;
  if attempt_row.provider_transaction_id is null or attempt_row.provider_receipt_number is null then
    return false;
  end if;
  if attempt_row.status_query_originator_id is not null then
    return attempt_row.status_query_originator_id = p_originator_conversation_id;
  end if;

  update public.akiba_payout_attempts
  set status_query_originator_id = p_originator_conversation_id,
      status_query_conversation_id = nullif(p_conversation_id, ''),
      status_query_submitted_at = clock_timestamp(),
      reconciliation_note = 'Independent Daraja transaction-status inquiry submitted; awaiting its authenticated result callback.',
      updated_at = clock_timestamp()
  where id = attempt_row.id;
  return true;
end;
$fn$;

create or replace function public.akiba_record_daraja_sandbox_b2c_callback(
  p_event_kind text,
  p_originator_conversation_id text,
  p_conversation_id text,
  p_transaction_id text,
  p_result_code text,
  p_result_description text,
  p_amount_minor bigint,
  p_receipt text,
  p_transaction_status text,
  p_response_digest text
) returns boolean
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  provider_row public.akiba_payment_providers%rowtype;
  attempt_row public.akiba_payout_attempts%rowtype;
  request_row public.akiba_withdrawal_requests%rowtype;
  event_ref text;
  event_id uuid;
  status_value text := lower(coalesce(p_transaction_status, ''));
  transaction_row_id uuid;
  reservation_count integer;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'Service role is required';
  end if;
  if p_event_kind not in ('payout_result','payout_timeout','status_result','status_timeout')
     or nullif(btrim(p_originator_conversation_id), '') is null
     or p_response_digest !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid Daraja B2C callback evidence';
  end if;

  select * into provider_row from public.akiba_payment_providers
  where provider_code = 'safaricom_daraja' and is_enabled = true;
  if not found or provider_row.capabilities ->> 'environment' <> 'sandbox' then
    raise exception 'Daraja sandbox provider is not enabled';
  end if;

  if p_event_kind in ('payout_result','payout_timeout') then
    select * into attempt_row from public.akiba_payout_attempts
    where provider_id = provider_row.id
      and provider_payout_ref = p_originator_conversation_id
    for update;
  else
    select * into attempt_row from public.akiba_payout_attempts
    where provider_id = provider_row.id
      and status_query_originator_id = p_originator_conversation_id
    for update;
  end if;
  if not found then
    raise exception 'Daraja callback does not match a known payout or status inquiry';
  end if;

  select * into request_row from public.akiba_withdrawal_requests
  where id = attempt_row.withdrawal_request_id for update;
  if not found or request_row.provider_id <> provider_row.id
     or request_row.currency_code <> 'KES'
     or request_row.fee_schedule_version <> 'sandbox-daraja-synthetic-zero-fee-v1'
     or request_row.destination_snapshot ->> 'quote_type' <> 'synthetic_sandbox_zero_fee'
     or request_row.destination_snapshot ->> 'fee_source' <> 'akiba_sandbox_fixture_not_safaricom' then
    raise exception 'Callback does not match an eligible Daraja sandbox withdrawal';
  end if;

  if p_event_kind in ('payout_result','payout_timeout')
     and attempt_row.provider_conversation_id is not null
     and p_conversation_id is distinct from attempt_row.provider_conversation_id then
    raise exception 'B2C payout conversation reference mismatch';
  end if;
  if p_event_kind in ('status_result','status_timeout')
     and attempt_row.status_query_conversation_id is not null
     and p_conversation_id is distinct from attempt_row.status_query_conversation_id then
    raise exception 'B2C status-query conversation reference mismatch';
  end if;

  event_ref := 'daraja-b2c:' || p_event_kind || ':' || p_originator_conversation_id;
  insert into public.akiba_provider_events(
    provider_id, provider_event_ref, event_type, source_reference, payload_digest,
    provider_result_code, amount_minor, currency_code, provider_receipt_number,
    callback_authenticated_at, callback_auth_method, retryable, attempt_count,
    next_retry_at, processing_status, processing_note
  ) values (
    provider_row.id, event_ref, 'mpesa_b2c_' || p_event_kind,
    nullif(p_conversation_id,''), p_response_digest,
    nullif(p_result_code,''), p_amount_minor,
    case when p_amount_minor is not null then 'KES' else null end,
    nullif(p_receipt,''), clock_timestamp(), 'shared_url_token',
    false, 0, clock_timestamp(), 'received', null
  ) on conflict (provider_id, provider_event_ref) do nothing
  returning id into event_id;

  if event_id is null then
    select id into event_id from public.akiba_provider_events
    where provider_id = provider_row.id and provider_event_ref = event_ref
      and payload_digest = p_response_digest;
    if event_id is null then
      raise exception 'A conflicting duplicate Daraja callback was received; manual review required';
    end if;
    return true;
  end if;

  if p_event_kind = 'payout_timeout' then
    update public.akiba_payout_attempts
    set status = 'unknown', reconciliation_status = 'pending',
        reconciliation_note = 'Daraja B2C queue timeout callback received; outcome remains unknown and reservation is retained.',
        updated_at = clock_timestamp()
    where id = attempt_row.id and status in ('submitted','processing','unknown');
    update public.akiba_withdrawal_requests
    set status = 'reconciliation_required',
        resolution_note = 'Daraja B2C queue timeout received; awaiting independent provider verification.',
        updated_at = clock_timestamp()
    where id = request_row.id and status in ('payout_submitted','payout_processing','reconciliation_required');
    return true;
  elsif p_event_kind = 'payout_result' then
    if p_result_code = '0'
       and p_transaction_id ~ '^[A-Z0-9]{8,20}$'
       and p_receipt ~ '^[A-Z0-9]{10}$'
       and p_amount_minor = request_row.recipient_amount_minor then
      update public.akiba_payout_attempts
      set provider_transaction_id = p_transaction_id,
          provider_receipt_number = p_receipt,
          response_code = p_result_code,
          response_summary = left(coalesce(p_result_description,'Daraja B2C result callback received.'),500),
          response_digest = p_response_digest,
          reconciliation_status = 'pending',
          reconciliation_note = 'Authenticated B2C result received; independent transaction-status inquiry required.',
          updated_at = clock_timestamp()
      where id = attempt_row.id and status in ('submitted','processing','unknown');
      update public.akiba_provider_events set processing_status='processed', processed_at=clock_timestamp()
      where id=event_id;
    else
      update public.akiba_payout_attempts
      set status='unknown', reconciliation_status='unmatched',
          reconciliation_note='B2C result callback was incomplete, unsuccessful, or did not match the approved amount. Reservation retained for manual review.',
          updated_at=clock_timestamp()
      where id=attempt_row.id and status in ('submitted','processing','unknown');
      update public.akiba_withdrawal_requests
      set status='reconciliation_required',
          resolution_note='B2C callback evidence did not satisfy payout matching requirements.',
          updated_at=clock_timestamp()
      where id=request_row.id and status in ('payout_submitted','payout_processing','reconciliation_required');
      update public.akiba_provider_events set processing_status='failed',
        processing_note='Callback did not contain matching success evidence; no funds released.'
      where id=event_id;
    end if;
    return true;
  elsif p_event_kind = 'status_timeout' then
    update public.akiba_payout_attempts
    set status='unknown', reconciliation_status='pending',
        reconciliation_note='Daraja transaction-status inquiry timed out; reservation retained.',
        updated_at=clock_timestamp()
    where id=attempt_row.id and status in ('processing','unknown');
    update public.akiba_withdrawal_requests
    set status='reconciliation_required',
        resolution_note='Daraja status inquiry timed out; manual or later independent verification required.',
        updated_at=clock_timestamp()
    where id=request_row.id and status in ('payout_processing','reconciliation_required');
    return true;
  end if;

  -- A status-query result is the independent second evidence source. Only
  -- explicit Completed/Failed outcomes with matching transaction identity
  -- are actionable. All other provider statuses remain unresolved.
  if p_result_code <> '0'
     or p_transaction_id is distinct from attempt_row.provider_transaction_id then
    update public.akiba_payout_attempts
    set status='unknown', reconciliation_status='unmatched',
        reconciliation_note='Status-query callback did not match the original provider transaction.',
        provider_status_digest=p_response_digest, updated_at=clock_timestamp()
    where id=attempt_row.id;
    update public.akiba_withdrawal_requests
    set status='reconciliation_required',
        resolution_note='Independent Daraja status evidence did not match the payout transaction.',
        updated_at=clock_timestamp()
    where id=request_row.id;
    update public.akiba_provider_events set processing_status='failed',
      processing_note='Status-query evidence mismatch; no reservation or ledger mutation performed.'
    where id=event_id;
    return true;
  end if;

  if status_value = 'completed' then
    if p_amount_minor <> request_row.recipient_amount_minor
       or p_receipt is distinct from attempt_row.provider_receipt_number
       or p_receipt !~ '^[A-Z0-9]{10}$' then
      update public.akiba_payout_attempts
      set status='unknown', reconciliation_status='unmatched',
          reconciliation_note='Independent status callback amount or receipt did not match the original B2C result.',
          provider_status_digest=p_response_digest, updated_at=clock_timestamp()
      where id=attempt_row.id;
      update public.akiba_withdrawal_requests
      set status='reconciliation_required',
          resolution_note='Independent Daraja status evidence amount or receipt mismatch.',
          updated_at=clock_timestamp()
      where id=request_row.id;
      update public.akiba_provider_events set processing_status='failed',
        processing_note='Amount/receipt mismatch; reservation retained.'
      where id=event_id;
      return true;
    end if;

    select count(*) into reservation_count from public.akiba_financial_reservations
    where withdrawal_request_id=request_row.id and group_id=request_row.group_id
      and currency_code='KES' and amount_minor=request_row.total_debit_minor and status='active';
    if reservation_count <> 1 then
      raise exception 'Verified payout requires exactly one matching active reservation';
    end if;
    perform 1 from public.akiba_financial_reservations
    where withdrawal_request_id=request_row.id and group_id=request_row.group_id
      and currency_code='KES' and amount_minor=request_row.total_debit_minor and status='active'
    for update;

    insert into public.akiba_financial_transactions(
      group_id,currency_code,transaction_type,reference,description,effective_at,created_by,metadata
    ) values (
      request_row.group_id,'KES','withdrawal',
      'daraja-b2c:' || p_transaction_id,
      'Verified Safaricom Daraja sandbox group withdrawal',
      clock_timestamp(),request_row.initiator_id,
      jsonb_build_object('provider_code','safaricom_daraja',
        'provider_transaction_id',p_transaction_id,
        'provider_receipt_number',p_receipt,
        'payout_attempt_id',attempt_row.id,
        'withdrawal_request_id',request_row.id,
        'verification','authenticated_b2c_result_plus_status_query',
        'quote_type','synthetic_sandbox_zero_fee')
    ) returning id into transaction_row_id;

    insert into public.akiba_financial_ledger_entries(
      transaction_id,group_id,currency_code,line_number,account_code,direction,amount_minor
    ) values
      (transaction_row_id,request_row.group_id,'KES',1,'group_funds','debit',request_row.total_debit_minor),
      (transaction_row_id,request_row.group_id,'KES',2,'provider_clearing','credit',request_row.recipient_amount_minor);

    update public.akiba_financial_reservations
    set status='consumed',resolved_at=clock_timestamp()
    where withdrawal_request_id=request_row.id and status='active';

    update public.akiba_payout_attempts
    set status='succeeded',confirmed_at=clock_timestamp(),
        reconciliation_status='resolved',provider_status='Completed',
        provider_status_digest=p_response_digest,
        reconciliation_note='Safaricom B2C result and independent transaction-status callback matched.',
        updated_at=clock_timestamp()
    where id=attempt_row.id;

    update public.akiba_withdrawal_requests
    set status='completed',financial_transaction_id=transaction_row_id,
        completed_at=clock_timestamp(),resolved_at=clock_timestamp(),
        resolution_note='Payout confirmed by authenticated B2C result and independent transaction-status inquiry.',
        updated_at=clock_timestamp()
    where id=request_row.id;

    insert into public.akiba_finance_activity_events(
      group_id,actor_id,event_type,source_type,source_id,event_payload
    ) values (
      request_row.group_id,request_row.initiator_id,'withdrawal_completed',
      'withdrawal_request',request_row.id,
      jsonb_build_object('financial_transaction_id',transaction_row_id,
        'payout_attempt_id',attempt_row.id,'currency_code','KES',
        'amount_minor',request_row.total_debit_minor,
        'provider_receipt_number',p_receipt,'provider_code','safaricom_daraja')
    ) on conflict (group_id,event_type,source_type,source_id) do nothing;
  elsif status_value = 'failed' then
    update public.akiba_payout_attempts
    set status='failed',confirmed_at=clock_timestamp(),
        reconciliation_status='resolved',provider_status='Failed',
        provider_status_digest=p_response_digest,
        reconciliation_note='Independent Safaricom transaction-status callback confirmed failure.',
        updated_at=clock_timestamp()
    where id=attempt_row.id;

    update public.akiba_financial_reservations
    set status='released',resolved_at=clock_timestamp()
    where withdrawal_request_id=request_row.id and status='active';

    update public.akiba_withdrawal_requests
    set status='failed',resolved_at=clock_timestamp(),
        resolution_note='Safaricom independently confirmed that the B2C transaction failed.',
        updated_at=clock_timestamp()
    where id=request_row.id;

    insert into public.akiba_finance_activity_events(
      group_id,actor_id,event_type,source_type,source_id,event_payload
    ) values (
      request_row.group_id,request_row.initiator_id,'withdrawal_failed',
      'withdrawal_request',request_row.id,
      jsonb_build_object('payout_attempt_id',attempt_row.id,
        'currency_code','KES','amount_minor',request_row.total_debit_minor,
        'provider_code','safaricom_daraja')
    ) on conflict (group_id,event_type,source_type,source_id) do nothing;
  else
    update public.akiba_payout_attempts
    set provider_status=left(p_transaction_status,100),
        provider_status_digest=p_response_digest,
        reconciliation_note='Safaricom status is not final; reservation remains active.',
        updated_at=clock_timestamp()
    where id=attempt_row.id;
  end if;

  update public.akiba_provider_events set processing_status='processed',
    processed_at=clock_timestamp(),
    processing_note='Independent status callback recorded.'
  where id=event_id;
  return true;
end;
$fn$;

revoke all on function public.akiba_record_daraja_status_query_submission(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.akiba_record_daraja_status_query_submission(uuid,text,text,text,text) to service_role;
revoke all on function public.akiba_record_daraja_sandbox_b2c_callback(text,text,text,text,text,text,bigint,text,text,text) from public,anon,authenticated;
grant execute on function public.akiba_record_daraja_sandbox_b2c_callback(text,text,text,text,text,text,bigint,text,text,text) to service_role;

comment on function public.akiba_record_daraja_sandbox_b2c_callback(text,text,text,text,text,text,bigint,text,text,text) is
  'Stores authenticated Daraja B2C callbacks and only settles a sandbox withdrawal after matching original result evidence with an independent transaction-status callback.';

commit;
