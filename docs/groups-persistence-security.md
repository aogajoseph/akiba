# Akiba persistence & authorization foundation

**Status:** Proposed schema committed for review; **not applied to any database**.
**Isolation:** The connected Supabase project is `globe-hq`. It must not be used for Akiba.

## What this change prepares
- `akiba_groups`: Event/Goal Groups, base currency, creator and timestamps.
- `akiba_group_memberships`: active/left/removed lifecycle, admin/member roles.
- `akiba_group_messages`: Group-scoped messages.
- `akiba_group_activity`: read-only institutional timeline.
- Row-level security for every table, with no anonymous table access.
- No payments, balances, ledger, withdrawals, invitation delivery or notifications.

## Known limitations — blockers before production
1. **No Akiba Supabase project exists yet** in the connected account. Provision a dedicated project and review schema before applying.
2. Group insertion and creator-membership insertion are currently separate operations; use a transactional, audited creation flow before production.
3. Role names and capabilities are provisional engineering scaffolding, pending mapping to the approved blueprint.
4. Members cannot be invited or removed by these policies; these operations need explicit server-side authorization, token hashing, expiry, replay prevention and audit events.
5. Activity entries are intentionally not client-writable; an authorized server workflow must generate them.
6. There is no user profile/verification implementation or session refresh setup yet.
7. Verify that expired/removed members cannot read Group messages, timeline, or details, including via direct REST calls and stale sessions.
8. Do not treat membership status as a substitute for a full capability matrix.
9. The schema uses an `akiba_` prefix for clarity in SQL review; the product term remains **Group**.

## Security test matrix
- Unauthenticated actor: no table reads or writes.
- Member of Group A: cannot read Group B, its messages, or its timeline.
- Nonmember: cannot insert messages into a Group.
- Active member: can read their Group and insert messages only as themselves.
- Removed/left member: cannot read Group details or messages.
- Creator: can establish own admin membership; cannot add another user via public insert.
- Ordinary member: cannot change roles, Group creator, or membership status through the Data API.
- Any client: cannot insert timeline records, modify posted messages, or delete historical membership records.
- Creation failures: cannot leave an accessible orphaned Group in the final production workflow.

## Rollout checklist
1. Create a dedicated Akiba Supabase project.
2. Run SQL review and database advisors; address findings.
3. Apply and verify schema in an isolated development project.
4. Implement transactional Group creation and role/invitation workflows.
5. Configure authenticated Next.js server/client connections with publishable key only.
6. Add automated RLS and session tests before exposing live Group functionality.

Reference: https://supabase.com/docs/guides/database/postgres/row-level-security
