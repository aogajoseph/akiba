# Akiba User Profile and Account MVP

**Status:** Implementation foundation on `feat/user-profile-and-account`. Not production-ready until profile screens, controlled profile reads, tests, and deployment review are complete.

## Product boundary

- **Akiba User** is the person's identity: display name, username, optional profile photo, optional bio, and personal information.
- **Akiba Account** is the person's private relationship with Akiba: authentication email, credentials, sessions, and account security.
- **Akiba Group** remains a separate shared space with its own membership, leadership, conversations, finance, and settings.

## MVP profile fields

### Identity
- Display name — required; 1–60 characters.
- Username — required; unique; existing format `^[a-z][a-z0-9_]{2,19}$`.
- Profile photo — optional; existing public avatar bucket and user-scoped upload path.
- Bio — optional; maximum 160 characters.

### Personal information
- Email — required by Supabase Auth. Email changes must use `auth.updateUser({ email })` and the configured confirmation flow. Never copy Auth email into the public profile table.
- Phone number — optional; stored in `akiba_user_contacts`; existing E.164 validation and owner-only RLS remain.
- Location — optional, user-entered general location (for example, city/region). Do not collect precise coordinates or live location in this MVP.

## Independent privacy preferences

Email, phone, and location each have an independent visibility value:
- `only_me` (default)
- `group_members`
- `all_akiba_users` (authenticated Akiba users only; not the public internet)

No presets or global toggle are included.

The new `akiba_user_privacy_settings` table stores preferences with owner-only RLS. The contact table continues to expose contact values only to their owner. These preference values are **not permission to read the underlying values directly**. Cross-user profile reads must use a controlled server-side projection that checks the viewer's relationship to the subject and applies each field's visibility before returning data. Do not widen contact-table RLS or expose `auth.users` email to clients.

## Historical identity

Existing records should continue to reference stable user IDs and retain their existing actor/username snapshots where present. Editing a profile must not rewrite historical finance or group activity.

## Scope exclusions

No occupation, gender, nationality, date of birth, exact location, live location, public-web profile, account deletion workflow, or broad privacy presets in this MVP.

## Implementation sequence

1. Extend profile setup and add a dedicated profile view/edit screen.
2. Add private email change flow using Supabase Auth confirmation.
3. Add optional phone and general location management.
4. Add independent privacy controls and safe, viewer-aware profile projection.
5. Replace disabled workspace Account links with functional Profile and Settings navigation.
6. Add tests for owner access, cross-user denial, visibility audiences, email confirmation, and profile update validation.

## Safety and deployment

- This branch is separate from the Group finance branch and is based on `main`.
- No production migration has been applied by this work.
- No production deployment or merge is authorized.
- Do not consider privacy controls complete until every read path enforces them server-side.
