# Work log — messaging inbox request races

- Date: 2026-10-27
- Task: prevent late inbox/member-search responses from overwriting current UI state.
- Agent: ChatGPT build session
- Branch: `fix/messages-inbox-request-races-2026-10-27`
- Base: `main` at branch creation; exact base SHA not returned by branch tool.
- Changed file: `src/modules/messages/MessagesInbox.tsx`.
- Design: monotonically increasing request IDs invalidate older inbox and search requests; changing the current user clears account-specific lists and invalidates in-flight work.
- Tests: no local typecheck, lint, build, or browser test was run in this session. CI must validate the exact PR head.
- Database/provider/config: none touched. No migration, deployment, or production operation.
- Security/privacy: stale inbox data from a prior account should not be rendered after account change; server-side authorization remains the actual security boundary.
- Rollback: revert the single component change.
- Deployment: not attempted.
- Next step: CI, then browser-test rapid account changes and slow search responses; verify group creation behavior if account changes mid-request.
