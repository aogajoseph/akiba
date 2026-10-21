# Akiba Core Domain Dictionary

| Term | Meaning | Constraint |
|---|---|---|
| Platform identity | A person's Akiba account | Authentication identity is distinct from Group membership |
| Profile | User-facing identity and preferences | Private contact/recovery data is not globally exposed |
| Group | Shared context for purpose, people, communication, governance and financial coordination | Every protected operation is scoped to an authorized active membership |
| Purpose | Reason a Group exists | MVP purposes are Event and Goal |
| Membership | A user's relationship with a Group | Lifecycle and role changes are auditable |
| Invitation | Controlled request to join a Group | Unpredictable token, expiry, safe storage and idempotent handling |
| Governance policy | Rules for permissions and financial decisions | Validate before sensitive actions execute |
| Contribution | Business-level contribution intent/record | Separate from provider transaction state and ledger posting |
| Payment intent | Request to initiate payment through a provider | Provider callbacks are authenticated and idempotent |
| Withdrawal request | Request to disburse funds | Execution blocked until required independent approvals exist |
| Approval decision | Approve/reject decision by eligible member | Preserve actor, time and request version; enforce independence |
| Ledger entry | Authoritative posted financial fact | Append-only; use compensating entries for corrections |
| Receipt | Evidence associated with contribution/payment outcome | Never trust a client claim as provider proof |
| Message | Communication in a Group | Membership authorization applies to reads and writes |
| Institutional timeline | Durable history of important collaborative events | Separate from ledger and security audit trail |
| Security audit event | Evidence of sensitive action/access/security decision | Avoid unnecessary secrets and sensitive payloads |
| Provider event | External provider callback/event | Verify, deduplicate, reconcile, then apply state transition |

## Money representation
Use integer minor units, ISO currency codes and explicit Group base currency. Never use binary floating point for financial amounts. Currency and provider remain open until launch-market decisions are confirmed.
