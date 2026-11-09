# Akiba Landing Page Audit — CEO Product Direction

**Audit basis:** Original landing page at `main` commit `e2cbe678cf1b0330c177dd919a6da0880b01998d` and the latest CEO and Research direction recorded for Akiba.  
**Scope:** Audit and recommendations only. No landing page implementation changes are included in this PR.

## Product direction to communicate

Akiba is a **finance coordination platform for people planning events and shared financial goals**. A group is organised around one purpose, with its own people, contribution target, financial activity and conversations.

### V1 product model

- Two active group types: **Event** and **Goal**.
- One **Group Creator**, who creates and leads the group, manages settings, appoints or demotes Admins, and initiates withdrawal requests.
- **Three appointed Admins**. All three must approve a Creator's withdrawal request before it can proceed. Any rejection ends that request.
- **Members** participate, communicate, contribute and can flag a proposed payout as suspicious.
- A suspicious-payout flag pauses a payout for review, including after unanimous Admin approval if the payout has not yet been executed.
- Maximum **100 people per V1 group**: one Creator, three Admins and up to 96 other Members.
- Appointments take effect immediately. An Admin demotion has a 24-hour notice period.
- No Akiba subscription charge in V1. Groups bear applicable transaction costs, which should be disclosed before payment confirmation.
- A group cannot be deleted while a transaction is pending or money remains in its group balance. Financial and audit records must be retained as required.

V2/V3 capacities and subscription monetisation are future roadmap items and should not be presented as current plans or prices.

## Audit findings

| Area | Previous public content | Recommendation for later revision |
|---|---|---|
| Product definition | Finance coordination for events or goals, but not clearly framed around the group's financial purpose | State the platform definition directly and make Event and Goal the two product types |
| Governance | Creator called Group Admin; two Sub-admins | Use Group Creator, three appointed Admins and Members consistently |
| Withdrawal approvals | Two Sub-admin approvals | State unanimous approval by all three Admins; any rejection terminates the request |
| Membership capacity | Pricing cards advertised 20, 200 and 2,000 members | State V1's single 100-person total group limit; do not advertise future tiers |
| Monetisation | Personal and group subscription plans with KSh prices | Remove or revise pricing section; explain V1 has no Akiba subscription charge and provider transaction costs may apply |
| Member protection | No suspicious-payout flagging described | Explain the member flag as a protective pause for review, not a final finding |
| Money custody | Claimed group funds are held by authorised financial institutions | Use accurate wording based on the actual payment-provider arrangement; do not imply escrow, deposit or guarantee |
| Closure | Creator could close or delete when purpose complete | Explain pending transactions, remaining balances and retention of financial records |
| Payment partners | A section titled “Partners” showed provider logos, despite a code comment saying no partnership was implied | Verify actual relationships and avoid implying commercial partnerships without approval |
| Navigation | Pricing link and Pricing section | Revisit pricing navigation only after the approved V1 offer is clear |

## Files and sections to review

- `Hero.tsx`: product definition and Event/Goal framing.
- `Features.tsx`: feature narrative and emphasis.
- `HowItWorks.tsx`: end-to-end group lifecycle.
- `GettingStarted.tsx`: onboarding and role setup.
- `RolesAndProtocols.tsx`: roles, withdrawal approval, member flagging and closure safeguards.
- `FAQ.tsx`: product, governance, custody, pricing, capacity and closure answers.
- `AppAppBar.tsx` and `Footer.tsx`: navigation and company/product description.
- `MarketingPage.tsx`: section order and which components appear.
- `Pricing.tsx` and `LogoCollection.tsx`: review content and claims before deciding whether to retain, revise or remove them.

## Accuracy and implementation caveats

This is an audit, not an implementation approval. It does **not** establish that the described workflows are already implemented or production-ready. The repository previously had a legacy `admin` / `sub_admin` role model, the group workspace labelled Chat as forthcoming, and the new member-flag/dispute workflow was not verified. Any public claims must be checked against the application before publication.

The exact independent process for resolving a suspicious-payout flag remains an open governance/operations detail. The actual custody/settlement arrangement for group money must be confirmed with Legal and the payment provider before stronger security or safeguarding claims are made.

## Recommended revision approach

Review the landing page one section at a time. Agree on the purpose and approved message for a section before changing its component. Keep each approved section change isolated and reviewable; do not restructure or remove other sections without explicit approval.
