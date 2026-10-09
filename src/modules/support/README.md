# Community support

Owns the optional support and hosted payment links surface. Stripe one-time tips are created by the server only when `COMMUNITY_TIPS_ENABLED=true`. Optional `LEMON_SQUEEZY_CHECKOUT_URL` and `MONZO_CONTRIBUTION_URL` values are exposed by the no-store support options endpoint only after HTTPS/credential validation; leave them empty until the business accounts and destinations are ready.

Lemon Squeezy is currently a direct hosted-checkout link, not a product integration: purchases are not associated with app accounts, and no in-app wallet/VIP entitlements are granted or reconciled. Monzo is a voluntary hosted bank-transfer destination, not an automated checkout/reconciliation integration. Never put API credentials or bank details in public configuration, source, or client code.
