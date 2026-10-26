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

`src/modules/economy/cosmetics.ts` maps catalog item IDs to client presentation. `src/modules/economy/catalog.ts` owns the slot, filter, and summary helpers and is covered by `catalog.test.ts`. The profile card and Discover avatar render the equipped frame, effect, and badge; the profile card also renders the equipped GIF banner. The Wallet page shows previews, a confirmation step, the resulting balance, owned/equipped state, remove controls, kind/owned filters, a total/owned/equipped summary, spend history, and the welcome-bonus entry. The three banner assets are in `public/cosmetics/` and were generated locally; there is no third-party GIF provider or user-upload path. The owner must approve every curated GIF and emoji badge before launch.

## 18+ purchase gate and refunds

Token purchases require a one-time server-side age confirmation. `WalletPanel` collects a date of birth, `confirm_token_purchase_age` validates it in Postgres, and only `profiles.purchase_age_verified_at` is stored. Bundle buttons stay disabled until the session carries a verification, and `token-checkout` rejects accounts without one.

Refunds and chargebacks are handled by `record_token_refund` from the Stripe webhook. The approved policy is to claw back unspent tokens, never create a negative balance, flag spent-token and partial-refund cases for manual review, and never reverse a purchased cosmetic. A refund clawback appears in the member's Wallet history as a negative entry (the member has a read policy on their own `token_refund_events`), so a balance drop is never unexplained. If a refund or dispute touches a token session whose grant has not been recorded yet, the webhook returns 5xx so Stripe retries rather than acknowledging and losing the clawback. Both migrations are unapplied and the webhook is undeployed.

## Token Shop page

`TokenShopPanel` is the navigation-level catalogue. It reads enabled rows from the server-owned catalogue and the signed-in member's balance/entitlements, shows owned state, and routes purchases to Wallet so the age gate and idempotent spend path stay in one place. It does not deduct tokens itself. Guest sessions can browse the preview but see no personal balance or inventory.

## Deferred

Transfers, trading, marketplace, cash-out, VIP, gifts, chat items, and post promotion are not implemented. Chat emoji packs are the next expression feature. Those are planned extensions and must be implemented with server-side ledger transactions and clear product rules before use. The wallet and ledger are account-bound. Deleting an account schedules a seven-day grace period; after the purge date the wallet, spend history, and unlocks are deleted with the account.

Status: the migrations have not been applied and the Edge Functions have not been deployed or validated in this workspace. `TOKEN_CHECKOUT_ENABLED` defaults to `false`. The 18+ gate, refund/chargeback clawback, seven-day deletion grace period, and admin dashboard are implemented in code but have not been applied or staging-tested. Do not enable live sales until those gates, the purge scheduler, and legal review are complete.
