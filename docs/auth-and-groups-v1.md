# Authentication and persistent Groups v1

**Status:** Implementation branch for review. Not production-verified until Vercel build and authenticated two-user tests pass.

## Included
- Supabase SSR server client using cookies and a Next.js 16 `proxy.ts` session refresh.
- Email/password signup and sign-in, email confirmation callback, and sign-out.
- Authenticated workspace that reads Groups from Akiba Supabase.
- Server-side Group creation with validation. Group creation is atomic with the creator's initial admin membership through the database trigger.
- Persistent Group details page verifies the user's active membership.
- Publishable key only; no service-role key in client configuration.
- RLS policy correction migration for Group messages and activity.

## Deployment configuration
Set these Vercel environment variables for the Akiba project:
- `NEXT_PUBLIC_SUPABASE_URL`: Project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key.
- `NEXT_PUBLIC_SITE_URL`: canonical deployed Akiba URL, including https.

In Supabase Authentication URL configuration, set the Site URL to the deployed Akiba URL and allow redirect URLs for the production `/auth/callback` and local development `http://localhost:3000/auth/callback` as needed. Ensure email confirmation settings match the desired launch policy.

## Security checks already completed
- Four application tables have RLS enabled.
- Group reads, message select/insert and activity select policies explicitly correlate membership to the current row's Group.
- Security advisors returned no findings after the RLS correction.
- Migration history contains the initial schema plus two RLS-correction migrations.

## Still required
- Run install, lint, typecheck, and production build in CI/Vercel.
- Complete signup/email-confirmation/sign-in flow against production configuration.
- Test with two real test accounts: each can only see its own Groups; user A cannot read user B's Group or Group messages.
- Verify unauthenticated requests are denied and direct access to another user's Group returns not-found.
- Verify atomic rollback by attempting invalid Group creation in a controlled test.
- Review user-facing errors and rate limits before launch.

## Not implemented
Invitations, membership management, persistent chat UI, timeline writers, notification delivery, financial ledger, contributions, withdrawals and real payments. The older homepage and `/groups/[groupId]` collaboration preview still use demo data; use `/workspace` for the authenticated backend workspace in this iteration.
