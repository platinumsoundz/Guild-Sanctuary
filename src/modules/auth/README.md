# Authentication

Owns registration, sign-in, sign-out, email verification challenges, session lifecycle, and mock second-factor challenges. `AuthenticationForm`, `AuthenticationGateway`, and `AuthenticationModal` provide the UI; `sessionStore.ts` owns browser-local demo account persistence and validation.

The current flow stores demo accounts in `localStorage`, uses the fixed code `000000` for email and 2FA steps, and does not send email or store passwords. Session roles/permissions are UI composition data only. This is not secure authentication and has no production security guarantees. Replace it with server-authoritative identity, verification, credential, and session providers before handling real accounts.

Google, Facebook, Microsoft/Xbox, and PlayStation federated sign-in are not configured in this demo. Production sign-in requires registered provider applications, server-side authorization-code/OIDC validation, state and nonce checks, immutable provider subject linking, and secure session issuance. Provider email verification must not automatically bypass an account's required 2FA or step-up authentication.

Expose only the authentication operations needed by the app shell through `index.ts`. Use shared contracts from `src/types/database.ts` and `src/types/index.ts` for data that crosses module boundaries; do not import implementation details from sibling modules.

When Supabase Auth is configured, the app requests email verification and sends `emailRedirectTo` to `/auth/callback`. That route exchanges Supabase PKCE `code` values (and supports token-hash confirmation links) into SSR cookies before redirecting to the app. In Supabase Authentication → URL Configuration, allow the deployed origin's `/auth/callback` URL and the local development callback. The email template's confirmation link must redirect to an allowed URL; links should be opened in the browser/device where signup was started for the PKCE verifier to be available. The local session store remains the fallback only when Supabase public configuration is absent. Database-backed application repositories still require the deployed schema, Auth profile creation, and tested RLS.
