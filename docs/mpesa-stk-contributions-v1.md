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
- MPESA_BUSINESS_SHORT_CODE
- MPESA_PASSKEY
- MPESA_TRANSACTION_TYPE=CustomerPayBillOnline (or CustomerBuyGoodsOnline for a configured Till)
- MPESA_CALLBACK_TOKEN: generate a long random secret; never reuse a user password
- MPESA_CALLBACK_URL: public HTTPS URL ending in /api/integrations/mpesa/callback?token=THE_SAME_RANDOM_SECRET
- MPESA_SANDBOX_COLLECTION_ENABLED=true only on the sandbox deployment intended for testing

Do not prefix any of these variables with NEXT_PUBLIC_. Configure the callback URL in the Daraja sandbox app. The callback endpoint uses the URL token as an additional shared-secret check because Daraja STK callbacks are not cryptographically signed. It independently queries Daraja before accepting a callback as evidence of a payment outcome.

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

Public webhook route protected by the configured random callback token. The callback is treated as an untrusted notification. The server correlates the CheckoutRequestID to a previously created attempt and calls the Daraja STK Query API. Only a matching successful provider query plus callback receipt and amount details can post a contribution.

### Check contribution status

GET /api/contributions/{intentId}/status

Authenticated contributor only. Queries Daraja for a final result. A successful status query without receipt metadata does not post the ledger; the route waits for the callback receipt details. Failed and cancelled final outcomes are recorded without affecting group funds.

## Ledger behavior

The migration adds provider reference fields and the server-only post_mpesa_contribution RPC. The RPC locks the attempt and intent, verifies amount/currency and provider reference, rejects reused receipt numbers, and atomically creates:

- One immutable financial transaction.
- A balanced journal: debit provider_clearing, credit group_funds.
- A successful payment attempt and contribution intent.
- One contribution_received finance activity outbox event.

A repeated success callback returns the already-posted transaction. The activity event uniqueness constraint prevents duplicate cards. Pending, failed, cancelled, expired, or unknown outcomes never post group funds.

## Sandbox test checklist

Use only Daraja sandbox credentials and sandbox test numbers. Do not use a real payment or production credentials.

1. Successful STK authorization: callback + STK Query confirm success; verify exactly one transaction, two balanced journal lines, one activity event.
2. User cancellation: provider returns cancellation (commonly result code 1032); verify no transaction and no group-funds credit.
3. Failed authorization: verify failed attempt/intent and no ledger movement.
4. Delayed callback: initiate, poll status, verify no optimistic balance increase; deliver callback later and verify one post.
5. Duplicate callback: replay the same callback; verify same transaction ID and no extra journal lines or activity events.
6. Duplicate initiation request: repeat the same idempotency key and same terms; verify no second STK prompt.
7. Idempotency conflict: reuse a key with different amount/group/provider; verify HTTP 409.
8. Unknown provider reference, mismatched amount, missing receipt, and failed status query: verify no ledger posting and reconciliation-needed state.

Repository CI validates lint, typecheck, and build. Real sandbox end-to-end tests require the deployment variables, a publicly reachable HTTPS callback URL, and a Daraja sandbox test phone configured in the developer portal.
