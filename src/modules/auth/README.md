# Authentication

Owns registration, sign-in, sign-out, email verification, optional TOTP, session lifecycle, and the authentication UI. `AuthenticationForm`, `AuthenticationGateway`, and `AuthenticationModal` provide the UI; `sessionStore.ts` owns the browser-local demo fallback; `supabaseAuth.ts` owns the Supabase flow.

When Supabase is configured, the app uses Supabase Auth:

- Email sign-in/up sends a secure link to `/auth/callback` and can also be completed with the numeric OTP from the email template. The form offers a “Use a code instead” path.
- The callback route exchanges PKCE `code` values or verifies token-hash links and writes SSR session cookies.
- `src/proxy.ts` refreshes the session cookies on subsequent requests.
- A verified TOTP factor upgrades the session to `aal2`; community writes and account deletion require that assurance when 2FA is enabled.
- The profile row is created by a database trigger from auth metadata and loaded into the session. The economy migration adds a separate profile-insert trigger that grants the 100-token welcome bonus and records it in the token ledger.
- Signup metadata can carry an accepted `termsVersion`; `create_profile_for_auth_user` stamps `terms_version` and `terms_accepted_at`. Existing members can record a later acceptance through `record_terms_acceptance`. Signup shows the checkbox only when `NEXT_PUBLIC_TERMS_REQUIRED=true`, and `TermsAcceptanceGate` re-prompts members who have no recorded version. The flag defaults to `false` while `/terms` is a marked draft.
- Account deletion schedules a seven-day grace period. The account is hidden immediately, a pending-deletion session can still sign in, and `restoreAccount` cancels the request before the purge date. The permanent purge is handled by the secret-protected `POST /api/account/purge` route, not by sign-in.

In Supabase Authentication → URL Configuration, allow the deployed origin's `/auth/callback` URL and the local development callback. Open links in the browser/device where signup started so the PKCE verifier is available.

When Supabase is absent, the local demo fallback uses `localStorage`, fixed code `000000`, and no passwords. Production sign-in is disabled without Supabase. The local store is not secure authentication and must never handle real accounts.

Federated sign-in is not configured. Production provider integration requires registered applications, server-side authorization-code/OIDC validation, state and nonce checks, immutable provider subject linking, and secure session issuance. Provider email verification must not bypass an account's required 2FA or step-up authentication.

Expose only the operations needed by the app shell through `index.ts`. Use shared contracts from `src/types/database.ts` and `src/types/index.ts`; do not import implementation details from sibling modules.
