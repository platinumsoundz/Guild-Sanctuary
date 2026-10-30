# Economy

The Wallet page displays the signed-in Supabase user's token balance and recent bundle purchases. Guest and local-demo accounts cannot buy tokens, and the browser never changes wallet balances.

Token bundles are configured as 100 tokens/£1, 600/£5, and 1,200/£10. Checkout is created server-side by the authenticated `token-checkout` Supabase Edge Function using fixed Stripe Price IDs. Credits are granted only after a signature-verified Stripe webhook calls the service-only, idempotent database function. Bundle cards remain disabled until checkout and required secrets are configured.

The shareable Stripe Payment Link is not used for wallet purchases because it cannot safely associate a checkout with a signed-in account. Keep live checkout disabled until migrations, functions, mode-matched Price IDs, webhook, end-to-end tests, and refund/chargeback handling are confirmed.

## Token Shop

The first-party cosmetic catalogue contains premium themes, profile frames, portrait effects, identity badges and profile banners. Cosmic Dark and Cosmic Light remain free; premium themes apply across Sanctuary and Guild. [SHOP_CATALOGUE.md](SHOP_CATALOGUE.md) lists all 32 current catalogue items.

All cosmetics are now priced between **20 and 50 tokens** (20p–50p at the standard 100 tokens = £1 rate). The price migration is code only and **NOT APPLIED**.

## Founding-member thank-you

The previous proposal for 1,000 tokens to the first 100 accounts has been replaced. The new proposal gives the first 100 eligible verified active accounts **500 tokens total**. Existing accounts retain their original 100-token welcome balance and receive a one-time +400 top-up; future eligible signups receive +500. The migration uses a locked database allocation pool and unique award records. The award migration is code only and **NOT APPLIED**. No live account balances were queried or changed.

## Release gates

Token redemption remains locked. No paid checkout, game spending, transfers, trading, or cash-out is enabled by this work. Owner-reviewed isolated staging must verify account eligibility, existing balances, concurrent first-100 allocation, award idempotency, wallet/ledger consistency, RLS, and function privileges before any production migration or purchase activation.

The wallet and ledger are account-bound; deleting an account deletes its stored wallet history. External donations are not associated with wallets/items or reconciled by the app.
