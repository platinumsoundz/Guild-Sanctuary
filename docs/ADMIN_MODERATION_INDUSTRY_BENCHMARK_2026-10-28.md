# Sanctuary Admin & Moderation Industry Benchmark — 2026-10-28

## Scope and method
Compared the current Admin & Moderation UI code on the stacked PR #199 branch (including its PR #198 and #191 parents) against publicly documented capabilities from Reddit, Discord, YouTube Studio, Shopify and GitHub. This is a representative benchmark of major community, creator and business platforms, not an exhaustive audit of every website. Public documentation describes available product capabilities; it does not prove Sanctuary's backend currently implements equivalent behavior.

Reviewed repository areas:
- \`src/modules/moderation/AdminDashboard.tsx\`
- \`src/modules/moderation/ModerationDashboard.tsx\`
- \`src/modules/moderation/service.ts\`
- \`scripts/check-moderation-dashboard-contract.mjs\`
- \`docs/ADMIN_CONTROL_CENTRE_RELEASE_GATES_2026-10-28.md\`

## Executive finding
Sanctuary has a useful first UI layer: a report queue, reported-content context, rationale input, role-tier action controls, report search/type filter, refresh, confirmation prompts, and member search/role-change controls. It is not yet comparable to a mature platform's complete moderation operations system. The highest-value gaps are audit history, workflow states and assignment, configurable safety automation, granular permissions, appeals/reversals, member enforcement history, and meaningful moderation analytics.

**Important limitation:** Supabase RPC/schema and authorization behavior have not been verified by this work context. Any UI references to server-side audit logging or role enforcement must be confirmed by the Supabase-connected agent and staging tests. Static source checks do not prove production security or functionality.

## Feature comparison

Status meanings:
- **Present (UI):** the reviewed UI has a corresponding control.
- **Partial / unverified:** only a basic interface or client-side behavior exists, or backend behavior is not verified.
- **Gap:** no corresponding feature was found in the reviewed admin/moderation code.
- **Later / optional:** worthwhile at scale but should follow core safety and accountability.

| Capability | Sanctuary reviewed code | Industry pattern | Priority |
| --- | --- | --- | --- |
| Single queue with reported content preview | Present (UI); backend RPC unverified | Reddit has a central queue and separate review/removal states | P1 |
| Search and content-type filtering | Present; filters only already-loaded rows | Mature queues support queue, type, age and action filters | P1 |
| Sorting, pagination and queue views | Gap; fetch contract is currently a bounded result set with no visible cursor/pagination UI | Oldest/newest/most-reported and distinct queues are common | P1 |
| Queue lifecycle: open, reviewing, resolved, dismissed, reopened | Partial; UI removes an item after action and has no queue tabs/state transition view | Reddit exposes needs-review, reported, removed, edited and unmoderated views | P1 |
| Assignment / ownership / handoff between moderators | Gap | Team moderation tools support multi-moderator operations | P1 |
| Report deduplication, grouping and report counts | Gap | Mature triage needs to distinguish one report from a coordinated pile-on | P1 |
| Reason taxonomy and reusable removal reasons | Partial; free-text rationale exists, but no visible standardised action reason library | Reddit supports removal reasons; YouTube supports configurable blocked terms | P1 |
| Action confirmation and rationale | Present in UI | Standard safety affordances | Keep |
| Server-authoritative action and role checks | Expected by UI contract but **unverified** here | Required baseline, not an optional benchmark feature | P0 |
| Immutable, searchable moderation/action audit log | Gap in reviewed UI; backend audit contract unverified | Reddit mod log and Shopify activity logs provide actor/action/time history | P0 |
| Member enforcement history / repeat-offender context | Gap; queue shows current target context but no member case history | Review decisions benefit from prior warnings, suspensions and related reports | P1 |
| Appeals and second review | Gap | Needed for fair enforcement and correcting mistakes | P1 |
| Configurable automated rules (blocked terms, links, spam, rate limits) | Gap in reviewed admin UI | Discord AutoMod and YouTube content controls offer configurable prevention | P1 |
| Suspected ban evasion / repeat abuse signals | Gap | Twitch and Reddit document tools for suspicious-user or reputation signals | P2 |
| Granular permissions / custom roles | Partial; six fixed roles and client-side action visibility | Shopify/GitHub separate roles and permission scopes | P1 |
| Safe role lifecycle: last-owner protection, self-change rules, concurrent-change safety | UI warning only; DB behavior unverified | High-trust role operations require server-enforced constraints and audit | P0 |
| Role-change / staff activity history | Gap in reviewed UI | Shopify exposes user-management activity and login history | P1 |
| Moderation and community health analytics | Gap; current counters are only counts of loaded reports, filtered results and loaded types | Reddit insights cover activity, team health, reports and removals | P2 |
| Staff workload, response time and backlog ageing | Gap | Needed when multiple moderators work a queue | P2 |
| Bulk actions / keyboard-first triage | Gap | Improves efficiency on high-volume queues | P2 |
| Reversal / undo and correction workflow | Gap | Important to handle mistakes safely; should be a new audited action, not silent data reversal | P1 |
| Notification/escalation when serious reports wait too long | Gap | Helps teams meet response expectations | P2 |
| Safe media/link handling | Partial; target media opens in a new tab with noreferrer, but URL validation policy is not proven in the UI | Untrusted links need explicit scheme/origin policy and safe preview behavior | P0 |
| Admin-wide search and service/feature health | Gap; overview cards describe supplied role access, not live health metrics | Business admin hubs commonly centralize navigation and operational status | P2 |
| Mobile-responsive layouts and accessible status/errors | Present in recent UI work; requires browser/a11y verification | Baseline quality expectation | Keep |

## Platform references

### Reddit
- Moderation Queue: https://support.reddithelp.com/hc/en-us/articles/15484440494356-Moderation-Queue
- Moderation Tools overview (queues, automation, safety filters, logs and insights): https://support.reddithelp.com/hc/en-us/articles/15484384020756-Moderation-Tools-overview
- Moderation Log: https://support.reddithelp.com/hc/en-us/articles/15484543117460-Moderation-Log
- Mod Insights: https://support.reddithelp.com/hc/en-us/articles/15484468824980-Mod-Insights
- Moderator permissions: https://support.reddithelp.com/hc/en-us/articles/15484498369428-User-Management-moderators-and-permissions

### Discord
- AutoMod FAQ: https://support.discord.com/hc/en-us/articles/4421269296535-AutoMod-FAQ

### YouTube Studio
- Moderation settings and content controls: https://support.google.com/youtube/answer/16622701
- Moderate your community and moderator responsibilities: https://support.google.com/youtube/answer/15739725

### Shopify
- Roles and granular permissions: https://help.shopify.com/en/manual/your-account/users/roles/
- Store activity logs: https://help.shopify.com/en/manual/shopify-admin/activity-logs
- User-management activity and login history: https://help.shopify.com/en/manual/your-account/users/security/user-management-activity-log

### GitHub
- Predefined organization roles and permissions: https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/permissions-of-predefined-organization-roles

## Recommended implementation sequence

### P0 — trust, security and evidence (before enabling real moderation)
1. Verify every privileged RPC, grant, role/status check and audit write in the actual Supabase project. Direct RPC calls from unauthorised accounts must fail.
2. Verify the server—not the client—decides role hierarchy, target identity, suspension expiry, report linkage and allowed actions.
3. Implement and verify an immutable audit/event model covering actor, target, action, rationale, timestamps, expiry, prior/new state, result and correlation/report ID. Add a filterable read-only admin view.
4. Validate media URL protocols and permitted origins on data returned to the UI; do not blindly open arbitrary stored URLs.
5. Add staging tests for owner protection, self-targeting, concurrency, inactive users, action failures and audit atomicity.

### P1 — complete daily moderation operations
6. Add explicit queue views/status transitions: New, In review, Actioned, Dismissed, Reopened, and Removed/Hidden where applicable. Define each state transition on the server.
7. Add sort and server-side pagination; filters for status, reason, target type, age, report count and assigned moderator.
8. Add assignment/handoff, report grouping/deduplication, standard removal reasons and member enforcement history.
9. Add an appeals workflow with independent reviewer, evidence, outcome and audit record.
10. Build granular permission capabilities instead of relying only on broad role labels; retain server-side authorization for every operation.
11. Define action reversal as a new audited event and add clear user-facing decision/appeal notices where policy permits.

### P2 — safety automation and scale
12. Add configurable prevention rules: blocked terms/links, spam/rate thresholds, account-age/trust requirements, repeated-report patterns and manual review thresholds. Start in observe/hold mode; do not automatically issue severe sanctions without validation and policy review.
13. Add workload and community metrics: reports received/resolved, backlog age, median time-to-first-review, action distribution, reversal/appeal rates and moderator activity.
14. Add serious-report escalation, notifications, keyboard shortcuts and carefully constrained bulk actions.
15. Add suspicious-account/banned-user-evasion signals only after privacy, fairness, false-positive and appeal requirements are defined.

## Release acceptance criteria
- Every action is enforced server-side and creates an auditable event.
- Unauthorised direct RPC invocation is rejected in staging.
- Queue pagination and filters are server-bounded and deterministic.
- Queue state is persisted by the backend; UI removal alone is not treated as resolution.
- Media/link targets are validated against an explicit policy.
- Role changes are race-safe and protect owner-level access.
- Appeals, reversal, and repeated enforcement decisions preserve original events rather than rewriting history.
- Automated rules are testable, observable and reversible, with false-positive handling.
- CI, browser accessibility checks and multi-account staging tests pass on the exact reviewed commit.

## Boundaries
This is a source and public-documentation benchmark, not a live penetration test. No database migration, live role change, production deployment, or Supabase acceptance is claimed. Keep the admin branches in draft until the database-connected agent supplies evidence and the owner approves release.
