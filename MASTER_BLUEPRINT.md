# The Sanctuary — Master Blueprint

Last updated: 2026-10-24

## Product decision

The Sanctuary is one community system for reflection, growth, care, and connection. The former Guild Hall is retired. There is no world selector, no world-specific navigation, and no application-facing `WorldType` contract.

## Architecture

- `src/app/` owns Next.js App Router entry points.
- `src/context/AppContext.tsx` owns client navigation and the current session. It does **not** own world state.
- `src/components/AppWorkspace.tsx` composes the authenticated feature surface; `Navigation.tsx` is a single Sanctuary navigation shell.
- `src/types/database.ts` contains shared entity contracts. Posts, Shorts, events, and conversations are community-wide entities.
- `src/modules/` owns feature UI, local state, and service APIs. Modules use their `index.ts` public entry points rather than sibling internals.
- `src/services/` owns shared integrations: Supabase clients, public-profile lookup, account deletion, and media helpers.
- `src/proxy.ts` is the Next.js 16 proxy (the renamed middleware convention). It refreshes Supabase session cookies and does not redirect.

## Current feature ownership

| Module | Scope | Current persistence |
| --- | --- | --- |
| `auth` | Email link/OTP sign-in and sign-up, optional TOTP, session lifecycle | Supabase Auth when configured; browser-local demo fallback otherwise |
| `feeds` | Unified post feed, media, likes, comments | Supabase when configured; in-memory demo fallback |
| `shorts` | Unified short video feed and engagement | Supabase when configured; in-memory demo fallback; aggregate likes/counts use the Shorts engagement RPCs |
| `events` | Community events, RSVPs, likes, comments | Supabase when configured; in-memory demo fallback; aggregate counts via `event_rsvp_counts` |
| `messages` | Direct one-to-one/group conversations and threads | Supabase repository when configured; in-memory demo fallback. Staging RLS/Realtime checks remain unfinished |
| `profiles` / `settings` | Profile, discovery, privacy, preferences, encrypted vault | Supabase when configured; browser-local demo fallback |
| `moderation` | Report UI and moderator workflow | Supabase RPCs; navigation visible only to moderators/admins |
| `support` | Optional community support and external donation link | Donation link is returned only on explicitly enabled Vercel Production deployments; no app-side reconciliation |
| `economy` | Persistent token wallet, bundle purchase foundation, 100-token signup grant, permanent profile cosmetics (frames, effects, emoji badges, curated GIF banners), and the Token Shop catalogue page | Supabase wallet/ledger/spend/cosmetics migrations and Edge Functions staged; checkout disabled by default; transfers/trading/marketplace/cash-out still deferred |
| `games` | In-app Games hub that launches The 5 Sleeves games on their existing hosts | No merged runtime, shared login, or shared wallet yet; rendering is client-only |
| `locations` | Experimental radius filtering | Not mounted; no durable location store |
| `ads` | Consent-gated web display slots plus native AdMob entry point | AdSense requires an explicit flag plus a production-marked deployment (`VERCEL_ENV=production` or `NEXT_PUBLIC_DEPLOYMENT_ENV=production`); IDs come from public build-time environment; native module excluded from web bundle |

## Navigation pages

The single Sanctuary navigation exposes Feed, Events, Discover, Messages, Shorts, Games, Profile, Wallet, Token Shop, Support, Settings, and Moderation. Moderation is filtered to active moderators/admins. Games is an in-app launcher for The 5 Sleeves games, which stay hosted separately. The Token Shop mirrors the server-owned cosmetic catalogue and routes purchases to Wallet so the 18+ gate and idempotent spend path stay in one place. Guest mode can browse the Games and Token Shop preview but cannot buy or spend. The navigation bar and mobile drawer also link to the public `/guidelines`, `/terms`, and `/privacy` pages; the desktop item row scrolls horizontally and keeps the active page in view. `locations` remains intentionally unmounted.

## Phase 1 launch gates — code status

The launch gates requested for Phase 1 are implemented in the repository but not applied to any Supabase project and not deployed:

- 18+ token purchase gate: `20261026000000_token_purchase_age_gate.sql`; the checkout function also rejects accounts without a stored verification.
- Refund/chargeback clawback: `20261026000100_token_refund_clawback.sql`; the Stripe webhook handles `charge.refunded` and `charge.dispute.created`.
- Seven-day account deletion grace period: `20261026000200_account_deletion_grace_period.sql`, `POST /api/account/delete`, and the secret-protected `POST /api/account/purge`.
- Terms acceptance record: `terms_acceptances` (`20261026113205` and `20261026113229`, contributed by the parallel database/auth branch) plus the `NEXT_PUBLIC_TERMS_REQUIRED` gate, which defaults to `false`.
- Admin and moderation dashboard: `20261026000400_admin_dashboard.sql` plus the Reports, Members, Appeals, Refund reviews, and Audit log tabs. `20261026000500_moderation_action_guards.sql` stops a moderator from suspending or banning an administrator or their own account.

Do not describe these as live until the migrations are applied, the Edge Functions and webhook are deployed, `ACCOUNT_PURGE_SECRET` and a scheduler are configured, and staging checks have actually run.

## Community content and legal paths

- `src/app/guidelines/page.tsx` publishes community guidelines for conduct, spiritual/wellbeing boundaries, age, tokens, reporting, appeals, and deletion. It is a community guide, not legal terms.
- `src/app/terms/page.tsx` is a clearly marked draft Terms page with `noindex` and a “not in force” banner. It must not be presented as accepted terms at signup until the operator details, jurisdiction, consumer wording, and legal review are complete.
- `src/app/privacy/page.tsx` remains the public privacy notice and now links to the guidelines and draft terms.
- `PLATFORM_COMPARISON_AND_LEGAL_NOTES.md` compares Meta, TikTok, Discord, Reddit, Patreon, Substack, Meetup, Insight Timer, and 7 Cups. It records age rules, virtual-goods/refund stances, moderation and appeal paths, the UK consumer/online-safety/privacy baseline, and the remaining launch gaps.

## SQL handoff

`SUPABASE_SQL_HANDOFF.md` and `supabase/handoff/` are the durable, paste-ready SQL path for the Dashboard SQL Editor. `economy_migrations.sql` combines the four economy migrations; `all_migrations.sql` combines all 12 migrations for a fresh project; `verify_economy.sql` and `verify_all.sql` are read-only checks. The earlier `syntax error at or near "```"` failures were caused by copying Markdown fences, not by SQL syntax. No SQL has been applied to the user’s project.

## Supabase cutover

The browser adapters are active when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present:

- Profiles load from `profiles`; public discovery uses the `public_profiles` view and trigram indexes. Discover lists all public, discovery-enabled profiles on load and filters by username/display name. It cannot find other accounts unless Supabase is configured and those profiles are eligible; the UI now states which data source is active and surfaces missing-view errors.
- Settings load and save through `account_settings`; the profile privacy and social-link controls update `profiles`. The profile page is display-first: profile card and own posts/media, with all settings inside an “Edit profile” dialog.
- The feed uses keyset pagination on `created_at desc, id desc` with 20-item pages and a “Load more” control, so older posts are not loaded in one request and a newly published post cannot duplicate the next page.
- Messages use the persistent repository and subscribe to Realtime INSERT events when Supabase is configured. Sends are optimistic, and the hook re-fetches messages newer than the last persisted item after reconnect, browser `online`, or tab visibility recovery. Read receipts/unread counts are not implemented yet.
- Events, RSVPs, likes, and comments use the database. Aggregate RSVP and like counts come from `event_rsvp_counts` and `social_like_counts` views so the app does not expose who reacted.
- Shorts likes/counts use `get_short_engagement_stats` and `toggle_short_like` RPCs so counts are not truncated by client-side RLS. Comment reads/posts remain browser Supabase queries and depend on the social schema/RLS plus `20261011000000_repair_social_engagement_insert_policies.sql`.
- Account deletion uses `POST /api/account/delete` with the server-only Supabase session. It verifies the session, email, `DELETE` phrase, and TOTP when enabled, then schedules a seven-day grace period. The profile and posts/Shorts/events/comments are hidden immediately; the owner can restore by signing in before the purge date. A separate secret-protected `POST /api/account/purge` route removes stored media and deletes the auth user once the grace period ends. Neither route is deployed or validated against a live project yet.
- The private profile vault stores AES-GCM ciphertext and a PBKDF2 salt. The passphrase never leaves the browser; there is no recovery.

The local demo stores remain only as a fallback when Supabase is not configured. Production sign-in is disabled without Supabase. The local demo code `000000` must never be used for real accounts.

`supabase/migrations/20261010000000_unify_sanctuary_scope.sql` is an **expand migration** for existing databases. It normalizes legacy records to `sanctuary`, makes legacy scope columns default to `sanctuary`, and adds `create_sanctuary_conversation`. It intentionally does not drop the old columns or enum in the same release. Drop them only after the deployed application, generated database types, historical clients, RLS policies, indexes, and restore procedure have been reviewed and migrated together.

`supabase/migrations/20261023000000_harden_policies_and_views.sql` adds the aggregate views, discovery indexes, and storage policies that require an active profile for upload/read/delete.

## Shorts engagement status

- Shorts likes/counts use `get_short_engagement_stats` and `toggle_short_like` RPCs in `src/modules/shorts/service.ts`; the functions are defined in `supabase/migrations/20261013000000_short_engagement_stats.sql` so counts are not truncated by client-side RLS.
- Comment reads/posts remain browser Supabase queries and depend on `supabase/migrations/20261011000000_repair_social_engagement_insert_policies.sql` plus the existing social schema/RLS. Signed-in engagement controls are disabled in guest mode.
- These migrations are repository code only and are not confirmed applied. No staging end-to-end check has been run; verify like/unlike, counts, comment fetch/post, RLS, and guest browsing after applying the pending migrations.

## PWA installation

- Added a web manifest, generated app/Apple icons, and an install-help panel with Chromium install prompts plus iOS/macOS and other-browser instructions.
- The install experience is browser-dependent; it does not promise a universal install button. No service worker or offline cache is included, so installation does not imply offline support.
- PWA assets and install prompts have not been validated on devices/browsers or deployed. Confirm the generated icon routes and manifest in the actual host build before claiming install support is verified.

## Advertising

Web display units are consent-gated by `src/modules/ads/AdsConsent.tsx`. The server layout only enables the AdSense flow when `NEXT_PUBLIC_ADSENSE_ENABLED=true`, the deployment is explicitly marked as production, and the publisher ID is valid. Vercel supplies `VERCEL_ENV=production`; Cloudflare Workers and other hosts must set `NEXT_PUBLIC_DEPLOYMENT_ENV=production` in the production build. Previews and local development fail closed. The layout also emits the `google-adsense-account` meta tag for verification. After that gate passes, the script is not injected until the visitor grants consent. There is no hardcoded publisher fallback; set `NEXT_PUBLIC_ADSENSE_CLIENT_ID` explicitly. Each manually placed feed/Shorts unit also requires its numeric slot ID and consent. Configure public AdSense values before each Next.js build, since `NEXT_PUBLIC_*` values are inlined at build time. Placements remain absent when the publisher or slot ID is blank or malformed. AdSense verifies domains, not shared platform subdomains such as `*.workers.dev`; attach a custom domain before applying.

`public/ads.txt` and `public/robots.txt` are included. The feed uses one responsive unit: a non-sticky right rail on wide screens and a bottom-of-feed unit on smaller screens. Shorts uses a unit below the feed. Signed-in members can change their advertising choice in Settings. Do not offer tokens or rewards for viewing ads; AdSense prohibits compensating users for ad views. Before serving live inventory, verify domain approval, site verification, policy-compliant placement, and a Google-certified consent-management platform for applicable regions. A local banner is the minimum gate, not a certified CMP. Do not log or infer billable impressions from rendered units. Native AdMob placements are separate, imported from `src/modules/ads/native.ts`, and are not mounted in the active web shell. See `ADSENSE_SETUP.md`.

## Payments and support — current state

- The Support page can show a Stripe-hosted voluntary donation link only when `VERCEL_ENV=production` and `STRIPE_DONATION_LINK_ENABLED=true`; it is not returned to previews/local builds. Donations are not associated with Sanctuary accounts or reconciled by the app.
- `/api/checkout`, `/api/webhooks/stripe`, and `/api/community-tips` remain disabled; do not register the disabled Next.js Stripe webhook.
- Token bundles use separate Supabase Edge Functions: authenticated `token-checkout` creates a Checkout Session from server-side Price IDs and requires the request Origin to exactly match the configured `APP_BASE_URL`; `stripe-token-webhook` verifies the raw Stripe signature and calls an idempotent, service-role-only database RPC.
- `TOKEN_CHECKOUT_ENABLED` defaults to `false`. Enable it only in isolated test-mode staging after migration, Edge Functions, mode-matched Price IDs, webhook secrets, and end-to-end checks are confirmed. Keep live checkout disabled until refund/chargeback handling and a customer-support policy are implemented and tested. Keep preview environments free of live payment configuration.
- The shared Stripe Payment Link is not used for token purchases because it cannot securely associate a session with the signed-in account.
- The current token release supports balance/history, verified bundle grants, a 100-token signup grant, and permanent profile cosmetics: animated frames, animated effects, emoji badges, and curated GIF banners. Spending is atomic and idempotent through `spend_tokens`; the client sends only a catalog item ID. Purchased cosmetics auto-equip, and owned cosmetics can be switched through `equip_profile_cosmetic`. Transfers, trading, marketplace, cash-out, VIP, gifts, chat items, and promotions remain deferred. Automatic refund/chargeback reconciliation is not implemented; the approved policy is to claw back unspent tokens and flag spent-token cases for manual review.

Never trust client-provided prices, amounts, user IDs, or fulfillment status. Do not represent this staged code as production-ready until migration/RLS, webhook idempotency, refund/dispute handling, backups, and staging tests are complete.

## Wallet roadmap and handoff

### Complete in the repository (not yet deployed or validated)

- Wallet navigation and page with persistent balance/history UI and fixed £1/£5/£10 bundle cards. Purchase status is origin-bound; preview URLs do not use a production checkout origin.
- Supabase wallet/ledger migration with owner-read-only policies and service-role-only transactional/idempotent purchase fulfillment.
- Authenticated Checkout Session Edge Function and raw-body Stripe-signature webhook. Checkout validates the configured Stripe Prices' mode, amount, currency, and active one-time status.
- `20261024000000_token_spending.sql` adds the server-owned spend catalog, spend ledger, entitlements, `profiles.equipped_frame`, and the idempotent `spend_tokens` RPC. The first enabled item is `profile_frame_sanctuary` at 300 tokens.
- `20261024000001_signup_token_bonus.sql` grants 100 tokens to each new profile, records a `signup_bonus` ledger entry, and backfills existing profiles that have no wallet. It also extends the ledger constraints to allow the signup grant.
- `20261024000002_profile_cosmetics.sql` adds the cosmetic catalog columns, three new equipped slots (`equipped_effect`, `equipped_badge`, `equipped_banner`), the 12-item curated catalog, updated `spend_tokens`, and the `equip_profile_cosmetic`/`clear_profile_cosmetic` RPCs. The three GIF banners live in `public/cosmetics/`.
- The profile card and Discover avatar render the equipped frame, effect, and emoji badge; the profile card also renders a curated GIF banner. The Wallet page shows cosmetic previews, filters by kind/owned state, a total/owned/equipped summary, purchase confirmation, owned/equipped state, remove controls, spend history, and signup-bonus activity. `catalog.ts` owns the filter/slot/summary helpers and is covered by `catalog.test.ts`.
- Purchase checkout remains disabled by default. A test-mode staging enablement is allowed only after staging migration, functions, Price IDs, webhook, and end-to-end test are configured.

### Blocking before live token sales

1. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and the separate Deno Edge Function check in an environment with dependencies. Do not claim current checks passed unless they were actually run for this revision.
2. Apply the wallet migration and deploy both Edge Functions in an isolated staging project; verify RLS, paid and unpaid sessions, duplicate webhook delivery, wrong mode/price, invalid signatures, and Origin rejection.
3. Refund/chargeback handling is implemented in code (`record_token_refund` and the webhook refund/dispute branch): claw back unspent tokens, never create a negative balance, and flag spent-token and partial-refund cases for manual review. Refund clawbacks appear as negative entries in the member's Wallet history. The migration is unapplied and the webhook is undeployed.
4. The 18+ purchase gate, the 7-day deletion grace period, the full admin dashboard, and the terms-acceptance record are implemented in code. Their migrations are unapplied, and the terms gate defaults off until approved legal text replaces the draft. Live sales still wait on staging verification of every gate.
5. Only then configure production-mode Price IDs/secrets/webhook and consider enabling live checkout. The migrations have not been applied and the functions have not been deployed to the user's project.

### Planned product scope and current status

The product owner confirmed the intended token sinks: profile cosmetics, chat items, gifts, VIP access, and post promotion. Profile cosmetics are implemented in code with a 12-item curated catalog: frames at 300 tokens, effects at 200–250, emoji badges at 150, and GIF banners at 300. The three abstract GIF banners were generated locally in `public/cosmetics/`; no third-party GIF provider or user-upload path is used. The owner must approve every curated GIF and emoji badge before launch. Chat emoji packs are the next expression feature. The remaining catalog in `TOKEN_CATALOG_PROPOSAL.md` is illustrative and unapproved. Transfers, trading, marketplace, and cash-out remain deferred. Keep token checkout disabled and do not expand redemption until refund/chargeback and reversal rules are implemented and tested. Guest mode remains read-only. `PLATFORM_COMPARISON_AND_LEGAL_NOTES.md` records the comparable-platform research and recommends a “connection first, content second, commerce last” product stance.

### Launch and policy decisions (2026-10-24)

- Launch publicly with the 100-token signup grant first. Live token checkout stays disabled until Stripe test-mode validation, refund/chargeback handling, legal review, and the 18+ purchase gate are complete.
- Token purchases are 18+ even though the community is 13+. The age gate is implemented in code (date of birth validated server-side; only `purchase_age_verified_at` is stored), but the migration is unapplied.
- Refund/chargeback policy: claw back unspent tokens. If tokens were already spent, flag the account for manual support review instead of silently creating a negative balance or reversing purchased cosmetics. Implemented in code; unapplied and undeployed.
- Account deletion: hide the profile immediately, allow the owner to restore by signing in within 7 days, then purge after 7 days. Implemented in code; the migration and purge scheduler are unapplied.
- The admin dashboard includes report review, suspend/ban, wallet/token history, audit log, appeals/notes, and role management. Implemented in code; its migration is unapplied.
- Legal documents use templates and still need qualified review. `TERMS_AND_CONDITIONS_DRAFT.md` and `/terms` are starter drafts with placeholders, not final legal terms. Signup acceptance and durable version/timestamp recording are implemented behind `NEXT_PUBLIC_TERMS_REQUIRED`, which defaults to `false` until approved text exists.
- AdSense code is ready to switch on, but live ads remain blocked on a custom domain, AdSense site approval, live slot IDs, and a Google-certified CMP for UK/EEA traffic. The current `workers.dev` host cannot be used for AdSense verification. See `ADSENSE_SETUP.md`.

Account deletion now schedules a seven-day grace period in code. After the purge date, deletion cascades the wallet, spend history, and unlocks. The migration, purge route, and scheduler must be tested before real-money sales.

## Supabase status

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` enable browser clients only. Supabase Edge Function secrets and the Next.js server-only service-role key remain server-side.
- The wallet migration (`20261012000000_token_wallet_and_fulfillment.sql`), token-spending migration (`20261024000000_token_spending.sql`), signup-bonus migration (`20261024000001_signup_token_bonus.sql`), profile-cosmetics migration (`20261024000002_profile_cosmetics.sql`), social-policy repair (`20261011000000_repair_social_engagement_insert_policies.sql`), Shorts engagement RPC migration (`20261013000000_short_engagement_stats.sql`), and aggregate-view/storage hardening (`20261023000000_harden_policies_and_views.sql`) are not confirmed applied to the user's project. Use `SUPABASE_SQL_HANDOFF.md` and `supabase/handoff/` for the paste-ready Dashboard path, or `SUPABASE_DASHBOARD_MIGRATION_GUIDE.md` for the longer walkthrough. From the repository, link the intended staging project, inspect `supabase migration list`, run `supabase db push --dry-run`, then `supabase db push` only after reviewing all pending migrations. `db push` applies every pending local migration, not just the wallet migration. A PostgREST cache refresh (`NOTIFY pgrst, 'reload schema';`) does not create missing tables or functions.
- Local demo auth is not production authentication; mock code `000000` is development-only.
- Production cutover requires Supabase Auth configuration, profile-creation handling, RLS/policy tests, persistent repository wiring, storage policies, session refresh/middleware strategy, and migration/restore validation.
- Never expose a Supabase secret/service-role credential to the web client. `POST /api/account/delete` uses `SUPABASE_SERVICE_ROLE_KEY` server-side; token Edge Functions use the platform-provided admin context (`ctx.supabaseAdmin`).

## Security and release gates

Do not call this a production release until all of the following are complete:

1. Apply and test every migration against a disposable project, then staging, including RLS for anonymous users, ordinary users, unrelated conversation members, moderators, suspended users, and expired suspensions.
2. Validate Supabase Auth Site URL/redirect settings, email templates (link and OTP), TOTP enrollment, session refresh through `src/proxy.ts`, and Realtime authorization.
3. Validate storage upload/read/delete policies, signed URL lifetime, media scanning, size limits, and lifecycle cleanup.
4. Implement and test the 7-day account-deletion grace period: hide the profile immediately, allow restore on sign-in, purge after 7 days, and define what happens to posts, media, messages, wallet history, and cosmetic unlocks. Test media removal, database cascades, and the service-role key boundary.
5. Keep live token checkout disabled until the staging flow is verified and the approved refund/chargeback behavior is implemented. The profile-cosmetics spend path is implemented but unapplied; test it in staging, and keep broader redemption/trading disabled until reversal and account-deletion behavior are tested. Add the 18+ purchase gate and the full admin dashboard before live sales. The Next.js payment API routes remain disabled. Publish approved Terms and Privacy Notice, require explicit signup acceptance, and record the accepted terms version and server-side timestamp before production signup.
6. Validate ad consent, placements, `ads.txt`, and production IDs in relevant territories; keep ads disabled until approval and site policies are in place.
7. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and the repository's Deno check after changes; then manually test responsive navigation, auth, feed, Shorts engagement/comments, direct and group messaging, events, moderation, support, wallet, games, token shop, and PWA installation states.

### Known gaps in the Phase 1 code

These are understood limitations, not unfinished wiring. Do not report them as
fixed.

- **Ban evasion through deletion.** A banned member can request deletion, wait
  seven days (or restore and instead register again with a different email), and
  return with a new account. Nothing binds an account to an identity, device, or
  payment instrument, and the purge removes the moderation record along with the
  account. Mitigating this needs an out-of-band identifier (payment fingerprint
  or manual allowlist), which is a product decision.
- **Appeals need a signed-in account.** Suspended and banned members cannot
  sign in (`isProfileUsable` only admits active accounts and accounts inside a
  deletion grace period), so the in-app Appeals panel is only reachable by
  active members who were warned or had content removed. A suspension or ban
  has to be appealed out of band until there is a restricted sign-in state.
  `submit_moderation_appeal` also requires `is_active_user()`, which matches
  the UI but means the RPC cannot serve a suspended member.
- **Suspended members may still request deletion.** `request_account_deletion`
  does not call `is_active_user()`, so a suspended or banned member can hide
  their content and schedule a purge. This is intentional: data erasure should
  not depend on standing, and the purge is still the only permanent deletion
  path.
- **A won dispute is not re-credited.** `dispute_won` exists in the review
  reason list, but no handler restores the clawback. Treat disputes as final
  until that is implemented.
- **Concurrent duplicate refund events.** `record_token_refund` checks for a
  prior clawback without locking the session, so two identical full-refund
  events delivered at the same instant could debit twice. Stripe delivers
  webhooks sequentially in practice; the idempotency test in
  `PHASE1_STAGING_CHECKLIST.md` covers the sequential case only.

## Messaging status and handoff

Direct one-to-one messages and group conversations are available in the UI. The active service is wired to the Supabase repository when Supabase is configured and falls back to the in-memory demo store otherwise. `src/modules/messages/service.ts`, `MessagesInbox.tsx`, `DirectMessageThread.tsx`, and `useDirectMessages.ts` own the flow; `supabaseRepository.ts` supplies persistent conversations/messages and Realtime subscriptions. Optimistic sends, reconnect gap recovery, duplicate de-duplication, and bottom-following scroll are implemented. Staging verification of conversation creation, membership policies, RLS, Realtime reconnect/duplicate events, and retention/abuse controls remains unfinished. Read receipts/unread counts still need a messages update policy and a mark-as-read path. Do not describe messaging as end-to-end encrypted; database/TLS encryption is not E2EE.

## Deployment and verification note

Cloudflare Workers is the currently observed deployment/preview target. The last observed Workers build for commit `b08d405622bc32207050824e8af8c80719d867aa` was still in progress; deployment is unconfirmed. The Support donation guard remains Vercel-specific. AdSense gating is host-aware and requires either `VERCEL_ENV=production` or `NEXT_PUBLIC_DEPLOYMENT_ENV=production`; keep live payment/ad configuration disabled until the environment guards and actual host build are verified. The deployed Worker must also be rebuilt with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Discover to search real accounts.

## Local development

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
```

Copy `.env.example` to `.env.local`. Public Supabase URL/key values are not secrets. Never commit `.env.local`, service-role keys, Stripe keys, or webhook secrets.
