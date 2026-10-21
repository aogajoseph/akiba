# Milestone 2 — Groups, Membership & Collaboration

**Status:** In progress — interface prototype only  
**Product terminology:** Group / Groups  
**Baseline:** CEO-approved Akiba Product Blueprint v1 implementation packets 01–18

## Scope
- Use **Group** as the customer-facing and primary domain term. A Group brings people together around an Event or Goal.
- Group overview: purpose, members, collaboration context and recent activity.
- Membership: invitation lifecycle, roles/capabilities, join/leave/remove and access revocation.
- Group conversation: messages scoped to a Group and kept distinct from financial records.
- Notifications: delivery policy and user preferences remain subject to the blueprint and open decisions.
- Group activity timeline: durable collaboration history, separate from ledger entries and security audit events.

## Implemented in this branch
- Replaced “Universe(s)” wording in the dashboard and core project documentation with “Group(s)”.
- Added a responsive Group workspace prototype with Overview, Members, Group chat and Activity sections.
- Added demo-only invitation and message interactions with explicit notices that they do not send or persist data.
- Updated domain dictionary and requirements register to use Group terminology.

## Not implemented yet
- Authentication, persistent database records, invitation token generation/delivery, membership writes, server-side authorization, real-time chat, notification delivery, and durable activity events.
- The workspace currently uses illustrative local data. UI controls are not evidence of real access enforcement.

## Engineering invariants
1. All Group reads and writes require server-side authorization for an active membership; database row-level security reinforces it.
2. Invitations must use unpredictable, expiring tokens, safe token storage, replay protection and idempotent acceptance.
3. Membership/role changes are auditable. Leaving or removal revokes access but does not erase legitimate history.
4. Roles map to explicit capabilities; hiding controls in the UI is not authorization.
5. Group chat reads/writes are Group-scoped and do not replace contributions, approvals, ledger entries or receipts.
6. Group activity timeline, financial ledger and security audit trail remain separate records.
7. Do not expose private contact or recovery details merely because people share a Group.

## Decisions required before production behavior
- Confirm which invite identifiers are supported and whether invitation delivery begins with email, SMS, shareable link, or a staged approach.
- Confirm initial role names and capabilities against the source packets before wiring permission controls.
- Confirm MVP notification channels and delivery preferences.
- Define retention/deletion rules for messages, invitations and timeline events.
