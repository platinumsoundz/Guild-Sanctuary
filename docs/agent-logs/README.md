# Agent Run Logs

This directory contains one durable log per implementation branch, using
`<branch-name>.md` as the filename. Do not overwrite another branch's log.
Use `docs/AGENT_CLOCK_IN_SCHEDULE.md` as the shared clock-in/out protocol.

## Coordinator log — Ashley

Ashley is the product owner/coordinator, not an automatically scheduled build
agent. Coordinator work is on-demand and should be logged in the relevant
GitHub issue/PR before or immediately after a decision. Record product/design
decisions, priorities, approvals, and handoffs here when they affect multiple
agents. Do not invent fixed clock-in times for Ashley.

### Coordinator entry template

```md
## Coordinator entry — YYYY-MM-DD HH:MM Europe/London
- Coordinator: Ashley
- Project(s):
- Decision / priority:
- Roadmap or issue/PR affected:
- Agents/slots affected:
- Design decision to keep stable:
- Approval given (scope only; no implied merge/deploy approval):
- Handoff / next review:
```

## Log quality rules

- Logs must be factual, dated, and specific enough for another agent to resume.
- Record the exact base SHA, branch, commits, changed files, tests, and outcomes.
- State clearly when tests were not run or when deployment was not verified.
- Keep personal/private information, credentials, tokens, and secrets out.
- If an agent is read-only or blocked from editing, it must still leave a report
  in the GitHub reservation/issue with the same fields where possible.
