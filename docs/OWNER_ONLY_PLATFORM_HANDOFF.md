# Owner-only platform operations and handoff

**Owner:** Ashley / product owner  
**Status:** Policy for agent work; live provider state is unverified until Ashley checks it.  
**Applies to:** Supabase, Stripe, Lemon Squeezy, Cloudflare, and Vercel.

## Hard ownership boundary

Ashley alone performs direct operations in these five providers. Agents must not access provider connectors/APIs or dashboards; create/edit provider projects; change secrets, environment variables, auth/security settings, domains, DNS, billing, products, prices, payment links, webhooks, deployments, production/staging data, or remote database schemas; run remote migrations; or promote/rollback deployments.

Agents may prepare repository-side architecture, proposed data models, SQL migration drafts explicitly labelled **NOT APPLIED**, local/static checks that do not connect to providers, and handoff notes. Never request, expose, copy, or commit credentials. If a task requires provider access, stop before that action and produce an owner handoff.

## Status vocabulary
- **Proposed** — design only; not implemented.
- **In code** — checked into a branch/PR; not necessarily merged or deployed.
- **Unapplied** — migration/configuration exists in code but has not been confirmed applied.
- **Owner-verified** — Ashley independently checked the provider and recorded evidence/date.
- **Blocked** — missing access, decisions, provider setup, or validation.
- **Retired** — intentionally removed with a documented reason.

Never infer that a database, table, policy, function, webhook, secret, or deployment exists merely because a file or PR mentions it.

## Owner checklist — execute in small, verified steps

### 1. Inventory and safety
- [ ] Open the correct project/account in each provider; confirm identity before changing anything.
- [ ] Record existing projects, environments, databases, migrations, auth providers, RLS policies, functions, grants, secret names, domains, deployments, payment products, and webhook status. Never copy secret values into GitHub.
- [ ] Verify the supported backup/recovery position before risky changes.
- [ ] Compare deployed state with repository migrations and current main; resolve drift before applying schema changes.
- [ ] Keep development/test and production separate. Use test/sandbox mode first.

### 2. Supabase — database/auth owner work
- [ ] Verify project/environment and migration history against repository migrations.
- [ ] Inspect tables, views, functions/RPCs, triggers, grants, RLS policies, Auth redirect allow-list, email-confirmation flow, and leaked-password protection.
- [ ] Investigate the reported Shorts error: public.get_short_engagement_stats(requested_short_id) is missing from the schema cache. Check migration 20261013000000_short_engagement_stats.sql and target migration history; inspect definition, grants, and RLS dependencies before considering a test-environment apply.
- [ ] Verify is_active_user(), role-authorization protections, and that game_wallet_sessions is not client-writable or exposed beyond intended server-side access.
- [ ] Test registration, confirmation, sign-in, session refresh, password reset, and logout with test accounts.
- [ ] Apply migrations only after dependency, data-impact, RLS, rollback, and backup review; start in non-production.
- [ ] Verify least-privilege RLS for anonymous, authenticated, owner, and service-role cases. Never expose service-role credentials to clients.

### 3. Stripe and Lemon Squeezy
- [ ] Decide which provider is canonical for each product/transaction path; avoid duplicate ownership of one checkout flow.
- [ ] Verify sandbox products/prices, currency, refund/cancellation wording, success/cancel paths, and webhook ownership.
- [ ] Require server-side signature verification, idempotency, replay-safe event processing, event-to-user/product mapping, and durable audit.
- [ ] Never trust client-supplied price, role, entitlement, wallet balance, or payment status.
- [ ] Keep checkout and paid features disabled until the launch checklist and explicit owner approval are complete. Cosmetics only; no paid status/attention advantages.

### 4. Cloudflare
- [ ] Inventory Workers, Pages, bindings, secret names, routes, domains, DNS, storage, and deployment environments.
- [ ] Compare deployed source commit to approved GitHub main and intended environment.
- [ ] Confirm least-privilege tokens, environment separation, and rollback procedure before route/worker changes.
- [ ] Record deployment ID/commit and smoke-test evidence for owner-performed changes.

### 5. Vercel
- [ ] Check project linkage, repository/branch, root directory, build command, framework settings, domains, environment-variable names by environment, and deployment protection.
- [ ] Distinguish code/CI success from preview/production deployment. Record rate limits/build errors exactly.
- [ ] Never paste environment-variable values into logs/issues.
- [ ] Deploy/promote/rollback only as an explicit owner action after the approved commit passes relevant checks.

## Required handoff format
For every owner-only action, agent notes must provide:
1. **Owner action required** — exact provider and environment.
2. **Why / dependency** — which code or system needs it.
3. **Pre-checks** — identity, current state, backup, and dependencies.
4. **Exact action** — specific dashboard area or migration/file, without secret values.
5. **Expected result** — measurable outcome.
6. **Verification evidence** — query/test/deployment ID or evidence Ashley can record.
7. **Rollback / recovery** — what can and cannot be reverted.
8. **Status/date** — Proposed, In code, Unapplied, Owner-verified, or Blocked.

## Launch safety gates
- No agent performs provider operations, remote migrations, provider configuration, billing, or deployment.
- No production migration/data mutation without explicit owner review and a recovery plan.
- Payments/ads and mandatory Terms gate remain off until separately approved.
- Keep schema drafts and handoff notes in a reviewable PR; never claim completion until Ashley records owner verification.
- A draft PR is not production evidence; passing static tests do not prove deployed behavior.
