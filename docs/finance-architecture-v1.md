# Akiba Finance & Monetization Architecture (v1)

## Purpose

This document records the approved product and engineering requirements for Akiba's group finance, payment orchestration, and revenue architecture. It is the implementation reference for the finance workstream.

## Architecture boundaries

Akiba separates three financial domains:

1. **Group Finance** — money attributed to a group, member contributions, withdrawal requests, reservations, payout outcomes, and the group's immutable financial history.
2. **Akiba Revenue & Monetization** — amounts earned by Akiba/Globe through subscriptions, transaction fees, advertising, partnerships, marketplace commissions, institutional services, and other future channels.
3. **Partner Settlement** — provider-side collection, safeguarding, processing, settlement, fees, and reconciliation. Regulated financial institutions/payment providers hold and move customer funds under their own applicable permissions and contractual responsibilities. Akiba does not represent an internal database balance as custody of money.

These domains may share payment integrations and references, but never share balances or imply common beneficial ownership.

## Contributions

- Any active group member (admin, sub-admin, or member) can initiate a contribution.
- The contributor enters an amount and selects an available provider.
- Before authorization, Akiba displays the amount, provider charges, total payable, and relevant provider confirmation details.
- Provider authentication (including PIN entry) occurs only in the provider's approved authorization experience. Akiba must never collect or store provider PINs.
- A contribution becomes group money only after authenticated provider confirmation and successful posting to the group ledger.
- Pending, failed, cancelled, and expired attempts do not increase the group's available balance.
- Akiba does not charge a contribution fee.
- A successful contribution creates a financial record, notification, and lightweight chat system card. Failed outcomes are also recorded accurately without implying funds were received.

## Withdrawals and approvals

- Only the active group admin may initiate a withdrawal.
- A group must have at least two currently active sub-admins before a withdrawal request can be created. This is a hard server/database gate.
- Two distinct active sub-admins must approve. The initiator cannot approve their own request.
- Any currently active sub-admin may approve, including one appointed after request creation.
- A rejection by either approver terminates the request. Rejection reason, actor, and timestamp are retained.
- The second approval authorizes payout execution; it does not establish payout completion.
- Provider-confirmed success establishes completion. Provider failure is a distinct failed payout outcome and must be reconciled before releasing any reservation.
- Approval is bound to the exact amount, currency, recipient, destination, fee quote, and other material payout terms. A material change invalidates previous approvals and requires a new approval cycle.
- Admin may cancel before provider submission, with an audit record. After provider submission, cancellation depends on provider capability and confirmed outcome.
- Historical approvals remain recorded if an approver is later removed.
- Completed payout destination and recipient details are visible by default to all active group members. Restrict or mask only where a specific legal/regulatory requirement requires it; document the reason.
- All role checks are repeated server-side at the time of action.

### One unresolved withdrawal per group

A group may have only one unresolved withdrawal request at a time, regardless of which admin submitted it.

A new request is blocked while an existing request is pending first approval, pending second approval, approved/awaiting payout, or processing. The group-level lock is released only when the existing request is rejected, completed, or failed and fully reconciled. The rule must be enforced transactionally in the database, including concurrent submissions.

### Withdrawal reservations and charges

- Available balance must account for posted group funds, existing reservations, unsettled funds, committed payouts, and applicable fees.
- Creating a valid withdrawal request reserves the required group funds atomically.
- Before submission, show the requested recipient amount, Akiba fee, provider fee, total group deduction, and net recipient amount. The admin must explicitly confirm the quote.
- Akiba transaction pricing is percentage-based and configurable, with support for optional minimum/maximum fees, time-bound promotions, group-specific rates, and fee waivers. Initial minimum/maximum values may be zero.
- Provider charges are shown separately and passed through according to the provider quote/contract.
- The quoted fee schedule and amounts are snapshotted on the request; later pricing changes do not silently alter an existing request.
- If a quote expires or material charges change before confirmation, obtain a fresh quote and confirmation.
- No contribution fee is charged by Akiba.

## Provider architecture

- Provider-independent adapters support multiple regulated financial partners.
- Provider capabilities are discovered and configured explicitly: collection, payout, account attribution/segregation, status inquiry, callbacks/webhooks, refunds, reversals, fee quotes, split settlement, reconciliation exports, and idempotency.
- Never assume a generic payment integration supports segregated group balances or group-level custody.
- Provider callbacks must be authenticated, idempotent, replay-safe, and correlated to internal attempts.
- Only provider-confirmed events post money movements to the group ledger.
- Provider account identifiers and sensitive payout destination data must be protected; store tokens/references where possible and encrypt sensitive values where storage is necessary.
- Partner contracts and Kenyan regulatory/legal review must establish the parties' responsibilities. Using a regulated partner does not automatically remove every legal obligation from Akiba.

## Financial records and chat cards

- Group financial journal is append-only and double-entry. Corrections use compensating entries.
- Money is stored in integer minor units with ISO currency codes; never use floating point.
- Financial workflow events (request created, approval, rejection, cancellation) are distinct from posted money movements. They appear in group activity, notifications, and chat cards but must not create fictitious ledger movements.
- Every financial event has a stable unique event ID and source record reference.
- Cards are generated from committed backend events, not optimistic frontend assumptions.
- Cards are chronological, lightweight, visually distinct from member messages, non-disruptive, and open the relevant transaction/request detail.
- Duplicate callbacks/events must not create duplicate cards.
- Cards must not force-scroll the chat, interrupt typing, or flood notifications.
- Push notifications are separate from in-chat system cards and should target people who need to act or be informed.

## Finance page

The group Finance page has three principal sections:

1. **Summary** — total group funds, available balance, reserved funds, total contributions, completed withdrawals, and pending activity.
2. **Actions** — Contribute (all active members), Withdraw (admin only), and Approve/Reject (eligible sub-admins). Actions remain visible to everyone; disabled states explain the responsible role.
3. **Transactions** — full-width, scannable table with date/time, type, actor/member, description/recipient, amount, charges, status, resulting balance where meaningful, and reference. Provide filters and transaction details.

Completed payout destination details are transparent to all active group members by default.

## Akiba Revenue & Monetization

Revenue is separate from group funds and is expandable by channel. Initial and potential channels include:

- Personal subscriptions.
- Group subscriptions.
- Transaction fees.
- Advertising and sponsored placements.
- Privacy-protected aggregated insights/data services, subject to consent, data-protection law, and contractual controls.
- Partnership and referral commissions.
- Marketplace/vendor/service commissions.
- Premium financial tools and administration features.
- Institutional/enterprise services, APIs, integrations, and white-label licensing.

A common revenue core should support independent channel modules, pricing products/plans, promotions, billing, revenue events, receivables, immutable revenue journal, refunds/adjustments, partner settlements, reconciliation, and analytics.

Each revenue record should identify channel, currency, counterparty/customer, source event, pricing version, amount, tax treatment, status, and settlement reference. Support earned-versus-received reporting and applicable deferred revenue treatment (for example, subscriptions paid in advance).

Group ledger and Globe/Akiba revenue ledger must never be combined. Transaction fees, subscriptions, partner commissions, and other revenue are recognized according to the applicable contracts and accounting treatment, then settled to Globe's business account through supported partner arrangements.

Personal financial histories, identifiable contribution records, and group conversations are not advertising inventory. Data monetization, if ever activated, requires privacy/legal review, appropriate consent and purpose limitation, aggregation/de-identification safeguards, and strict contractual controls.

## Initial implementation boundaries

Implement the secure database foundation first: membership role support, immutable group journal, currency integrity, and tests. Then implement provider-independent workflow tables and transactional server-side operations for contribution, withdrawal request, approvals, reservations, payout execution, event cards, and reconciliation. Build the Revenue & Monetization foundation as a separate ledger/domain. UI and provider integrations follow after their server-side invariants are established.

No production migration or live provider integration is authorized by this document alone. Changes remain on a feature branch and are reviewed/tested before any production application.
