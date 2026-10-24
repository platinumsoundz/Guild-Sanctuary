<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Guild Sanctuary handoff rules

- Read `MASTER_BLUEPRINT.md` and `AI_RESTORE_PROMPT.md` before planning changes. Keep the roadmap and handoff file aligned when status changes.
- Current economy scope is wallet balance/history, fixed token bundles, a 100-token signup grant, and one permanent profile-frame sink (300 tokens). Spending is server-owned and idempotent via `spend_tokens`; the client sends only a catalog item ID. Checkout code is staged but not deployed or validated; `TOKEN_CHECKOUT_ENABLED` defaults to false. Do not enable live purchases until staging checks and refund/chargeback handling are complete.
- Refund/chargeback policy is not specified. Ask the product owner about full/partial refunds, disputes, manual support, and reversals if tokens have been spent; do not guess.
- Do not use the shareable Stripe Payment Link for wallet purchases. Keep prices and fulfillment decisions server-side, and never expose Supabase/Stripe secrets.
- Preview/local safety: Support returns its external donation URL only on Vercel Production with `STRIPE_DONATION_LINK_ENABLED=true`; AdSense requires its explicit flag plus a production-marked deployment (`VERCEL_ENV=production` or `NEXT_PUBLIC_DEPLOYMENT_ENV=production`); token checkout rejects Origins that do not exactly match server-side `APP_BASE_URL`. Keep preview environments free of live payment config.
- Wallet migrations are `20261012000000_token_wallet_and_fulfillment.sql`, `20261024000000_token_spending.sql`, and `20261024000001_signup_token_bonus.sql`; functions are `token-checkout` and `stripe-token-webhook`. These remain unapplied/undeployed until the user configures Supabase.
- Discover lists public, discovery-enabled profiles on load and searches username/display name. It can only find other real accounts when Supabase is configured; the UI states whether it is using Supabase or local demo data.
- The profile page is display-first: profile card and own posts/media, with settings in an “Edit profile” dialog.
- Guest mode is read-only; transfers, trading, marketplace, cash-out, VIP, gifts, chat items, and promotions are deferred. Profile-frame spending is implemented in code but unapplied to Supabase.
- Distinguish code changes from applied SQL, deployed functions, and tests. Do not claim build/typecheck/staging checks passed unless actually run. Attempt `npm run typecheck` and `npm run build` when shell and dependencies are available.
