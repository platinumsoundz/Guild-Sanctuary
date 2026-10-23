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
- The Wallet page shows the signed-in Supabase user's token balance and recent bundle purchases. The browser never changes wallet balances.

## Current product decisions

- The product is **The Sanctuary**. Guild Hall / dual-world switching is retired.
- Guest browsing remains read-only.
- Wallet scope for the first release is: persistent balance, purchase history, and fixed token bundles only.
- No transfers, trading, marketplace, cash-out, token spending, cosmetics, VIP, gifts, or post promotion are in the first release.
- Tokens have no cash value. Account deletion currently cascades to the wallet and purchase ledger; the wallet UI discloses this.
- The voluntary Stripe donation link is external and does not grant tokens or account benefits.
- Do not use the shareable Stripe token Payment Link for in-app purchases: it cannot safely attribute a payment to the signed-in Sanctuary account. In-app checkout is a server-created Stripe Checkout Session tied to the authenticated user.

## Wallet implementation status

Wallet UI and backend foundation are in the repository, but this is **not deployed, tested, or ready for live payments**:

- Navigation and UI: `src/components/Navigation.tsx`, `src/components/AppWorkspace.tsx`, `src/context/AppContext.tsx`, and `src/modules/economy/`.
- Bundles: `tokens_100` (£1), `tokens_600` (£5), and `tokens_1200` (£10).
- Supabase migration: `supabase/migrations/20261012000000_token_wallet_and_fulfillment.sql`. It creates owner-read-only wallet/ledger tables and a service-role-only, transactional/idempotent purchase RPC. Account deletion cascades wallet history.
- Edge Functions: `supabase/functions/token-checkout/index.ts` requires an authenticated active profile, uses server-side fixed Price IDs, and checks Price amount/currency/mode before creating a Stripe Checkout Session. `supabase/functions/stripe-token-webhook/index.ts` verifies the raw Stripe signature and grants tokens only for valid paid sessions.
- `supabase/config.toml` keeps JWT verification on for checkout and off for the Stripe webhook (the webhook verifies Stripe signatures itself).
- `TOKEN_CHECKOUT_ENABLED=false` is the default. Staging may enable it only with Stripe test configuration after deployment and setup. Keep live checkout disabled until refund/chargeback handling and a customer-support policy are implemented and reviewed.
- Refunds and chargebacks are **not implemented**. Before building that flow, ask the product owner how to handle partial refunds, full refunds, disputes, manual support, and cases where tokens may already have been spent. Do not invent a token-reversal policy.
- The Supabase wallet migration has not been applied to the user's project. Functions are not deployed. No Stripe Price IDs, keys, or webhook secret were provided or configured.
- Validation must be run in an environment with dependencies. Do not claim lint, typecheck, tests, build, SQL/RLS checks, deployed functions, or staging payments passed unless they were actually run.

## Handoff: next agent actions

1. Review current wallet code and these docs before editing. Fix any static/type/build issues found when validation is available.
2. Keep live purchases disabled. Refund/chargeback behavior is a launch blocker; ask for the desired business rule before implementing it.
3. The user must apply the migration to staging, deploy `token-checkout` and `stripe-token-webhook`, configure test-mode Price IDs/secrets, and create a Stripe test webhook for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
4. Verify staging: one purchase per bundle grants the right amount once; duplicate webhook deliveries do not double-credit; invalid signatures, unpaid sessions, wrong mode, and wrong/inactive Prices do not credit.
5. Do not enable live purchases until staging passes and refunds/chargebacks are addressed. The user's Stripe/Supabase credentials must stay private; never ask them to paste secrets into chat.
6. Defer token spending and all future token sinks until the purchase/refund ledger rules are complete. Transfers and cash-out remain out of scope.

## Required collaboration rules

- Treat `MASTER_BLUEPRINT.md` and this handoff as source-of-truth project context; update both when roadmap/status changes.
- Keep Supabase RLS enabled. No client-side wallet writes, client-supplied prices, user IDs, or fulfillment claims. Never expose Stripe or Supabase secret keys.
- Keep guest mode read-only. Never treat local demo balances or mock authentication as real accounts.
- Distinguish code added from SQL applied, functions deployed, and payments tested. Report only validations actually run.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` after changes.
- Ask the user when a product, refund, chargeback, deletion, or spending policy is underspecified.
