# Group Membership Experience

## Purpose

Deliver the complete group membership lifecycle through the Group Membership area in the group workspace. Build on the existing `akiba_group_memberships`, profile, group governance, plan-entitlement, and membership-event foundations.

## Confirmed product rules

### Roles and membership
- Every group has exactly one Group Creator. The Creator cannot leave, transfer the Creator role, be removed, demoted, or blocked.
- Group Admins are appointed and demoted only by the Group Creator.
- A Group Admin may voluntarily step down to ordinary Member and then leave. The role change and departure must respect unresolved-withdrawal approver protections.
- Ordinary Members may leave voluntarily at any time.
- Only the Group Creator may remove or block another member, and only the Creator may unblock them.
- Every active member can invite people to the group.
- Accepting an invitation always creates an ordinary Member. Admin appointment remains a separate Creator action.

### Capacity and leadership
- Capacity is the plan's maximum total active memberships, including Creator and Admins.
- Free plan remains 100 total active people, with 3 required and at most 3 Group Admins.
- New invitations are blocked when the group is at capacity and the UI must show: **Group capacity reached.**
- Pending invitations do not reserve capacity.
- Invitation acceptance rechecks capacity atomically. Concurrent acceptances must never exceed the entitlement.
- Removing a member or a member leaving frees a slot and unlocks invitations.
- Existing contribution-readiness and unresolved-withdrawal protections remain in force.

### Invitation lifecycle
- Recipients can accept or decline.
- Accepting while signed in joins the authenticated user and redirects to the group detail page.
- Signed-out users sign in and return to the invitation; users without accounts register, sign in, and return to the invitation.
- Invitation context must survive sign-in and registration. The invitation must be revalidated after authentication before membership is created.
- Declining terminates the invitation.
- Invitations must be single-use, securely tokenized, and expire. A proposed initial expiry is seven days, subject to final configuration.
- Duplicate pending invitations, already-active members, blocked users, expired/revoked invitations, and full groups must be handled explicitly.
- Invitation methods to support: existing Akiba username, email address, and a shareable invitation link. Email/username-bound invitations must only be accepted by the intended account.

### Group deactivation and retention
- The Group Creator deactivates the group when its purpose is fulfilled.
- Deactivation starts the six-month retention clock immediately.
- Deactivation immediately disables new invitations, invitation acceptance, membership changes, contributions, withdrawals, and other new group activity.
- The group is scheduled for deletion six calendar months after deactivation. An hourly database retention worker processes groups whose deadline has passed.
- At deletion, the group is removed from the active product, its identifying group details are scrubbed, membership/content/invitation records are removed, and the original image path is retained in a cleanup record.
- Financial transaction, ledger, contribution and withdrawal records are retained. Because those records reference the group, a minimal non-user-facing group tombstone remains as their relational anchor; the group is not physically deleted from the database while those financial references exist.
- Historical financial and legally required records must not be destroyed merely because the group is deleted. Retention/archival obligations and any legal hold must be respected.

### Membership directory
- All active members, including the viewer, can see the active membership directory.
- Show display name, username, avatar (with fallback), and role.
- Do not expose private account contact information in the directory.

## Delivery plan

1. Database lifecycle and security: invitation records, token digests, blocks, group lifecycle timestamps, atomic accept/leave/remove/block/role operations, RLS and audit events.
2. Invitation flow: create/share, accept/decline, authentication/registration return path, expiry/revocation and clear capacity errors.
3. Membership directory: enable the Membership tab as the central member directory and invitation access point.
4. Creator administration: appoint/demote Admins, remove/block/unblock members; member/Admin voluntary departure.
5. Notifications and group activity history.
6. Deactivation and six-month retention/deletion worker, with financial-record preservation.
7. End-to-end tests for permissions, identity binding, token replay, capacity races, leadership readiness, withdrawal quorum, and deactivation.

## Implementation constraints

- Database authorization is authoritative; frontend controls are not security boundaries.
- Reuse existing governance and entitlement structures; do not create parallel role or capacity systems.
- Use forward-only migrations. Never edit an applied migration.
- No shared test or production database migration is applied as part of this PR without explicit approval.
- No production deployment or PR merge without explicit approval.

## Open implementation detail

The application currently has no installed transactional email provider. Addressed invitations are visible in the recipient's Akiba inbox, and the creator can share the generated recipient-bound link through WhatsApp, email or another channel. Automatic email delivery remains a provider-integration follow-up. The six-month retention interval is confirmed and is registered with pg_cron where that extension is enabled; it does not depend on a user opening the app.
