# Beginner-friendly collaborator playbook

This guide is mandatory for human collaborators and automated coding agents working on The Sanctuary. Assume the contributor is new to the codebase and may not know the right technical vocabulary. Be patient and specific, but do not blindly implement vague requests.

## The default working style

- Use plain language first. Explain an unfamiliar technical term briefly when it matters.
- Be kind, direct, and willing to challenge assumptions. The goal is a working product, not agreeing with every suggestion.
- A short request is a starting point, not a complete specification.
- Do not make the owner responsible for repository inspection, file discovery, or routine GitHub actions when connected tools can do that work.
- Never claim something is built, tested, deployed, secure, or live without evidence.

## Turn a vague request into a workable task

Before coding, write a short task brief:

1. **Goal:** What should change?
2. **User benefit:** What becomes easier or better for a member?
3. **Current behaviour:** What does the app do today? Inspect the code and existing issues/PRs.
4. **Proposed behaviour:** What should happen after the change?
5. **Scope:** Which pages, modules, and files are likely involved?
6. **Out of scope:** What must not change?
7. **Acceptance checks:** How will we know it works?
8. **Dependencies and owner actions:** Does it need a provider, database, secret, deployment, or product decision?
9. **Rollback:** How can the change be reverted safely?

Ask one or two focused questions only when a missing decision could materially change the implementation. If a safe default follows existing product decisions, state it and proceed. Do not make contributors fill in a long questionnaire for routine work.

## Inspect before editing

Before any change:

- Read `AGENTS.md`, `ROADMAP.md`, `MASTER_BLUEPRINT.md`, and `AI_RESTORE_PROMPT.md` as applicable.
- Inspect the current default branch, relevant files, open issues and pull requests, active branches, recent commits, and existing tests.
- Search for existing implementations before adding a second one.
- Check branch and file ownership. If another open PR edits the same files or changes the same behaviour, coordinate first. If the conflict cannot be resolved, stop and report the blocker.
- Distinguish **Planned**, **In code**, **Unapplied**, **Verified**, and **Live**. These labels are not interchangeable.

## Work in small, isolated changes

- Reserve a task in an issue before substantial work.
- Create a fresh task-specific branch from the latest canonical base. Do not commit directly to the default branch or reuse another contributor's branch.
- Prefer one coherent outcome per branch and pull request.
- Keep changes minimal and reversible. Avoid broad rewrites when a focused fix will do.
- Do not overwrite unrelated changes or silently change an agreed design. Record material design changes in the issue before proceeding.
- Keep a durable work log in the PR description and, where practical, `docs/agent-logs/<branch-name>.md`.

## Test and report honestly

Run relevant checks available in the environment, such as focused contract scripts, lint, typecheck, tests, and production build. State exactly which commands or CI checks ran and whether they passed. If a check could not run, explain why and give the next action.

Every handoff must include:

- User-visible behaviour changed.
- Files changed and why.
- Tests/checks run with exact results.
- What remains untested (especially browser, mobile, staging, and production).
- Risks, assumptions, dependencies, and rollback.
- The next concrete step.

A code commit or passing build does not prove a feature works in a browser, a database migration is applied, or a deployment is live.

## Avoid overlapping collaborators

- Keep one clear owner per task and agree file scope before parallel work.
- Check active PRs and work logs before editing shared files.
- Do not create duplicate implementations to make progress look faster.
- If two workstreams overlap, stop one or split responsibilities at file/module boundaries.
- Scheduled checks should be lightweight and useful. Prefer event-triggered or path-filtered validation where appropriate over repeatedly doing expensive work without a reason.

## Owner-only provider boundary

The project owner alone performs direct account, dashboard, database, billing, secret/configuration, migration-application, and deployment actions for **Supabase, Stripe, Lemon Squeezy, Cloudflare, and Vercel**, plus any other task explicitly reserved to the owner.

Collaborators may prepare repository-side code, documentation, proposed SQL, static checks, and precise handoff steps. They must not connect to or mutate live providers, change secrets, apply remote migrations, change billing/webhooks, or deploy unless the owner explicitly changes this boundary.

Never place secrets in source control, issue comments, logs, screenshots, or client-visible environment variables.

## Admin and token rules

- The admin interface is for authorised project administration and testing, not a pretend hacker console.
- Testers and ordinary collaborators may use only features granted by their role.
- Only the project owner/admin may grant or deduct tokens. Enforce this in server-side authorization and the authoritative token ledger; hiding a button is not sufficient.
- Any privileged token action must validate the actor and target, validate the amount/reason, be safe against duplicate requests, and leave an audit record.
- The planned launch bonus is 1,000 tokens for each of the first 100 eligible sign-ups. The cap and eligibility must be enforced atomically on the server. Do not issue bonuses retroactively or claim the feature is live until the implementation and relevant tests are verified.
- Keep tokens cosmetic-only under the current product decision; do not add transfers, trading, cash-out, gifts, VIP, or paid reach.

## Product priorities

1. Improve the existing UI, responsive layouts, themes, accessibility, and everyday usability.
2. Measure and fix meaningful performance problems.
3. Improve practical admin visibility and testing tools without exposing unnecessary private data.
4. Implement the first-100 sign-up bonus and owner-only token controls with server-side enforcement.
5. Continue broader features once the current foundations work reliably.

Advanced end-to-end encryption can remain a later workstream, but basic authentication, authorization, secret handling, and safe token accounting are not optional.

## Definition of done

A task is ready for review when the requested behaviour is implemented on an isolated branch, acceptance checks are documented, relevant automated checks have run (or their blockers are explicit), overlapping work has been checked, the work log is updated, and a focused pull request is ready. Do not merge, deploy, apply migrations, or change live provider settings without the required owner approval.
