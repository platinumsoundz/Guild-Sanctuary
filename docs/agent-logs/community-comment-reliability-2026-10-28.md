# Community comment reliability — 2026-10-28

## Scope
- Prevent repeated comment fetches and make loading state visible.
- Track when comments have successfully loaded so a failed request is not presented as an empty thread.
- Trim comment submissions and block duplicate requests while a submission is pending.
- Preserve existing comment edit, delete, like and report controls.
- Add a focused static contract and run it in CI.

## Safety
- No database migrations, production deployment, account, payment or provider settings changed.
- Client controls do not replace backend authorization/RLS.

## Validation status
- Exact-head CI passed, including the new comment-action contract, TypeScript and production build.
- Phase 1 dependency-map contract passed.
- Cloudflare Worker build passed; deployment was skipped for the PR event.

## Remaining validation
- Real desktop/mobile testing must verify load errors, empty threads, posting, edit/delete, likes and reports while authenticated.
- Real desktop/mobile testing must verify load errors, genuinely empty threads, posting, edit/delete, likes and reports while authenticated.
