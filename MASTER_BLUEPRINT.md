# The Sanctuary — Master Blueprint

Last updated: 2026-10-10

## Product decision

The Sanctuary is one community system for reflection, growth, care, and connection. The former Guild Hall is retired. There is no world selector, no world-specific navigation, and no application-facing `WorldType` contract.

## Architecture

- `src/app/` owns Next.js App Router entry points.
- `src/context/AppContext.tsx` owns client navigation and the current demo/Supabase session. It does **not** own world state.
- `src/components/AppWorkspace.tsx` composes the authenticated feature surface; `Navigation.tsx` is a single Sanctuary navigation shell.
- `src/types/database.ts` contains shared entity contracts. Posts, Shorts, events, and conversations are community-wide entities.
- `src/modules/` owns feature UI, local state, and service APIs. Modules use their `index.ts` public entry points rather than sibling internals.
- The current social data layer is mostly in-memory for local demos. Supabase browser adapters are present for selected modules but are not production-ready without a complete Auth/RLS deployment and tests.

## Current feature ownership

| Module | Scope | Current persistence |
| --- | --- | --- |
| `auth` | Email-code sign-in/up, mock 2FA, session lifecycle | Browser-local demo store; optional Supabase browser flow |
| `feeds` | Unified post feed, media metadata, likes, comments | In-memory or optional Supabase adapter |
| `shorts` | Unified short video feed and engagement | In-memory or optional Supabase adapter |
| `events` | Community events and RSVPs | In-memory |
| `messages` | Direct/group conversations and threads | In-memory; optional Supabase repository is not active UI |
| `profiles` / `settings` | Profile, discovery, privacy, local preferences | Browser-local demo store |
| `moderation` | Report UI and moderator workflow contracts | Supabase-dependent when configured |
| `support` | Explains optional community support | No provider is enabled |
| `economy` | Demo-only wallet, credits, VIP, cosmetics | Browser-local demo state only |
| `ads` | Responsive web display slots plus optional native AdMob placements | AdSense IDs via public build-time environment; native AdMob module not wired into the active shell |

## Sanctuary consolidation

The application contracts and local repositories have been unified: `worldType`, `activeWorld`, `entryWorld`, world switching, and per-world local stores were removed.

`supabase/migrations/20261010000000_unify_sanctuary_scope.sql` is an **expand migration** for existing databases. It normalizes legacy records to `sanctuary`, makes legacy scope columns default to `sanctuary`, and adds `create_sanctuary_conversation`. It intentionally does not drop the old columns or enum in the same release. Drop them only after the deployed application, generated database types, historical clients, RLS policies, indexes, and restore procedure have been reviewed and migrated together.

## Advertising

Web display units are wired through `src/modules/ads/AdSenseScript.tsx` and `AdSlot.tsx`. The script loads with publisher ID `ca-pub-8267279636493149` (override via `NEXT_PUBLIC_ADSENSE_CLIENT_ID`) using Next.js `beforeInteractive`, which places it in the initial HTML head for AdSense site verification. Each manually placed feed/Shorts unit also requires its numeric slot ID. Configure public AdSense values before each Next.js build, since `NEXT_PUBLIC_*` values are inlined at build time. Placements remain absent when slot IDs are blank or malformed.

Before serving live inventory, verify domain approval, site verification/`ads.txt` requirements, policy-compliant placement, and an approved consent-management platform for applicable regions. Do not log or infer billable impressions from the rendered units. The native AdMob consent and placements module is separate and is not currently mounted in `AppWorkspace`.

## Payments and support — audit result

Payments are disabled by design in this build.

- `/api/checkout` returns `503`; it does not accept browser-supplied prices or create a checkout.
- `/api/webhooks/stripe` returns `503`; do not register it with Stripe.
- `/api/community-tips` returns no enabled providers, so the support UI has a reliable disabled state.
- Lemon Squeezy and Monzo are not integrated. Do not populate checkout URLs or provider secrets.
- The wallet/economy UI is a demo only and must never be represented as a real balance, entitlement, or purchase system.

Before enabling payment collection, implement and review: server-side product allowlists, authenticated checkout creation, raw-body provider signature verification, provider event idempotency, transactional orders/ledger/entitlements, refunds/disputes/reconciliation, and sandbox tests. Never trust a client-provided price, amount, user ID, or fulfillment status.

## Supabase status

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` enable browser clients only.
- Local demo auth is not production authentication; mock code `000000` is development-only.
- Production cutover requires Supabase Auth configuration, profile-creation handling, RLS/policy tests, persistent repository wiring, storage policies, session refresh/middleware strategy, and migration/restore validation.
- `SUPABASE_SERVICE_ROLE_KEY` remains server-only and is not currently required by disabled payment paths.

## Security and release gates

Do not call this a production release until all of the following are complete:

1. Replace local/mock authentication and data with tested authenticated APIs or RLS-protected browser access.
2. Test Supabase migrations, RLS policies, backup restore, and forward/rollback behavior in staging.
3. Complete media validation, scanning, storage, moderation, rate limits, and abuse controls.
4. Keep payments disabled or finish the complete provider lifecycle described above.
5. Validate ad consent, placements, and production IDs in relevant territories; keep ads disabled until approval and site policies are in place.
6. Run `npm run typecheck` and `npm run build` after code changes, then manually test responsive navigation, auth, feed, event, message, and support states.

## Local development

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

Copy `.env.example` to `.env.local`. Public Supabase URL/key values are not secrets. Never commit `.env.local`, service-role keys, Stripe keys, or webhook secrets.
