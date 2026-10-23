Please read the attached `MASTER_BLUEPRINT.md` and `README.md` before making changes.

Project: **The Sanctuary** (`Guild-Sanctuary`), a single-community Next.js 16 App Router + TypeScript application with an optional Capacitor Android shell. The former dual-world Guild Hall concept is retired. Do not reintroduce world selectors, `WorldType` navigation, or per-world stores.

Current stack:
- Next.js 16.4 App Router, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Lucide.
- Supabase Auth, Postgres, Storage, and Realtime when `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured.
- Browser-local demo fallback when Supabase is absent. Production sign-in is disabled without Supabase.
- `src/proxy.ts` refreshes Supabase session cookies (Next.js 16 renamed `middleware.ts` to `proxy.ts`).
- Google AdSense web ads are consent-gated; native AdMob lives in `src/modules/ads/native.ts` and must never enter the web bundle.
- Payments are intentionally disabled. Do not enable Stripe, Lemon Squeezy, or Monzo paths without the full audit and fulfillment design described in the blueprint.

Current capabilities:
- Email link/OTP auth, optional TOTP, profile editing, discovery, social links, settings, private encrypted vault, posts, Shorts, events/RSVPs, direct/group messages, moderation queue, account deletion.
- Account deletion uses `POST /api/account/delete` with `SUPABASE_SERVICE_ROLE_KEY` server-side. The service-role key must never be exposed to the browser.
- Aggregate RSVP and like counts use the `event_rsvp_counts` and `social_like_counts` views.
- Storage policies require an active profile via `public.is_active_user()`.

Your role:
1. Follow the module boundaries in `MASTER_BLUEPRINT.md`; import sibling modules only through their `index.ts` entry points.
2. Keep Supabase and local fallback behavior consistent; do not add a Supabase-only UI path without handling configuration errors.
3. Preserve privacy controls, RLS assumptions, and the server/client secret boundary.
4. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` after changes.
5. Update the blueprint and affected module READMEs when architecture, persistence, or deployment steps change.

Acknowledge that you understand the current single-Sanctuary architecture, then ask which feature or file to work on first.
