# The Sanctuary

**The Sanctuary** is a community app for personal growth, reflection, wellbeing, and connection. It brings community posts and short-form media together with private planning tools, messaging, events, self-discovery, and a growing set of games.

> **Project status:** Active development. Some screens and services are prototypes or use browser-local/in-memory demo data. A successful build does not mean a feature is production-ready. Authentication/RLS, persistence, privacy, payments, accessibility, and real-device behaviour must be verified before public launch.

## Product principles

- Connection and personal growth come before commerce.
- Community wisdom and support should remain accessible without payment.
- Self-discovery is optional and private by default; personality tools are for reflection, not diagnosis.
- Guest access is read-only.
- Tokens are intended for cosmetic expression, not buying reach, attention, or status.
- Privacy, clear moderation, and calm, accessible UI are core requirements.

## What is in the app

Implementation and verification status varies by feature; use [ROADMAP.md](ROADMAP.md) for the current source of truth.

- **Community:** feed posts, comments, likes, author display names, reporting, and short-form video surfaces.
- **Today / personal growth:** personal planner, habits, notes, and daily reflection.
- **Discover and profiles:** profile and discovery surfaces, privacy settings, and local preferences.
- **Messages:** direct and group conversation UI. The active inbox/thread still uses an in-memory demo service; end-to-end encryption is not implemented.
- **Events:** community event and RSVP UI; persistence and end-to-end behaviour need verification.
- **Cosmic Arcade:** Starseed Word Search, Cosmic Snake, Lunar Solitaire, and a small Celestial Crossword preview. These are prototypes; Zodiac Mahjong is planned. Arcade token purchases/rewards are not enabled.
- **Games hub:** entry points for The 5 Sleeves 2D and The 5 Sleeves 3D. The 2D host URL must be configured and verified before launch; the 3D prototype currently links to its Pages host.
- **Wallet and support:** voluntary external community donations can be enabled independently on Vercel or Cloudflare with a verified Stripe Payment Link. Account-linked donations, token purchases and paid entitlements remain separately gated and are not approved for live use.
- **Themes and installation:** theme options and PWA manifest/assets are present; browser/device and offline behaviour still need validation.

## Tech stack

- Next.js App Router, React, and TypeScript
- CSS Modules and Framer Motion
- Supabase client/server integration and Edge Functions
- Stripe checkout/webhook foundations; Lemon Squeezy package available for future integration
- Vercel Analytics integration and optional AdSense/native AdMob foundations
- Capacitor Android project

The repository is still named `Guild-Sanctuary` for compatibility, but the product name and user-facing copy should be **The Sanctuary**.

## Getting started

Requirements: Node.js **20.9 or newer**.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Next.js. If you do not have the external service configuration, work on local/demo surfaces and expect connected features to be limited.

Useful commands:

```bash
npm run dev                 # local development server
npm run typecheck           # TypeScript check
npm run build               # production build
npm run start               # serve a built app
npm run check:pwa           # PWA asset contract
npm run check:auth          # auth-flow contract
npm run check:messages      # message persistence contract
npm run check:theme         # theme contract
npm run check:navigation    # navigation contract
npm run check:cosmic-arcade # arcade regression contract
```

The repository contains additional focused `check:*` scripts; inspect `package.json` for the full list. Contract scripts are static regression checks, not a replacement for browser, accessibility, security, or end-to-end tests.

## Project map

- `src/app/` — Next.js App Router pages and route handlers
- `src/components/` — application shell, navigation, shared surfaces, and arcade/game UI
- `src/context/AppContext.tsx` — navigation and current demo/Supabase session context
- `src/modules/` — feature modules and their service boundaries
- `src/types/` — shared TypeScript and database contracts
- `supabase/migrations/` — SQL migrations (not automatically applied by CI)
- `supabase/functions/` — Supabase Edge Functions
- `scripts/` — focused source-contract checks
- `ROADMAP.md` — product decisions, workstreams, and current implementation status
- `MASTER_BLUEPRINT.md` — architecture and persistence notes
- `AI_RESTORE_PROMPT.md` — continuity and handoff notes

Prefer module public entry points (`index.ts`) over importing another module's internals. Keep shared entity contracts in `src/types/`. Update the roadmap and blueprint when implementation or product decisions change.

## Environment and integrations

Copy `.env.example` to `.env.local` and only populate values for services you are authorised to configure. Never commit local environment files or expose private keys through `NEXT_PUBLIC_*`.

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public client configuration. **Never** put a Supabase service-role/secret key in a public variable.
- Stripe secret keys, webhook secrets, and private price configuration must remain server-side. Token checkout is disabled by default; do not enable live checkout until authenticated staging, webhook, refund/chargeback, and host-specific origin checks have been verified.
- Voluntary external donations are host-independent: set `COMMUNITY_TIPS_ENABLED=true` and `STRIPE_DONATION_URL` to a real HTTPS Stripe Payment Link on `buy.stripe.com` or `donate.stripe.com`. The endpoint exposes the link only when both are valid; no account perks or tokens are granted. Keep account-linked Stripe checkout, token purchases and paid entitlements disabled until their separate webhook, refund/dispute and staging safeguards are verified. AdSense remains separately gated.
- `NEXT_PUBLIC_*` values are generally inlined at build time. Configure the correct values for each environment before building.
- Keep previews isolated from production accounts, user data, and live payment configuration. Do not use production credentials for local development.

Provider dashboards, production secrets, migrations, and deployment settings are owner-controlled tasks. The presence of a migration or Edge Function in Git does **not** mean it has been applied or deployed.

## Before a public release

1. Run the current CI checks against the exact commit intended for release.
2. Apply and verify migrations in a controlled staging project; review Supabase Auth, RLS, and service-role access.
3. Test signup/login, account deletion and recovery, messaging persistence, privacy boundaries, and moderation permissions with multiple accounts.
4. Verify the public voluntary donation link on every deployed host and confirm the Stripe Payment Link destination. Keep account-linked Stripe checkout and token purchases disabled until isolated staging, webhook replay/idempotency, refund/chargeback handling, and legal review are complete.
5. Verify the deployed host's security guards, canonical origin, analytics/ad consent, and environment variables.
6. Test keyboard and screen-reader use, responsive layouts, mobile devices, PWA installation, and any claimed offline behaviour.
7. Record evidence and the exact commit/deployment in [ROADMAP.md](ROADMAP.md). Do not mark a feature **Verified** based on source inspection or a green build alone.

## Documentation

- [Product roadmap and locked decisions](ROADMAP.md)
- [Master architecture blueprint](MASTER_BLUEPRINT.md)
- [AI restore and project handoff notes](AI_RESTORE_PROMPT.md)
