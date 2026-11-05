# M-Pesa STK Push Contributions (Sandbox v1)

## Scope and safety

This implementation is sandbox-only. It does not enable the M-Pesa catalogue entry, support payouts, or initiate production payments. The provider catalogue remains disabled. Sandbox collection requires the explicit deployment flag MPESA_SANDBOX_COLLECTION_ENABLED=true.

Akiba does not collect or store M-Pesa PINs. The user authorizes the payment only in the M-Pesa prompt. Akiba is not a custodian or wallet; the regulated provider processes the payment.

## Server configuration

Set these server-only deployment variables:

- SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY
- MPESA_ENVIRONMENT=sandbox
- MPESA_CONSUMER_KEY
- MPESA_CONSUMER_SECRET
- MPESA_STK_SHORTCODE (or MPESA_BUSINESS_SHORT_CODE)
- MPESA_STK_PASSKEY (or MPESA_PASSKEY)
- MPESA_TRANSACTION_TYPE=CustomerPayBillOnline (or CustomerBuyGoodsOnline for a configured Till)
- MPESA_CALLBACK_TOKEN: generate a long random secret; never reuse a user password
- CRON_SECRET: a separate long random secret used only by the internal reconciliation worker
- MPESA_CALLBACK_URL: public HTTPS URL ending in /api/integrations/mpesa/callback?token=THE_SAME_RANDOM_SECRET
- MPESA_SANDBOX_COLLECTION_ENABLED=true only on the sandbox deployment intended for testing
- MPESA_SANDBOX_TEST_GROUP_ID: the UUID of the one KES Test group allowed to initiate sandbox contributions on that Preview deployment; the server rejects collection requests for every other group

Do not prefix any of these variables with NEXT_PUBLIC_. Configure the callback URL in the Daraja sandbox app. The callback endpoint uses the URL token as a shared-secret check because Daraja STK callbacks are not cryptographically signed. It validates the checkout reference against the stored attempt and, when present, requires an exact merchant-reference match. A complete success callback (result code 0, valid ten-character receipt, exact amount and KES currency) is posted immediately through the atomic ledger RPC. It does not call STK Query. The callback is acknowledged only after its facts are durably stored; incomplete or mismatched success callbacks are retained for manual review and never credit group funds.

## API

### Initiate a contribution

POST /api/contributions/mpesa

Authenticated Akiba session required.

Example body:

    {
      "groupId": "GROUP_UUID",
      "amountMinor": "10000",
      "phoneNumber": "0712345678",
      "idempotencyKey": "client-generated-stable-key"
    }

amountMinor is integer minor units (KES cents). M-Pesa accepts whole shillings only, so the value must be divisible by 100. For example, 10000 means KES 100. The request may also supply Idempotency-Key as a header.

The server verifies active membership, group currency, provider capability, and the idempotency terms. It creates the intent and attempt before calling Daraja. Reusing the same key never sends a second STK prompt. An uncertain network outcome is marked unknown; clients must check status and must not retry with a new key.

### Provider callback

POST /api/integrations/mpesa/callback?token=...

Public webhook route protected by the configured random callback token. The server correlates the CheckoutRequestID to a previously created attempt, validates the merchant reference when one was stored, and checks the callback's success result, ten-character receipt, exact amount and KES currency. Complete success callbacks post immediately; the flow does not depend on STK Query availability.

### Automatic callback reconciliation

The callback stores only minimal facts (provider result code, KES amount, receipt reference, and payload digest); it does not retain the raw callback body or phone number. Complete success callbacks call the same atomic, idempotent posting RPC used by recovery. If database posting is temporarily unavailable, the event remains in a durable retry queue with bounded exponential backoff. The protected worker at `GET /api/internal/payments/mpesa/reconcile` processes due events in small batches and requires `Authorization: Bearer $CRON_SECRET`. It prioritizes complete success callback evidence and posts it without calling STK Query. STK Query is reserved for missing callbacks and non-success/incomplete events where an independent provider status can help reconcile the outcome. Worker writes are conditional on the callback payload digest, and the digest is rechecked immediately before posting so stale workers cannot overwrite newer callback facts. Missing-callback discovery pages through stale attempts. Expired worker claims can be recovered; exhausted or conflicting events are flagged for manual review and never posted.

Configure a trusted scheduler to call this endpoint every 5 minutes and set `CRON_SECRET` only in the server environment. Do not expose it as a `NEXT_PUBLIC_` variable. Vercel Cron can invoke the endpoint, but Hobby plans allow only one run per day, which is too slow for payment reconciliation; use a Pro schedule or an external scheduler for a 5-minute cadence. Vercel Cron does not retry failed invocations, so the worker itself is idempotent and scans all due records on each run.

### Check contribution status

GET /api/contributions/{intentId}/status

Authenticated contributor only. Reads Akiba's durable payment state and does not call Daraja. It reports success only after the atomic ledger posting has completed. Failed and cancelled outcomes do not affect group funds.

## Ledger behavior

The migration adds provider reference fields and the server-only post_mpesa_contribution RPC. The RPC locks the attempt and intent, verifies amount/currency and provider reference, rejects reused receipt numbers, and atomically creates:

- One immutable financial transaction.
- A balanced journal: debit provider_clearing, credit group_funds.
- A successful payment attempt and contribution intent.
- One contribution_received finance activity outbox event.

A repeated success callback returns the already-posted transaction. The activity event uniqueness constraint prevents duplicate cards. Pending, failed, cancelled, expired, or unknown outcomes never post group funds.

## Sandbox test checklist

Use only Daraja sandbox credentials and sandbox test numbers. Do not use a real payment or production credentials.

1. Successful STK authorization: deliver a complete success callback while STK Query is unavailable or rate-limited; verify the contribution still posts exactly one transaction, two balanced journal lines, one activity event, and the correct group total.
2. User cancellation: provider returns cancellation (commonly result code 1032); verify no transaction and no group-funds credit.
3. Failed authorization: verify failed attempt/intent and no ledger movement.
4. Delayed callback: initiate, poll status, verify no optimistic balance increase; deliver callback later and verify one post.
5. Duplicate callback: replay the same callback; verify same transaction ID and no extra journal lines or activity events.
6. Duplicate initiation request: repeat the same idempotency key and same terms; verify no second STK prompt.
7. Idempotency conflict: reuse a key with different amount/group/provider; verify HTTP 409.
8. Unknown provider reference, mismatched amount, missing receipt, and provider-query outage: verify no unsafe ledger posting; complete callback facts must still post when STK Query is unavailable.

Repository CI validates unit tests, PostgreSQL ledger-posting regression tests (including concurrent duplicate RPC calls), lint, typecheck, and build. These database tests use a disposable CI database and do not verify the hosted Supabase runtime. Real sandbox end-to-end tests require the deployment variables, a publicly reachable HTTPS callback URL, and a Daraja sandbox test phone configured in the developer portal.


## Payment status and callback operations

The contributor-facing status endpoint reads the durable Akiba contribution intent and payment-attempt state only. It must not issue STK Query requests. Provider verification is owned by the scheduled reconciliation worker so that repeated browser polling cannot increase Daraja request volume or interfere with callback processing.

The finance panel polls the local status endpoint with exponential backoff while a contribution is pending. It stops polling after a terminal state and refreshes the group finance view after a confirmed contribution.

For sandbox Preview deployments, the Daraja callback URL must target a publicly reachable Preview alias. Vercel deployment protection is overridden only for that callback alias; the callback route still requires the branch-scoped `MPESA_CALLBACK_TOKEN`. Keep the callback token and URL scoped to the dedicated Preview branch, and never add them to Production.

The Supabase Preview reconciliation scheduler must target a deployment that contains missing-callback discovery. A successful scheduler HTTP response is not enough: monitor `discoveredMissingCallbacks`, `scanned`, `processed`, `deferred`, and `manualReview` to verify actual reconciliation work.
