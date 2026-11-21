\set ON_ERROR_STOP on
begin;

do $daraja_provider$
declare
  provider_row public.akiba_payment_providers%rowtype;
  request_fn text;
  withdrawal_guard text;
  payout_guard text;
begin
  select * into provider_row
  from public.akiba_payment_providers
  where provider_code = 'safaricom_daraja';

  if not found then
    raise exception 'Safaricom Daraja sandbox provider is not registered';
  end if;
  if provider_row.is_enabled is distinct from true
     or provider_row.capabilities ->> 'environment' is distinct from 'sandbox'
     or provider_row.capabilities ->> 'payout' is distinct from 'true'
     or provider_row.capabilities ->> 'fee_quotes' is distinct from 'false'
     or provider_row.capabilities ->> 'synthetic_sandbox_quotes' is distinct from 'true'
     or provider_row.capabilities ->> 'payout_submission_enabled' is distinct from 'false' then
    raise exception 'Daraja must be registered for sandbox payouts with synthetic quotes and execution disabled';
  end if;


  if to_regprocedure('public.akiba_claim_daraja_sandbox_payouts(integer)') is null
     or to_regprocedure('public.akiba_record_daraja_sandbox_payout_submission(uuid,boolean,text,text,text,text,text)') is null then
    raise exception 'Durable Daraja sandbox payout worker RPCs are missing';
  end if;

  if has_function_privilege('authenticated',
       'public.akiba_claim_daraja_sandbox_payouts(integer)', 'EXECUTE')
     or not has_function_privilege('service_role',
       'public.akiba_claim_daraja_sandbox_payouts(integer)', 'EXECUTE')
     or has_function_privilege('authenticated',
       'public.akiba_record_daraja_sandbox_payout_submission(uuid,boolean,text,text,text,text,text)', 'EXECUTE') then
    raise exception 'Payout worker RPCs are not restricted to service_role';
  end if;

  if position('skip locked' in lower(pg_get_functiondef(
       'public.akiba_claim_daraja_sandbox_payouts(integer)'::regprocedure))) = 0
     or position('automatic resubmission is prohibited' in lower(pg_get_functiondef(
       'public.akiba_record_daraja_sandbox_payout_submission(uuid,boolean,text,text,text,text,text)'::regprocedure))) = 0 then
    raise exception 'Payout claim or uncertain-outcome safeguards are missing';
  end if;

  if provider_row.capabilities ->> 'payout_submission_enabled' <> 'false' then
    raise exception 'Sandbox payout execution must remain disabled until explicit credential and environment verification';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='akiba_payout_attempts'
      and column_name='provider_transaction_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='akiba_payout_attempts'
      and column_name='status_query_originator_id'
  ) then
    raise exception 'Daraja payout callback and independent status evidence columns are missing';
  end if;

  if to_regprocedure('public.akiba_record_daraja_status_query_submission(uuid,text,text,text,text)') is null
     or to_regprocedure('public.akiba_record_daraja_sandbox_b2c_callback(text,text,text,text,text,text,bigint,text,text,text)') is null then
    raise exception 'Daraja B2C callback/reconciliation RPCs are missing';
  end if;

  if has_function_privilege('authenticated',
       'public.akiba_record_daraja_sandbox_b2c_callback(text,text,text,text,text,text,bigint,text,text,text)', 'EXECUTE')
     or not has_function_privilege('service_role',
       'public.akiba_record_daraja_sandbox_b2c_callback(text,text,text,text,text,text,bigint,text,text,text)', 'EXECUTE') then
    raise exception 'Daraja B2C callback RPC is not restricted to service_role';
  end if;

  if position('authenticated_b2c_result_plus_status_query' in lower(pg_get_functiondef(
       'public.akiba_record_daraja_sandbox_b2c_callback(text,text,text,text,text,text,bigint,text,text,text)'::regprocedure))) = 0
     or position('reservation remains active' in lower(pg_get_functiondef(
       'public.akiba_record_daraja_sandbox_b2c_callback(text,text,text,text,text,text,bigint,text,text,text)'::regprocedure))) = 0 then
    raise exception 'Independent verification or reservation-retention safeguards are missing';
  end if;

  select pg_get_functiondef(
    'public.akiba_create_sandbox_withdrawal_request(uuid,bigint,text,text,text,text)'::regprocedure
  ) into request_fn;
  if position('safaricom_daraja' in request_fn) = 0
     or position('SYNTH-DARAJA-' in request_fn) = 0
     or position('synthetic_sandbox_zero_fee' in request_fn) = 0
     or position('akiba_sandbox_fixture_not_safaricom' in request_fn) = 0 then
    raise exception 'New sandbox withdrawal requests are not connected to the explicitly synthetic Daraja quote';
  end if;

  select pg_get_functiondef('akiba_private.guard_withdrawal_provider_capability()'::regprocedure)
    into withdrawal_guard;
  if position('synthetic_sandbox_quotes' in withdrawal_guard) = 0
     or position('is distinct from' in withdrawal_guard) = 0 then
    raise exception 'Withdrawal provider guard does not enforce the synthetic Daraja quote';
  end if;

  select pg_get_functiondef('akiba_private.guard_payout_attempt_insert()'::regprocedure)
    into payout_guard;
  if position('payout_submission_enabled' in payout_guard) = 0 then
    raise exception 'Payout attempt guard does not require the later execution opt-in';
  end if;
end;
$daraja_provider$;

rollback;
