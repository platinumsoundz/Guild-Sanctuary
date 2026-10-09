# Economy

Owns wallet balances, credit packages, VIP tiers, cosmetic catalog, inventory, and equipment state. `service.ts` and `useWallet.ts` provide an in-memory demo adapter and typed UI hook; `WalletPanel` exposes mock checkout, tier unlocks, and cosmetic management.

The `stripe-mock` checkout never contacts Stripe or charges money. Demo wallet/inventory snapshots use browser `localStorage`, which users can edit and which is not authoritative. Production work requires a trusted server-side ledger, idempotent webhook-driven Stripe Checkout, refunds/reconciliation, entitlement rules, and fraud controls. Never trust client-supplied wallet balances or purchase permissions.