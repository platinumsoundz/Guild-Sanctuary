# Guild Sanctuary — AI Handoff / Restore Notes

Read `MASTER_BLUEPRINT.md` and `README.md` first; they are the product and technical roadmap. Preserve the existing modular Next.js App Router + TypeScript project structure and read project/Next.js guidance before changing code.

## Project context

**The Sanctuary** (`Guild-Sanctuary`) is a single-community Next.js 16 App Router + TypeScript application with an optional Capacitor Android shell. The former dual-world Guild Hall concept is retired. Do not reintroduce world selectors, `WorldType` navigation, or per-world stores.

Current stack:

- Next.js 16.4 App Router, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Lucide.
- Supabase Auth, Postgres, Storage, and Realtime when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured.
- Browser-local demo fallback when Supabase is absent. Production sign-in is disabled without Supabase; mock code `000000` is development-only.
- `src/proxy.ts` refreshes Supabase session cookies (Next.js 16 renamed `middleware.ts` to `proxy.ts`).
- Google AdSense web ads are consent-gated; native AdMob lives in `src/modules/ads/native.ts` and must never enter the web bundle.
- `POST /api/account/delete` uses `SUPABASE_SERVICE_ROLE_KEY` server-side. The service-role key must never be exposed to the browser.
- Token checkout uses separate Supabase Edge Functions (`token-checkout` and `stripe-token-webhook`), not the disabled Next.js payment routes.

Current capabilities:

- Email link/OTP auth, optional TOTP, profile editing, discovery, social links, settings, private encrypted vault, posts, Shorts, events/RSVPs, direct/group messages, moderation queue, and account deletion.
- Aggregate RSVP counts use `event_rsvp_counts`; aggregate like counts are available through `social_like_counts`. The app does not expose who reacted.
- Storage policies require an active profile via `public.is_active_user()`.
- The Wallet page shows the signed-in Supabase user's token balance, purchase/spend history, a 100-token signup grant, and one permanent profile-frame sink (300 tokens). The browser never changes wallet balances directly; spending goes through the server-owned, idempotent `spend_tokens` RPC. The profile card and Discover avatar render the equipped frame.

## Current product decisions

- The product is **The Sanctuary**. Guild Hall / dual-world switching is retired.
- Guest browsing remains read-only.
- Current wallet scope is: persistent balance/history, fixed token bundles, a 100-token signup grant, and one permanent profile-frame sink. The product owner confirmed the future token sinks to design: profile cosmetics, chat items, gifts, VIP, and post promotion. The remaining catalog in `TOKEN_CATALOG_PROPOSAL.md` is unapproved; transfers, trading, marketplace, and cash-out remain deferred.
- The profile page is display-first: profile card plus the user’s posts/media, with settings inside an “Edit profile” dialog. Discover lists public profiles on load and searches username/display name; it only finds other accounts when Supabase is configured and the profiles are public with discovery enabled.
- Tokens have no cash value. Account deletion currently cascades to the wallet and purchase ledger; the wallet UI discloses this.
- The voluntary Stripe donation link is external and does not grant tokens or account benefits. It is served only when `VERCEL_ENV=production` and `STRIPE_DONATION_LINK_ENABLED=true`; preview/local deployments fail closed under Vercel. AdSense is likewise disabled by default and requires an explicit flag plus an explicitly marked production deployment (`VERCEL_ENV=production` on Vercel, or `NEXT_PUBLIC_DEPLOYMENT_ENV=production` on Cloudflare/other hosts); it also emits a `google-adsense-account` verification meta tag when enabled. AdSense verifies domains, not shared platform subdomains such as `*.workers.dev`. Cloudflare is the current observed hosting target, so do not assume Vercel-specific guards are safe there; keep live config disabled until host-specific guards are reviewed.
- Do not use the shareable Stripe token Payment Link for in-app purchases: it cannot safely attribute a payment to the signed-in Sanctuary account. In-app checkout is a server-created Stripe Checkout Session tied to the authenticated user.

## Wallet implementation status

Wallet UI and backend foundation are in the repository, but this is **not deployed, tested, or ready for live payments**:

- Navigation and UI: `src/components/Navigation.tsx`, `src/components/AppWorkspace.tsx`, `src/context/AppContext.tsx`, and `src/modules/economy/`.
- Bundles: `tokens_100` (£1), `tokens_600` (£5), and `tokens_1200` (£10).
- Supabase migrations: `20261012000000_token_wallet_and_fulfillment.sql` creates owner-read-only wallet/ledger tables and a service-role-only, transactional/idempotent purchase RPC. `20261024000000_token_spending.sql` adds the server-owned catalog, spend ledger, entitlements, `profiles.equipped_frame`, and the idempotent `spend_tokens` RPC. `20261024000001_signup_token_bonus.sql` grants 100 tokens to new profiles, records `signup_bonus` ledger entries, and backfills existing profiles without a wallet. Account deletion cascades wallet, spend history, and unlocks.
- Edge Functions: `supabase/functions/token-checkout/index.ts` requires an authenticated active profile, uses server-side fixed Price IDs, and checks Price amount/currency/mode before creating a Stripe Checkout Session. It also requires `Origin` to exactly match the configured `APP_BASE_URL`, preventing preview deployments from using production checkout. `supabase/functions/stripe-token-webhook/index.ts` verifies the raw Stripe signature and grants tokens only for valid paid sessions.
- `supabase/config.toml` keeps JWT verification on for checkout and off for the Stripe webhook (the webhook verifies Stripe signatures itself).
- `TOKEN_CHECKOUT_ENABLED=false` is the default. Staging may enable it only with Stripe test configuration after deployment and setup. Keep live checkout disabled until refund/chargeback handling and a customer-support policy are implemented and reviewed.
- Refunds and chargebacks are **not implemented**. Before building that flow, ask the product owner how to handle partial refunds, full refunds, disputes, manual support, and cases where tokens may already have been spent. Do not invent a token-reversal policy. Redemption remains disabled until this is decided and tested.
- The user requested Terms and Conditions access plus a required signup checkbox and durable version/time acceptance record. `TERMS_AND_CONDITIONS_DRAFT.md` is a placeholder draft, not production-ready legal text. Obtain approval/legal review for the operator, contact, jurisdiction, age, content license, privacy, deletion, support, and refund terms before presenting it as final or launching production signup.
- The Supabase wallet migration has not been applied to the user's project. Functions are not deployed. No Stripe Price IDs, keys, or webhook secret were provided or configured.
- Validation must be run in an environment with dependencies. Do not claim lint, typecheck, tests, build, SQL/RLS checks, deployed functions, or staging payments passed unless they were actually run.

## Latest changes and exact status

- Shorts: `supabase/migrations/20261013000000_short_engagement_stats.sql` adds server-side `get_short_engagement_stats` and `toggle_short_like`. `src/modules/shorts/service.ts`, `ShortsFeed.tsx`, and generated DB types use those RPCs for aggregate likes/counts. Comment reads/posts still use Supabase browser queries and depend on the existing social schema/RLS plus `20261011000000_repair_social_engagement_insert_policies.sql`. Guest engagement controls are disabled. The migrations are not confirmed applied; no staging like/comment check has run.
- Wallet: the reported `public.token_wallets` schema-cache error means the wallet migration is not applied to that Supabase project. A PostgREST cache reload cannot create the missing table. The token-spending and signup-bonus migrations are also repository code only and must be applied after the base wallet migration.
- Economy validation run: `npm run lint`, `npm run typecheck`, `npm test -- --run` (7/7), and `npm run build` passed after the current economy/profile/Discover edits. SQL/RLS, deployed functions, and staging payments have not been validated.
- Messaging: both direct and group flows exist in the demo UI. Direct path: Messages → Find someone to message → Discover → search a public profile → Message. Group creation is in Messages and requires two other members. Active files are `src/modules/messages/MessagesInbox.tsx`, `DirectMessageThread.tsx`, `useDirectMessages.ts`, and `service.ts`. The active service uses the Supabase repository when configured and falls back to the in-memory demo otherwise; staging persistence, Realtime, RLS, and production abuse/retention checks are unfinished. Discover now lists public profiles on load, shows whether Supabase or local demo data is active, and surfaces missing-view/configuration errors. The inbox presents separate one-to-one and group sections; a profile’s Message button opens the one-to-one thread. This UI clarification is unvalidated in staging.
- PWA: code has been added in `src/app/manifest.ts`, `src/app/icon.tsx`, `src/app/apple-icon.tsx`, `src/app/pwa-icons/`, `src/lib/sanctuaryPwaIcon.ts`, `src/components/PwaInstallHelp.tsx`, and its CSS. It includes generated icons and browser-specific install guidance. No service worker/offline cache is included; installability is not offline support. No device/browser test or deployment has confirmed it, and Cloudflare compatibility of generated icon routes must be checked.
- Terms acceptance: Terms draft exists but the signup checkbox and durable accepted-version/time recording are not implemented. The Terms draft is not final legal advice.
- Hosting/validation: last known Workers build for `b08d405622bc32207050824e8af8c80719d867aa` was still in progress; deployment is unconfirmed. The reported CI pass for that commit predates current Shorts/PWA edits. Re-check current CI and Cloudflare status rather than repeating that old result.

## Handoff: next agent actions (small, modular tasks)

1. **Validate current code first.** Read this handoff, `MASTER_BLUEPRINT.md`, and applicable project/Next docs. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, and the Deno Edge Function check if shell/dependencies are available. Fix only observed failures; keep each change focused in its feature module. Report exact commands/results.
2. **Apply staging migrations safely.** From the repository, use the intended staging project only:
   ```sh
   supabase link --project-ref <STAGING_PROJECT_REF>
   supabase migration list
   supabase db push --dry-run
   supabase db push
   ```
   Review the dry run first: `db push` applies *all* pending local migrations, not only the wallet migration. Pending work may include `20261011000000_repair_social_engagement_insert_policies.sql`, `20261012000000_token_wallet_and_fulfillment.sql`, `20261013000000_short_engagement_stats.sql`, `20261023000000_harden_policies_and_views.sql`, `20261024000000_token_spending.sql`, and `20261024000001_signup_token_bonus.sql`. Never run against production without explicit approval. `NOTIFY pgrst, 'reload schema';` only refreshes the API cache after schema changes; it does not create tables/functions.
3. **Verify Shorts on staging.** With signed-in test accounts, check like/unlike, visible counts across users, comment load/post/count, RLS rejection for non-members/inactive users, and guest read-only behavior. Record failures and fix one service/RPC/policy area at a time. Do not claim comments are fixed end-to-end before this passes.
4. **Validate the new economy/profile/Discover behavior.** In staging, confirm a new profile gets a 100-token wallet and `signup_bonus` ledger entry; buy the 300-token frame with a funded test account; retry the same idempotency key and confirm no double charge; confirm the frame appears on the profile card and Discover; confirm the Edit-profile dialog saves and cancels correctly; and confirm Discover lists/search real Supabase profiles. Do not claim these passed until run.
5. **Finish messaging in bounded steps.** Verify the new one-to-one entry point in `MessagesInbox` and the Discover → Message path. Separately, wire `MessagesInbox`/thread hooks to `supabaseRepository.ts` only after reviewing auth, `create_sanctuary_conversation`, membership/message policies, Realtime publication, and migration state. Test direct and group participants, unauthorized reads/writes, offline/reconnect, duplicate subscription events, and profile privacy. Keep files small and module-owned; do not combine the UX and persistence rewrites.
6. **Verify PWA separately.** Check manifest/192/512/Apple icon responses and install prompt behavior on Chromium desktop/Android, iOS Safari, and macOS Safari. Confirm behavior on the actual Cloudflare Worker build. No service worker is present: do not promise offline use. Keep browser-specific manual instructions and never promise an install prompt in every browser.
7. **Complete legal consent only after approval.** Obtain approved, versioned Terms and Privacy text first; implement explicit signup acceptance and durable version/timestamp recording in a focused auth migration/UI task. Do not ship placeholder terms as final.
8. **Check hosting and release gates.** Inspect the latest GitHub validation and Cloudflare Workers deployment; distinguish an Actions pass from a deployed worker. Support’s donation guard remains Vercel-specific; AdSense is host-aware and requires a production-marked build. Verify the actual host before configuring live values. Keep all live token checkout disabled.
9. **Ask the product owner before policy work.** Confirm full/partial refund behavior, disputes/manual support, and reversal when tokens were spent. Do not expand redemption or enable live sales until those rules are approved and tested. Never ask for Stripe/Supabase secrets in chat.

## Required collaboration rules

- Treat `MASTER_BLUEPRINT.md` and this handoff as source-of-truth project context; update both when roadmap/status changes.
- Keep Supabase RLS enabled. No client-side wallet writes, client-supplied prices, user IDs, or fulfillment claims. Never expose Stripe or Supabase secret keys.
- Keep guest mode read-only. Never treat local demo balances or mock authentication as real accounts.
- Distinguish code added from SQL applied, functions deployed, and payments tested. Report only validations actually run.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` after changes. Run the Deno Edge Function check when changing `supabase/functions/`.
- Keep changes beginner-maintainable: prefer small feature-owned components/services and focused migrations; avoid long all-in-one files and unrelated edits. Update the module README, `MASTER_BLUEPRINT.md`, and this handoff when behavior/status changes.
- Ask the user when a product, refund, chargeback, deletion, or spending policy is underspecified.
