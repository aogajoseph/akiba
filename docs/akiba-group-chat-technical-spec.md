# Akiba Group Chat — Technical Specification

**Status:** Proposed implementation specification  
**Workstream:** Globe Software / Akiba  
**Repository:** `aogajoseph/akiba`  
**Target architecture:** Next.js App Router + Supabase Auth + PostgreSQL RLS + Supabase Realtime

## 1. Purpose

Give every Akiba group its own persistent, real-time conversation space. Members use it to coordinate plans, ask questions, share updates and discuss group matters in the context of that group.

Chat is a group capability, not a separate company-wide messaging product. A user's conversations are scoped to the groups they currently belong to.

## 2. Product decisions

1. **One conversation per group.** No direct messages, global inbox or cross-group chat in this milestone.
2. **Real messages, not prototype messages.** A sent message is stored in PostgreSQL and remains available after refresh, sign-out and sign-in.
3. **Current membership controls access.** Only authenticated, active members of an active group can read or send messages.
4. **Membership remains the source of truth.** Chat must reuse `akiba_group_memberships`; it must not create a second participant or role system.
5. **Financial records remain separate.** A chat message is not a contribution, withdrawal request, approval, payment instruction or ledger entry. Financial actions continue through their dedicated workflows.
6. **A message is attributed to its authenticated author.** The client cannot choose or spoof `author_id`.
7. **A member who leaves or is removed loses access immediately.** Their messages remain part of the group's history and retain their original author attribution. If the person is later made an active member again, the current membership-based policy would restore access to that group's history; this should be revisited only if product policy requires a different rejoining experience.
8. **MVP is text-first.** Attachments, typing indicators, presence, reactions and push/email notifications are not prerequisites for a useful first release.

## 3. Current implementation findings

The production Supabase schema already contains:

- `public.akiba_groups`, including an active/deactivated/deleted lifecycle.
- `public.akiba_group_memberships`, with `group_id`, `user_id`, role and membership status.
- `public.akiba_profiles`, with username, display name and avatar path.
- `public.akiba_group_messages`, with `id`, `group_id`, `author_id`, `body` and `created_at`.
- An index on `(group_id, created_at DESC)`.
- RLS policies allowing active members to read messages and insert messages attributed to themselves.

The current message table has a 1,000-character body limit. It has no edit/delete/reply fields or read-state fields. The existing group workspace route (`app/groups/[groupId]/page.tsx`) still renders illustrative group, member, activity and chat data; its chat composer explicitly says messages are demo-only.

**Implication:** this is not a greenfield messaging schema. The first implementation should build on the existing message table and carefully extend its policies/schema only where required. Do not create a duplicate messages table.

## 4. MVP scope

### Included

- Real group chat tab in the authenticated group workspace.
- Load persisted messages for the selected group.
- Send plain-text messages.
- Display author name/username, message body and timestamp.
- Real-time arrival of new messages while the group chat is open.
- Older-message pagination.
- Loading, empty, sending, failed-send, offline/reconnecting and access-denied states.
- Responsive desktop and mobile layouts.
- Membership and group lifecycle enforcement in PostgreSQL, not merely in UI code.

### Deferred to a follow-up release

- Edit and soft-delete own messages.
- Replies/threads.
- Image and document attachments.
- Typing indicators and online presence.
- Unread counts and last-read state.
- Push, email or in-app message notifications.
- Reactions, search, pinning, forwarding, voice notes and direct messages.

These can be added without changing the core rule that the database is the source of truth and group membership controls access.

## 5. Data model and migration direction

Continue using `public.akiba_group_messages`.

For MVP, retain the existing columns and constraints:

| Column | Purpose |
|---|---|
| `id` | Stable message UUID |
| `group_id` | Owning group |
| `author_id` | Authenticated sender |
| `body` | Plain text, trimmed, 1–1,000 characters |
| `created_at` | Server-generated timestamp |

Keep the existing group/time index. Confirm it supports the chosen keyset pagination query; add a deterministic `id` tie-breaker to the query and, if needed, the index.

Do not add a second message table. A future migration may add `edited_at`, `deleted_at` and `reply_to_message_id` when edit/delete/replies are scheduled. A future unread milestone may add `last_read_at` to each membership row or introduce a dedicated per-user/per-group read-state table after evaluating membership lifecycle semantics.

### Message query and pagination

- Scope every query by the selected `group_id`.
- Sort newest-first in the database for efficient page retrieval, then reverse each page for chronological display.
- Use keyset pagination based on `created_at` and `id`; avoid offset pagination for an actively growing conversation.
- Fetch a modest initial page (recommended 30 messages) and load older pages on demand.
- Use server-generated `created_at`; never trust a client-supplied timestamp.

## 6. Authorization and security

RLS is the enforcement boundary. Hiding a tab or disabling a composer is useful UX but is not authorization.

### Required invariants

- SELECT: requester has an active membership in the message's group, and the group is active.
- INSERT: `author_id = auth.uid()`, requester has an active membership in the target group, and the group is active.
- A user cannot read another group's messages by changing a URL, group UUID or client query.
- A user cannot insert as another author.
- A former/removed member cannot read or post while their membership status is not `active`.
- A deactivated/deleted group cannot receive new messages.
- Anonymous users cannot read or write messages.

The currently deployed policies already check active membership for message SELECT/INSERT. Before implementation, inspect and update them to also enforce the group lifecycle status. Keep policy predicates correlated explicitly to `akiba_group_messages.group_id` to avoid accidental SQL name shadowing.

### Edit/delete policies

Not part of MVP. Do not grant UPDATE or DELETE to authenticated clients in this milestone. If later enabled, UPDATE must have both `USING` and `WITH CHECK`, restrict changes to the original author, preserve immutable identity/group fields, and retain an audit trail. Prefer soft deletion over hard deletion so conversation history remains coherent.

### Realtime authorization

Use private, group-scoped channels, e.g. `group:<group-uuid>:chat`. Authorize subscription and message delivery against the same active-membership and active-group rules. Do not use a blanket `USING (true)` policy for authenticated users on `realtime.messages`.

Persist the message first. Realtime is a delivery signal, not the canonical message store. A broadcast event should contain only the information needed to trigger a refresh/insert (prefer message ID and group ID); the client then obtains the canonical message under normal table RLS. This avoids treating an untrusted broadcast payload as an authoritative record.

Use a narrowly scoped database trigger/helper if needed to publish after insert. Any privileged function must have a fixed safe `search_path`, minimal privileges, no public execute grant, and no client-controlled authorization bypass.

### Profile display

Resolve author identity from `akiba_profiles` using the existing profile model. Prefer non-empty `display_name`, then `username`; use a neutral fallback if the profile is unavailable. Do not copy author names into message rows as the source of truth. Do not expose email addresses in the chat UI.

## 7. Realtime and client behaviour

- Subscribe only while the user is viewing the selected group's chat.
- Unsubscribe when the component unmounts or the selected group changes.
- Handle subscription status, reconnects and duplicate events.
- On reconnect, refetch the latest persisted page so messages missed while offline are recovered.
- De-duplicate by message UUID.
- Optimistic sending is optional; if used, reconcile the temporary item with the persisted row and show a clear retry/error state on failure.
- Do not assume successful broadcast means a message was persisted.

Supabase Realtime Broadcast with private channels is the preferred direction for the live event layer. PostgreSQL remains the durable message store. Keep the implementation small enough to replace or tune the delivery mechanism without changing the message model.

## 8. UI/UX requirements

Replace the current illustrative chat panel in `app/groups/[groupId]/page.tsx` with real data.

The chat panel should contain:

- Group conversation heading and a short explanation that messages belong to this group.
- Chronological message list with sender identity and readable local timestamps.
- Visually distinct own/other messages without hiding sender identity.
- Text composer with a 1,000-character limit, send button and Enter-to-send behaviour (Shift+Enter for a newline if a multiline composer is used).
- Clear send-in-progress and send-failed feedback.
- Empty state encouraging the first group message.
- Loading state and an older-messages affordance.
- Accessible labels, keyboard operation and mobile-friendly composer.

Do not render sample names, seeded messages, fake activity or “demo message” success notices in the authenticated live group workspace. The public marketing/demo experience may retain illustrative examples if clearly labelled and isolated from authenticated group data.

## 9. Suggested implementation sequence

1. **Schema and security review:** verify the deployed migration history, current message policies, group lifecycle checks, profile visibility and Realtime configuration. Add a migration only for confirmed gaps.
2. **Persistent messaging:** implement group-scoped read and send operations using the authenticated Supabase client and RLS.
3. **Live delivery:** add private group channel authorization and broadcast-on-insert; refetch canonical rows on reconnect.
4. **Workspace UI:** replace the static prototype chat with the real conversation and all required states.
5. **Pagination and resilience:** add keyset pagination, duplicate protection and reconnect recovery.
6. **Test and release:** run automated checks and test with two real accounts in the same group plus an account outside the group.

Do not combine this milestone with Finance workflows, payment handling or a redesign of group membership.

## 10. Acceptance criteria

### Core behaviour

- An active member can open a group and see its persisted messages.
- An active member can send a valid text message and see it appear without refreshing.
- A second active member viewing the same group receives the message in real time.
- A message remains visible after refresh and a new sign-in.
- Messages are displayed in chronological order and older history can be loaded.
- Empty groups show a useful empty state.
- Invalid/blank/over-limit messages are rejected clearly.

### Security

- A signed-in user who is not a member cannot read or post to the group.
- A member of Group A cannot read or post to Group B unless separately an active member there.
- A removed or departed member cannot read or post while inactive.
- A client cannot spoof another user's author ID or timestamp.
- A deactivated group rejects new messages and does not expose chat to inactive membership.
- Realtime subscriptions cannot be opened for groups the user is not currently authorized to access.
- No service-role or secret key is exposed to the browser.

### Quality

- `npm run lint`, `npm run typecheck` and `npm run build` pass.
- Automated database tests cover membership isolation, author spoofing, inactive memberships and group deactivation.
- Two-account end-to-end test confirms persistence and real-time delivery.
- No financial transaction or approval is created as a side effect of sending a message.

## 11. Release boundary

This milestone is complete when every active group has a secure, persistent, real-time text conversation and the authenticated group workspace no longer presents demo chat as if it were live. Attachments, notifications, presence, read receipts and message editing are subsequent product decisions, not blockers for the first useful release.
