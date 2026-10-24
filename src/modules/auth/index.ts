export { AuthenticationGateway } from './components/AuthenticationGateway';
export { AuthenticationForm } from './components/AuthenticationForm';
export { AuthenticationModal } from './components/AuthenticationModal';
export type { AuthMode } from './components/AuthenticationForm';
export {
	clearStoredSession,
	assertLocalAccountDeletion,
	deleteLocalAccount,
	findLocalAccountByEmail,
	persistActiveSession,
	registerLocalAccount,
	restoreSession,
	setLocalTwoFactor,
	listLocalPublicProfiles,
	searchLocalPublicProfiles,
	getLocalPublicProfileById,
	updateLocalProfile,
	verifyLocalEmail,
	verifyLocalTwoFactor,
} from './sessionStore';
export { MOCK_EMAIL_CODE, MOCK_TWO_FACTOR_CODE } from './sessionStore';
export type { AuthSession, SignUpInput } from './sessionStore';
export {
  isPrivateProfileVaultUnlocked,
  lockPrivateProfileVault,
  savePrivateProfileVault,
  unlockPrivateProfileVault,
} from './privateProfileVault';
export type { PrivateProfileData } from './privateProfileVault';
export {
  isSupabaseAuthConfigured,
  mapProfileRow,
  mapPublicProfileRow,
  requestSupabaseEmailCode,
  restoreSupabaseSession,
  updateSupabaseProfile,
  verifySupabaseEmailCode,
  verifySupabaseTotpCode,
} from './supabaseAuth';
export type { SupabaseEmailVerification, SupabaseProfileUpdate } from './supabaseAuth';