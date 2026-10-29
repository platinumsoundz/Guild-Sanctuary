# Role-based access and VIP entitlements

## Navigation matrix

| Page / capability | Basic user | VIP | Moderator | Admin | Developer | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| Today, Community, Discover, Messages, Profile, Daily Planner, Support, Notifications, Roadmap, Settings | Yes | Yes | Yes | Yes | Yes | Yes |
| Shorts, Events, Wallet, Token Shop | — | Yes | Yes | Yes | Yes | Yes |
| Moderation tools | — | — | Yes | Yes | Yes | Yes |
| Member role management | — | — | — | Yes | Yes | Yes |
| Guild and Guild roadmap | — | — | — | — | Yes | Yes |
| Unregistered/new pages | — | — | — | — | Yes | Yes |

Navigation visibility is not the only check: workspace rendering and direct navigation use the same page access allowlist. The Guild shortcut, controller entry, and Settings launch controls are restricted to developers and owners. The existing public Cosmic Arcade remains available in guest exploration without exposing it in basic-user navigation.

## New-page rule

Add every intentional role exception to `src/lib/sanctuaryFeatureGates.ts`'s `pageMinimumRole` map. Unknown page IDs fail closed for basic, VIP, moderator, and admin roles. Owner always has access; developer is the default access level for an unregistered page. Do not add a page to navigation and assume hiding its link is sufficient.

## Automatic VIP

- The database trigger grants VIP after a new, verified token-purchase ledger entry is created.
- Community donations use account-associated Stripe Checkout sessions. The signed webhook checks the user reference, currency, amount, and payment status before invoking `record_sanctuary_donation`.
- The donation ledger has unique Stripe event and Checkout Session identifiers. Replayed/mismatched events are rejected; repeated matching events are idempotent.
- Entitlement updates only promote accounts whose role is `user`. VIP grants do not demote moderator, admin, developer, or owner accounts.
- External unlinked donation URLs are not exposed by this flow because they cannot safely identify the Sanctuary account receiving VIP.

## Stripe configuration and release gates

Test donations require the existing `SANCTUARY_STRIPE_TEST_CHECKOUT_ENABLED=true` setting, a test secret key, webhook signing secret, and `SANCTUARY_SITE_URL`.

Live donations are deliberately off unless explicitly configured with:
- `SANCTUARY_STRIPE_DONATION_CHECKOUT_ENABLED=true`
- `SANCTUARY_STRIPE_DONATION_MODE=live`
- a matching `sk_live_` Stripe secret and webhook signing secret
- the `record_sanctuary_donation` migration applied to the target Supabase project
- a configured Stripe webhook endpoint that receives the community donation events

The API webhook accepts live-mode events only for account-linked donations when the live donation flag is enabled. Token bundle checkout remains test-only in the Next.js webhook. The Supabase Edge Function also validates event mode against its configured `STRIPE_TOKEN_MODE`.

Before enabling live contributions, run the migration in staging and test each role, successful/declined checkout, duplicate webhook delivery, signature rejection, invalid amount/currency, account mismatch, and preservation of elevated roles. No live checkout flag or production database policy was changed by this PR.
