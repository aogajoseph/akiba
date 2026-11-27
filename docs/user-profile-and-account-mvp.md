# Akiba User Profile and Account Settings

**Branch:** `feat/user-profile-and-account`  
**Status:** Preview implementation; CI and manual acceptance required before the scope is locked.

## Product boundary

- **Akiba User** is a person's in-product identity: display name, username, optional profile photo and optional bio.
- **Personal information** contains the user's authentication email, optional phone number and optional general location.
- **Akiba Account** covers appearance preferences, group membership overview, sign-in email/password/session controls, subscription status (future release), and account lifecycle.
- **Akiba Group** remains a separate shared space with its own membership, leadership, conversations, finance and settings.

## Profile fields

### Identity
- Display name — required; 1–60 characters.
- Username — required; unique; format `^[a-z][a-z0-9_]{2,19}$`.
- Profile photo — optional; JPG, PNG or WebP; maximum 3 MB; user-scoped storage path.
- Bio — optional; maximum 160 characters.

### Personal information
- Email — supplied by Supabase Auth. Email changes use `auth.updateUser({ email })` and the configured confirmation flow. Never copy the Auth email into the public profile table.
- Phone number — optional; E.164 format; stored in `akiba_user_contacts`.
- Location — optional, user-entered general location (city/region only); maximum 120 characters. Do not collect precise coordinates or live location.

## Privacy preferences and current disclosure boundary

Email, phone and location each have an independent saved preference:
- `only_me` (default)
- `group_members`
- `all_akiba_users` (authenticated Akiba users only; never the public internet)

The preference table and contact table retain owner-only RLS. Cross-user profile access is provided only through `akiba_get_profile_by_username`, a narrowly scoped authenticated `SECURITY DEFINER` projection. It validates the viewer, never accepts an arbitrary subject user ID, and returns email, phone and location values only when each field's visibility preference permits that viewer. `group_members` requires a shared active group; the owner-only preview models a fellow active group member when the owner belongs to an active group. The RPC does not return raw privacy settings or expose contact-table rows. Do not query or join contact tables directly from client-facing profile or group-member code.

Public identity fields already used across Akiba (display name, username and avatar) remain distinct from private contact details. The account page includes a preview driven by the same viewer-aware projection used by other members. Email, phone and location appear as individual rows, showing their values when visible and `Private` otherwise. Other signed-in members can open profiles from group overview and membership directories at `/workspace/people/[username]`.

## Account Settings

The account settings page is separate from Edit Profile and Group Settings.

- **Appearance:** light, dark or system default. The theme preference is stored in `akiba_user_settings` and applied across the workspace.
- **My Groups:** lists active memberships with group avatar, name, the user's role and group lifecycle status; each row links to the group.
- **Account Access:** change sign-in email through Supabase Auth confirmation, update the authenticated account password (minimum 10 characters), and revoke other refresh-token sessions while retaining the current session. Other access tokens may remain usable until expiry.
- **Subscription:** explicitly marked Coming soon. No billing or payment integration is included.
- **Danger Zone:** account deletion requires a recent sign-in, an exact confirmation phrase and acknowledgement. The server rechecks group ownership and role gates.

### Account deletion policy

- A user cannot delete their account while they are the Group Creator of any group that is not fully deleted.
- An eligible group with no financial history, unresolved activity, held funds or balance may be permanently deleted through the existing group deletion workflow.
- A group with financial history must preserve its financial records. The Creator may resolve outstanding activity and deactivate it; the six-month retention worker must complete deletion before account deletion is allowed.
- A user who is a Group Admin must step down in every group first. The database rechecks this rule during account deletion.
- Ordinary Members may delete their account without leaving every group. Memberships are removed and personal attribution is anonymised where needed, while immutable financial records and historical group content are retained.
- Internal moderator accounts must be transferred/offboarded by support before account deletion.

## Historical identity

Editing a profile must not rewrite historical finance, group activity, notification or message snapshots. Stable user IDs remain the relationship key. Account deletion anonymises identity-dependent references where required; immutable financial journal rows are never rewritten or deleted.

## Tests and acceptance

- Clean-database migration run, including account settings and account-deletion safety migrations.
- Account settings RLS test verifies theme preferences are owner-only.
- Account deletion safety test verifies Creator ownership is a hard gate and ordinary-member message attribution is anonymised while historical messages are retained.
- SQL regression test verifies owner-only contact and privacy reads/writes, cross-user update denial, and protection of `phone_verified_at`.
- CI lint, TypeScript, Edge Function typecheck and production build.
- Preview acceptance for onboarding, profile edits, avatar add/change/remove, phone/location save/clear, privacy preference save, theme switching and persistence, group list and roles, email-change confirmation, password update, signing out other sessions, and all account-deletion gate states.
- Cross-user profile/contact disclosure must remain closed until a separately reviewed projection and its authorization tests are implemented.

## Safety and deployment

- This branch is separate from the Group finance branch and based on `main`.
- The profile/location/privacy migration was applied to the linked Supabase project on 2026-11-23 and its schema/RLS presence was verified. The viewer-aware profile projection and account-settings migrations are committed on this branch and still require CI/Preview validation before any linked-project application.
- No account-settings or account-deletion migration has been applied to the linked Supabase project. This does not authorize a Production deployment or merge.
- Preview only. No Production deployment or merge is authorized.
