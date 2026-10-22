# Akiba

Akiba is a Collaborative Financial Platform being developed by Globe Software, a division of Globe Technologies Ltd.

## Current implementation

- The public homepage and Group collaboration page still contain illustrative prototype data.
- The authenticated workspace uses Supabase Auth and lists real Groups from the dedicated Akiba Supabase project.
- Signed-in users can create persistent Event and Goal Groups. The database trigger creates the creator's initial admin membership in the same transaction.
- Group data is protected by PostgreSQL Row Level Security (RLS).
- Invitations, membership administration, real chat, activity event writing, contributions, withdrawals and payments are not yet implemented.

## Requirements

- Node.js 20.9 or later
- npm

## Local development

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL` from your Akiba project and local site URL.
4. In Supabase Auth, configure the site URL and redirect URL for `http://localhost:3000/auth/callback` and your production `/auth/callback` URL.
5. Start the server: `npm run dev`
6. Open `http://localhost:3000`, then use Sign in or My Groups.

## Vercel environment variables

Configure the same three variables in the Akiba Vercel project's environment settings. Use the Supabase **publishable** key. Do not add a service-role or secret key to any `NEXT_PUBLIC_*` variable.

## Checks

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## Security

Server-side actions verify the current user, while database RLS enforces row access. The public homepage remains a demo and must not be interpreted as account data. No financial activity is enabled. Do not enable real payment movement until provider, jurisdiction, compliance, reconciliation and operational controls are approved.
