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
