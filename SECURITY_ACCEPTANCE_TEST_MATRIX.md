# Sanctuary Security and Acceptance Test Matrix

Last updated: 2026-10-26

This is a test specification. Every result begins as **Not run** until someone executes it against a named build/environment and records evidence. Never put passwords, OTP values, recovery codes, tokens, or secret environment values in test evidence.

## Status vocabulary

- **Not run** — no observed test result.
- **Pass** — executed against the recorded build/environment and evidence retained.
- **Fail** — observed behavior violates the expected result.
- **Blocked** — cannot run because a prerequisite or environment is missing.
- **N/A** — explicitly out of scope for this release, with a reason.

## Authentication and session cases

| ID | Scenario | Expected result | Status |
| --- | --- | --- | --- |
| AUTH-001 | Signup with valid unique email and password >= 10 chars | Request accepted; one account and one profile after provider confirmation/trigger | Not run |
| AUTH-002 | Signup with password under 10 chars | Rejected before account creation | Not run |
| AUTH-003 | Signup with mismatched confirmation | Rejected; no auth request sent | Not run |
| AUTH-004 | Signup with malformed email or invalid username | Rejected with accessible inline validation | Not run |
| AUTH-005 | Repeat signup with an existing email | No duplicate profile; response does not disclose account existence unnecessarily | Not run |
| AUTH-006 | Unconfirmed account attempts sign-in/protected navigation | No authenticated app session is activated | Not run |
| AUTH-007 | Correct password, no TOTP factor | Session activates only after user/profile/email status checks pass | Not run |
| AUTH-008 | Wrong password | Generic credentials error; no authenticated session | Not run |
| AUTH-009 | Correct password, verified TOTP factor | TOTP challenge appears; no active app session before verification | Not run |
| AUTH-010 | Wrong/expired TOTP code | Challenge remains unfulfilled; protected features remain unavailable | Not run |
| AUTH-011 | Dismiss pending TOTP modal by Escape | Pending challenge is cancelled; no active app session remains | Not run |
| AUTH-012 | Dismiss pending TOTP modal by close button | Pending challenge is cancelled; no active app session remains | Not run |
| AUTH-013 | Dismiss pending TOTP modal by backdrop | Pending challenge is cancelled; no active app session remains | Not run |
| AUTH-014 | TOTP account restores an AAL1 session after refresh | Session is not activated until required assurance level is met | Not run |
| AUTH-015 | Expired session during protected action | Action fails safely; user can sign in again | Not run |
| AUTH-016 | Sign out then refresh | Previous account's protected UI/data is not available | Not run |
| AUTH-017 | Password reset request for known/unknown email | Same generic confirmation message; no account enumeration | Not run |
| AUTH-018 | Valid password reset link | Recovery flow allows password change and new-password sign-in | Not run |
| AUTH-019 | Expired/reused/malformed reset link | No password change; safe error/restart path | Not run |
| AUTH-020 | Password changed successfully | Old password rejected; new password accepted | Not run |
| AUTH-021 | Local mock code or demo account on production build | Cannot authenticate as a real production user | Not run |
| AUTH-022 | Guest attempts write operation | Server/database denies mutation even if request is manually sent | Not run |

## Authorization and database cases

| ID | Scenario | Expected result | Status |
| --- | --- | --- | --- |
| RLS-001 | Anonymous reads exposed user data | Only intentionally public fields/rows are visible | Not run |
| RLS-002 | User A reads User B's private profile fields | Denied or redacted according to approved privacy rules | Not run |
| RLS-003 | User A updates User B's profile | Denied | Not run |
| RLS-004 | User changes own role/status through direct API | Denied | Not run |
| RLS-005 | User changes own wallet balance or ledger row | Denied | Not run |
| RLS-006 | User reads another user's wallet/ledger | Denied | Not run |
| RLS-007 | User updates a row owner/user ID to another account | Denied by USING/WITH CHECK policy | Not run |
| RLS-008 | Browser accesses server-only game wallet session table | Denied | Not run |
| RLS-009 | User reads another user's private message/thread | Denied | Not run |
| RLS-010 | User marks another user's notification as read | Denied | Not run |
| RLS-011 | Guest submits post/comment/like/RSVP/message | Denied by server-side policy | Not run |
| RLS-012 | Security-definer function called by unintended role | Execute denied or function safely rejects caller | Not run |
| RLS-013 | Security-definer function uses untrusted object resolution | Fixed safe search path; no caller-controlled privilege escalation | Not run |
| RLS-014 | Storage upload exceeds size/type policy | Rejected | Not run |
| RLS-015 | User requests another user's private media object | Denied | Not run |
| RLS-016 | Disabled/suspended account performs write | Denied consistently across UI and direct API | Not run |

## Persistence and community features

| ID | Scenario | Expected result | Status |
| --- | --- | --- | --- |
| DATA-001 | Create feed post and reload | Post remains only if persistent repository is active; otherwise feature is clearly marked demo | Not run |
| DATA-002 | Edit/delete another user's post | Denied | Not run |
| DATA-003 | Like/unlike rapidly or repeat same request | One consistent relationship and correct count | Not run |
| DATA-004 | Shorts comment with valid account | Comment persists and ownership is correct | Not run |
| DATA-005 | Shorts comment from guest/blocked account | Denied | Not run |
| DATA-006 | Create direct conversation | Membership is limited to intended participants | Not run |
| DATA-007 | Add/read group message as non-member | Denied | Not run |
| DATA-008 | Duplicate event RSVP | One RSVP per user/event; counts stay correct | Not run |
| DATA-009 | Private event read/RSVP by unauthorized user | Denied | Not run |
| DATA-010 | Change profile privacy setting | Discovery/display behavior reflects setting in another session | Not run |
| DATA-011 | Notification for User A queried by User B | No data leak | Not run |
| DATA-012 | Account deletion request | User confirmation, session revocation, data retention/cascade behavior follow approved policy | Not run |

## Token economy and payment cases

| ID | Scenario | Expected result | Status |
| --- | --- | --- | --- |
| PAY-001 | Checkout disabled in production/preview | Checkout endpoint refuses creation; no payment link exposed | Not run |
| PAY-002 | Missing/expired auth session starts checkout | Rejected | Not run |
| PAY-003 | Client submits modified price/amount/currency | Server ignores/rejects client amount and uses configured Price ID | Not run |
| PAY-004 | Checkout request uses wrong origin | Rejected | Not run |
| PAY-005 | Invalid Stripe signature | Webhook rejects event; wallet unchanged | Not run |
| PAY-006 | Duplicate successful webhook delivery | One ledger credit only | Not run |
| PAY-007 | Unpaid/failed/abandoned checkout | No wallet credit | Not run |
| PAY-008 | Wrong user/session association | No wallet credit; event is safely logged for review | Not run |
| PAY-009 | Concurrent fulfillment of same purchase | Atomic/idempotent single credit | Not run |
| PAY-010 | Refund/dispute/reversal | Manual-review rules followed; no silent automatic negative balance | Not run |
| BONUS-001 | Eligible verified account after beta opens | Exactly one grant according to approved policy | Not run |
| BONUS-002 | Signup before beta opens or unverified account | No bonus | Not run |
| BONUS-003 | Concurrent signup around the first-100 boundary | Hard cap is not exceeded | Not run |
| BONUS-004 | Retry/profile recreation/duplicate event | No duplicate bonus | Not run |
| BONUS-005 | Existing 100-token grant data encountered | Reconciled before changing policy; no silent top-up/clawback | Not run |

## Hosting, privacy, and accessibility cases

| ID | Scenario | Expected result | Status |
| --- | --- | --- | --- |
| HOST-001 | Cloudflare build with placeholder Supabase config | Build may complete, but deployment is skipped | Not run |
| HOST-002 | Cloudflare build without deployment credentials | Deployment is skipped and explicitly reported | Not run |
| HOST-003 | Vercel preview deployment | Correct commit and URL recorded; preview does not use live payments | Not run |
| HOST-004 | Change public Supabase config | Host rebuilds; browser uses expected public config | Not run |
| HOST-005 | Security headers on each supported host | Headers are present and compatible with auth, media, and install behavior | Not run |
| HOST-006 | Preview/local ad configuration | No production ad inventory served | Not run |
| HOST-007 | Production support/donation guard on non-Vercel host | Fails closed unless host support is explicitly implemented and tested | Not run |
| UX-001 | Keyboard-only use | All controls reachable with visible focus | Not run |
| UX-002 | Auth errors and async status | Screen reader announces errors/status and focus remains understandable | Not run |
| UX-003 | Mobile narrow viewport | No critical overflow or inaccessible modal controls | Not run |
| UX-004 | Reduced-motion preference | Non-essential motion is reduced/disabled | Not run |
| UX-005 | PWA install help on supported browsers | Guidance matches browser capability; no offline promise unless implemented | Not run |

## Execution record template

For each run, record:

- Test ID(s):
- Commit SHA:
- Deployment URL/environment:
- Browser/device:
- Test account alias (never email/password):
- Result: Pass / Fail / Blocked / N/A
- Evidence URL or redacted screenshot:
- Bug/issue link:
- Tester/date:
- Follow-up owner:

## Current known blockers to keep visible

- Vercel email confirmation and password-reset flow needs direct manual verification on Vercel.
- Current CI evidence applies to the specific tested commit, not automatically to later documentation commits.
- Supabase leaked-password protection and security-definer grants require dashboard/database review.
- RLS/AAL2 protections need direct API tests; client-side challenges are not a substitute for database enforcement.
- The live 100-token signup grant does not match the planned 1,000-token/first-100-verified beta grant.
- Token Edge Functions/migrations are not confirmed deployed/applied to staging.
- In-memory feature state is not durable persistence.
- Payment checkout, token spending, production ads, and public launch remain gated.
