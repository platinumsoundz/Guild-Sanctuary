# Economy

Owns wallet balances, credit packages, VIP tiers, cosmetic catalog, inventory, and equipment state. `service.ts` provides an in-memory demo adapter; `useWallet.ts` is its typed UI hook, and `WalletPanel` exposes mock checkout, tier unlocks, and cosmetic management.

`WalletPanel` is **not mounted** in the active shell. It is experimental demo code, not a live commerce surface. The `stripe-mock` checkout never contacts Stripe or charges money, and wallet/inventory snapshots remain browser-local and editable.

Payments are disabled in this build. `/api/checkout`, `/api/webhooks/stripe`, and `/api/community-tips` return disabled responses. Lemon Squeezy digital-goods checkout and Monzo Business contributions are not implemented. Never enable live digital-goods payments until server-authoritative identity, durable entitlements, refund/reconciliation handling, and operational review are complete. Never represent the demo wallet as a real balance, entitlement, or purchase.
