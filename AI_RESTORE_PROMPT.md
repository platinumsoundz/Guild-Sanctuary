# Guild Sanctuary — AI Handoff / Restore Notes

Read `MASTER_BLUEPRINT.md` first; it is the product and technical roadmap. Preserve the existing modular Next.js App Router + TypeScript project structure and read project/Next.js guidance before changing code.

## Current product decisions

- The product is **The Sanctuary**. Guild Hall / dual-world switching is retired.
- Guest browsing remains read-only.
- Wallet scope for the first release is: persistent balance, purchase history, and fixed token bundles only.
- The initial release remains wallet balance/history and fixed token bundles only. The product owner confirmed the future token sinks to design: profile cosmetics, chat items, gifts, VIP, and post promotion. No spending is implemented or enabled; transfers, trading, marketplace, and cash-out remain deferred. See `TOKEN_CATALOG_PROPOSAL.md` for unapproved illustrative suggestions.
- Tokens have no cash value. Account deletion currently cascades to the wallet and purchase ledger; the wallet UI discloses this.
- The voluntary Stripe donation link is external and does not grant tokens or account benefits. It is served only when `VERCEL_ENV=production` and `STRIPE_DONATION_LINK_ENABLED=true`; preview/local deployments fail closed. AdSense is likewise disabled by default and requires an explicit flag plus production environment.
- Do not use the shareable Stripe token Payment Link for in-app purchases: it cannot safely attribute a payment to the signed-in Sanctuary account. In-app checkout is a server-created Stripe Checkout Session tied to the authenticated user.

## Wallet implementation status

Wallet UI and backend foundation are in the repository, but this is **not deployed, tested, or ready for live payments**:

- Navigation and UI: `src/components/Navigation.tsx`, `src/components/AppWorkspace.tsx`, `src/context/AppContext.tsx`, and `src/modules/economy/`.
- Bundles: `tokens_100` (£1), `tokens_600` (£5), `tokens_1200` (£10).
- Supabase migration: `supabase/migrations/20261012000000_token_wallet_and_fulfillment.sql`. It creates owner-read-only wallet/ledger tables, and a service-role-only, transactional/idempotent purchase RPC. Account deletion cascades wallet history.
- Edge Functions: `supabase/functions/token-checkout/index.ts` requires an authenticated active profile, server-side fixed Price IDs, and checks Price amount/currency/mode before creating a Stripe Checkout Session. `supabase/functions/stripe-token-webhook/index.ts` verifies the raw Stripe signature and grants tokens only for valid paid sessions.
- `supabase/config.toml` keeps JWT verification on for checkout and off for the Stripe webhook (the webhook verifies Stripe signatures itself). The checkout function also requires `Origin` to exactly match the configured `APP_BASE_URL`, preventing preview deployments from using production checkout.
- `TOKEN_CHECKOUT_ENABLED=false` is the default. Staging may enable it only with Stripe test configuration after deployment and setup. Keep live checkout disabled until refund/chargeback handling and customer support policy are implemented and reviewed.
- Refunds and chargebacks are **not implemented**. Before building that flow, ask the product owner how to handle partial refunds, full refunds, disputes, and cases where tokens may already have been spent. Do not invent a token-reversal policy. Redemption remains disabled until this is decided and tested.
- The user requested Terms and Conditions access plus a required signup checkbox and durable version/time acceptance record. `TERMS_AND_CONDITIONS_DRAFT.md` is a placeholder draft, not production-ready legal text. Obtain approval/legal review for the operator, contact, jurisdiction, age, content license, privacy, deletion, support, and refund terms before presenting it as final or launching production signup.
- The Supabase migration has not been applied to the user's project. Functions are not deployed. No Stripe Price IDs, keys, or webhook secret were provided or configured.
- `npm run typecheck` and `npm run build` were not run: the prior workspace had no shell/command tool and no `node_modules`. Do not claim they passed. Run them if the next environment permits.

## Handoff: next agent actions

1. Review current wallet code and these docs before editing. Fix any static/type/build issues found when validation is available.
2. Keep live purchases disabled. Refund/chargeback behavior is a launch blocker; ask for the desired business rule before implementing it.
3. The user must apply the migration to staging, deploy `token-checkout` and `stripe-token-webhook`, configure test-mode Price IDs/secrets, and create a Stripe test webhook for `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
4. Use a stable staging app origin (not an ephemeral preview URL) for test checkout. Verify one purchase per bundle grants the right amount once; duplicate webhook deliveries do not double-credit; invalid signatures, unpaid sessions, wrong mode, and wrong/inactive Prices do not credit. Confirm previews hide donation links and AdSense, and cannot invoke production checkout due to the Origin check.
5. Do not enable live purchases until staging passes and refunds/chargebacks are addressed. The user's Stripe/Supabase credentials must stay private; never ask them to paste secrets into chat.
6. The product owner confirmed the five future sinks listed in `TOKEN_CATALOG_PROPOSAL.md`; prices/effects there are proposals only and need approval. Do not implement or enable token redemption until refund/chargeback and reversal policy is approved. Transfers and cash-out remain out of scope. Implement the requested signup Terms control and durable acceptance record only with approved, versioned Terms; keep the current placeholder draft clearly non-final.

## Required collaboration rules

- Treat `MASTER_BLUEPRINT.md` and this handoff as source-of-truth project context; update both when roadmap/status changes.
- Keep Supabase RLS enabled. No client-side wallet writes, client-supplied prices, user IDs, or fulfillment claims. Never expose Stripe or Supabase secret keys.
- Keep guest mode read-only. Never treat local demo balances or mock authentication as real accounts.
- Distinguish code added from SQL applied, functions deployed, and payments tested. Report only validations actually run.
- Ask the user when a product, refund, chargeback, deletion, or spending policy is underspecified.
