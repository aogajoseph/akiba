# Akiba Finance Implementation Specification (v1)

**Status:** Phase 1 implementation-level specification  
**Branch:** feat/group-finance-foundation  
**Scope:** State transitions, authorization, database invariants, ledger posting, provider evidence, staging, flags, payouts, activity and notifications.  
**Authority:** Implements docs/finance-architecture-v1.md. Does not authorize production migrations, live payment activation, merge, or deployment.

## 1. Non-negotiable rules

1. Akiba coordinates group money; it is not a bank and must not hold group funds. Payment partners hold and move money under their own supported product and contractual arrangements.
2. The group ledger is an internal accounting record, not evidence that a partner is holding or has settled cash.
3. Contributions are available to every active group member only while the group has exactly one active Creator and at least three active Admins, distinct from the Creator.
4. Only the active Group Creator can request a withdrawal.
5. Every Admin in the immutable request-time approval snapshot must approve. One rejection terminates the request. The Creator cannot approve as an Admin.
6. Admin demotion is blocked while a withdrawal is unresolved.
7. Final approval starts a fixed two-hour staging period. Flags never restart or extend it.
8. One active member flag at the original deadline blocks payout. The request is cancelled, its reservation is released, and all still-active flags are automatically closed with a system reason. Flag history is retained.
9. Only the member who created a flag can remove it. Only active members can create or remove their own flags.
10. One unresolved withdrawal per group, enforced by the database.
11. Every financial action and state transition emits a durable, deduplicated activity event and notifies all active group members.
12. Workflow events (approval, rejection, flag, unflag, staging) are not ledger postings.
13. A contribution is posted only when authenticated callback evidence AND independent authenticated Safaricom verification agree on the same successful transaction, provider references, amount, currency and receipt facts. Neither source alone is enough.
14. An ambiguous provider outcome remains reserved/unresolved until reconciled. A timeout is not proof of failure.
15. Sandbox end-to-end verification is required before live provider activation.

## 2. State transition matrix

### 2.1 Contribution intent

| Current state | Event / guard | Next state | Money / ledger effect |
|---|---|---|---|
| created | Intent validated; leadership ready; active member; provider enabled for sandbox | awaiting_provider | No posting |
| created | Validation, membership or leadership gate fails | No intent, or failed if durably created | No posting |
| awaiting_provider | Provider accepts STK request | awaiting_provider | No posting; persist provider attempt reference |
| awaiting_provider | Authenticated callback received, query not yet verified | verification_pending | No posting |
| awaiting_provider | Query confirms success, callback missing | verification_pending | No posting; await callback |
| verification_pending | Callback and independent provider query both confirm same success facts | succeeded | One atomic double-entry posting |
| awaiting_provider / verification_pending | Both sources establish same terminal failure/cancellation | failed / cancelled | No posting |
| Any non-terminal | Provider unavailable, pending or rate-limited | Same pending state | No posting; retry with backoff |
| Any non-terminal | Evidence conflicts, is unauthenticated or cannot be reconciled | manual_review | No posting |
| manual_review | Authoritative evidence resolves success and both evidence requirements are met | succeeded | One atomic posting |
| manual_review | Authoritative evidence establishes no payment | failed / cancelled / expired | No posting |

Terminal contribution states: succeeded, failed, cancelled, expired. A late callback may enrich a recovery record, but may not overwrite a provider-confirmed terminal fact. A successful intent must have exactly one linked financial transaction; every other state must have none.

### 2.2 Withdrawal request

| Current state | Event / guard | Next state | Reservation effect |
|---|---|---|---|
| None | Creator submits valid request; leadership ready; no unresolved request; sufficient available balance; supported quote/capability | pending_approval | Create one active reservation atomically |
| pending_approval | Required Admin approves, others remain | pending_approval | Remains active |
| pending_approval | Final required Admin approves exact terms | staging | Remains active; set immutable staging_started_at and staging_deadline_at = staging_started_at + 2 hours |
| pending_approval | Any required Admin rejects | rejected | Release atomically |
| pending_approval | Creator cancels | cancelled | Release atomically |
| staging | Member adds/removes own flag before deadline | staging | Remains active; deadline unchanged |
| staging | Deadline worker locks request; one or more active flags exist | cancelled_flagged | Release atomically; close all remaining active flags |
| staging | Deadline worker locks request; no active flags exist | payout_queued | Remains active |
| payout_queued | Payout attempt is durably created and submitted idempotently | payout_submitted / payout_processing | Remains active |
| Submitted / processing | Provider confirms completed payout | completed | Consume reservation and post withdrawal once |
| Submitted / processing | Provider definitively confirms terminal failure and no payout occurred | failed | Release reservation; no completed-withdrawal posting |
| Submitted / processing | Timeout, missing callback, contradictory or uncertain result | reconciliation_required | Keep reservation active |
| reconciliation_required | Reconciliation proves completion | completed | Consume reservation and post once |
| reconciliation_required | Reconciliation proves no payout occurred | failed | Release reservation |
| payout_queued | Provider capability or settlement checks fail before submission | reconciliation_required or dedicated pre-submission hold | Keep reservation; do not silently release |

Terminal withdrawal states: rejected, cancelled, cancelled_flagged, completed, and failed only after a confirmed no-payout outcome. reconciliation_required is unresolved and retains the lock and reservation. The group lock must not be released while an external payout could still complete.

### 2.3 Flag lifecycle

A flag has its own lifecycle independent of the withdrawal:

- active — created by an active member during staging.
- removed_by_member — the same member removes their own flag before the staging deadline.
- closed_by_system — staging deadline reached with at least one active flag; withdrawal cancelled and all still-active flags closed automatically.

Flag records are never deleted. Store created_by, created_at, removed_at, closed_at, closure_actor, and closure_reason (or equivalent immutable event history). A flag is unique per withdrawal/member while active; historical flags remain available. A member cannot remove another member's flag. A Creator or Admin has no override.

### 2.4 Approval lifecycle

Approvals are append-only decisions scoped to withdrawal_request_id + approval_version + approver_id. Each required Admin has exactly one decision per version. An approval is valid only if the stored terms fingerprint equals the request's immutable terms fingerprint. A material terms change does not mutate the approved request: cancel/release it and create a new request/version with a fresh approval snapshot. Do not recycle old approval rows.

## 3. Transaction boundaries and concurrency

Every transition below must be one database transaction/RPC or an equivalently atomic server-side unit. Do not implement a sequence of independent client/API writes that can partially commit.

### 3.1 Create contribution intent

1. Authenticate the user; derive actor identity from the verified session, never request-body user IDs.
2. Lock/read group and active membership/leadership facts consistently.
3. Verify group is active, actor is an active member, and exactly one active Creator plus at least three active Admins exist.
4. Verify provider is enabled for the current environment and supports collection for this currency/group arrangement.
5. Validate amount, currency, phone/destination format, idempotency key, fees and quote.
6. Insert intent with unique (group_id, contributor_id, idempotency_key).
7. Insert one payment attempt before calling provider. Use one attempt per intent unless a safe, explicitly modelled retry policy is introduced.
8. Call provider only after durable intent/attempt exists. If outcome is uncertain, keep attempt recoverable; do not create another attempt or prompt blindly.

A concurrent role change must not allow contribution to bypass the leadership gate. Use a consistent lock/serialization strategy for membership readiness and intent creation.

### 3.2 Post contribution

The posting RPC must not accept callback facts as sufficient proof. It must require durable references to both evidence records and independently validate them while holding row locks.

Required atomic sequence:

1. Lock contribution intent, payment attempt, callback event, and provider-verification record.
2. Confirm callback authentication was validated by callback ingress and persisted with payload digest, event reference, provider result, receipt, amount, currency, and request references.
3. Confirm an independent server-to-server Safaricom query was made using the stored attempt reference; persist query time, provider response reference, authenticated/validated response evidence, result code, amount/currency/receipt facts when supplied, and response digest/reference.
4. Require both sources to identify the same attempt and agree on successful terminal result and all available transaction facts. Missing facts, mismatch, timeout or pending result means no posting.
5. Confirm provider identity, CheckoutRequestID, MerchantRequestID where supplied, receipt, amount and currency match immutable attempt/intent.
6. Reject a receipt already linked to another attempt.
7. Insert one financial transaction and balanced ledger lines; mark attempt and intent succeeded; link evidence and transaction; insert one activity event/outbox event.
8. Commit once. A retry returns the existing transaction only if the exact same evidence remains linked. Conflicting facts cause manual review, never a second posting.

The RPC itself must enforce dual evidence; route-handler discipline alone is insufficient. Keep it in a non-exposed/private schema if possible, use a fixed safe search path, revoke execute from PUBLIC/anon/authenticated, and grant only the trusted server role. Do not allow browser clients to post contributions.

### 3.3 Create withdrawal and reservation

1. Authenticate Creator and verify active Creator membership.
2. Lock the group row and group-scoped financial lock row (or use an equivalent serialization point).
3. Verify leadership readiness and no unresolved withdrawal.
4. Snapshot all active Admin IDs (excluding Creator), role/membership identifiers, and terms fingerprint.
5. Calculate total group deduction = recipient amount + provider fee + Akiba fee. Store integer minor units only.
6. Derive posted group balance from ledger lines; subtract active reservations and other explicit encumbrances. Separately verify partner-side settlement/funds where supported. Never infer partner cash from ledger balance.
7. Validate provider supports this exact payout destination, currency, amount and settlement model. Collection capability does not imply payout capability.
8. Insert request, immutable approval snapshot, reservation, and activity event in one transaction.
9. A unique/partial database index is the final defence against concurrent requests. A uniqueness conflict returns a clear conflict, not a second reservation.

### 3.4 Approve/reject

- Lock request before recording a decision.
- Require pending_approval, current active Admin role, and membership in the request-time approval snapshot.
- Reject Creator self-approval.
- Verify immutable terms fingerprint and approval version.
- Insert decision idempotently.
- A rejection atomically sets rejected, releases reservation, resolves request and emits activity/notification events.
- An approval checks whether every snapshot Admin has approved. Only the transaction recording the final approval may set staging and write the two-hour deadline.
- Block Admin demotion while any unresolved request exists. Enforce server-side/database-side.

### 3.5 Stage deadline worker

- Run server-side on a schedule; never rely on an open browser or client clock.
- Claim due staging rows with row-level locking (e.g. FOR UPDATE SKIP LOCKED) or safe compare-and-set.
- Recheck state is staging and stored deadline is due.
- Lock/evaluate flags in the same transaction as withdrawal and reservation.
- If any active flag remains: set cancelled_flagged, release reservation, close all active flags with system reason, emit all events.
- Otherwise set payout_queued; do not submit until provider capability and settlement checks pass.
- Worker retries are idempotent. The original deadline is immutable and never restarted.

### 3.6 Payout submission and reconciliation

- Persist payout attempt and stable provider idempotency/request reference before sending.
- Never generate a new payout reference to retry an ambiguous request. Query/reconcile original provider instruction.
- A unique partial index must permit only one live payout attempt per withdrawal request across queued/submitted/processing/unknown.
- A payout submission transport error after request transmission is unknown, not failed.
- Consume reservation and post withdrawal only after authoritative provider completion evidence.
- Release reservation only after authoritative evidence establishes no payout occurred, or before submission in a locally cancelled workflow.
- Collection sandbox does not prove payout sandbox capability. End-to-end sandbox must test payout, callbacks/query, idempotency, reconciliation and settlement records before live use.

## 4. Database invariants

These are database-level invariants, not UI conventions.

| Invariant | Required enforcement |
|---|---|
| One active Creator per group | Partial unique index on active Creator membership per group |
| Creator is not counted as Admin | Readiness function counts active Admin rows only |
| Minimum three active Admins | Server-side gate inside contribution initiation and withdrawal actions |
| Only active members contribute | Authenticated server/RPC check against active membership |
| Only Creator requests withdrawal | Server/RPC authorization against active Creator membership |
| Every snapshotted Admin approves | Immutable approval snapshot + exact set comparison under request lock |
| Creator cannot approve | Constraint/RPC guard excluding Creator/initiator |
| Admin demotion blocked during unresolved withdrawal | Membership role-change guard checks all unresolved states |
| One unresolved withdrawal per group | Partial unique index covering every unresolved state, not only legacy statuses |
| Reservation unique per withdrawal | Unique withdrawal_request_id; validate group and currency |
| Reservation amount positive | CHECK; active iff resolved_at IS NULL |
| Available balance cannot be overspent | Atomic lock/serialization, balance check and reservation insert in one transaction |
| One live payout attempt per request | Partial unique index across queued/submitted/processing/unknown |
| One contribution attempt per intent | Unique index; idempotent creation |
| One provider receipt per provider | Unique partial index for non-null receipt |
| Callback and provider verification both required | Private posting RPC validates durable evidence records and matching facts |
| One ledger posting per contribution | Unique source reference and unique intent transaction link |
| One ledger posting per completed withdrawal | Unique source reference and unique withdrawal-to-transaction link |
| Double-entry balanced | Posting RPC validates debit total equals credit total per transaction/currency |
| Ledger immutable | Revoke direct UPDATE/DELETE; corrections use compensating transactions |
| Flags retained | No delete; append-only lifecycle/history |
| One active flag per member/withdrawal | Partial unique index on withdrawal_request_id + member_id where active |
| Activity event deduplication | Unique group/event/source key or deterministic event key |
| Notifications deduplicated | Unique event_id + recipient_id + channel in durable outbox |
| Every active member notified | Snapshot active recipients at event commit; durable retries |
| Exact money arithmetic | BIGINT minor units; no floating point |
| Currency consistency | Composite FKs/checks bind request, reservation, transaction and ledger group/currency |
| Provider custody distinct | Provider settlement records separate from group accounting and Akiba revenue |

### 4.1 Balance equations

For each group and currency:

- posted_group_funds_minor = SUM(credit group_funds) - SUM(debit group_funds)
- active_reservations_minor = SUM(reservation.amount_minor WHERE status = active)
- available_group_accounting_minor = posted_group_funds_minor - active_reservations_minor - other_explicit_encumbrances_minor

This is internal accounting availability only. Compare separately with partner-reported settled/available funds before submitting a payout.

For each financial transaction:
- SUM(debit amount_minor) = SUM(credit amount_minor)
- All lines have the same group and currency as the parent transaction.
- Amounts are positive integer minor units; direction carries debit/credit meaning.

## 5. Existing schema mapping

Live tables observed during Phase 1:

- akiba_group_memberships: group/user/role/status; role values include Creator, Admin and member. Source for active membership and leadership readiness.
- akiba_contribution_intents: contribution amount, currency, member, provider, idempotency key, status and linked financial transaction.
- akiba_payment_attempts: provider attempt references, amount/currency, receipt, provider result and attempt status.
- akiba_provider_events: durable callback/recovery event, digest, callback result/receipt/amount/currency and retry metadata.
- akiba_financial_transactions and akiba_financial_ledger_entries: double-entry accounting.
- akiba_financial_reservations: one reservation per withdrawal request, active/consumed/released.
- akiba_withdrawal_requests: request terms, initiator, fees, destination snapshot, status and financial transaction link.
- akiba_withdrawal_approvals: Admin decisions, approval version and terms fingerprint.
- akiba_payout_attempts: payout provider request/reference, status and reconciliation status.
- akiba_finance_activity_events: deduplicated group activity/outbox events with published_at.

The live schema already has useful uniqueness foundations: one payment attempt per contribution, unique provider receipt, one reservation per withdrawal, one live payout attempt per withdrawal, and deduplicated finance activity events.

## 6. Live-schema gaps found

These are observed mismatches and implementation blockers, not permission to modify production:

1. Withdrawal states are legacy/incomplete. The live request status check currently accepts pending_approval, approved, processing, completed, rejected, cancelled, failed_pending_reconciliation, and failed. It does not represent staging, cancelled_flagged, payout_queued, payout_submitted, or reconciliation_required as the canonical request state machine.
2. Unresolved-withdrawal index is incomplete. Its predicate covers only pending_approval, approved, processing, and failed_pending_reconciliation. It must cover every canonical unresolved state.
3. No withdrawal flag table was found. A durable flag table with member ownership, active/removed/system-closed lifecycle and history is required.
4. No separate durable provider-verification evidence table was found. Current provider event rows store callback evidence, but independent Safaricom query facts are not durably represented as a second evidence record.
5. Existing posting RPC does not enforce dual evidence. The live post_mpesa_contribution RPC accepts checkout reference, receipt, amount, currency and result code; it checks these against attempt/intent and posts a balanced transaction, but does not require or verify an independent Safaricom query record.
6. Callback route posts before independent query. The current branch's callback handler directly invokes the posting RPC after callback-only validation. The reconciliation worker also has a callback-only fast path before querying Safaricom. Both violate the approved rule and must be removed before any contribution posting path can be accepted.
7. Evidence helper is misleading. hasPostableContributionEvidence currently delegates to callback-only validation. Its name implies dual evidence but does not enforce it.
8. Callback authentication is a shared URL token. The current route checks MPESA_CALLBACK_TOKEN in the query string. Treat this as bearer-secret authentication, not a provider-signed payload. Protect it from logs/leaks, compare safely, rotate it, and still require independent provider verification. Do not describe it as a cryptographic Safaricom signature.
9. Notification delivery needs recipient-level guarantees. Finance activity events already have a deduplicated event key and unpublished-event index, but the full durable recipient/channel outbox and retry/deduplication contract must be verified/implemented so every active member receives every financial event.
10. Withdrawal approval snapshot needs explicit storage. Approval rows record decisions and fingerprints, but the exact immutable set of required Admin IDs at request creation must be persisted and enforced, not inferred from current membership later.
11. Payout support is not established by collection support. Provider configuration must be checked for payout capability independently; no live payout should be activated until sandbox payout and reconciliation are end-to-end proven.

## 7. Required future schema work

The implementation branch should plan, review and test (without applying to production until separately approved):

- Canonical request states and transition guard/RPC.
- Immutable withdrawal approval-roster snapshot.
- Staging start/deadline timestamps, immutable after final approval.
- Withdrawal flag table with active flag uniqueness and append-only history.
- Durable provider verification evidence separate from callback event evidence.
- Revised unresolved-withdrawal partial unique index.
- Guard preventing Admin demotion while unresolved request exists.
- Posting RPC requiring callback evidence ID plus provider verification evidence ID; retire obsolete signature and ensure only trusted server role can execute.
- Payout attempt state mapping and provider evidence fields that preserve unknown/ambiguous outcomes.
- Reservation lifecycle guards and atomic consumption/release RPC.
- Durable event-recipient notification outbox with unique recipient/event/channel key, retries and delivery state.
- Constraints/foreign keys ensuring group and currency consistency across request, reservation, transaction and ledger lines.
- Tests for every transition, concurrency race, retry, duplicate callback, duplicate provider query, flag/deadline race, demotion race, and ambiguous payout outcome.

Do not create or apply migrations until schema design is reviewed against this specification and the complete current branch migration history. Do not make live database changes as part of Phase 1.

## 8. Required test matrix before merge

### Contributions
- Active member can initiate only when leadership readiness is satisfied.
- Creator plus fewer than three active Admins blocks contribution initiation.
- Three Admins plus Creator permits contribution initiation by an ordinary active member.
- Inactive/non-member cannot initiate.
- Same idempotency key cannot create a second intent, STK prompt or ledger posting.
- Callback success alone never posts.
- Provider query success alone never posts.
- Callback + provider query success with matching references/amount/currency/receipt posts once.
- Mismatched amount, currency, receipt, CheckoutRequestID or MerchantRequestID never posts.
- Provider query outage after callback stores evidence and retries without posting.
- Late callback enriches existing recovery event and still requires independent query.
- Duplicate callback/query/worker execution returns same result without duplicate ledger entries.
- Callback/query disagreement moves to manual review.
- RPC called without both evidence records is rejected.

### Withdrawals
- Non-Creator cannot request; Creator can request only when leadership is ready.
- Every active Admin in immutable snapshot must approve; Creator cannot approve.
- One rejection cancels and releases reservation.
- Admin demotion fails while any unresolved withdrawal exists.
- Concurrent requests cannot create two unresolved withdrawals or overspend.
- Final approval starts exactly one two-hour deadline.
- Flag does not extend deadline; unflag does not extend deadline.
- Only active members can flag/unflag; member can unflag only own flag.
- One active flag at deadline cancels, releases reservation and closes all remaining flags.
- No active flags at deadline queues payout once.
- Worker retry and delayed worker use original deadline and do not duplicate effects.
- Timeout after payout submission retains reservation and enters reconciliation.
- Confirmed payout completion consumes reservation and posts once.
- Confirmed no-payout failure releases reservation and does not post a completed withdrawal.
- No second payout instruction is created while original outcome is unknown.

### Accounting and notifications
- Every financial transaction balances per currency.
- Workflow events never create ledger postings.
- Available balance subtracts active reservations.
- Provider settlement discrepancy blocks payout pending reconciliation.
- Every financial action/state transition creates one activity event.
- Every active member at event time receives one durable notification per configured channel.
- Notification retries do not duplicate notifications.
- Activity/notification failures do not roll back committed money movement; outbox retry repairs delivery.

## 9. Phase 1 review outcome

**Architecture specification:** defined.  
**Live schema comparison:** performed.  
**Implementation blockers:** identified, including the callback-only posting defect.  
**Production migration / live provider / merge / deployment:** not authorized and not performed.

The next implementation work must first correct the dual-evidence contribution path and database posting boundary, then build withdrawal staging/flags and complete the end-to-end sandbox workflow. The branch must pass the full transition, concurrency, RLS/privilege, and provider reconciliation test matrix before any merge is proposed.
