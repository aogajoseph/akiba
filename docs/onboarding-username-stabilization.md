# Akiba onboarding stabilization
Production target: https://akiba-kappa.vercel.app

## Required Supabase email template configuration
Authentication > Email Templates > Confirm signup: replace the confirmation CTA href with:
`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup`
The code-exchange callback also remains supported for PKCE links containing `?code=...`. The default `{{ .ConfirmationURL }}` may land at the Site URL instead of the app callback, and can leave the browser without a session.

## Flow
Sign up → confirm once → /onboarding → choose unique @username → /onboarding/complete → optionally create Group or open workspace. Existing authenticated users with a profile go straight to workspace.

Username: lowercase ASCII, 3–20 characters, starts with a letter, rest letters/digits/underscore. Availability is debounced and checked against the database. A unique constraint enforces ownership atomically when two people claim a username simultaneously. The availability endpoint requires login and is advisory, not a reservation. No email or profile secrets returned.

## Deployment
The migration `akiba_profiles_unique_usernames` has ALREADY been applied to dedicated Akiba Supabase project; do not rerun. Merge the PR after CI and review, then deploy production. Confirm the Supabase email template and Vercel site URL.

## Known limits / required testing
Group creation still needs an authenticated end-to-end test. The original error is now logged server-side with its PostgREST code and message, rather than being silently discarded. A synthetic RLS insert test could not establish a valid user session; no Group write was committed by that diagnostic. If creation fails, inspect Vercel Function logs for `Akiba Group insert failed` before changing policies.
Test signup, one-time confirmation, username available/taken/race, returning login, Group creation, and cross-user Group isolation. Build/lint have not been run in this environment. Profile photo and username editing are not part of this patch.
