'use client';

import {
  createContext,
  useEffect,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import {
  cancelAccountDeletion,
  findLocalAccountByEmail,
  persistActiveSession,
  clearStoredSession,
  recordTermsAcceptance,
  registerLocalAccount,
  restoreSession,
  setLocalTwoFactor,
  updateLocalProfile,
  verifyLocalEmail,
  verifyLocalTwoFactor,
  lockPrivateProfileVault,
  isSupabaseAuthConfigured,
  requestSupabaseEmailCode,
  restoreSupabaseSession,
  updateSupabaseProfile,
  verifySupabaseEmailCode,
  verifySupabaseTotpCode,
} from '@/modules/auth';
import type { AuthSession, SignUpInput } from '@/modules/auth';
import type { Profile } from '@/types/database';
import { deleteDemoAccount } from '@/services/accountDeletion';
import { getSupabaseBrowserClient } from '@/services/supabase';

export type NavigationState = 'feed' | 'events' | 'shorts' | 'messages' | 'discover' | 'games' | 'profile' | 'wallet' | 'shop' | 'support' | 'settings' | 'moderation';

export type UserSession = AuthSession;

interface AppContextValue {
  currentUser: UserSession | null;
  isAuthenticated: boolean;
  isSessionReady: boolean;
  sessionError: string | null;
  pendingEmail: string | null;
  pendingTwoFactorEmail: string | null;
  activeNavigation: NavigationState;
  isGuest: boolean;
  login: (email: string) => Promise<void>;
  signup: (input: SignUpInput) => Promise<void>;
  verifyEmailCode: (code: string) => Promise<boolean>;
  verifyTwoFactorCode: (code: string) => Promise<void>;
  setTwoFactorEnabled: (enabled: boolean) => void;
  updateProfile: (updates: Partial<Omit<Profile, 'id' | 'userId' | 'role'>>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  cancelAuthChallenge: () => void;
  logout: () => void;
  deleteAccount: (emailConfirmation: string, phrase: string, twoFactorCode: string) => Promise<void>;
  restoreAccount: () => Promise<void>;
  acceptTerms: (version: string) => Promise<void>;
  setActiveNavigation: (navigation: NavigationState) => void;
  loginAsGuest: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppContextProviderProps {
  children: ReactNode;
}

export function AppContextProvider({ children }: AppContextProviderProps) {
  const [activeNavigation, setActiveNavigation] = useState<NavigationState>('feed');
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingTwoFactorEmail, setPendingTwoFactorEmail] = useState<string | null>(null);
  const [pendingTotp, setPendingTotp] = useState<{ factorId: string; challengeId: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        const restoredSession = isSupabaseAuthConfigured()
          ? await restoreSupabaseSession()
          : restoreSession();
        if (cancelled) return;
        if (restoredSession && restoredSession.user.status === 'active' && restoredSession.user.emailVerified) {
          setCurrentUser(restoredSession);
        } else if (!isSupabaseAuthConfigured()) {
          clearStoredSession();
        }
      } catch (restoreError) {
        if (!cancelled) {
          setSessionError(restoreError instanceof Error ? restoreError.message : 'Your session could not be restored.');
        }
      } finally {
        if (!cancelled) setIsSessionReady(true);
      }
    };
    void restore();
    return () => { cancelled = true; };
  }, []);

  const activateSession = (session: AuthSession, persist = !isSupabaseAuthConfigured()) => {
    if (persist) persistActiveSession(session);
    setCurrentUser(session);
    setIsGuest(false);
    setActiveNavigation('feed');
    setPendingEmail(null);
    setPendingTwoFactorEmail(null);
    setPendingTotp(null);
    setSessionError(null);
  };

  const loginAsGuest = () => {
    setIsGuest(true);
    const timestamp = new Date().toISOString();
    const guestSession: UserSession = {
      user: {
        id: 'guest-user-id',
        email: 'guest@guildsanctuary.local',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        purchaseAgeVerifiedAt: null,
        termsVersion: null,
        termsAcceptedAt: null,
        deletionPurgeAfter: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      profile: {
        id: 'guest-profile-id',
        userId: 'guest-user-id',
        username: 'Guest Explorer',
        displayName: 'Guest Explorer',
        bio: null,
        statusMessage: null,
        avatarUrl: null,
        bannerUrl: null,
        themeColor: '#52765c',
        location: null,
        age: null,
        starSign: null,
        belief: null,
        privacy: {
          bio: true,
          location: false,
          age: false,
          starSign: false,
          belief: false,
          socialLinks: false,
          allowDirectMessages: true,
        },
        socialLinks: {
          facebook: null,
          x: null,
          youtube: null,
          xbox: null,
          playstation: null,
          steam: null,
          epicGames: null,
          reddit: null,
        },
        visibility: 'public',
        role: 'member',
        equippedFrame: null,
        equippedEffect: null,
        equippedBadge: null,
        equippedBanner: null,
      },
      permissions: [],
    };
    setCurrentUser(guestSession);
    setActiveNavigation('feed');
    setSessionError(null);
  };

  const signup = async (input: SignUpInput) => {
    if (isSupabaseAuthConfigured()) {
      await requestSupabaseEmailCode(input.email, input);
      setPendingEmail(input.email.trim().toLowerCase());
      setPendingTwoFactorEmail(null);
      setPendingTotp(null);
      return;
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Production sign-up is disabled until Supabase Auth is configured.');
    }
    const session = registerLocalAccount(input);
    setPendingEmail(session.user.email);
    setPendingTwoFactorEmail(null);
  };

  const login = async (email: string) => {
    if (isSupabaseAuthConfigured()) {
      await requestSupabaseEmailCode(email);
      setPendingEmail(email.trim().toLowerCase());
      setPendingTwoFactorEmail(null);
      setPendingTotp(null);
      return;
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Production sign-in is disabled until Supabase Auth is configured.');
    }
    const session = findLocalAccountByEmail(email);

    if (!session) {
      throw new Error('No saved account uses that email. Create an account first.');
    }
    if (session.user.status !== 'active') {
      throw new Error('This account is currently unavailable. Contact support for help.');
    }

    setPendingEmail(session.user.email);
    setPendingTwoFactorEmail(null);
  };

  const verifyEmailCode = async (code: string) => {
    if (!pendingEmail) {
      throw new Error('Start sign in or registration before verifying your email.');
    }

    if (isSupabaseAuthConfigured()) {
      const result = await verifySupabaseEmailCode(pendingEmail, code);
      if (result.challenge) {
        setPendingEmail(null);
        setPendingTwoFactorEmail(pendingEmail);
        setPendingTotp(result.challenge);
        return true;
      }
      if (!result.session) throw new Error('Authentication completed without an active session.');
      activateSession(result.session, false);
      return false;
    }
    const session = verifyLocalEmail(pendingEmail, code);
    if (!session) {
      throw new Error('The email verification code is incorrect.');
    }

    if (session.user.twoFactorEnabled) {
      setPendingEmail(null);
      setPendingTwoFactorEmail(session.user.email);
      return true;
    }

    activateSession(session);
    return false;
  };

  const verifyTwoFactorCode = async (code: string) => {
    if (!pendingTwoFactorEmail) {
      throw new Error('No two-factor challenge is pending.');
    }

    if (isSupabaseAuthConfigured()) {
      if (!pendingTotp) throw new Error('The authenticator challenge has expired. Start sign-in again.');
      const session = await verifySupabaseTotpCode(
        pendingTotp.factorId,
        pendingTotp.challengeId,
        code,
      );
      activateSession(session, false);
      return;
    }
    const session = verifyLocalTwoFactor(pendingTwoFactorEmail, code);
    if (!session) {
      throw new Error('The two-factor code is incorrect.');
    }

    activateSession(session);
  };

  const setTwoFactorEnabled = (enabled: boolean) => {
    if (!currentUser) {
      throw new Error('Sign in before changing two-factor settings.');
    }
    if (isSupabaseAuthConfigured()) {
      throw new Error('Use your Supabase Authenticator settings to manage TOTP. In-app enrollment is not available yet.');
    }

    const session = setLocalTwoFactor(currentUser.user.email, enabled);
    setCurrentUser(session);
  };

  const updateProfile = async (updates: Partial<Omit<Profile, 'id' | 'userId' | 'role'>>) => {
    if (!currentUser) {
      throw new Error('Sign in before editing your profile.');
    }
    if (isGuest) {
      throw new Error('Profile editing is disabled in Guest Mode.');
    }

    if (isSupabaseAuthConfigured()) {
      const profile = await updateSupabaseProfile(currentUser.user.id, updates);
      setCurrentUser({ ...currentUser, profile });
      return;
    }

    const session = updateLocalProfile(currentUser.user.id, updates);
    setCurrentUser(session);
  };

  const refreshProfile = async () => {
    if (!currentUser || isGuest || !isSupabaseAuthConfigured()) {
      return;
    }
    // Server-owned changes such as an equipped token frame are not writable by
    // the client. Re-read the profile after a purchase so the UI reflects them.
    const profile = await updateSupabaseProfile(currentUser.user.id, {});
    setCurrentUser((session) => session ? { ...session, profile } : session);
  };

  const cancelAuthChallenge = () => {
    if (isSupabaseAuthConfigured()) {
      void getSupabaseBrowserClient().auth.signOut().then(({ error }) => {
        if (error) setSessionError(`The pending sign-in could not be cleared: ${error.message}`);
      });
    }
    setPendingEmail(null);
    setPendingTwoFactorEmail(null);
    setPendingTotp(null);
  };

  const logout = () => {
    if (currentUser && !isGuest) lockPrivateProfileVault(currentUser.user.id);
    if (isSupabaseAuthConfigured() && !isGuest) {
      void getSupabaseBrowserClient().auth.signOut().then(({ error }) => {
        if (error) setSessionError(`Sign-out could not be confirmed: ${error.message}`);
      });
    }
    clearStoredSession();
    setCurrentUser(null);
    setIsGuest(false);
    setActiveNavigation('feed');
    setPendingEmail(null);
    setPendingTwoFactorEmail(null);
    setPendingTotp(null);
  };

  const deleteAccount = async (emailConfirmation: string, phrase: string, twoFactorCode: string) => {
    if (!currentUser) {
      throw new Error('Sign in before deleting your account.');
    }
    if (isGuest) {
      throw new Error('Guest accounts cannot be deleted this way.');
    }

    if (isSupabaseAuthConfigured()) {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailConfirmation, phrase, twoFactorCode }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
          ? result.error
          : 'Your account could not be deleted.';
        throw new Error(message);
      }
      const purgeAfter = typeof result === 'object' && result !== null && 'purgeAfter' in result && typeof result.purgeAfter === 'string'
        ? result.purgeAfter
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const profile = await updateSupabaseProfile(currentUser.user.id, {});
      setCurrentUser((session) => session ? {
        ...session,
        profile,
        user: { ...session.user, status: 'suspended', deletionPurgeAfter: purgeAfter },
      } : session);
      return;
    }

    deleteDemoAccount(currentUser.user.id, emailConfirmation, phrase, twoFactorCode);
    lockPrivateProfileVault(currentUser.user.id);
    clearStoredSession();
    setCurrentUser(null);
    setIsGuest(false);
    setActiveNavigation('feed');
    setPendingEmail(null);
    setPendingTwoFactorEmail(null);
    setPendingTotp(null);
  };

  const restoreAccount = async () => {
    if (!currentUser) throw new Error('Sign in before restoring your account.');
    if (!isSupabaseAuthConfigured()) {
      throw new Error('Account restoration is only available for Supabase accounts.');
    }
    await cancelAccountDeletion();
    try {
      // Rebuild the session so the restored moderation status is accurate
      // instead of assuming the account is active again.
      const restored = await restoreSupabaseSession();
      if (restored) {
        setCurrentUser(restored);
        setActiveNavigation('feed');
        return;
      }
    } catch (error) {
      // The deletion request is cancelled even when the rebuilt session is
      // rejected (for example a restored suspension or ban). Drop the stale
      // notice and surface the real reason.
      setCurrentUser((session) => session ? {
        ...session,
        user: { ...session.user, deletionPurgeAfter: null },
      } : session);
      throw error;
    }
    const profile = await updateSupabaseProfile(currentUser.user.id, {});
    setCurrentUser((session) => session ? {
      ...session,
      profile,
      user: { ...session.user, deletionPurgeAfter: null },
    } : session);
    setActiveNavigation('feed');
  };

  const acceptTerms = async (version: string) => {
    if (!currentUser) throw new Error('Sign in before accepting the terms.');
    const acceptance = await recordTermsAcceptance(version);
    setCurrentUser((session) => session ? {
      ...session,
      user: {
        ...session.user,
        termsVersion: acceptance.termsVersion,
        termsAcceptedAt: acceptance.termsAcceptedAt,
      },
    } : session);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated: currentUser !== null,
        isSessionReady,
        sessionError,
        pendingEmail,
        pendingTwoFactorEmail,
        activeNavigation,
        isGuest,
        login,
        signup,
        verifyEmailCode,
        verifyTwoFactorCode,
        setTwoFactorEnabled,
        updateProfile,
        refreshProfile,
        cancelAuthChallenge,
        logout,
        deleteAccount,
        restoreAccount,
        acceptTerms,
        setActiveNavigation,
        loginAsGuest,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider.');
  }

  return context;
}
