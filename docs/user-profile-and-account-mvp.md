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

The preference table and contact table use owner-only RLS. These values are **saved preferences for future profile-sharing surfaces; they do not currently grant anyone else access to contact values**. Do not expose contact values or Auth email through group-member queries, profile queries, client-side joins or public APIs. A future profile-sharing feature must use a viewer-aware server-side projection that checks the viewer's relationship to the subject and enforces each field's preference before returning data.

Public identity fields already used across Akiba (display name, username and avatar) remain distinct from private contact details. The account page includes a saved-profile preview for display name, username, avatar and bio. It explicitly shows contact details as private because cross-user contact projection is not implemented yet; saved visibility preferences must not be presented as effective access grants.

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
- The migration is committed but has not been applied to the linked Supabase project.
- The profile/location/privacy migration was applied to the linked Supabase project on 2026-11-23 and schema/RLS presence was verified. This does not authorize a Production deployment or merge.
- Preview only. No Production deployment or merge is authorized.
