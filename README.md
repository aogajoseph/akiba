# Akiba

Akiba is a Collaborative Financial Platform being developed by Globe Software, a division of Globe Technologies Ltd.

## Current status
The repository is initialized from the CEO-approved Akiba Product Blueprint v1 implementation packets. The first commit establishes the repository; this branch adds the initial dashboard prototype and engineering documentation. The UI currently uses illustrative local data only: there is no authentication, database persistence or live payment integration yet.

## Requirements
- Node.js 20.9 or later
- npm

## Local development
1. Install dependencies: npm install
2. Copy .env.example to .env.local. No environment variables are required for the current prototype.
3. Start the development server: npm run dev
4. Open http://localhost:3000.

## Checks
- npm run lint
- npm run typecheck
- npm run build

## Documentation
- docs/engineering-plan-v1.md — milestone plan and launch gates
- docs/core-domain-dictionary.md — initial shared vocabulary
- docs/requirements-register.md — traceable requirement status
- docs/adr/ — architecture decision records

## Security
Never commit credentials or production environment files. Use server-side authorization and database policies together. Do not enable real payment movement until provider, jurisdiction, compliance, reconciliation and operational controls are approved.
