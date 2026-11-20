# Akiba Finance Architecture (v1)

**Status:** Governing finance architecture — Phase 3 sandbox implementation  
**Applies to:** Group contributions, withdrawals, payment orchestration, group financial activity, and Akiba revenue separation  
**Implementation rule:** This document defines product and engineering invariants. It does not authorize production migrations, live payment activation, merging, or deployment. Permanent provider/custody decision: [ADR-001](adr/ADR-001-globe-technology-provider-and-non-custodial-payments.md).

## 1. Purpose and governing principles

Akiba is a money-coordination platform for groups. It coordinates member contributions, group financial decisions, payment-provider instructions, transparent activity records, and reconciliation. Akiba is not a bank, does not take custody of group funds, and must not represent an internal ledger balance as proof that money is held or available at a payment partner.

The architecture follows these principles:

1. **Provider custody and movement:** Payment partners hold and move funds under their own applicable permissions, contracts, and operating arrangements. Akiba coordinates supported instructions and records evidence and outcomes.
2. **Separate financial domains:** Group accounting, partner-held funds/settlement, and Akiba/Globe revenue are distinct.
3. **Server-authoritative transitions:** Authorization, eligibility, balances, reservations, state transitions, idempotency, and posting are enforced server-side and transactionally. The client is never authoritative.
4. **Evidence before posting:** A contribution is credited only after both a valid authenticated provider callback and an independent provider status verification confirm the same successful transaction.
5. **Append-only accounting:** Posted ledger entries are immutable. Corrections use compensating entries, never edits or deletion.
6. **Workflow is not money movement:** Requests, approvals, rejections, flags, notifications, and other workflow events are auditable activity but are not ledger postings unless an actual monetary movement occurs.
7. **Reconciliation is mandatory:** Ambiguous provider outcomes remain unresolved and reserved until evidence establishes the outcome.

## 2. Financial domains and non-custodial boundary

Akiba separates three domains:

### 2.1 Group accounting

Akiba maintains each group's internal accounting record: confirmed contributions, reservations, completed withdrawals, reversals/adjustments, and the group's financial history. This is an accounting and coordination record, not a custodial account or proof of partner-side cash availability.

### 2.2 Partner-held funds and settlement

A supported payment partner receives, holds, safeguards where applicable, settles, and pays out funds under the partner's own product, permissions, and contract. Partner capabilities must be verified individually; do not assume that an integration supports segregated group balances, pooled collection, named beneficiary payouts, refunds, reversals, or group-level custody.

Akiba must maintain provider-side references and reconciliation evidence sufficient to map partner activity to group intents and payout requests. Provider settlement reports and balances must be reconciled with Akiba's internal records. Any discrepancy is an exception requiring investigation, not an invitation to manufacture a ledger adjustment.

### 2.3 Akiba/Globe revenue

Akiba/Globe revenue is a separate business domain and account. It may include subscriptions, transaction fees if later approved, partner commissions, marketplace commissions, institutional services, and other channels. Revenue is never group money and must never be posted to a group's ledger.

### 2.4 Legal and operational qualification

The non-custodial design is an architectural and commercial objective, not a legal conclusion or guarantee of regulatory exemption. Kenyan legal and regulatory review must assess the actual funds flow, partner contracts, payment initiation/orchestration, customer disclosures, safeguarding responsibilities, complaints, consumer protection, data protection, and revenue model before live operation.

## 3. Group leadership and authority

### 3.1 Leadership readiness gate

A group is financially enabled only when it has:
- exactly one active Group Creator; and
- at least three active Group Admins, distinct from the Creator.

The Creator is not counted as one of the three Admins. The readiness condition must be checked on the server for every contribution initiation and every withdrawal workflow action where applicable. UI visibility is not enforcement.

If leadership readiness is not satisfied, new contributions and new withdrawal requests are blocked. Existing financial records remain accessible and reconciliation/settlement obligations continue; a leadership change must not erase or strand existing obligations.

### 3.2 Contributions

Every active group member may contribute once the group satisfies the leadership readiness gate. Contribution eligibility is not limited to leadership roles.

### 3.3 Withdrawal authority

- Only the active Group Creator may create and submit a withdrawal request.
- Every active Group Admin captured in the request's approval snapshot must approve the exact request before it can enter staging.
- The Creator does not approve in place of an Admin.
- Any one required Admin may reject. A rejection terminates the approval workflow and releases the reservation according to the transactional cancellation rules.
- Admin demotion is blocked while the group has an unresolved withdrawal.
- The required Admin roster is snapshotted when a withdrawal request is committed. Admins promoted after that point do not silently become additional approvers for that request. Admin demotion is blocked while it is unresolved, preserving the approval set.
- Authorization is rechecked server-side at the time of every action. Historical approvals and rejections remain auditable even if a member's role later changes after the workflow is resolved.

## 4. Contribution lifecycle and posting evidence

### 4.1 Initiation

1. An eligible active member selects Contribute.
2. Akiba presents currently enabled providers. M-Pesa is the initial provider; the interface and adapter boundary must allow future providers without changing group accounting semantics.
3. The member enters a valid phone/payment destination where required and an amount in the group's currency.
4. Akiba obtains or calculates the provider quote where supported and discloses the contribution amount, provider charges, total payable, currency, and authorization flow before the member confirms.
5. Akiba creates a durable contribution intent and idempotent provider attempt before issuing the provider collection request.
6. Provider authorization (including PIN entry) occurs only in the provider's approved authorization experience. Akiba must never collect or store a provider PIN.

### 4.2 Contribution state machine

Canonical intent lifecycle:

- `created` — validated intent persisted; no provider attempt submitted.
- `awaiting_provider` — provider request accepted for processing; awaiting outcome.
- `verification_pending` — callback or provider evidence has arrived, but the two required evidence sources are not yet in agreement.
- `succeeded` — authenticated callback and independent provider verification agree on successful payment and matching transaction facts; ledger posting has committed exactly once.
- `failed` — provider-confirmed terminal failure; no group ledger credit.
- `cancelled` — cancelled before provider acceptance/authorization where the provider flow supports cancellation.
- `expired` — provider-confirmed or safely established expiry; no group ledger credit.
- `manual_review` — evidence conflicts, cannot be authenticated, or remains ambiguous beyond the automated retry policy. No ledger credit until resolved with authoritative evidence.

Allowed transitions are monotonic except that a late authenticated callback may enrich a previously incomplete recovery record. It must not overwrite a terminal, provider-confirmed fact with contradictory data. Manual review is resolved only by an auditable reconciliation decision supported by authoritative partner evidence.

### 4.3 Mandatory dual-evidence posting rule

A contribution may be posted to the group ledger only when **both** conditions below are satisfied:

**A. Authenticated callback evidence**
- Callback authentication succeeds using the configured callback authentication mechanism.
- Callback maps to the stored provider attempt using the expected provider, CheckoutRequestID, and MerchantRequestID where supplied.
- Callback reports a success result code.
- Receipt/reference is present and valid for the provider.
- Amount and currency are present, valid, and exactly match the stored intent/attempt.
- Callback payload digest and receipt facts are durably recorded for audit and replay protection.

**B. Independent provider verification**
- Akiba independently queries the provider using the stored attempt reference through the trusted server-side provider adapter.
- Provider response is authenticated/validated according to the provider's API contract.
- Provider confirms successful completion for the same transaction, matching references, amount, and currency. Any available receipt/reference facts must agree with the callback.
- A timeout, rate limit, provider outage, malformed response, or pending status is not success; it defers verification with retry/backoff.
- A provider query success without authenticated callback evidence is not sufficient to post.
- A callback success without independent provider verification is not sufficient to post.

Only when A and B agree may a single database transaction mark the intent successful and post the balanced ledger entries, link the provider evidence, and emit the durable success event. Unique constraints/idempotency keys must make repeated callbacks, queries, and workers harmless.

### 4.4 Failure, late callback, and recovery

- Pending, failed, cancelled, expired, and manual-review attempts do not increase group available balance.
- Callback receipt must be persisted durably before acknowledging it as processed.
- Duplicate callbacks are acknowledged safely and must not duplicate events or ledger postings.
- Missing callbacks are discovered by a scheduled server-side recovery worker. Recovery placeholders contain no success evidence and cannot be posted.
- A late authenticated callback enriches the existing recovery event and triggers independent provider verification; it does not create a second contribution.
- Retry transient provider failures with bounded exponential backoff, rate limiting, concurrency-safe claims/leases, and observable attempt counts.
- If callback and provider query conflict, preserve both records and move the attempt to manual review; do not choose whichever result is more convenient.
- Client status views read Akiba's durable state. They must not trigger repeated provider queries or determine posting.

## 5. Withdrawal lifecycle

### 5.1 Request and reservation

Only the Group Creator may request a withdrawal. The request includes:
- amount and currency;
- recipient identity and destination;
- purpose/description;
- selected supported payout partner;
- provider and Akiba charges, where applicable;
- net recipient amount and total group deduction;
- immutable quote/version and material terms;
- an idempotency key.

Before request commit, the server verifies leadership readiness, Creator authority, available group accounting balance, unresolved withdrawal lock, provider capability, quote validity, and all required fields. It reserves the full group deduction atomically. Concurrent requests cannot overspend or create a second unresolved withdrawal.

The request snapshots the exact terms and the active Admin approval roster. Any material change to amount, recipient, destination, charges, currency, or provider invalidates the request and requires cancellation/release followed by a new request and approval cycle. Approval is always bound to the immutable snapshot.

### 5.2 Withdrawal state machine

Canonical request lifecycle:

- `pending_approval` — Creator request committed, funds reserved, awaiting every Admin in the snapshot.
- `rejected` — at least one required Admin rejected; request closed and reservation released atomically.
- `cancelled` — Creator cancelled before payout submission; request closed and reservation released atomically.
- `staging` — every required Admin approved the same terms; the fixed two-hour member-flagging window is running.
- `cancelled_flagged` — at the staging deadline at least one flag remains active; request closed, reservation released, active flags automatically closed.
- `payout_queued` — staging deadline passed with no active flags; payout is eligible for submission, subject to current provider capability and funds/reconciliation checks.
- `payout_submitted` — idempotent payout instruction accepted by the partner or submission acknowledged according to its contract.
- `payout_processing` — partner reports a non-terminal processing state.
- `completed` — authoritative partner evidence confirms payout completion; reservation is consumed and corresponding ledger posting is committed once.
- `failed` — authoritative partner evidence confirms terminal payout failure and that no funds were paid; reservation is released and the outcome is recorded.
- `reconciliation_required` — submission outcome is ambiguous, callback/query evidence conflicts, or provider confirmation is unavailable. Reservation remains held until the outcome is established.

A timeout or transport failure after a payout submission may have reached the partner is ambiguous, not a confirmed failure. Never release the reservation or submit a fresh payout with a new idempotency key until reconciliation establishes the original instruction's outcome.

### 5.3 Approval and rejection

- Every Admin in the request-time snapshot must approve.
- Approvals are distinct, authenticated, timestamped, idempotent and bound to the exact immutable request terms.
- One rejection is sufficient to terminate the request.
- The Creator cannot approve as an Admin.
- An Admin cannot approve a changed request using an earlier approval.
- A new withdrawal cannot be created until the previous unresolved request has reached a terminal, reconciled state.

### 5.4 Two-hour staging and member flags

Staging begins only after all required Admin approvals have been recorded. The staging duration is **two hours**, measured from the committed time of the final required approval. The deadline is fixed and stored on the request. Flagging, unflagging, or repeated activity does not restart or extend it. The duration may be changed in a future product revision based on user feedback, but any change must be explicit, versioned, and applied prospectively.

During staging:
- Any active group member may create a flag against the active withdrawal.
- A member may remove only their own active flag. Another member, including an Admin or Creator, cannot remove it on their behalf.
- Flag creation/removal is authenticated, idempotent, timestamped, and audited.
- One active flag is sufficient to block payout at the deadline.
- Flags are workflow records, not ledger postings.
- A flag does not automatically prove misconduct; it signals a member concern and blocks release pending the defined deadline outcome.

At the original staging deadline, a server-side scheduled worker/transaction locks the request and evaluates active flags:
- **One or more active flags:** transition to `cancelled_flagged`, release the withdrawal reservation atomically, and automatically close every still-active flag with a system closure reason such as `withdrawal_cancelled_at_staging_deadline`. Preserve each flag's creator, creation time, any member removal, system closure actor/reason, and closure time. The request cannot be revived; a new withdrawal requires a new request and approval cycle.
- **No active flags:** transition to `payout_queued`. The system may proceed to provider payout submission only after rechecking request integrity, partner capability, and current reconciliation/funds conditions.

A worker retry must be idempotent. A delayed worker must evaluate the original deadline, not start a new two-hour period. Client clocks and browser sessions are never authoritative.

### 5.5 One unresolved withdrawal per group

At most one unresolved withdrawal may exist per group. The database must enforce this transactionally with a unique/partial constraint covering every non-terminal state, including approval, staging, queued, submitted, processing, and reconciliation-required states. The lock is released only after a terminal outcome is committed and any reservation/provider ambiguity is resolved.

## 6. Reservations, balances, and ledger invariants

1. All money is stored as integer minor units with ISO currency codes; never use floating-point arithmetic for money.
2. A group's currency is immutable once financial artifacts exist, subject to the existing currency policy.
3. The group journal is append-only and double-entry. Every posted transaction balances debits and credits in the same currency; corrections use compensating entries.
4. Workflow states and workflow events do not create ledger entries by themselves.
5. A reservation is an internal encumbrance against group accounting availability, not a completed transfer, not a ledger credit/debit, and not proof of partner-side custody.
6. Available group accounting balance is derived from posted ledger balance less active reservations and any other explicitly modelled encumbrances. It must not be confused with partner-reported available/settled funds.
7. A contribution is credited exactly once and only after the dual-evidence rule in §4.3.
8. A payout is debited/consumed exactly once only after authoritative partner completion evidence. A confirmed terminal payout failure releases its reservation without recording a completed withdrawal.
9. Ambiguous provider outcomes keep reservations in place and require reconciliation.
10. No group balance may be spent twice. Reservation creation, state transition, and available-balance checks must be atomic and concurrency-safe.
11. Ledger rows, provider events, workflow events, and audit evidence have stable unique IDs and source references. Provider callbacks and worker retries are idempotent.
12. Group funds and Akiba/Globe revenue are never netted, pooled in the internal ledger, or represented as one balance.
13. Failed/expired contribution attempts, approvals, rejections, flags, unflags, notifications, and staging events are not financial postings.
14. Financial postings are immutable. Reversals/refunds/adjustments use linked compensating entries with reason, actor/source, timestamp, and provider evidence where relevant.

## 7. Financial activity, notifications, and chat cards

Every financial action and state transition must produce a durable, deduplicated activity event and notify **all active group members**. This includes, at minimum:
- contribution initiated, provider-pending, confirmed, failed, cancelled, expired, or moved to manual review;
- withdrawal requested, approved, rejected, cancelled, and staged;
- flag created, member-removed, or automatically closed;
- payout queued, submitted, processing, completed, failed, or moved to reconciliation;
- reservation created/released/consumed and any reconciled correction.

Notifications must be generated from committed server-side events, not optimistic UI actions. Use an outbox or equivalent durable delivery mechanism, stable event IDs, recipient/event deduplication, retry handling, and delivery observability. Notification failure must not roll back a committed financial transition. Sensitive destination details must not be exposed in push text.

The unified activity statement may display both monetary postings and workflow events, but must label them clearly. Approvals and flags must never appear as money movements. Ledger-derived balances are shown only for events that actually affect the group's accounting balance; workflow rows may show “no balance impact.” In-chat system cards are distinct from ordinary member messages, generated from committed events, and must not force-scroll or interrupt conversation.

## 8. Finance page requirements

The group Finance page includes:

### Summary
- Total confirmed contributions since group creation.
- Total completed withdrawals since group creation.
- Current group accounting balance.
- Available balance and active reserved/staged funds.
- Pending approvals and other useful unresolved activity.
- Progress toward the group target. The numeric percentage may exceed 100%; the visual progress bar is capped at 100%.

### Actions
- **Contribute:** available to active members only when leadership readiness is satisfied. Provider selection is extensible; M-Pesa is the initial provider. Collect phone/destination and amount as required, show fees and total payable, initiate provider authorization, and do not post the contribution until both callback evidence and independent provider verification agree.
- **Withdraw:** visible to all members; enabled only for the Group Creator. Disabled states explain that only the Creator can request withdrawal.
- **Approve/Reject:** visible to all members; enabled only for Admins included in the request's approval snapshot. Disabled states explain the required role/eligibility.
- **Flag/Remove own flag:** available to active members during staging. Members can remove only their own flag; the UI shows the flag state and original deadline.

### Pending withdrawal area
Show request amount, purpose, recipient information with appropriate privacy safeguards, approval progress, staging start/deadline/countdown, active flag count and current status. Provide clear empty states when no withdrawal is pending.

### Activity statement
Provide a chronological, filterable statement with date/time, stable transaction/event reference, type, actor, description/context, amount, charges where applicable, status, and resulting group accounting balance where meaningful. Show workflow events alongside postings but distinguish them explicitly. Transaction detail views should expose relevant audit history without leaking credentials or unnecessary sensitive data.

## 9. Provider integration and sandbox-first policy

Provider adapters are capability-driven and provider-independent. Capabilities must be explicitly registered and verified for collection, payout, status inquiry, callbacks/webhooks, reversals/refunds, fees/quotes, idempotency, settlement reporting, and reconciliation.

The current M-Pesa integration is a collection sandbox foundation. Do not infer that payout is enabled merely because STK collection works. The sandbox must be exercised end-to-end before any live integration is considered. Sandbox test coverage must include successful and failed collections, callback success/failure, missing and late callbacks, duplicate callbacks, transient provider outages, amount/reference mismatch, provider-query disagreement, duplicate worker execution, and exact-once ledger posting. Payout workflows require verified partner sandbox payout support; if the sandbox cannot execute payout, the limitation must be documented and no simulated success may be represented as a real provider outcome.

Callback endpoints must authenticate requests according to the provider contract, validate schemas and transaction correlation, enforce size limits, persist evidence durably, and be replay-safe. Shared-secret callback tokens are bearer credentials, not cryptographic proof of provider origin; use provider-supported authentication/network controls and independent provider verification. Secrets must never be logged or exposed to clients.

## 10. Akiba revenue and monetization

Revenue is separate from group funds and must have its own domain, ledger, reconciliation, and business account. Potential channels include:
- personal and group subscriptions;
- transaction fees, if separately approved and disclosed;
- advertising/sponsored placements;
- partnership and referral commissions;
- marketplace/vendor/service commissions;
- premium administration and financial tools;
- institutional/enterprise services, APIs, integrations, and white-label licensing.

Each revenue record identifies channel, currency, counterparty, source event, pricing version, amount, tax treatment, status, and settlement reference. Support earned-versus-received reporting, refunds/adjustments, partner settlements, and applicable deferred-revenue treatment. Revenue recognition follows applicable contracts and accounting advice.

Personal financial histories, identifiable contribution records, and group conversations are not advertising inventory. Any future data-based product requires privacy/legal review, lawful basis and appropriate consent where required, purpose limitation, aggregation/de-identification safeguards, and strict contractual controls.

## 11. Implementation sequence and change control

1. Lock this architecture and the associated state-machine/invariant specification.
2. Audit and harden contribution dual-evidence verification, durable callbacks, missing-callback recovery, retries, and exact-once posting.
3. Implement leadership readiness enforcement and contribution end-to-end sandbox behavior.
4. Implement Creator withdrawal requests, Admin approval snapshots, atomic reservations, rejection/cancellation, and Admin demotion protection.
5. Implement two-hour staging, member-owned flags, deadline processing, automatic flag closure, and durable notifications to all active members.
6. Implement and verify sandbox payout/reconciliation only where the partner exposes actual sandbox capability.
7. Build the Finance UI and unified activity statement on top of the authoritative backend events and ledger.
8. Complete security, operational, legal, partner-contract, and reconciliation reviews before considering live payment activation.

All new work remains on `feat/group-finance-foundation` until reviewed. No production migration, live provider activation, merge to `main`, or deployment is authorized by this document alone.

## 12. Permanent architecture decision — Globe is a technology provider

**Accepted ADR:** [ADR-001: Globe Technologies remains a technology provider; custody and payment execution are delegated](adr/ADR-001-globe-technology-provider-and-non-custodial-payments.md).

> **Globe Technologies is a technology provider, not a financial custodian or payment operator. All custody and payment execution must be delegated to appropriately licensed and contracted third-party partners.**

This is a permanent architectural constraint across Akiba and future Globe products unless formally amended through Globe's authorized governance. It is not a legal opinion or a claim that every technology/orchestration activity is automatically outside financial regulation.

### 12.1 Provider-independent core

The following remain inside Akiba's core and must not be rewritten when a partner is added or replaced:

- Group accounting and append-only double-entry ledger.
- Group leadership readiness and Creator/Admin/member authority.
- Immutable withdrawal terms and request-time approval roster.
- Atomic reservations, rejection/cancellation rules and one-unresolved-request lock.
- Two-hour staging, member-owned flags and deadline outcomes.
- Finance activity events, member notifications and audit history.
- Normalized payout outcome handling, reconciliation policy and exact-once ledger posting.

A partner adapter is responsible for partner-specific quote acquisition, destination tokenization/validation, payout submission, callback authentication/parsing, status inquiry, idempotency mapping and settlement evidence. Adapters return normalized facts; they never write ledger rows or independently approve, release reservations, or complete a withdrawal.

### 12.2 Multiple licensed partners

Provider records and adapters are capability-driven. Akiba must support multiple independently configured partners, each with an explicit environment, supported currencies, collection/payout capabilities, quote capability, destination rules, callback/status mechanisms, idempotency behavior, settlement reporting and contractual scope. A capability is not assumed from another capability or from a provider's brand. The selected provider and its immutable quote/terms remain bound to the withdrawal request and approval fingerprint.

The central workflow and ledger consume normalized provider events and evidence. Partner replacement or routing changes are implemented in provider configuration and adapter/orchestration code, not by changing the core ledger schema or governance state machine.

### 12.3 Sandbox simulator and B2C exercise

The sandbox_workflow_simulator is strictly a workflow demonstrator. Its synthetic zero-fee quote and non-routable destination label allow the Creator request, reservation, Admin approvals, staging and flag lifecycle to be exercised. It has payout=false, cannot create a payout attempt, and must never produce a completed withdrawal.

Safaricom Daraja B2C remains a separate sandbox-only technical exercise. It is not the selected provider for the workflow simulator and is not a live payout or custody arrangement. Any future partner adapter must be contracted and legally reviewed before live activation.
