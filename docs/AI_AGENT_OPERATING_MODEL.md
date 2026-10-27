# The Sanctuary — AI Agent Operating Model

Last reviewed: 2026-10-27
Owner: product owner
Status: operating rules; no feature is considered shipped merely because a branch or PR exists.

## Start here — mandatory for every agent

Before planning or changing files, read in this order:

1. `AGENTS.md` — mandatory cross-agent rules.
2. `ROADMAP.md` — product decisions and priorities.
3. `MASTER_BLUEPRINT.md` — architecture and implementation status.
4. `AI_RESTORE_PROMPT.md` — current handoff, known blockers, and recent work.
5. The relevant module README, test instructions, and applicable Next.js documentation under `node_modules/next/dist/docs/`.

If any of these disagree, do not silently choose one. Record the conflict in the PR/report and prefer the explicit locked product decision in `ROADMAP.md` unless the owner has changed it.

## Workstreams and ownership

### A — Product and experience
**Mission:** accessible, coherent Sanctuary experience: identity, layout, navigation, design tokens/themes, PWA UX, feed and feature UI.

- Primary owner: ChatGPT or another product-oriented coding agent.
- Allowed: isolated UI/component/CSS work and tests.
- Avoid: changing database schema, authentication policy, secrets, payment configuration, or production settings unless the task is explicitly assigned and separately reviewed.
- Current anchor: PR #69, `build/roadmap-theme-foundation-2026-10-27`. It is open and must not be described as merged or deployed without fresh evidence.

### B — Engineering, trust, and reliability
**Mission:** auth/session correctness, privacy/RLS, moderation, account deletion, terms records, wallet safety, migrations, CI, deployment health, observability, recovery.

- Primary owner: DeepSeek may be assigned implementation/review tasks that benefit from an independent coding pass; ChatGPT coordinates the task contract and independently checks the resulting diff/evidence.
- Allowed: bounded implementation in assigned modules, tests, migrations and runbooks.
- Required: independent review for security-sensitive changes. No agent may approve its own security-sensitive change solely on its own reasoning.
- Current anchor: PR #18 / `feature/phase1-trust-safety`, and `PHASE1_STAGING_CHECKLIST.md` on that branch. Confirm the live PR head and branch state before adding work; do not duplicate or stack unrelated changes.

### C — Roadmap, research, and integration
**Mission:** one authoritative roadmap, competitor/product research, dependency map, agent task queue, branch coordination, cross-project integration, evidence-based reports.

- Coordinator: ChatGPT.
- Competitor findings are hypotheses until supported by current first-party product/docs or credible sources. Compare real workflows, privacy/safety, accessibility, retention mechanics, pricing, platform constraints, and documented user pain—not just feature counts.
- Recommendations must distinguish: existing and verified; existing but unverified; proposed; deferred; rejected.
- Never turn competitor features into requirements without checking fit with Sanctuary's principles.

## Branch and parallel-agent contract

1. **Never work directly on `main`.** Every task gets its own descriptive branch from the current canonical base.
2. Branch format: `work/<stream>-<short-task>-YYYY-MM-DD` for new work. Preserve established branch names on existing PRs.
3. One task/PR per branch. Keep the diff focused; do not bundle unrelated refactors, dependency upgrades, schema changes, or deployment settings.
4. Before editing, inspect open PRs, branch base, changed files, and overlapping ownership. Do not create a duplicate branch for work already represented by an open PR.
5. Assign each branch an explicit owner, scope, files/modules allowed, excluded files, dependencies, acceptance criteria, test commands, and rollback note in the task or PR description.
6. **Avoid shared-file collisions.** The roadmap coordinator owns `ROADMAP.md`, `MASTER_BLUEPRINT.md`, `AI_RESTORE_PROMPT.md`, `AGENTS.md`, and these operating rules. Feature agents propose status updates in their PR description; coordinator updates canonical status after reviewing evidence. If an urgent code task must update one of these files, coordinate first.
7. Independent branches may run in parallel only when their changed-file sets and dependencies do not conflict. If work depends on another PR, base it on that branch only with an explicit stacked-PR plan; otherwise branch from canonical `main`.
8. Do not force-push, rewrite another agent's branch, merge your own PR, or change production settings without explicit owner approval.
9. Rebase/update against the target branch before merge when safe; resolve conflicts intentionally. Do not use blind conflict resolution on auth, SQL, role, payment, or policy files.
10. Use PRs for reviewable delivery. No PR, branch, green lint, or successful build alone proves production readiness.

## Required task contract

Every task/PR must include:

- **User outcome:** what changes for members or maintainers.
- **Scope / non-scope:** precise paths/modules and explicit exclusions.
- **Dependencies:** migrations, APIs, feature flags, other PRs, secrets, provider configuration.
- **Acceptance criteria:** observable pass/fail statements.
- **Verification:** exact commands and actual results, plus browser/device or staging evidence where relevant.
- **Risk and rollback:** user/data/security impact and how to disable or reverse safely.
- **Status:** code-only, CI-verified, staging-verified, production-verified, blocked, or deferred.
- **Follow-ups:** any known limitations or next task.

## Phase 1 execution order

Phase 1 is the **trust, safety, and launch-gate workstream**; it is not complete until required checks have actually passed. In parallel, the W0 visual foundation can progress without changing security-sensitive files.

1. **P0 — Establish truth:** inventory canonical branches, open PRs, migration drift, CI state, hosting state, and current blockers. Do not apply migrations or change live configuration as part of a read-only inventory.
2. **P1 — Code review and test harness:** inspect age-gate, terms acceptance, deletion grace/restore/purge, refund/dispute handling, admin/moderation permissions and audit trail. Confirm tests cover negative/abuse paths, idempotency, role escalation, and failure recovery.
3. **P2 — CI verification:** run available lint, typecheck, unit/integration tests, SQL handoff checks, Deno checks and production build against the exact branch. Record missing commands/dependencies as blocked, not passed.
4. **P3 — Disposable staging only:** apply/reconcile migrations against a disposable/staging Supabase project after checking migration history and backup/recovery. Use Stripe test mode only. Never run `supabase db push` blindly; it applies all pending migrations.
5. **P4 — Acceptance tests:** execute `PHASE1_STAGING_CHECKLIST.md` against real configured staging services. Capture evidence without secrets or personal data.
6. **P5 — Independent review:** a different agent reviews security-sensitive diffs and tests. Resolve blockers before merge.
7. **P6 — Release decision:** live purchases, ads, mandatory Terms gate, migrations, and production deployment remain disabled until explicit owner approval and all applicable release gates pass.

## Safety and privacy invariants

- Keep live token checkout, live payments, donation configuration, and ads disabled until the host-specific guards and staging evidence are reviewed.
- Never paste, commit, log, or return secrets. Never expose service-role keys or Stripe/webhook secrets in client code or `NEXT_PUBLIC_*`.
- Guest mode is read-only. No anonymous posting.
- Tokens are cosmetic-only; no transfers, trading, marketplace, cash-out, paid reach, or buying attention.
- Sensitive self-discovery is optional and private by default. No diagnosis or treatment claims.
- Do not run destructive SQL, purge user data, alter production auth/roles, or perform irreversible account actions without explicit owner approval.
- Do not invent CI, staging, deployment, browser/device, or security test results. Cite the exact commit/branch and evidence.
- If an operation is blocked by access, billing limits, missing secrets, or absent staging, produce a specific blocker and safe next action; do not work around it by weakening safeguards.

## Reporting and shared memory

Each agent leaves a concise report in the PR and, for a substantial task, a report under `docs/reports/` with date, branch, commit, scope, files changed, commands/results, unresolved risks, dependencies, and next task. Do not store secrets, private user data, or raw production records in reports.

Update the canonical roadmap/blueprint only after the coordinator has reviewed the PR and evidence. Preserve a single master roadmap; project-specific details should link back to it rather than creating conflicting roadmaps.

## Multi-project coordination

The Sanctuary is the product/identity hub for The 5 Sleeves Online/2D and The 5 Sleeves 3D. Keep their integration contracts, naming, and roadmap dependencies aligned, but do not combine unrelated codebases or share credentials. Each repository gets its own branch, task, tests, and PR. PlatinumBridge is outside this programme unless the owner explicitly brings it back into scope.

## Completion definition

A task is complete only at the level claimed:
- **Code complete:** changes are committed on the task branch.
- **CI verified:** relevant CI ran on the exact commit and passed.
- **Staging verified:** documented staging acceptance checks passed.
- **Production verified:** the deployed revision was observed and checked in production.
- **Blocked:** required access/configuration/approval was unavailable.

Use the narrowest accurate status. Never equate merged with deployed, or deployed with safe.

## Scheduled automation limits

The available task scheduler supports daily, weekly, and monthly recurring tasks; hourly recurring builds and exact recurring minute-level start times are unavailable. Use separate daily flexible tasks for independent repositories, with approximate morning/afternoon/evening targets rather than promises of exact start times. Every scheduled run still follows the branch, task-scope, testing, and reporting rules above. A scheduled run request is not proof that a build ran, passed, or deployed; check its result and the exact commit.
