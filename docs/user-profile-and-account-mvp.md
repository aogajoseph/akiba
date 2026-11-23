# Akiba User Profile and Account Settings

**Branch:** `feat/user-profile-and-account`  
**Status:** Preview implementation; CI and manual acceptance required before the scope is locked.

## Product boundary

- **Akiba User** is a person's in-product identity: display name, username, optional profile photo and optional bio.
- **Personal information** contains the user's authentication email, optional phone number and optional general location.
- **Akiba Account** covers sign-in email changes, password updates and signing out other sessions.
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

## Account controls

- Change sign-in email through Supabase Auth confirmation.
- Update password for the authenticated account; minimum 10 characters.
- Revoke other refresh-token sessions while retaining the current session. Other access tokens can remain usable until expiry.
- Account deletion and session inventory/device naming are not part of this milestone.

## Historical identity

Editing a profile must not rewrite historical finance, group activity, notification or message snapshots. Stable user IDs remain the relationship key.

## Tests and acceptance

- Clean-database migration run.
- SQL regression test verifies owner-only contact and privacy reads/writes, cross-user update denial, and protection of `phone_verified_at`.
- CI lint, TypeScript, Edge Function typecheck and production build.
- Preview acceptance for onboarding, profile edits, avatar add/change/remove, phone/location save/clear, privacy preference save, email-change confirmation, password update and signing out other sessions.
- Cross-user profile/contact disclosure must remain closed until a separately reviewed projection and its authorization tests are implemented.

## Safety and deployment

- This branch is separate from the Group finance branch and based on `main`.
- The profile/location/privacy migration was applied to the linked Supabase project on 2026-11-23 and its schema/RLS presence was verified. The viewer-aware profile projection migration is committed on this branch and still requires CI/Preview validation before any linked-project application.
- The profile/location/privacy migration was applied to the linked Supabase project on 2026-11-23 and schema/RLS presence was verified. This does not authorize a Production deployment or merge.
- Preview only. No Production deployment or merge is authorized.
