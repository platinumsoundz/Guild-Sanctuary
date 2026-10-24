# Economy

The Wallet page is the persistent economy surface. It displays the signed-in Supabase user's token balance, recent purchase/spend activity, the enabled spend catalog, and fixed bundle cards. Guest and local-demo accounts cannot buy or spend tokens, and the browser never changes wallet balances directly.

## Balances and purchases

Token bundles are configured as GBP 100/£1, 600/£5, and 1,200/£10. Checkout is created server-side by the authenticated `token-checkout` Supabase Edge Function using fixed Stripe Price IDs. Credits are granted only after a signature-verified Stripe webhook calls the service-only, idempotent database function. Bundle cards remain disabled until `TOKEN_CHECKOUT_ENABLED=true` and the expected Edge Function secrets are present.

The shareable Stripe Payment Link is not used for wallet purchases because it cannot safely associate an individual checkout with the signed-in Sanctuary account. Do not share/use that link for in-app token sales; direct purchases through it will not be credited to a wallet. In staging, enable the flag only with Stripe test keys and test Price IDs after the webhook is configured. Keep live checkout disabled until the migration, functions, mode-matched Price IDs, webhook, end-to-end test, and refund/chargeback handling policy are confirmed. The checkout function retrieves each Stripe Price and verifies it is active, one-time, the expected GBP amount, and in the configured mode before allowing checkout.

## Signup grant

Every new profile receives 100 tokens through a database trigger. The grant is recorded in `token_ledger` as a `signup_bonus` entry so the wallet history explains the starting balance. Existing profiles without a wallet are backfilled once by `20261024000001_signup_token_bonus.sql`; profiles that already have a wallet are not changed.

## Spending

The first sink is a permanent profile frame, `profile_frame_sanctuary`, priced at 300 tokens in the server-owned `token_spend_catalog`. The client sends only the catalog item ID and an idempotency key to the `spend_tokens` RPC. The RPC locks the wallet, rejects insufficient balances, writes the spend ledger, updates the balance, grants the entitlement, and equips a profile frame atomically. Repeating the same idempotency key does not double-charge, and a permanent frame cannot be bought twice.

The profile card and Discover avatar render the equipped frame. The Wallet page shows a confirmation step, the resulting balance, spend history, and the welcome-bonus entry.

## Deferred

Transfers, trading, marketplace, cash-out, VIP, gifts, chat items, and post promotion are not implemented. Those are planned extensions and must be implemented with server-side ledger transactions and clear product rules before use. The wallet and ledger are account-bound; deleting an account deletes its stored wallet, spend history, and unlocks. The system currently records verified purchases, signup grants, and catalog spends only; refund/chargeback reconciliation must be added before enabling live sales or broader redemption.

Status: the migrations have not been applied and the Edge Functions have not been deployed or validated in this workspace. `TOKEN_CHECKOUT_ENABLED` defaults to `false`. Before live sales, ask the product owner how to handle full/partial refunds, disputes, manual support, and reversals when tokens have already been spent; do not guess that policy.
