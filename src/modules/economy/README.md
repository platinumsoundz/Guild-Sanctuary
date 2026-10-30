# Economy

The Wallet page is the first persistent economy feature. It displays the signed-in Supabase user's token balance and recent bundle purchases. Guest and local-demo accounts cannot buy tokens, and the browser never changes wallet balances.

Token bundles are configured as GBP 100/£1, 600/£5, and 1,200/£10. Checkout is created server-side by the authenticated `token-checkout` Supabase Edge Function using fixed Stripe Price IDs. Credits are granted only after a signature-verified Stripe webhook calls the service-only, idempotent database function. Bundle cards remain disabled until `TOKEN_CHECKOUT_ENABLED=true` and the expected Edge Function secrets are present.

The shareable Stripe Payment Link is not used for wallet purchases because it cannot safely associate an individual checkout with the signed-in Sanctuary account. Do not share/use that link for in-app token sales; direct purchases through it will not be credited to a wallet. In staging, enable the flag only with Stripe test keys and test Price IDs after the webhook is configured. Keep live checkout disabled until the migration, functions, mode-matched Price IDs, webhook, end-to-end test, and refund/chargeback handling policy are confirmed. The checkout function retrieves each Stripe Price and verifies it is active, one-time, the expected GBP amount, and in the configured mode before allowing checkout.

The draft branch now contains the first-party cosmetics catalogue, inventory, profile appearance rendering, accessible accent picker, unified wallet history, and a closed-by-default first-100 bonus implementation. These features are not production-live: the migration is NOT APPLIED, spending/equipping remains locked, and the beta bonus remains closed. `TOKEN_CATALOG_PROPOSAL.md` contains the approved staging-only catalogue/prices; production prices/terms are not approved. No user listings, trading, or cash-out are in scope.

Keep checkout in Stripe test mode in isolated staging only; live purchases remain off. The original wallet migration records verified bundle purchases. The draft completion migration reuses the existing `token_ledger` for signup bonus credits and retains the existing cosmetic spend ledger; these changes must be reviewed and applied to isolated staging before use. Product-owner direction is manual review for reported token-purchase disputes: pause spending during review; decide case by case on full/partial refunds and token/item reversals; no automatic negative balance. External donations are not associated with wallets/items or reconciled by the app. This is not final legal text or an implemented workflow. Do not enable redemption or live sales until the migrations, RLS, functions, reversal paths, staging tests, and legal review are complete. The wallet and ledger are account-bound; deleting an account deletes its stored wallet history.

## October 2026 shop UX work

The shop now has a searchable catalogue, category filters derived from the server catalogue, an owned-only view, clearer empty/search states, and a visible token shortfall on items that cost more than the signed-in wallet balance. These are presentation improvements only: browser-side token spending remains disabled and the server-side spend RPC remains revoked until isolated staging approval.

**Catalog reconciliation is still required before staging:** the existing migration seed contains 12 profile frames/effects/badges/banners, while `TOKEN_CATALOG_PROPOSAL.md` describes a different starter set of frames, borders, profile themes and colour customisation. Review the existing migration history and live catalogue before creating a forward-only reconciliation migration. Do not edit an already-applied migration or silently change prices.

The shop still needs a full item preview/equip experience, a dedicated inventory/collection view, bonus-grant ledger support, purchase/dispute review workflow, and the isolated staging verification matrix. No live token redemption or live Stripe checkout is enabled by this work.


## October 30 economy completion batch

The draft implementation now includes the owner-approved eight-item starter catalogue as a forward-only migration, retires the previous twelve demo seed items from sale while preserving existing entitlements, adds an account collection view, renders equipped cosmetics on signed-in/public profiles through a separate privacy-safe projection, and adds an entitlement-gated accessible accent picker.

Wallet activity now combines verified Stripe credits, cosmetic spend entries and beta bonus grants into one chronological history. The proposed first-100 bonus is serialized by a locked singleton program row, restricted to verified accounts created after the explicit beta-open timestamp, unique per account, and capped at 100 grants. The program defaults closed. Support-only spending holds are audited and block spend/equip/customisation RPCs.

**All database work is a repository migration proposal only.** The new migration is NOT APPLIED to Supabase. The beta program remains closed, token spending/equipping RPCs remain revoked, Stripe checkout remains independently gated, and no live payment or balance mutation has been enabled by this PR. Do not apply to production. Staging migration review, permission checks, concurrency tests and browser QA remain required.

Reviewed refunds and token corrections use a separate service-role-only adjustment ledger with unique source keys, case references and actor attribution. A negative adjustment is rejected if it would take the wallet below zero; any item already spent needs a manual item-level review rather than an automatic negative balance. The app never initiates a Stripe refund from this ledger.

Stripe dispute-created events are linked to the wallet by the saved PaymentIntent ID (with PaymentIntent/Checkout metadata fallback for older sessions). The webhook places a service-role hold automatically; dispute closure does not auto-release it. Support must review the case and release that specific hold explicitly.

Cosmetic equipping is implemented through entitlement-checked, hold-aware RPCs and member-only grants. The UI is feature-gated by `NEXT_PUBLIC_SANCTUARY_COSMETIC_EQUIP_ENABLED=true`; leave it unset until the staging migration and equipment tests pass. Token spending remains disabled independently.
