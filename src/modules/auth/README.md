# Authentication

Owns registration, sign-in, sign-out, email verification challenges, session lifecycle, and mock second-factor challenges. `AuthenticationForm`, `AuthenticationGateway`, and `AuthenticationModal` provide the UI; `sessionStore.ts` owns browser-local demo account persistence and validation.

The current flow stores demo accounts in `localStorage`, uses the fixed code `000000` for email and 2FA steps, and does not send email or store passwords. Permissions and active world are session fields for UI composition only. This is not secure authentication and has no production security guarantees. Replace it with server-authoritative identity, verification, credential, and session providers before handling real accounts.

Expose only the authentication operations needed by the app shell through `index.ts`. Use shared contracts from `src/types/database.ts` and `src/types/index.ts` for data that crosses module boundaries; do not import implementation details from sibling modules.