# Stripe test-mode integration contract

Last updated: 2026-10-27  
Status: design and implementation handoff; **not enabled in production**.

## Confirmed account and scope

- Intended Stripe account: **The sanctuary**, account ID `acct_1UV9k5DMX3xKbajd`.
- The connected Stripe tool reports this account as **test mode** (`livemode=false`).
- The existing `Youtube` account is separate and must not be used for Sanctuary changes.
- Preferred first checkout shape: Stripe-hosted Checkout for a web browser, one-time payment, with server-side fulfillment. This is a selected implementation direction, not an instruction to create live products or begin charging.
- No products, prices, payment links, customers, subscriptions, or payment settings were created or changed as part of this plan.

## Product and money boundaries

1. Tokens are an in-app entitlement, not cash, and must not imply reach, status, or another member's attention.
2. The planned welcome grant is 1,000 tokens for each of the first 100 eligible signups (maximum 100,000 total). It is a promotional grant, not a purchase; it must not be fulfilled through Stripe.
3. Paid token packs or other paid digital entitlements remain **unconfigured** until the owner confirms the product, exact price, currency, terms, refund policy, and whether token packs are actually the chosen offer.
4. Checkout must never accept a client-provided amount, token quantity, user ID, or entitlement as authoritative. The server selects an approved price and binds the order to the authenticated user.
5. Do not make payments or purchases a prerequisite for community participation or core wisdom/reflection features.

## Required architecture

### 1. Server-only checkout creation

- Implement a server endpoint using the existing supported application framework.
- Require an authenticated user and validate CSRF/origin protections appropriate to the route.
- Accept only an allowlisted product/price key; map it server-side to a reviewed Stripe Price ID.
- Use Stripe Checkout Sessions in `mode=payment` for one-time purchases unless product requirements later justify subscriptions.
- Add an opaque internal order identifier and authenticated user reference in server-controlled metadata; never put sensitive personal or questionnaire data in Stripe metadata.
- Set success and cancel URLs from trusted application configuration, not arbitrary client input.
- Do not expose Stripe secret keys to browser code.

### 2. Webhook verification and idempotent fulfillment

- Receive Stripe webhooks only through a server-side endpoint.
- Verify the `Stripe-Signature` against the exact raw request body and the configured webhook signing secret.
- Process at minimum `checkout.session.completed`; for delayed payment methods, also handle the appropriate asynchronous success/failure events before fulfillment.
- Confirm expected account/mode, payment status, currency, expected price and amount, order ownership, and internal order state before granting anything.
- Persist Stripe event IDs under a unique constraint and make fulfillment transactional/idempotent. Duplicate deliveries must not grant tokens twice.
- Do not trust the browser success redirect as proof of payment.
- Store a durable order/payment record before fulfillment; reconcile out-of-order events safely.

### 3. Refunds, disputes, and failures

- Define and document refund/dispute policy before enabling purchases.
- Record refunds and disputes as separate ledger/order events. Do not silently delete ledger history.
- Decide explicitly whether a refund reverses unspent tokens, creates a debt/negative balance, or requires manual review; do not invent this behavior in code.
- Make payment failures and abandoned Checkout Sessions leave the wallet unchanged.
- Log event/order IDs and outcome codes, never full card data or secrets.

### 4. Token ledger boundary

- The wallet/ledger remains server-authoritative in Supabase.
- Promotional signup grants and paid purchases use distinct ledger reasons and separate authorization paths.
- Paid fulfillment should call a trusted server-side database function/transaction that verifies the order and inserts the ledger entry once.
- Authenticated clients must not be able to mint, spend, or reverse tokens by writing directly to wallet/ledger tables.
- Review existing `SECURITY DEFINER` functions, grants, and RLS policies before exposing any new function. No blanket permission changes.
- Do not activate fulfillment while the database transaction and duplicate-event behavior are untested.

## Environment and deployment gates

The 2026-10-27 provider audit found the Vercel project has a Stripe publishable key in all targets, but the Stripe secret key and webhook signing secret were only present in preview/development at audit time; no production Stripe secret key was configured. The Supabase audit reported zero deployed Edge Functions at that time. Re-check these facts before implementation because provider state may change.

- Keep all test-mode credentials separate from live-mode credentials.
- Use environment-specific webhook secrets and verify the account/mode expected by each deployment.
- Never commit secrets or include them in logs, screenshots, PR text, or this document.
- Add a test-mode webhook endpoint only after its route and fulfillment logic are implemented and verified.
- No production keys, live products, live prices, production webhooks, or live payment acceptance until explicit owner approval and a successful test checklist.

## Acceptance checklist

- [ ] Owner confirms what is being sold, price, currency, and refund policy.
- [ ] Approved test-mode product/price is configured; no live product created.
- [ ] Authenticated user can create a Checkout Session only for an allowlisted price.
- [ ] Unauthenticated users and client-modified amounts/quantities are rejected.
- [ ] Valid test payment creates exactly one order and one entitlement/ledger grant.
- [ ] Duplicate webhook delivery does not duplicate fulfillment.
- [ ] Invalid signature, wrong mode/account, unpaid session, wrong amount/currency, and unknown price grant nothing.
- [ ] Cancelled/failed payment leaves wallet unchanged.
- [ ] Refund/dispute behavior is explicitly implemented and tested before selling.
- [ ] Logs and persisted records contain no secret or card data.
- [ ] Build, typecheck, focused contract tests, and an end-to-end Stripe test-mode flow pass.
- [ ] Owner separately approves production rollout.

## Current status

This document is a contract and handoff, not an implementation claim. The live integration is not verified by this document. Stripe account connection was confirmed in test mode; no payment object or configuration was created.