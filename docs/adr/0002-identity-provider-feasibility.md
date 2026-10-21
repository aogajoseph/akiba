# ADR 0002: Identity Provider Feasibility Check

- **Status:** Proposed; implementation spike required
- **Date:** 2026-10-21

## Context
The blueprint calls for verified phone and email, plus sign-in using username, email or phone. Provider defaults may not satisfy all flows safely without an identity-resolution layer.

## Decision
Supabase Auth is the initial candidate, but username login and combined verification are not assumed to be drop-in features. Validate the flow before production identity work.

## Constraints
No account enumeration; never store plaintext passwords; enforce verification and authorization server-side; keep secrets out of client bundles and source control.

## Acceptance test
Demonstrate safe login resolution for each identifier, verification-state handling, abuse controls and generic failure messages that do not reveal whether an account exists.
