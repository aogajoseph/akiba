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
