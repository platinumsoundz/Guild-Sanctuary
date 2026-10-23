# Community support

Owns the optional support and hosted payment-link surface. Payments are **disabled in this build**: `/api/community-tips` returns `stripeTipsEnabled: false` and no hosted checkout URLs, so `SupportPanel` shows a clear “not currently configured” state. `/api/checkout` and `/api/webhooks/stripe` also return `503`.

The panel can render a Lemon Squeezy hosted-checkout link or a Monzo contribution link only when the no-store support endpoint returns validated HTTPS destinations. Lemon Squeezy is a direct hosted link, not a product integration: purchases are not associated with app accounts, and no in-app wallet/VIP entitlements are granted or reconciled. Monzo is a voluntary hosted bank-transfer destination, not an automated checkout/reconciliation integration. Never put API credentials or bank details in public configuration, source, or client code.

Do not re-enable payment collection until server-side product allowlists, authenticated checkout creation, raw-body provider signature verification, event idempotency, transactional orders/ledger/entitlements, refunds/disputes/reconciliation, and sandbox tests are implemented and reviewed. The demo economy wallet is separate and must never be represented as a real balance or entitlement.
