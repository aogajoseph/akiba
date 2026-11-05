\set ON_ERROR_STOP on
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','payer@example.test'),
 ('10000000-0000-4000-8000-000000000002','payer2@example.test')
on conflict do nothing;

insert into public.akiba_groups(id,name,purpose,currency_code,created_by)
values ('20000000-0000-4000-8000-000000000001','CI M-Pesa group','goal','KES',
        '10000000-0000-4000-8000-000000000001');

insert into public.akiba_contribution_intents
 (id,group_id,contributor_id,provider_id,currency_code,amount_minor,status,idempotency_key)
select '30000000-0000-4000-8000-000000000001',
       '20000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001', p.id, 'KES', 500, 'processing',
       'ci-idempotency-key-0001'
from public.akiba_payment_providers p where p.provider_code='safaricom_daraja';

insert into public.akiba_payment_attempts
 (id,contribution_intent_id,provider_id,provider_attempt_ref,status,amount_minor,currency_code,request_reference)
select '40000000-0000-4000-8000-000000000001',
       '30000000-0000-4000-8000-000000000001',p.id,'ws_CO_CI_0001','pending',500,'KES','ci-request-0001'
from public.akiba_payment_providers p where p.provider_code='safaricom_daraja';

-- A second, independent attempt is used to prove that a receipt cannot be reused.
insert into public.akiba_contribution_intents
 (id,group_id,contributor_id,provider_id,currency_code,amount_minor,status,idempotency_key)
select '30000000-0000-4000-8000-000000000002',
       '20000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000002', p.id, 'KES', 700, 'processing',
       'ci-idempotency-key-0002'
from public.akiba_payment_providers p where p.provider_code='safaricom_daraja';

insert into public.akiba_payment_attempts
 (id,contribution_intent_id,provider_id,provider_attempt_ref,status,amount_minor,currency_code,request_reference)
select '40000000-0000-4000-8000-000000000002',
       '30000000-0000-4000-8000-000000000002',p.id,'ws_CO_CI_0002','pending',700,'KES','ci-request-0002'
from public.akiba_payment_providers p where p.provider_code='safaricom_daraja';

-- Failed/pending evidence must never post funds.
insert into public.akiba_contribution_intents
 (id,group_id,contributor_id,provider_id,currency_code,amount_minor,status,idempotency_key)
select '30000000-0000-4000-8000-000000000003',
       '20000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001', p.id, 'KES', 900, 'processing',
       'ci-idempotency-key-0003'
from public.akiba_payment_providers p where p.provider_code='safaricom_daraja';

insert into public.akiba_payment_attempts
 (id,contribution_intent_id,provider_id,provider_attempt_ref,status,amount_minor,currency_code,request_reference)
select '40000000-0000-4000-8000-000000000003',
       '30000000-0000-4000-8000-000000000003',p.id,'ws_CO_CI_0003','pending',900,'KES','ci-request-0003'
from public.akiba_payment_providers p where p.provider_code='safaricom_daraja';

-- The shell runner invokes the exact same valid RPC twice concurrently.
-- This block verifies rejected evidence and receipt uniqueness.
do $$
begin
  begin
    perform public.post_mpesa_contribution('ws_CO_CI_0002','CI-RECEIPT-0001',700,'KES','0');
    raise exception 'receipt reuse unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'receipt reuse unexpectedly succeeded' then raise; end if;
    if sqlerrm not like '%already linked%' then raise; end if;
  end;

  begin
    perform public.post_mpesa_contribution('ws_CO_CI_0002','CI-RECEIPT-WRONG-AMOUNT',600,'KES','0');
    raise exception 'wrong amount unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'wrong amount unexpectedly succeeded' then raise; end if;
    if sqlerrm not like '%amount or currency%' then raise; end if;
  end;

  begin
    perform public.post_mpesa_contribution('ws_CO_CI_0002','CI-RECEIPT-WRONG-CURRENCY',700,'USD','0');
    raise exception 'wrong currency unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'wrong currency unexpectedly succeeded' then raise; end if;
    if sqlerrm not like '%amount or currency%' then raise; end if;
  end;

  begin
    perform public.post_mpesa_contribution('ws_CO_CI_0002','CI-RECEIPT-FAILED',700,'KES','1032');
    raise exception 'non-success result unexpectedly succeeded';
  exception when others then
    if sqlerrm = 'non-success result unexpectedly succeeded' then raise; end if;
    if sqlerrm not like '%confirmed M-Pesa success%' then raise; end if;
  end;
end;
$$;

do $$
declare
  posted_count bigint;
  ledger_count bigint;
  group_funds bigint;
  attempt_status text;
  intent_status text;
begin
  select count(*) into posted_count
  from public.akiba_financial_transactions
  where reference = 'mpesa:ws_CO_CI_0001';
  if posted_count <> 1 then
    raise exception 'Expected exactly one transaction after concurrent replay; got %', posted_count;
  end if;

  select count(*) into ledger_count
  from public.akiba_financial_ledger_entries e
  join public.akiba_financial_transactions t on t.id=e.transaction_id
  where t.reference = 'mpesa:ws_CO_CI_0001';
  if ledger_count <> 2 then
    raise exception 'Expected exactly two balanced ledger entries; got %', ledger_count;
  end if;

  select coalesce(sum(case when direction='credit' then amount_minor else -amount_minor end),0)
    into group_funds
  from public.akiba_financial_ledger_entries
  where group_id='20000000-0000-4000-8000-000000000001'
    and account_code='group_funds';
  if group_funds <> 500 then
    raise exception 'Expected group funds 500 after one valid payment; got %', group_funds;
  end if;

  select status into attempt_status from public.akiba_payment_attempts
  where id='40000000-0000-4000-8000-000000000002';
  select status into intent_status from public.akiba_contribution_intents
  where id='30000000-0000-4000-8000-000000000002';
  if attempt_status <> 'pending' or intent_status <> 'processing' then
    raise exception 'Rejected evidence changed the second attempt or intent state';
  end if;

  if exists (
    select 1 from public.akiba_financial_transactions
    where reference like 'mpesa:ws_CO_CI_0002%'
  ) then
    raise exception 'Rejected evidence unexpectedly created a financial transaction';
  end if;
end;
$$;

select 'M-Pesa PostgreSQL regression checks passed' as result;
