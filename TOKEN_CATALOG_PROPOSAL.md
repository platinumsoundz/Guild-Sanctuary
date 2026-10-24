# Token catalog proposal — for product approval

**Status:** proposal only. None of these items, prices, durations, or effects are approved or purchasable. Existing checkout remains disabled by default; no token redemption should be implemented or enabled until the refund/chargeback and reversal policy is approved.

## Scope

The planned token sinks named in the roadmap are:

1. Profile cosmetics
2. Chat cosmetics/items
3. Gifts
4. VIP access
5. Post promotion

Transfers, trading, a marketplace, and cash-out remain out of scope unless the product owner explicitly reopens them.

## Suggested first catalog (illustrative prices)

| Sink | Example | Proposed price | Duration / effect |
| --- | --- | ---: | --- |
| Profile cosmetics | Profile frame | 300 tokens | Permanent account unlock; one active frame at a time |
| Profile cosmetics | Banner design | 600 tokens | Permanent account unlock; replaceable at any time |
| Chat items | Chat-bubble theme | 300 tokens | Permanent account unlock; cosmetic only |
| Chat items | Emote pack | 250 tokens | Permanent account unlock; subject to moderation rules |
| Gifts | Small digital gift | 100 tokens | One-time send to another account; no token-balance transfer |
| Gifts | Celebration gift | 300 tokens | One-time send; recipient gets a visible gift, not cash or transferable tokens |
| VIP | 30-day VIP access | 600 tokens | Time-limited; exact benefits and stacking/renewal rules need approval |
| Post promotion | 24-hour promoted placement | 500 tokens | Clearly labeled promotion; no guaranteed views, engagement, or ranking outcome |

Prices are merely a starting proposal relative to the existing 100/600/1,200-token bundles. Before approval, decide whether purchases are permanent or consumable, whether gifts can be sent to blocked users, VIP benefits/renewal, promotion eligibility and labeling, and what happens when content is removed or an account is suspended.

## Safety and fulfillment rules required for implementation

- Catalog and prices must be server-owned; the client sends only a stable item ID.
- Spend and entitlement grant must happen atomically in a database transaction, with idempotency protection and an immutable ledger entry.
- The UI must show the item, exact token cost, duration/expiry, and resulting balance before confirmation.
- No negative balance, client-side balance mutation, or direct transfer of token balances.
- Add refund/chargeback reversal behavior before allowing real-money purchases or redemptions. Keep live checkout disabled; do not test with live Stripe configuration.
- Gifts and post promotion need abuse/moderation controls; VIP benefits must not bypass safety or moderation.

## Questions still open

Approve or edit the example catalog/prices; specify VIP benefits; define gift visibility/recipient controls; define promotion placement, eligibility and labeling; decide whether cosmetics are permanent; and approve refund/dispute/reversal policy before redemption is enabled.
