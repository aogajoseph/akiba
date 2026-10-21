# Requirements Register — Initial

Labels: Baseline = explicit domain rule; MVP = planned first release slice; Future = not promised for MVP; Open = decision required.

| Area | Requirement | Status | Verification |
|---|---|---|---|
| Product model | Group is primary collaborative context | Baseline | Membership-scoped integration tests |
| Purpose | Event and Goal Group purposes | Baseline | Creation/validation tests |
| Identity | Login includes username, email and phone paths | Baseline; spike required | Auth flow and account-enumeration tests |
| Verification | Phone/email verification part of account trust | Baseline; exact MVP policy open | Verification-state tests |
| Membership | Invitations, lifecycle and roles are auditable | Baseline | Expiry, replay, removal and access tests |
| Governance | Independent approvals precede withdrawal execution | Baseline; edge cases open | Invalid approval combination tests |
| Ledger | Posted financial records are append-only and authoritative | Baseline | Constraint, adjustment and reconciliation tests |
| Payments | Provider events authenticated and idempotent | Baseline | Signature and duplicate/retry tests |
| Chat | Conversation contextual to a Group | Baseline | Cross-Group access tests |
| Histories | Ledger, timeline and security audit are separate | Baseline | Domain/schema review |
| Reports | Derived from authoritative records and permission-filtered | MVP | Report-to-ledger reconciliation |
| Real payments | Production provider integration and money movement | Gated future milestone | Provider/compliance/operational approval |
| Attachments | Storage and safety policy before upload feature | Open | Security review |
| Notifications | Initial channels and delivery policy | Open | Channel-specific tests |

## Working rule
Link each new rule to its source packet and mark it Baseline, MVP, Future, Recommendation or Open. Surface conflicts instead of silently rewriting product intent.
