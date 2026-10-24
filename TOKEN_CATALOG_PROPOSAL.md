# Token catalog — approved cosmetics and later proposals

**Status:** the 12-item profile-cosmetics catalog is implemented in code and staged in `20261024000002_profile_cosmetics.sql`, but the migration has not been applied to Supabase. Checkout remains disabled by default. The remaining sinks are proposals only. Do not enable live sales or expand redemption until refund/chargeback handling, the 18+ purchase gate, the 7-day deletion grace period, and the admin dashboard are implemented and tested.

## Scope

Named token sinks:

1. Profile cosmetics — implemented in code
2. Chat cosmetics/items — chat emoji packs are next
3. Gifts — deferred
4. VIP access — deferred
5. Post promotion — deferred

Transfers, trading, a marketplace, and cash-out remain out of scope unless the product owner explicitly reopens them.

## Approved profile-cosmetics catalog

Purchases are permanent account unlocks. A purchase auto-equips the item, and an owned item can be switched with `equip_profile_cosmetic`. The client sends only the catalog item ID; prices and entitlement checks stay server-side.

| Item ID | Type | Price | Presentation |
| --- | --- | ---: | --- |
| `profile_frame_sanctuary` | Frame | 300 | Warm-gold static frame |
| `profile_frame_aurora` | Frame | 300 | Animated aurora ring |
| `profile_frame_ember` | Frame | 300 | Animated ember glow |
| `profile_effect_sparkle` | Effect | 250 | Drifting sparkles |
| `profile_effect_glow` | Effect | 200 | Soft pulsing glow |
| `profile_badge_sparkle` | Badge | 150 | ✨ beside display name |
| `profile_badge_moon` | Badge | 150 | 🌙 beside display name |
| `profile_badge_flame` | Badge | 150 | 🔥 beside display name |
| `profile_badge_leaf` | Badge | 150 | 🌿 beside display name |
| `profile_banner_aurora` | GIF banner | 300 | Curated animated aurora banner |
| `profile_banner_ember` | GIF banner | 300 | Curated animated ember banner |
| `profile_banner_tide` | GIF banner | 300 | Curated animated tide banner |

The three banner files are generated locally in `public/cosmetics/`. No third-party GIF provider, external GIF search, or user-upload path is used. The owner must approve every curated GIF and emoji badge before launch.

## Remaining proposal — not implemented

| Sink | Example | Proposed price | Duration / effect |
| --- | --- | ---: | --- |
| Chat items | Emoji pack | 250 tokens | Permanent account unlock; curated and owner-approved |
| Chat items | Chat-bubble theme | 300 tokens | Permanent account unlock; cosmetic only |
| Gifts | Small digital gift | 100 tokens | One-time send to another account; no token-balance transfer |
| Gifts | Celebration gift | 300 tokens | One-time send; recipient gets a visible gift, not cash or transferable tokens |
| VIP | 30-day VIP access | 600 tokens | Time-limited; exact benefits and stacking/renewal rules need approval |
| Post promotion | 24-hour promoted placement | 500 tokens | Clearly labeled promotion; no guaranteed views, engagement, or ranking outcome |

Prices are illustrative relative to the existing 100/600/1,200-token bundles. Before implementing the rest, decide whether gifts can be sent to blocked users, VIP benefits/renewal, promotion eligibility and labeling, and what happens when content is removed or an account is suspended.

## Safety and fulfilment rules

- Catalog and prices must be server-owned; the client sends only a stable item ID.
- Spend and entitlement grant must happen atomically in a database transaction, with idempotency protection and an immutable ledger entry.
- The UI must show the item, exact token cost, duration/expiry, and resulting balance before confirmation.
- No negative balance, client-side balance mutation, or direct transfer of token balances.
- Refunds/chargebacks: claw back unspent tokens; if tokens were already spent, flag the account for manual support review. Do not silently create a negative balance or reverse a purchased cosmetic.
- Token purchases are 18+ even though the community is 13+.
- Gifts and post promotion need abuse/moderation controls; VIP benefits must not bypass safety or moderation.
- Keep live checkout disabled until Stripe test-mode validation, refund handling, legal review, and the 18+ gate are complete.

## Open questions

- Which chat emoji packs should be curated first, and who approves each asset?
- Should gifts be visible publicly or only to sender/recipient?
- What exact benefits, stacking, and renewal rules apply to VIP?
- Where may promoted posts appear, and how will they be labeled?
- Which admin actions are required before public launch? The approved dashboard scope is reports, suspend/ban, wallet/token history, audit log, appeals/notes, and role management.
