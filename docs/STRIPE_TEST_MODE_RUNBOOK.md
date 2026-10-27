# Sanctuary Stripe test-mode checkout runbook

Status: implementation proposal on a feature branch. It must pass CI and receive review before deployment. No live-mode payment acceptance is enabled by this work.

## Existing bundle contract

The existing token-ledger migration defines these fixed one-time GBP bundles:

| Bundle key | Tokens | Expected amount |
| --- | ---: | ---: |
| `tokens_100` | 100 | £1.00 |
| `tokens_600` | 600 | £5.00 |
| `tokens_1200` | 1,200 | £10.00 |

These amounts come from the existing schema, not a new pricing recommendation. Confirm they remain the intended test bundles before enabling checkout.

## Required environment variables (test values only)

Set these in the chosen Vercel **Preview** deployment first. Never paste secret values into chat, issues, commits, or logs.

- `SANCTUARY_STRIPE_TEST_CHECKOUT_ENABLED=true`
- `SANCTUARY_SITE_URL=https://<the-exact-preview-host>` (must match browser Origin)
- `STRIPE_SECRET_KEY=sk_test_...` for the intended Stripe account
- `STRIPE_WEBHOOK_SECRET=whsec_...` for the same test webhook destination
- `SANCTUARY_STRIPE_TEST_PRICE_TOKENS_100=price_...`
- `SANCTUARY_STRIPE_TEST_PRICE_TOKENS_600=price_...`
- `SANCTUARY_STRIPE_TEST_PRICE_TOKENS_1200=price_...`
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` for the intended Sanctuary Supabase project. Keep the service secret server-only.

Created in the Stripe account **The sanctuary** in test mode only. Each is active, one-time, GBP, and the expected amount. These IDs are configured as Preview-only Vercel variables for this feature branch; never reuse them in live mode:\n\n- 100 tokens (£1.00): `price_1UV9ymDMX3xKbajdDIBvvWwt`\n- 600 tokens (£5.00): `price_1UV9yqDMX3xKbajdwpZ61mvL`\n- 1,200 tokens (£10.00): `price_1UV9ysDMX3xKbajdFMp6PUk0`

## Configure test webhook

After this code is deployed to a current Preview URL (Vercel deployment is currently blocked by the account's daily deployment quota), create a Stripe test-mode webhook endpoint at:

`https://<the-exact-preview-host>/api/webhooks/stripe`

Subscribe to:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET` for that Preview deployment. Do not point a live-mode webhook at this endpoint.

## Owner acceptance test

1. Open the exact Preview host and sign in with a test account.
2. In Token Shop, choose a bundle and start Checkout. Confirm Stripe's hosted page shows the intended GBP test price.
3. Use Stripe's documented test card `4242 4242 4242 4242`, a future expiry, any valid CVC and a test postal code if requested. This simulates payment; no real funds move.
4. Complete Checkout and wait for the webhook. The success redirect alone never grants tokens.
5. Refresh Token Shop and confirm the wallet increases by exactly the selected bundle once.
6. Replay the same event from Stripe's test webhook dashboard and confirm the wallet does not increase again.
7. Cancel another checkout and confirm the wallet remains unchanged.
8. Verify unauthenticated requests, invalid signatures, unknown bundle IDs, live-mode events, wrong currency/amount/price and unpaid sessions grant nothing.

## Release gates

- The webhook depends on `record_token_bundle_purchase` from `20261012000000_token_wallet_and_fulfillment.sql`. Verify the migration is applied to the intended Supabase project before enabling the webhook.
- Verify deployed database function permissions and idempotency against the real schema.
- Refund/dispute reversal behavior is not implemented. Do not enable real payments until an owner-approved policy and reconciliation are implemented.
- Keep `SANCTUARY_STRIPE_TEST_CHECKOUT_ENABLED` absent/false outside the deliberate test deployment. Never configure a live key for these routes.
- If Token Shop does not call `POST /api/checkout` with a `bundleId` and navigate to the returned `url`, wire that UI before claiming the whole journey is ready.
