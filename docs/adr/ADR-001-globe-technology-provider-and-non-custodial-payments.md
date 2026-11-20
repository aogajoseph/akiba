# ADR-001: Globe Technologies remains a technology provider; custody and payment execution are delegated

- **Status:** Accepted — permanent architectural constraint
- **Decision date:** 21 November 2026
- **Applies to:** Globe Technologies Ltd, Akiba, all current and future payment integrations, custody arrangements, settlement flows and payout providers
- **Decision owner:** Globe Technologies Ltd
- **Supersedes:** Any proposal that Globe or Akiba should become the custodian or direct operator of group funds

## Context

Akiba coordinates group contributions, financial decisions, records and reconciliation. Its internal ledger is an accounting record; it is not a bank account, a safeguarded client-money account, or evidence that funds are held by a payment institution.

Globe intends to remain a technology company permanently. The company does not intend to obtain a financial-services licence in order to custody customer funds or execute payment transactions itself. Payment services, custody, safeguarding, settlement and payout execution must be provided by appropriately licensed and contracted third parties.

This decision also preserves commercial flexibility: Akiba may integrate with more than one provider and may replace, add or route between partners as its coverage, economics, reliability and legal arrangements evolve.

## Decision

**Globe Technologies is a technology provider, not a financial custodian or payment operator. All custody and payment execution must be delegated to appropriately licensed and contracted third-party partners.**

Accordingly:

1. Globe and Akiba must not take possession, control or custody of group funds, hold customer money in Globe-owned operating accounts, or represent an internal Akiba ledger balance as partner-held cash.
2. A contracted partner is responsible for the regulated custody, safeguarding, settlement and payment execution activities that fall within its permissions and contractual scope.
3. Akiba may provide technology for payment initiation/orchestration, group-level accounting views, instructions, workflow, audit trails and reconciliation only within the legal and contractual model reviewed for the actual arrangement.
4. No provider is presumed to support pooled collections, segregated group balances, named-beneficiary payouts, reversals, refunds, fee quotations, settlement reports or safeguarding merely because it supports one other capability. Capabilities must be verified and contracted individually.
5. Multiple providers must be supported through replaceable adapters and capability/configuration records. Provider-specific API details must not leak into the core ledger, group authorization rules, withdrawal state machine, reservations or member governance.
6. The Safaricom Daraja B2C code currently present in Akiba is a sandbox-only technical exercise. It is not a live payout arrangement, custody model, or authorization to enable production credentials.
7. A sandbox simulator may demonstrate request creation, approvals, reservations, staging and flags. It must never be presented as an actual provider quote, payment instruction, settlement or completed payout.

## Architectural consequences

- The group ledger remains provider-independent and append-only.
- A withdrawal request binds an immutable provider identifier, provider quote reference, quote version, destination reference/fingerprint, fees, currency and amount. The selected partner and its material terms are part of the approval snapshot.
- The core withdrawal workflow owns leadership checks, Creator authority, Admin roster snapshots, approvals/rejections, reservations, two-hour staging, member flags, cancellation and notification events.
- A provider adapter owns only partner-specific concerns: quote acquisition/validation, destination tokenization/validation, payout submission, callback parsing/authentication, status inquiry, idempotency mapping and partner settlement evidence.
- Provider adapters return normalized evidence and outcomes. They do not write Akiba ledger entries, approve requests, release reservations, or mark a withdrawal complete.
- A central orchestration/reconciliation service validates normalized provider evidence and invokes the existing transactional database workflows. Only authoritative partner confirmation may trigger reservation consumption and a completed-withdrawal ledger posting.
- Unknown or contradictory partner outcomes remain unresolved and reserved. A timeout is not a confirmed failure.
- Provider credentials remain server-side, scoped per environment and partner, and are never exposed to clients.

## Live activation gates

No live provider may be enabled until all applicable gates have been satisfied and separately approved:

1. Due diligence confirms the provider's legal identity, regulatory permissions, product scope, safeguarding model and subcontractors.
2. Globe has a signed contract defining funds flow, custody, settlement, payout execution, service levels, fees, liability, disputes, reversals, refunds, complaints, data handling, audit access and termination/portability.
3. Kenyan legal and regulatory counsel has reviewed the actual end-to-end funds flow, Akiba's orchestration role, customer disclosures and Globe's commercial model. This ADR is not a legal opinion or a guarantee of regulatory exemption.
4. Partner technical onboarding and production credentials are complete, with least-privilege secrets management and verified callback/status authentication.
5. End-to-end sandbox tests, concurrency tests, reconciliation controls, incident procedures, monitoring, support ownership and operational runbooks pass.
6. Finance and product owners approve the specific provider, capability set, fee schedule, destination model and launch cohort.
7. Production activation, production migrations, deployments and any changes to funds flow receive explicit authorization; sandbox success alone is insufficient.

## Rejected alternatives

- **Globe becomes a licensed payment service provider:** rejected as inconsistent with the permanent company strategy.
- **Globe holds pooled group funds and pays members directly:** rejected because it places custody and payment execution inside Globe.
- **A single provider hard-coded into the core ledger/workflow:** rejected because it creates lock-in and makes partner replacement invasive.
- **Treating Safaricom B2C sandbox success as proof of a live custody model:** rejected because an API test does not establish partner custody, settlement or regulatory arrangements.

## Review

This ADR is permanent unless Globe's Board/authorized executive governance explicitly amends it. Product or engineering convenience, a provider's API availability, or a sandbox demonstration is not authority to override it.
