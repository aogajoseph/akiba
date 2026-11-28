# Akiba production polish: trust, usability, and delivery

## Goal

Make Akiba feel like a coherent, dependable product for early users—not a sandbox—by improving clarity, confidence, and speed across the main user journeys.

This is a product-quality initiative, not a visual redesign for its own sake. Each change should help a user understand where they are, what they can do, what happened after an action, and what to do next.

## Product principles

1. **Clarity over decoration** — strong hierarchy, concise labels, understandable actions, and less competing UI.
2. **Confidence at every step** — explain important actions and show reliable success, pending, and failure states.
3. **Fast paths for frequent tasks** — surface the next useful action and remove unnecessary steps.
4. **Consistency across sections** — navigation, spacing, typography, controls, status patterns, and terminology should behave consistently.
5. **Respect real-world stakes** — finance and account actions must communicate status and consequences precisely; never imply money moved when it did not.
6. **Accessible and responsive by default** — keyboard, focus, contrast, reduced-motion, and mobile layouts are part of product quality.

## Areas to audit and improve

- **First impression and onboarding:** explain Akiba's value, make the first successful action obvious, and avoid dead ends.
- **Group overview and navigation:** establish a clear group home, predictable section navigation, useful context, and visible permissions.
- **Contributions and finances:** make balances, activity, statuses, and next steps easy to scan; distinguish recorded, pending, failed, and sandbox actions.
- **Membership and invitations:** make member roles and invite status understandable; make invitation and joining flows feel safe and straightforward.
- **Group chat:** improve readability, message/action affordances, loading and empty states, and continuity with group tasks.
- **Settings and account:** make settings discoverable, explain sensitive controls, and provide clear save/error feedback.
- **Shared UI states:** standardize loading, empty, error, success, disabled, confirmation, and retry patterns.

## Initial audit findings

The first workspace-dashboard pass identified several trust and usability issues:

- The top bar presented a search field visually, but it was a non-interactive placeholder. Replace it with clear workspace context until real search is available.
- The dashboard reported a hard-coded "Profile Complete" status that was not backed by a full profile-readiness check. Remove the unsupported status.
- The updates metric counted only the five notifications fetched for the dashboard. Label it as a recent, limited list instead of implying it is a total.
- The dashboard repeated the brand slogan and group-creation CTA in several places, creating noise. Keep the primary group CTA where it is most useful.
- An "Upcoming & Pending" panel described schedules and approvals as future features but offered no actionable information. Replace it with direct profile/account shortcuts.
- The desktop metric grid assumed four cards. Rebalance it for the three meaningful metrics and retain a deliberate mobile layout.

- The group overview called a static informational card “Contribution progress” despite not showing a calculated progress value. Rename it to a financial overview and direct users to the Finance section for posted contributions, balances, and payment status.

The first implementation slice focuses on these dashboard improvements. The next journey pass clarified onboarding requirements, group review details, membership behavior for shared links, and the M-Pesa approval/status steps. The group overview also needs a clear first-time creator action when leadership is incomplete.

## Journey audit findings

- Onboarding fields were presented without a clear summary of which details are required. State that display name and username are required; photo, bio, phone, and location are optional.
- Group creation review omitted the event location even though it was collected. Include it in the review before creation.
- Group creation described the group as accessible only to invited people, but reusable links allow anyone with the link to request membership. Explain that the Group Creator approves link-based join requests.
- The invitation modal did not explain the difference between email invitations and shared links. Clarify that email invitations are addressed to the recipient and shared links create an approval-based join request.
- The M-Pesa form needed a simpler action sequence: enter amount and number, verify and approve the prompt on the phone, then wait for provider-confirmed status. Preserve all payment and ledger behavior.
- A new Group Creator needs an obvious next action when leadership is incomplete: invite members and appoint the required Group Admins from Membership.

The next implementation keeps these improvements in the current initiative branch and remains limited to UX copy and navigation; financial and membership rules are unchanged.

## Suggested delivery sequence

### Phase 1 — Product audit and journey map
Review the app from the perspective of a new user and a returning group member. Capture friction, confusing copy, visual inconsistency, dead ends, and missing feedback. Rank issues by user impact and implementation risk.

### Phase 2 — Establish a cohesive product shell
Define and apply shared patterns for page headers, navigation, content width, cards/surfaces, buttons, forms, status indicators, alerts, and responsive behavior. Preserve intentional light/dark theme behavior.

### Phase 3 — Polish the highest-value journeys
Prioritize:
1. Sign up / sign in → first group or invitation
2. Group overview → contribution / finance status
3. Invite → join → understand role
4. Group activity/chat → find relevant information
5. Settings → safely update and confirm changes

### Phase 4 — Verify
Run automated checks and review the deployed Preview at desktop and mobile sizes. Validate keyboard/focus, contrast, empty/loading/error states, and critical flows. Keep payment/provider behavior and financial rules unchanged unless a separately reviewed task explicitly requires it.

## Acceptance criteria

- Main screens share a clear, consistent hierarchy and visual language.
- A first-time user can identify the primary action on each key screen without guessing.
- Important actions provide immediate, accurate feedback and recoverable errors.
- No key flow ends in an unexplained blank, disabled, or "coming soon" state.
- Financial and account statuses are accurate and do not overstate completion.
- Layouts work at mobile and desktop sizes; interactive controls are keyboard accessible.
- Changes are validated in CI and in the Preview deployment before merge.

## Out of scope

- Rewriting financial logic, ledger behavior, payment integrations, or payout controls.
- Adding new product capabilities unrelated to reducing user friction or increasing trust.
- A wholesale brand rework before the current user journeys and shared UI patterns have been audited.

## Working approach

Start with a focused screen-by-screen audit and evidence-based prioritization. Implement improvements in small, reviewable slices, preserving existing functionality and keeping the light theme intact when making dark-theme-specific refinements.
