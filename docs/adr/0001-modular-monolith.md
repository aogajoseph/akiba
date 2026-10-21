# ADR 0001: Start as a Modular Monolith

- **Status:** Accepted as initial engineering direction
- **Date:** 2026-10-21

## Context
Akiba has connected domains: identity, membership, governance, payments, ledger, communication, reports and audit. Distributed services would add operational cost before usage patterns and team boundaries are proven.

## Decision
Start with one Next.js application and one PostgreSQL database, organized into explicit domain modules and transaction boundaries. Avoid cross-module shortcuts that bypass business rules.

## Consequences
Lower deployment and operational complexity with shared database transactions. Modules must retain clear ownership of invariants. This is not a commitment to microservices later.
