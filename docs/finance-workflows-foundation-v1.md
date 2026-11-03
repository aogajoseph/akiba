# Finance workflow foundation (v1)

This migration adds provider-independent workflow persistence on top of the immutable group journal.

## Tables

- Provider catalogue and group provider-account references (no credentials or PINs).
- Contribution intents and provider payment attempts.
- Withdrawal requests with fee/recipient/destination snapshots.
- Immutable withdrawal approval decisions tied to a terms fingerprint and approval version.
- Group-level reservations, payout attempts, provider callback idempotency records.
- A finance activity outbox for durable system-card and notification publication.

## Database-enforced invariants

- Workflow currency must match the group's configured currency.
- Only an active group admin can initiate a withdrawal.
- A withdrawal requires at least two active sub-admins at creation time.
- One unresolved withdrawal per group is enforced by a partial unique index.
- Request creation locks the group row, checks posted group-funds ledger balance less active reservations, and creates the full-deduction reservation in the same transaction.
- Only a currently active sub-admin other than the initiator can approve/reject.
- Approval decisions are bound to the current request version and a digest of material terms.
- Any rejection terminates the request. Two distinct approvals move it to approved; this is authorization, not payout completion.
- A payout attempt cannot be created until two distinct approvals exist for the current request version and must use the approved provider.
- A failed payout remains unresolved in failed_pending_reconciliation; it continues to block a new withdrawal until reconciliation resolves it.
- Client roles have read-only access to group-scoped workflow records. Provider configuration, provider attempts, payout attempts, and raw provider event records remain server-only.

## Withdrawal approval RPC (v1)

The follow-up migration `20261104100000_finance_withdrawal_server_workflows_v1.sql` adds the authenticated `akiba_decide_withdrawal_request` RPC. It derives the actor from `auth.uid()`, locks the request, rechecks current active sub-admin membership and initiator exclusion, calculates the approval terms fingerprint inside PostgreSQL, and inserts the immutable decision. Existing database triggers perform the approval/rejection state transition and activity event creation.

A rejection now releases the associated active reservation in the same transaction. The RPC cannot create withdrawal requests, quote fees, initiate payouts, post ledger entries, or call a provider. Request creation remains withheld until trusted provider fee quoting and destination handling are implemented; accepting client-supplied fee quotes would be unsafe.

## Deliberate boundaries

This is a schema and database-invariant foundation, not a live payment integration. It does not:
- connect a provider or initiate a real collection/payout;
- store provider PINs, credentials, or raw payout secrets;
- claim that a pending payment is money received;
- mark a payout completed from a frontend response;
- implement the complete authenticated webhook processor, reconciliation worker, or notification publisher;
- apply this migration to production.

The trusted server layer still needs to own withdrawal request creation after trusted fee quoting, provider request signing, callback authentication, replay handling, reconciliation, ledger posting, reservation consumption on confirmed completion, and event publication. In particular, a provider-confirmed contribution/payout must be correlated and posted exactly once before its workflow is considered financially complete.

## Verification status

The initial workflow schema migration is applied in production. The approval RPC follow-up is on a feature branch and has not yet been applied to production or verified against an isolated PostgreSQL/Supabase preview database. Do not treat the approval RPC as production-ready until the preview migration check passes.
