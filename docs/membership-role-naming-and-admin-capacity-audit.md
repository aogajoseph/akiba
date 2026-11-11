# Membership Role Naming & Admin Capacity — Implementation Audit

**Status:** Audit complete; implementation not changed  
**Baseline:** `main` at `b09b0c90e669008f45724f8ae56a0774982576d9`  
**Scope:** Role identity, naming, authorization, admin counts, withdrawal governance, plan entitlements, migration safety and user-facing terminology.

## Executive summary

The codebase is not yet aligned with the CEO-directed membership model. The public marketing role/protocol section already uses **Group Creator** and **Group Admins**, and states that a group requires three appointed Group Admins and that all Group Admins must approve a Creator's withdrawal. The authenticated workspace and database still use the previous `admin` / `sub_admin` model. The withdrawal database workflows still require only two `sub_admin` approvals.

The target model for implementation should be:

| Membership role | Stored key | Meaning |
|---|---|---|
| Group Creator | `group_creator` | The one person who created the group; a permanent identity distinct from appointed admins |
| Group Admin | `group_admin` | An appointed governance role; three required for the current Free/launch entitlement |
| Member | `member` | Ordinary active group participant |

The three Group Admins are **in addition to** the one Group Creator (four governance-role holders in total). The admin allowance must be an entitlement/configuration, not a global hard-coded constant. The current launch entitlement is three; future group plans must be able to set a higher allowance without another code rewrite.

No application, database or production settings were changed during this audit. This PR contains only this report.

## Findings

### 1. Database role model — critical

**Tracked baseline**
- `supabase/migrations/20261022031657_akiba_groups_initial_secure_foundation.sql` defines `akiba_group_memberships.role` as `admin` or `member`.
- Its creator-membership trigger inserts the creator with role `admin`.
- `database/akiba-groups-foundation.sql`, the separate SQL foundation copy, also permits only `admin` and `member` and creates the owner as `admin`.

**Live Akiba Supabase project (read-only inspection)**
- The live role check currently permits `admin`, `sub_admin` and `member`.
- The live creator trigger still writes `admin`.
- The live `akiba_groups.created_by` column defaults to `auth.uid()`; the trigger checks that it equals the authenticated user and creates the initial active `admin` membership.
- The live project has 14 groups and 14 active memberships; all 14 membership rows currently have role `admin`. No `sub_admin` rows were present. Every current group had a matching active `admin` membership for its `created_by` identity.

**Migration drift**
- The live database's three-value role constraint cannot be reconstructed from the tracked initial schema and the current applied migration history: there is no tracked role-expansion migration in that history.
- The separate `database/` schema copy is also stale relative to the live role constraint.
- Before changing roles, reconcile this drift explicitly. Do not edit or rewrite already-applied migrations.

**Implication**
- `admin` currently means Group Creator in the creator trigger and current production data. It must not be blindly renamed to `group_admin`.
- `created_by` is the durable creator identity and should remain intact. The new `group_creator` membership role should align with it, with database invariants ensuring exactly one creator per group and preventing creator identity from being transferred by an ordinary role change.

### 2. Authenticated workspace terminology and role typing — high

In `app/workspace/groups/[groupId]/page.tsx`:
- The `Member` TypeScript type permits only `"admin" | "member"`, despite the live database also permitting `sub_admin`.
- The current user's role is rendered as **Administrator** when `role === "admin"`, otherwise **Member**.
- The roster renders **Administrator** for `admin` and **Member** for every other value. This would mislabel a future `group_admin` if the role model were changed without updating the display mapping.
- `GroupWorkspaceActions` receives a boolean `isAdmin` derived from `membership.role === "admin"`; the meaning of that flag is currently ambiguous between creator-only and general administrator authority.
- The group-creation review text in `app/workspace/new/group-creation-form.tsx` says the creator becomes the group administrator.

The legacy `/groups/[groupId]` collaboration preview should also be included in the surface audit, but it is documented as illustrative/demo data rather than the authenticated workspace. Avoid treating that prototype as the source of authorization truth.

### 3. Membership lifecycle and management — not implemented

The authenticated group workspace currently reads the current membership and active roster. The Members tab is explicitly disabled/coming soon; invitation, appointment, demotion, removal, transfer and leave workflows are not implemented as real membership operations in the inspected workspace.

The database grants authenticated users membership reads but does not provide general client-side membership writes. The creator membership is inserted by a restricted database trigger. This is a useful security boundary to preserve: role changes should be trusted server/database workflows, not direct client updates.

The unique constraint on `(group_id,user_id)` preserves one membership row per user per group, and status tracks active/left/removed. The schema has no maximum Group Admin count constraint or plan entitlement record.

### 4. Withdrawal governance — critical mismatch

The marketing role/protocol component (`app/marketing-template/components/RolesAndProtocols.tsx`) already says:
- the Group Creator appoints and demotes Group Admins;
- each group requires at least three Group Admins;
- all Group Admins review a withdrawal initiated by the Group Creator;
- every Group Admin must approve; any rejection stops the request.

The database finance workflow still implements the previous rules:
- `akiba_private.guard_withdrawal_request_insert()` allows an active `admin` to initiate a withdrawal, counts active `sub_admin` rows, and blocks creation only when fewer than **two** exist.
- `akiba_private.guard_withdrawal_approval_insert()` and `public.akiba_decide_withdrawal_request(...)` authorize only active `sub_admin` approvers.
- `akiba_private.apply_withdrawal_approval_decision()` marks the request approved after **two** distinct approvals, not after all appointed Group Admins have approved.
- The payout-attempt guard independently requires two distinct approvals.
- These checks are database-side triggers/RPCs, so changing labels or frontend booleans alone would leave the financial authorization model inconsistent.

The current schema and UI do not yet implement the full Creator-versus-Group-Admin role distinction. The finance changes must be designed around the approved governance model, including the question of whether the Creator can ever be an approver (the public protocol currently makes the Creator the requester and all Group Admins the approvers).

There is a second launch-protocol gap on contributions: the contribution orchestration in `lib/payments/orchestration/create-contribution.ts` verifies that the contributor is an active group member, but it does not check that the group has the required three appointed Group Admins. The M-Pesa route delegates to that active-membership check. Therefore, the public rule that no one may contribute until three Group Admins are appointed is not currently enforced by the contribution backend. This readiness gate must be added server/database-side as part of the same governance model, not merely displayed in the UI.

### 5. Plans and capacity — high

- `app/marketing-template/components/Pricing.tsx` currently advertises group member capacities (Free 100, Plus 300, Premium 1,000) and personal group-count limits. It does not define Group Admin entitlements.
- No group-plan, subscription, entitlement or admin-limit table was found in the inspected tracked schema.
- The live database has no admin-capacity constraint or plan-linked admin allowance.
- A literal `< 3` / `>= 3` check in multiple functions would simply recreate the same rigidity at a new number.

The implementation should introduce one authoritative entitlement source. It must resolve the group's applicable plan and expose both `max_members` and `max_group_admins`. Launch/Free is configured as 100 total active people and three appointed Group Admins. The database must enforce both entitlements transactionally at appointment/join time, not trust the UI. The three-admin leadership readiness requirement is separate from the maximum admin allowance and must be enforced before contributions are enabled.

## Confirmed policy decisions (CEO direction confirmed 11 Nov 2026)

The following policy inputs are now confirmed and supersede the open questions in the initial audit:

1. Exactly one Group Creator per group.
2. Exactly three appointed Group Admins for the launch/Free plan; appointed by the Group Creator.
3. Contributions are disabled until leadership is established: the group has its one Group Creator and all three appointed Group Admins.
4. Every appointed Group Admin must approve a withdrawal before it proceeds. The Group Creator initiates the withdrawal and is not one of the three approvers.
5. Launch/Free group capacity is **100 people total**, counting the Group Creator and all three Group Admins. This leaves a maximum of 96 ordinary Member places.
6. Future subscriptions increase group capacity and may increase the Group Admin allowance. Both values must be plan-configurable, not hard-coded.

### Required entitlement model

The implementation should resolve at least these two independent group-plan entitlements:

- `max_members`: total active group membership capacity, including Creator, Group Admins and ordinary Members. Launch/Free = 100.
- `max_group_admins`: maximum appointed Group Admins, excluding the Creator. Launch/Free = 3.

The group must also satisfy the leadership readiness invariant: exactly one active Group Creator and the required three active appointed Group Admins before contributions can be enabled. The capacity check must count all active membership roles together, not add the leadership roles on top of the plan's total capacity.

Future plan values remain to be set by the business when subscription tiers are finalized; the system must support those values through entitlement data/configuration without schema or code rewrites.

## Proposed implementation plan

### Phase 0 — confirm policy inputs before coding
1. **Confirmed:** three appointed Group Admins plus one Group Creator.
2. **Confirmed:** the Group Creator is the withdrawal requester; all three Group Admins are approvers.
3. **Confirmed:** every appointed Group Admin must approve each withdrawal; no two-of-three shortcut. The present two-approval database rule conflicts with the public all-admins rule.
4. **Confirmed:** contributions remain disabled until the Creator and all three Group Admins are in place.
5. **Confirmed:** launch/Free capacity is 100 people total, including one Creator and three Group Admins (96 ordinary Member places). Future plans must configure both total group capacity and Group Admin allowance; actual future values remain a business decision.

### Phase 1 — domain model and data migration
1. Add a new forward-only Supabase migration; never alter applied migration files.
2. Reconcile the unexplained live `sub_admin` constraint with migration history and ensure the resulting migration sequence can be replayed from an empty database.
3. Migrate current `admin` creator memberships to `group_creator` by joining to `akiba_groups.created_by`, not by blanket string replacement.
4. Migrate legacy `sub_admin` memberships to `group_admin`.
5. Keep ordinary `member` rows unchanged.
6. Add database constraints/guard functions to ensure one creator identity per group, creator-role alignment with `created_by`, no duplicate active appointed admin identity, and plan-aware admin capacity.
7. Preserve membership IDs, group/user relationships, status, join/end timestamps and financial history. Validate every group has exactly one active creator membership after migration.

### Phase 2 — central authorization and membership workflows
1. Define canonical role constants/types and a role-to-capability matrix. Do not infer permissions from labels or generic booleans such as `isAdmin`.
2. Keep role changes behind authenticated server actions/RPCs with actor authorization, transactionality, audit events and concurrency-safe capacity checks.
3. Implement appointment/demotion, removal, leave and succession rules against the approved Creator and Group Admin responsibilities.
4. Resolve the group entitlement server-side for every appointment. Enforce both the configured cap and any minimum-admin readiness requirement in the database.
5. Keep creator identity immutable; succession/ownership transfer, if ever supported, must be a separate explicit audited operation.

### Phase 3 — finance governance alignment
1. Change withdrawal initiation authorization to the Group Creator role only.
2. Change approver authorization to active `group_admin` memberships only.
3. Replace the fixed two-approver threshold with the confirmed all-admin or quorum policy, evaluated against the active appointed admins at the correct point in the request lifecycle.
4. Apply the same policy consistently in request guards, approval RPCs, approval triggers, request state transitions and payout-attempt guards.
5. Define how admin appointment/removal during a pending withdrawal affects the required approval set. Snapshotting the eligible approver set per request is likely safer and auditable than silently changing the required count mid-flight; confirm this policy before implementation.
6. Preserve rejection semantics, independent approvers, approval versioning, terms fingerprints, reservations, idempotency and payout reconciliation.

### Phase 4 — application surfaces and product plan configuration
1. Update all authenticated workspace role labels, badges, role descriptions, member roster mappings, creator review text and action visibility.
2. Replace `isAdmin` with explicit capability props/checks (for example `canManageGroup`, `canRequestWithdrawal`) backed by server authorization.
3. Update marketing role/protocol copy only where it needs to reflect the final confirmed policy; it is already ahead of the backend in key areas.
4. Add Group Admin allowances to the authoritative group-plan entitlement model and display them in pricing/plan surfaces where useful.
5. Ensure every UI label is derived from canonical role data and unknown roles fail closed rather than being displayed as Member.

### Phase 5 — verification and rollout
- Migration replay from a clean database and upgrade against a production-like snapshot.
- Data reconciliation: exactly one creator per group; all legacy sub-admins become Group Admins; no membership history loss.
- Capacity tests: three Group Admins accepted on launch/Free; fourth rejected on that plan; higher configured plan cap accepted; concurrent appointments cannot exceed the cap.
- Authorization matrix tests for Creator, Group Admin and Member across group settings, appointments, removal, contributions, withdrawal request, approvals and read access.
- Withdrawal tests for all approvals, one rejection, initiator self-approval, removed approver, newly appointed approver, concurrent decisions, admin changes while pending, and payout execution.
- RLS and RPC tests using multiple real test accounts; verify direct REST/RPC attempts cannot bypass role or capacity checks.
- UI tests for role labels, creator/admin action visibility, and empty/partial roster states.
- Deploy to preview first; verify migration and end-to-end flows before any production migration. Production rollout requires separate explicit approval.

## Acceptance criteria for the implementation PR

- No use of `admin` to mean Group Creator or `sub_admin` to mean Group Admin remains in active authorization paths.
- `created_by` remains the durable creator identity and matches exactly one `group_creator` membership.
- Launch/Free entitlement supports exactly three appointed Group Admins, with a configurable higher allowance for later plans.
- All backend and database finance checks implement the confirmed withdrawal policy consistently.
- Membership writes are transactional, authorized, capacity-safe and auditable.
- Existing membership and financial history is preserved.
- Migration history is reproducible and the live schema no longer relies on undocumented drift.
- CI, migration replay, RLS, integration and end-to-end tests pass.

## Audit boundaries and caveats

This review inspected the tracked repository at the stated main commit, the authenticated workspace and finance surfaces, relevant SQL migrations/schema copies, public role/pricing content, and the connected Akiba Supabase project's live table definitions, role constraint, trigger/function definitions, policies, migration history and aggregate membership counts. The live database inspection was read-only. No member identifiers or personal records are included in this report.

The repository does not yet contain a complete invitation/member-management implementation. Therefore, this audit identifies where future workflows must be introduced; it does not claim to have audited nonexistent appointment/removal UI or server actions. A final implementation design should be approved after the five policy questions in Phase 0 are settled.
