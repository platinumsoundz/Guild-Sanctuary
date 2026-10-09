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
	searchLocalPublicProfiles,
	syncLocalProfileEntitlements,
	getLocalPublicProfileById,
	updateLocalProfile,
	verifyLocalEmail,
	verifyLocalTwoFactor,
} from './sessionStore';
export { MOCK_EMAIL_CODE, MOCK_TWO_FACTOR_CODE } from './sessionStore';
export type { AuthSession, SignUpInput } from './sessionStore';