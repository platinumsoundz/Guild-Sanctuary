# Sanctuary Beta and Automated Development Operating Plan

Status: Proposed planning document — not an authorization to merge, deploy, enable payments, or enable token spending.
Updated: 2026-10-26

## 1. Confirmed product-owner direction

- Beta access: open registration, capped at the first 100 beta accounts.
- Early-account reward: retain the existing proposal of 1,000 Sanctuary Tokens for each of the first 100 eligible, verified new accounts after beta opens. This supersedes the newer 500-token suggestion in the discussion; confirm eligibility and the intended internal valuation before implementation.
- Currency: one shared Sanctuary Token wallet for eligible Sanctuary features and supported games. Game-specific scores, levels, and gameplay cash may remain separate.
- Automation autonomy: automatically merge only explicitly classified low-risk changes after all required checks pass. Sensitive changes require human approval. Production deployment is a separate approval gate.
- Schedule target: hourly external scheduling if a suitable free-tier mechanism is available and its limits are acceptable. ChatGPT's built-in recurring automations do not currently support hourly schedules.
- First engineering priority: accounts, database security, backups, and persistent community features.
- Beta scope must also include a usable Games Hub, token shop, the proposed Sanctuary redesign, and working purchase/donation flows for the owner's own testing.
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
- Implement an atomic first-100 verified-account reward of 1,000 tokens each, with a database-enforced cap and unique grant record.
- Decide whether beta eligibility is based on verified registration order, and define duplicate, deleted, banned, and restored accounts.
- Complete shop catalogue, approved prices/effects, purchase fulfilment, entitlement ownership, refunds/reversals, and account-deletion policy.
- Keep direct spending disabled until end-to-end purchase, retry, reversal, and access-control tests pass.

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

- First make flows operational in isolated staging with Stripe test mode, mode-matched test Price IDs, test webhook secrets, signature verification, idempotent fulfilment, and account association.
- Donations should be clearly voluntary and separate from token balances unless a specific donation benefit is explicitly approved. Do not silently award tokens for donations.
- Verify successful, cancelled, unpaid, duplicate-webhook, invalid-signature, wrong-price/mode, refund/dispute, and retry paths.
- Do not enable live charges until the owner explicitly approves the live-money switch after reviewing legal terms, refund/chargeback handling, support process, security checks, and staging evidence.
- “Live for testing” must be clarified as either functional test-mode staging or real-money production transactions. The safe default is test mode first.

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

## 6. Open decisions before consequential implementation

1. Payments and donations: does “live so I can test” mean fully working Stripe test-mode staging first, or do you intend to authorize real-money charges immediately? Recommended: test mode first, then a separate explicit live switch.
2. Donations: should they be purely voluntary support with no token/item reward? Recommended: yes, unless a benefit is deliberately approved.
3. Token valuation: blueprint says 1,000 tokens for first 100 accounts, while the recent discussion described 500 tokens as £5. Confirm whether 1,000 tokens is intended to represent £10 internally, another value, or no fixed cash equivalence. Free beta tokens should not be presented as redeemable cash.
4. Beta cap: should the first 100 mean the first 100 verified, non-duplicate accounts after beta is formally opened? Recommended: yes.
5. Registration: is email verification enough for eligibility, or should an additional anti-abuse control be required?
6. Token spending: confirm initial eligible sinks (profile cosmetics/themes/colours/borders and specific approved game items) and whether any games may ever convert tokens into native cash/credits. Recommended: no conversion, transfers, trading, or cash-out for beta.
7. Automation platform: approve the proposed external hourly runner only after confirming it can use repository-scoped credentials, safe concurrency, required checks, notifications, and a free tier. No live secrets should be placed in logs or client code.
8. Auto-merge boundary: confirm that only explicitly allowlisted low-risk changes may auto-merge, and that all database/security/payment/game-economy changes require approval.
9. Hosting: confirm staging and production targets; current deployment evidence mentions Cloudflare Workers while parts of the blueprint rely on Vercel-specific environment guards.
10. Legal and account lifecycle: confirm the operator/contact details, applicable jurisdiction, age policy, privacy/retention, terms acceptance, account deletion, token history, and refund/dispute policy before production accounts or live money.

## 7. Immediate next action

Perform a read-only inventory of current GitHub branches/PRs, CI status, Supabase migrations/tables/advisors/Edge Functions, deployment targets, and payment configuration. Produce a dependency map and staged checklist. Do not merge, deploy, apply pending migrations, activate spending, enable live payments, or start recurring automation until the inventory and open decisions are reviewed.
