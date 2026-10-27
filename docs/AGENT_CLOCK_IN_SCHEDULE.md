# Agent Clock-In / Clock-Out Schedule

Last updated: 2026-10-27  
Timezone: Europe/London  
Coordinator / product owner: Ashley  
Canonical coordination issue: [#88 — Multi-agent development protocol](https://github.com/platinumsoundz/Guild-Sanctuary/issues/88)

## Purpose

This is the shared coordination sheet for agents working on The Sanctuary and its connected projects. The aim is to avoid two agents starting the same project or editing the same feature at the same time, keep the current design stable, and make useful work visible on GitHub early.

**The sheet is a coordination protocol, not a guaranteed real-time lock.** Before touching files, each agent must also inspect the latest GitHub state and post a clock-in/reservation to the relevant issue or PR. If an agent cannot verify that the task is unclaimed and the project is current, it must stop at read-only review and report the blocker.

## Daily schedule — current slots

Times are approximate flexible targets, not guaranteed exact execution times.

| Target (London) | Agent / slot | Project and lane | Clock-in requirement |
| --- | --- | --- | --- |
| 08:00 | Sanctuary Morning Build | The Sanctuary — W1 trust, security, launch gates | Check active W1 PRs/issues and reserve one non-overlapping task |
| 15:00 | Sanctuary Afternoon Feature | The Sanctuary — W0 visual identity, navigation, accessibility and responsive UX | Check active W0 PRs/issues and reserve one non-overlapping task |
| 19:00 | Sleeves Alternating Build | Alternate The 5 Sleeves 2D and The 5 Sleeves 3D, one project per run | **Read-only unless the explicit project-access verdict permits edits** |

The three slots are intentionally staggered. Additional agents must claim a different slot and project lane in this sheet and in GitHub before they begin. Do not add a new automation or assume a new agent is scheduled until its schedule is confirmed by the automation system. Existing automation times are flexible targets.

### Adding another agent or schedule

1. Choose a different time/daypart and a clearly separate project/workstream.
2. Confirm the existing automation or scheduler supports that schedule; do not promise exact recurring times where only flexible timing is supported.
3. Add the agent, timezone, target time, project, workstream, and owner to the table above.
4. Update the agent prompt so it must read this sheet, check GitHub, clock in, reserve a task, clock out, and leave a durable log.
5. If the new slot would overlap a current reservation, pick another slot or coordinate a handoff first.

## Mandatory clock-in sequence

Before creating files, code, branches, migrations, tests that mutate data, or a new design:

- [ ] Read this schedule and the latest agent logs.
- [ ] Fetch the current canonical `main` (or the target project's canonical default branch) and review recent commits.
- [ ] Inspect all relevant open PRs, branches, issues, CI results, and in-progress reservations.
- [ ] Read the current roadmap, blueprint, handoff, project instructions, and relevant module/database docs.
- [ ] Confirm the project and design are up to date; do not build on stale assumptions or duplicate work.
- [ ] Claim one bounded task in its GitHub issue/PR with agent/owner, project, branch, base SHA, expected files, design decision, status, and intended next checkpoint.
- [ ] Check for file/function/schema/UI overlap with other active tasks.
- [ ] Create a fresh task-specific branch from the latest canonical base. Never work directly on `main` or another agent's branch.

If any step fails, do not start implementation. Leave a read-only coordination note with the missing evidence and next action.

## During work: push early, safely, and often

- Push each coherent, reviewable milestone to the task branch as soon as it is ready; do not wait until the entire feature is finished.
- Open a **draft PR early** once there is a meaningful change, then keep it updated with incremental commits and an accurate work log.
- Commit frequently enough that useful progress is visible and recoverable, but never push broken secrets, credentials, private user data, unsafe migrations, or knowingly failing/unreviewable fragments.
- Keep commits focused and explain what changed. Include test/check results and mark checks as passed, failed, skipped, or not run.
- Rebase or sync with the canonical base only after checking for conflicts; never force-push over another agent's work.
- Keep the agreed design stable. If it must change, explain why in the reservation/PR before implementing the revised direction.
- Before each significant push and before opening/updating the PR, re-check the current base and relevant PRs for new overlapping work.
- Never merge, deploy, apply production migrations, alter production data/accounts/roles, or enable payments, ads, or the mandatory Terms gate without explicit authorisation.

## Mandatory clock-out sequence

Every run must finish with a status update, even if blocked or read-only:

- [ ] Set the reservation status to **Complete**, **Blocked**, **Handed off**, or **Read-only report**.
- [ ] Record the last commit SHA / PR link and exact test/check outcomes.
- [ ] Update the durable log at `docs/agent-logs/<branch-name>.md` when editing is permitted.
- [ ] Include files changed, design decisions, migrations/config, security/privacy notes, assumptions, rollback, deployment state, blockers, and next step.
- [ ] Update the roadmap only when evidence justifies it; distinguish **Planned**, **In code**, **Unapplied**, and **Verified**.
- [ ] Leave the next agent a concrete handoff and explicitly release the reservation, or identify the new owner.
- [ ] Do not report completion merely because a commit, PR, CI run, or preview exists. Deployed behaviour is Verified only after the named environment and user journey are actually tested.

## Clock-in / clock-out log template

Copy one entry per agent run into the relevant issue/PR or a dedicated log file.

```md
## Agent run — YYYY-MM-DD HH:MM Europe/London
- Agent / slot:
- Project / workstream:
- Status: Clocked in | In progress | Blocked | Handed off | Complete | Read-only report
- GitHub issue / reservation:
- Branch:
- Canonical base branch + SHA checked:
- Active PRs/branches reviewed:
- Design/task held stable:
- Files / schema / behaviour in scope:
- Changes and commit SHAs pushed:
- Tests/checks run (exact result):
- Migration/config requirements:
- Security/privacy review:
- Blockers/assumptions:
- Rollback plan:
- Deployment status (never infer from CI):
- Clock-out time:
- Next step / handoff owner:
```

## Project-specific safety rules

- **The Sanctuary is the priority** unless Ashley explicitly reprioritises.
- W1 security/launch-gate changes and W0 UI/UX changes remain separate tasks and branches.
- Messaging, community, and Shorts work may start only after checking active PR overlap.
- The 5 Sleeves 2D and The 5 Sleeves 3D remain separate projects with separate branches and logs. The alternating slot stays read-only until the explicit verdict in the conversation **“branch - project access check”** is recovered and permits editing. Never infer permission from this schedule.
- Never put private user information, credentials, or secrets in a log.
- The product roadmap remains the source of truth; this schedule does not override locked product or safety decisions.
