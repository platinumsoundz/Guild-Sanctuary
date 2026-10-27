# Sanctuary Beta and Automated Development Operating Plan

Status: Proposed planning document — not an authorization to merge, deploy, enable payments, or enable token spending.
Updated: 2026-10-26

## 1. Confirmed product-owner direction

- Beta access: open registration, capped at the first 100 beta accounts.
- Early-account reward: a one-time 1,000 Sanctuary Token testing-balance bonus for each of the first 100 eligible, verified, non-duplicate accounts after beta formally opens. This is a testing balance with **no fixed cash equivalence** and must not be presented as cash, redeemable value, or a cash-out entitlement.
- Currency: one shared Sanctuary Token wallet for eligible Sanctuary features and supported games. Game-specific scores, levels, and gameplay cash may remain separate.
- Automation autonomy: automatically merge only explicitly classified low-risk changes after all required checks pass. Sensitive changes require human approval. Production deployment is a separate approval gate.
- Schedule target: hourly external scheduling if a suitable free-tier mechanism is available and its limits are acceptable. ChatGPT's built-in recurring automations do not currently support hourly schedules.
- First engineering priority: accounts, database security, backups, and persistent community features.
- Beta scope must also include a usable Games Hub, token shop, the proposed Sanctuary redesign, and working purchase/donation flows for the owner's own testing.
- Purchases and donations must first work in an isolated **Stripe test-mode staging** environment. This is not authorization for live-mode configuration or real-money charges.
- Donations are voluntary support only, with no Sanctuary Token, item, or other reward. Keep donations separate from the token wallet.
- Guest access should remain available for exploration, with privileged actions requiring verified authentication.

## 2. Product and system principles

1. One Sanctuary application and identity model; avoid separate accounts for individual games.
2. Supabase is the authoritative database for account-linked community data, token ledger/balances, entitlements, reward grants, game registrations, and secure game sessions.
3. Sanctuary Tokens are the shared platform currency. Game-native scores or cash are not interchangeable with tokens unless explicitly designed and approved.
4. All balances, rewards, spending, fulfilment, and eligibility decisions must be enforced server-side and recorded idempotently. Never trust client-provided user IDs, prices, amounts, eligibility, or fulfilment claims.
5. Games integrate through a documented, versioned module contract and least-privilege session bridge. A game must not receive Supabase service credentials or the user's general access token.
6. The Games Hub should support existing 2D/3D games and later modular casual games (e.g. solitaire, word search, crosswords, Snake) without creating a separate wallet or identity per game.
7. Guest mode remains read-only for account-linked, financial, and privileged actions.
8. Keep existing working URLs as fallbacks while hosting is consolidated. No domain purchase is planned.
9. Maintain the master blueprint and this operating plan when architecture, dependencies, or release status changes.
10. A passing CI run is evidence for the checked commit only; it is not proof that production services, migrations, secrets, payments, or real-user workflows work.
11. A test-mode staging checkout must be isolated from production data and money, use mode-matched test Price IDs and webhook secrets, and validate signature checking and idempotent fulfilment.
12. No merge, deployment, token-spending activation, live Stripe configuration, or real-money charge is authorized by this plan. Obtain explicit owner authorization for each consequential release/action.

## 3. Proposed roadmap order

### Track A — establish trustworthy foundations (first priority)

- Inventory every repository, deployed URL, hosting target, branch, open PR, database, Edge Function, environment, and dependency.
- Map each feature to its authoritative data store and identify demo/local-only adapters.
- Establish the canonical Supabase project and document schema/migration drift, RLS, grants, storage policies, Edge Functions, secrets, and backup/restore procedure.
- Finish real account creation, verification, session lifecycle, profile provisioning, and account deletion behavior.
- Wire persistent repositories for feeds, comments/likes, Shorts engagement, events/RSVPs, direct/group messaging, settings, and moderation; verify policies and abuse controls.
- Define staging and production environments so test data and test payments cannot affect production users or money.
- Verify recovery/restore and migration-forward/rollback procedures before beta data is relied on.

### Track B — token economy and beta rewards

- Reconcile repository token migrations and the live Supabase schema; inspect before applying any pending migrations.
- Complete one server-authoritative wallet ledger, balance history, idempotency, and transaction audit trail.
- Implement an atomic first-100 verified-account reward of 1,000 tokens each, with a database-enforced cap and unique grant record. Treat it as a testing balance with no fixed cash equivalence.
- Eligibility is the first 100 verified, non-duplicate accounts after beta opens. Define robust server-side ordering and treatment of deleted, banned, duplicate, and restored accounts before implementation; do not let clients claim eligibility.
- Complete shop catalogue, approved prices/effects, purchase fulfilment, entitlement ownership, refunds/reversals, and account-deletion policy.
- Keep direct spending disabled until end-to-end purchase, retry, reversal, and access-control tests pass.
- Do not describe free beta tokens as money, cash-equivalent, or redeemable.

### Track C — Games Hub and modular game integration

- Document a versioned Game Module Contract: game ID, display metadata, version, launch URL/build, allowed capabilities, session issuance, balance query, purchase request/receipt, session expiry/revocation, and error reporting.
- Register games in a controlled catalogue; do not trust arbitrary iframe origins or client-supplied game IDs.
- Verify iframe origin and source, use short-lived scoped game sessions, validate messages, and never pass general Supabase credentials to a game.
- Implement the wallet listener and purchase-receipt handling in each existing game repository only within an explicitly authorized combined edit/test batch.
- Keep game-specific scores/progression separate from Sanctuary Tokens unless an explicit conversion rule is approved.
- Make casual games independently importable and sandboxed; avoid adding a new bespoke wallet integration for every game.

### Track D — redesign, shop, and working beta flows

- Finalize the Sanctuary redesign/navigation and implement the Games Hub and token shop in the unified app.
- Preserve guest exploration while requiring a real verified account for token grants, purchases, donations associated with an account, and other privileged actions.
- Provide understandable balance/history, item ownership, purchase status, donation status, loading/error/empty states, and support/report paths.
- Preserve existing working app/game URLs as fallbacks until the new routes are validated.
- Check accessibility, mobile/responsive behavior, performance, moderation and privacy implications before beta release.

### Track E — purchases and donations for owner testing

- First make purchase and donation flows operational in isolated staging with **Stripe test mode**, mode-matched test Price IDs, test webhook secrets, signature verification, idempotent fulfilment, and account association where appropriate.
- Donations are voluntary support only. They grant no tokens, items, balance increase, or other reward, and remain separate from the Sanctuary wallet.
- Verify successful, cancelled, unpaid, duplicate-webhook, invalid-signature, wrong-price/mode, refund/dispute, and retry paths.
- Do not configure live-mode payment credentials, expose live payment links, or enable real-money charges unless the owner separately and explicitly authorizes that switch after reviewing legal terms, refund/chargeback handling, support process, security checks, and staging evidence.
- “Working for testing” means functional Stripe test-mode staging first, not live-money production transactions.

### Track F — beta readiness and feedback

- Invite the owner and a small friend group to test staging before opening capped public registration.
- Define the registration cap, reward eligibility, beta feedback/bug-report path, incident contact, and data retention.
- Run a release checklist covering auth, persistence, RLS, token ledger, rewards, shop, games, donations, responsive UI, logs, backup restore, and rollback.
- Expand to open registration only after the release gate is explicitly approved.

## 4. Proposed automated development loop

1. Trigger hourly using a free external scheduler only after its limits and reliability are confirmed. Use non-overlapping concurrency and a bounded run time.
2. Read the roadmap, master blueprint, issue/PR state, latest CI status, and relevant project files.
3. Select exactly one highest-priority unblocked task; do not repeat completed work or skip unresolved decisions.
4. Classify the task before editing:
   - Low risk: documentation, isolated UI polish, tests, non-sensitive refactors.
   - Approval required: auth/RLS, schema or data migrations, token balances/grants/spending, payment/donation flows, secrets, account deletion, privacy/terms, production config, cross-repository protocol changes, or deployment.
5. Work in an isolated branch and open/update a reviewable PR. Run relevant lint/typecheck/build/unit/integration/security checks where available.
6. Auto-merge only low-risk changes from an explicit allowlist after required checks, branch protection, and conflict/dependency checks pass. If any classification is ambiguous, fail closed and request review.
7. Never automatically deploy, alter live payment mode, expose secrets, run destructive production migrations, grant/spend tokens, change permissions, or edit multiple game repositories as an unreviewed batch.
8. Update roadmap status, evidence, changed files, test results, unresolved decisions, and the next task. If blocked, record the blocker and stop rather than repeatedly retrying.
9. Produce a daily digest of completed changes, failed checks, pending approvals, cost/usage concerns, and the next recommended item.
10. Add a kill switch, run logs, idempotent task claims, concurrency controls, rate limits, and notification on failure before enabling recurring runs.

## 5. Proposed change-risk and approval policy

| Change class | Automation policy |
| --- | --- |
| Documentation, roadmap maintenance, isolated tests | May commit and merge after checks if no sensitive behavior changes |
| Low-risk isolated UI changes | May merge only from a reviewed allowlist with required checks and a clean diff |
| Auth, permissions, RLS, migrations, database grants, data deletion | Human approval required; staging validation before production |
| Token issuance, spending, entitlements, shop prices, game purchase protocol | Human approval required; no automatic production activation |
| Stripe, donations, live Price IDs, webhook secrets, refunds/chargebacks | Human approval required; test mode only until explicit live approval |
| Hosting, DNS, domains, production deployment, secrets, service credentials | Human approval required |
| Changes spanning multiple game repositories | Require an explicitly authorized combined edit-and-test batch |

## 6. Remaining decisions before consequential implementation

1. Registration: is email verification enough for eligibility, or should an additional anti-abuse control be required?
2. Token spending: confirm initial eligible sinks (profile cosmetics/themes/colours/borders and specific approved game items). No conversion to game-native cash/credits, transfers, trading, marketplace, or cash-out is approved for beta.
3. Automation platform: approve the proposed external hourly runner only after confirming it can use repository-scoped credentials, safe concurrency, required checks, notifications, and a free tier. No live secrets should be placed in logs or client code.
4. Auto-merge boundary: only explicitly allowlisted low-risk changes may auto-merge; all database/security/payment/game-economy changes require approval.
5. Hosting: confirm staging and production targets; current deployment evidence mentions Cloudflare Workers while parts of the blueprint rely on Vercel-specific environment guards.
6. Legal and account lifecycle: confirm the operator/contact details, applicable jurisdiction, age policy, privacy/retention, terms acceptance, account deletion, token history, and refund/dispute policy before production accounts or live money.

## 7. Immediate next action

Perform a read-only inventory of current GitHub branches/PRs, CI status, Supabase migrations/tables/advisors/Edge Functions, deployment targets, and payment configuration. Produce a dependency map and staged checklist. Do not merge, deploy, apply pending migrations, activate spending, enable live payments, or start recurring automation until the inventory and release gates are reviewed and the relevant actions are explicitly authorized.
