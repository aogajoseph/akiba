# Akiba Engineering Plan v1

**Status:** CEO-approved kickoff baseline  
**Source:** Akiba Product Blueprint v1, implementation packets 01–18  
**Repository:** aogajoseph/akiba (private)

## Decision
The 18 implementation packets are sufficient to begin engineering. Part 2 is the CEO-approved baseline. Part 3 may be filled with engineering decision records as implementation proceeds. Explicit domain rules are baseline; items marked future, strategic enhancement, recommendation or open research are not automatically MVP commitments.

## Product invariants
1. Group is the primary collaborative context; roles and permissions belong to membership.
2. Purpose-led setup supports Events and Goals, with governance defined before collaboration.
3. Membership history is preserved; access is revoked on departure without erasing legitimate history.
4. Withdrawal approval is separate from payment execution.
5. The ledger is authoritative and append-only. Correct mistakes through adjustment/reversal entries, not silent edits.
6. Provider status is not ledger truth; only verified provider events can finalize payment records.
7. Ledger, institutional timeline and security audit trail are distinct.
8. Chat is contextual to a Group and references financial objects rather than duplicating them.
9. Authorization is enforced server-side and reinforced by database policies.
10. Private profile/contact data is not exposed just because users share a Group.

## Architecture
- Next.js App Router, React, TypeScript, Tailwind CSS.
- Modular monolith initially, with explicit domain boundaries.
- Supabase PostgreSQL and Supabase Auth, subject to an authentication feasibility spike.
- Server-side capability checks plus row-level security and database constraints.
- Integer minor units for money, ISO currency codes, UTC timestamps.
- Provider interface and fake/sandbox payment adapter before real integration.
- Unit, integration and end-to-end tests; CI for lint, typecheck, tests and build.

## Milestones
0. Foundation: repository, scaffold, CI, domain dictionary, requirements register, ADRs, auth/security/money spikes.
1. Identity and first Group: account flow, profile, dashboard, Event/Goal creation, currency, governance, creator admin.
2. Membership and collaboration: invitations, roles, member lifecycle, Group overview, contextual chat, notifications, timeline.
3. Financial core: contribution lifecycle, receipts, withdrawal requests and independent approvals, simulated payments, ledger and audit.
4. Operational completeness: reports, search, preferences, session security, reconciliation and recovery.
5. Real payments: gated on provider, jurisdiction, compliance, settlement, reconciliation, monitoring and operational approval.

## Open decisions
- Exact verified phone/email requirements and verification sequence.
- Secure username/email/phone sign-in and account-enumeration protections.
- Initial jurisdiction, currency, provider, settlement model and transaction limits.
- Whether the withdrawal requester may approve; approver independence and succession rules.
- Refunds, reversals, chargebacks and correction semantics.
- Data retention, deletion and privacy obligations.
- Attachment storage, scanning, moderation and retention.
- MVP notification channels and internal support/admin capabilities.

## First-user release criteria
- No cross-Group reads/writes without authorization.
- Retries and duplicate callbacks cannot double-post ledger entries.
- Withdrawal execution is blocked until independent approvals are satisfied.
- Balances derive from ledger entries and reconcile in tests.
- Sensitive actions are auditable; production secrets are not committed.
- Real money movement remains disabled until launch gates are approved.
