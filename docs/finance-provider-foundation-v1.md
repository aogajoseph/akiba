# Finance provider foundation (v1)

## Scope

This foundation introduces the first provider catalogue entry and a provider-independent application boundary. It does not initiate payments, receive callbacks, post ledger entries, or enable live payment movement.

## First provider: M-Pesa

- Provider code: `safaricom_daraja`
- Display name: `M-Pesa`
- Initial environment: Daraja sandbox
- Collection capability: declared
- Payout capability: disabled
- Catalogue row: seeded with `is_enabled = false`

The catalogue entry remains disabled until the sandbox credentials are configured, the collection workflow is implemented and tested, and an explicit enablement decision is made. Capability metadata describes the provider integration surface; it does not itself authorize a payment flow.

## Application boundary

- `lib/payments/types.ts` contains provider, money and contribution domain types.
- `lib/payments/provider-interface.ts` defines the adapter contract.
- `lib/payments/registry.ts` is the central, code-owned provider registry. Clients cannot register arbitrary providers.
- `lib/payments/providers/safaricom-daraja` owns Daraja configuration and OAuth behavior.
- `lib/payments/orchestration/create-contribution.ts` defines the provider-independent contribution-intent use case and its repository port.

Contribution-intent creation requires an active group member, a matching group currency, an enabled collection-capable provider, positive integer minor units, and an idempotency key. Repository implementations must enforce the unique idempotency constraint atomically. Reusing a key with different contribution terms is rejected.

## Configuration

Server-only variables:

- `MPESA_ENVIRONMENT=sandbox`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`

Never prefix provider credentials with `NEXT_PUBLIC_`. The existing Preview-only connection route continues to require an authenticated Akiba user and sandbox mode. OAuth tokens are discarded after the connection check and are not returned or logged.

## Next milestone

Implement STK Push initiation, callback authentication/correlation, provider status verification, transactional ledger posting and reconciliation. Do not mark a contribution successful from a client response or an unverified callback.
