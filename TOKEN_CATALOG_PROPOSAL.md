# Beta token shop proposal — for product approval

**Status:** the product owner approved the listed cosmetics and token prices for isolated staging tests only. Implementation is in draft PR #296 and its forward-only database migration is NOT APPLIED. Redemption and live sales remain disabled; production prices/terms are not approved.

## Owner-confirmed beta direction

- Test with a small friend group first, then open the beta publicly.
- Token checkout must use Stripe **test mode in isolated staging only**. Do not expose live payment or donation URLs in previews, and do not enable production charges.
- The first 100 **verified new accounts after the beta opens** should receive a one-time 1,000-token bonus. This must be fulfilled server-side and atomically; no signup bonus exists in code yet.
- The first shop should sell only Sanctuary-provided cosmetics. No user listings, transfers, trading, or cash-out.
- Product-owner policy direction for planning: free beta tokens have no cash value and are non-refundable. Token purchases and external donations are intended to be non-refundable by default except a report/chargeback sent for manual review. For token-purchase cases, pause further spending during review; decide case by case on a full/partial refund and whether to reverse remaining tokens or revoke the item. Do not create an automatic negative balance. Donations are not associated with wallets/items and are not reconciled by the app. This is not final legal language or an implemented workflow.

## Starter cosmetic catalog (illustrative)

Proposed initial categories are frames, borders, profile themes/skins, and colour palettes. All items are cosmetic only, account-bound, non-transferable, and would be permanent unlocks unless stated otherwise. Items/prices are approved for staging tests only; production prices and terms are not approved.

| Category | Draft item | Proposed price | Draft effect / rule |
| --- | --- | ---: | --- |
| Frame | Moonlit Halo | 250 tokens | Permanent profile-frame unlock; one frame active at a time |
| Frame | Wildflower Wreath | 400 tokens | Permanent profile-frame unlock; one frame active at a time |
| Border | Aurora Line | 200 tokens | Permanent profile-card border; visual only |
| Border | Gilded Laurel | 350 tokens | Permanent profile-card border; visual only |
| Profile theme | Tidal Glass | 400 tokens | Permanent profile-card colour/background theme |
| Profile theme | Twilight Garden | 600 tokens | Permanent profile-card colour/background theme |
| Colour palette | Sanctuary Colour Pack | 150 tokens | Unlock a curated set of accessible accent colours |
| Colour customization | Custom Accent Picker | 500 tokens | Unlock user-selected accent colours, subject to contrast/accessibility limits |

“Custom” here means configuring a first-party profile appearance; it does not include user-uploaded shop assets or a user-to-user marketplace. Confirm the catalog, visual effects, prices, permanence, and whether palette changes are free after unlock before implementation.

## Implementation and release gates

- The current wallet migration supports positive purchase credits only; it has no bonus-grant, cosmetic-inventory, spend, refund, or reversal records. Do not write wallet balances from the browser.
- Any first-100 bonus needs a verified-account check, a concurrency-safe global limit, one grant per account, and an auditable server-side ledger entry.
- Each shop purchase must validate a server-owned item ID and price, check the authenticated user's balance, deduct tokens and grant the entitlement atomically, and be idempotent.
- A report or chargeback must pause spending for review. Implement the approved case-by-case refund/reversal workflow and test spent-token cases before enabling redemption.
- Run the purchase and webhook flow using test-mode Stripe prices in isolated staging only. Keep live checkout disabled until migrations, Edge Functions, RLS, end-to-end tests, and approved/legal-reviewed terms are complete.
- The existing shareable Stripe Payment Link must not be used for wallet purchases; it cannot safely attribute fulfillment to an account. External donations remain unassociated with accounts and are not reconciled by the app.

## Still awaiting approval

The catalog and prices are approved for isolated staging tests. Confirm any changes before implementation; production terms/prices still require approval and legal review. No item is purchasable until the necessary schema, server-side transaction, support review process, and staging tests exist.
