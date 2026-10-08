# Authentication

Owns sign-in, sign-out, identity verification, and authentication/session state for the app. Keep provider-specific code and session lifecycle details inside this module.

Expose only the authentication operations needed by the app shell. Use shared contracts from `src/types` for data that crosses module boundaries; do not import implementation details from sibling modules.