/**
 * Public compatibility barrel for the browser-local auth store.
 *
 * The implementation is split by responsibility:
 * - sessionSchema.ts: session types, defaults, and persisted-data validation
 * - sessionStorage.ts: browser storage access and active-session lifecycle
 * - localAccounts.ts: registration, verification, two-factor, and deletion
 * - localProfiles.ts: public-profile discovery and profile updates
 */
export type { AuthSession, SignUpInput } from './sessionSchema';
export { MOCK_EMAIL_CODE, MOCK_TWO_FACTOR_CODE } from './sessionSchema';
export {
  clearStoredSession,
  persistActiveSession,
  restoreSession,
} from './sessionStorage';
export {
  assertLocalAccountDeletion,
  deleteLocalAccount,
  findLocalAccountByEmail,
  registerLocalAccount,
  setLocalTwoFactor,
  verifyLocalEmail,
  verifyLocalTwoFactor,
} from './localAccounts';
export {
  getLocalPublicProfileById,
  listLocalPublicProfiles,
  searchLocalPublicProfiles,
  updateLocalProfile,
} from './localProfiles';
