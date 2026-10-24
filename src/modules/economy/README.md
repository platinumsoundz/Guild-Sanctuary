# Economy

The Wallet page is the persistent economy surface. It displays the signed-in Supabase user's token balance, recent purchase/spend activity, the enabled spend catalog, and fixed bundle cards. Guest and local-demo accounts cannot buy or spend tokens, and the browser never changes wallet balances directly.

## Balances and purchases

Token bundles are configured as GBP 100/£1, 600/£5, and 1,200/£10. Checkout is created server-side by the authenticated `token-checkout` Supabase Edge Function using fixed Stripe Price IDs. Credits are granted only after a signature-verified Stripe webhook calls the service-only, idempotent database function. Bundle cards remain disabled until `TOKEN_CHECKOUT_ENABLED=true` and the expected Edge Function secrets are present.

The shareable Stripe Payment Link is not used for wallet purchases because it cannot safely associate an individual checkout with the signed-in Sanctuary account. Do not share/use that link for in-app token sales; direct purchases through it will not be credited to a wallet. In staging, enable the flag only with Stripe test keys and test Price IDs after the webhook is configured. Keep live checkout disabled until the migration, functions, mode-matched Price IDs, webhook, end-to-end test, and refund/chargeback handling policy are confirmed. The checkout function retrieves each Stripe Price and verifies it is active, one-time, the expected GBP amount, and in the configured mode before allowing checkout.

## Signup grant

Every new profile receives 100 tokens through a database trigger. The grant is recorded in `token_ledger` as a `signup_bonus` entry so the wallet history explains the starting balance. Existing profiles without a wallet are backfilled once by `20261024000001_signup_token_bonus.sql`; profiles that already have a wallet are not changed.

## Spending and profile cosmetics

The enabled catalog contains 12 permanent profile cosmetics:

- animated frames at 300 tokens
- animated effects at 200–250 tokens
- emoji badges at 150 tokens
- curated animated GIF banners at 300 tokens

The client sends only the catalog item ID and an idempotency key to the `spend_tokens` RPC. The RPC locks the wallet, rejects insufficient balances, writes the spend ledger, updates the balance, grants the entitlement, and auto-equips the purchased cosmetic atomically. Repeating the same idempotency key does not double-charge, and a permanent cosmetic cannot be bought twice. Owned cosmetics can be switched through `equip_profile_cosmetic`; `clear_profile_cosmetic` supports frame, effect, badge, and banner slots.

`src/modules/economy/cosmetics.ts` maps catalog item IDs to client presentation. The profile card and Discover avatar render the equipped frame, effect, and badge; the profile card also renders the equipped GIF banner. The Wallet page shows previews, a confirmation step, the resulting balance, owned/equipped state, spend history, and the welcome-bonus entry. The three banner assets are in `public/cosmetics/` and were generated locally; there is no third-party GIF provider or user-upload path. The owner must approve every curated GIF and emoji badge before launch.

## Deferred

Transfers, trading, marketplace, cash-out, VIP, gifts, chat items, and post promotion are not implemented. Chat emoji packs are the next expression feature. Those are planned extensions and must be implemented with server-side ledger transactions and clear product rules before use. The wallet and ledger are account-bound; deleting an account currently deletes its stored wallet, spend history, and unlocks. The approved 7-day deletion grace period is not implemented. The system currently records verified purchases, signup grants, and catalog spends only; refund/chargeback reconciliation must be added before enabling live sales or broader redemption.

Status: the migrations have not been applied and the Edge Functions have not been deployed or validated in this workspace. `TOKEN_CHECKOUT_ENABLED` defaults to `false`. The approved refund/chargeback policy is to claw back unspent tokens and flag spent-token cases for manual support review; implementation is still pending. Token purchases are 18+, but the age gate is not implemented. Do not enable live sales until refund handling, the 18+ gate, the 7-day deletion grace period, the admin dashboard, and legal review are complete.
