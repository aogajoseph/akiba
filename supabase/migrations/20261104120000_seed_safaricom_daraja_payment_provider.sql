-- Register M-Pesa as Akiba's first payment provider.
-- The catalogue entry remains disabled until sandbox configuration and the
-- collection workflow have been reviewed and explicitly enabled.
begin;

insert into public.akiba_payment_providers (
  provider_code,
  display_name,
  is_enabled,
  capabilities
)
values (
  'safaricom_daraja',
  'M-Pesa',
  false,
  jsonb_build_object(
    'environment', 'sandbox',
    'collection', true,
    'payout', false,
    'status_inquiry', true,
    'callbacks', true,
    'refunds', false,
    'reversals', false,
    'fee_quotes', false,
    'split_settlement', false,
    'reconciliation_exports', false,
    'idempotency', true
  )
)
on conflict (provider_code) do nothing;

commit;
