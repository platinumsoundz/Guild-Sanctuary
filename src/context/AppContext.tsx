'use client';

import {
  createContext,
  useEffect,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { WorldType } from '@/types';
import {
  findLocalAccountByEmail,
  persistActiveSession,
  clearStoredSession,
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
  verifySupabaseEmailCode,
  verifySupabaseTotpCode,
} from '@/modules/auth';
import type { AuthSession, SignUpInput } from '@/modules/auth';
import type { Profile } from '@/types/database';
import { toggleWorld as toggleWorldRequest } from '@/services/mockApi';
import { deleteDemoAccount } from '@/services/accountDeletion';
import { getSupabaseBrowserClient } from '@/services/supabase';

export type NavigationState = 'feed' | 'events' | 'shorts' | 'messages' | 'discover' | 'profile' | 'support' | 'settings';

export type UserSession = AuthSession;

interface AppContextValue {
  activeWorld: WorldType;
  currentUser: UserSession | null;
  isAuthenticated: boolean;
  isSessionReady: boolean;
  sessionError: string | null;
  pendingEmail: string | null;
  pendingTwoFactorEmail: string | null;
  activeNavigation: NavigationState;
  isGuest: boolean;
  selectWorld: (world: WorldType) => Promise<void>;
  toggleWorld: () => Promise<WorldType>;
  login: (email: string) => Promise<void>;
  signup: (input: SignUpInput) => Promise<void>;
  verifyEmailCode: (code: string) => Promise<boolean>;
  verifyTwoFactorCode: (code: string) => Promise<void>;
  setTwoFactorEnabled: (enabled: boolean) => void;
  updateProfile: (updates: Partial<Omit<Profile, 'id' | 'userId' | 'role'>>) => void;
  cancelAuthChallenge: () => void;
  logout: () => void;
  deleteAccount: (emailConfirmation: string, phrase: string, twoFactorCode: string) => void;
  setActiveNavigation: (navigation: NavigationState) => void;
  loginAsGuest: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppContextProviderProps {
  children: ReactNode;
}

export function AppContextProvider({ children }: AppContextProviderProps) {
  const [activeWorld, setActiveWorld] = useState<WorldType>('sanctuary');
  const activeWorldRef = useRef<WorldType>('sanctuary');
  const [activeNavigation, setActiveNavigation] = useState<NavigationState>('feed');
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingTwoFactorEmail, setPendingTwoFactorEmail] = useState<string | null>(null);
  const [pendingEntryWorld, setPendingEntryWorld] = useState<WorldType>('sanctuary');
  const [pendingTotp, setPendingTotp] = useState<{ factorId: string; challengeId: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        const restoredSession = isSupabaseAuthConfigured()
          ? await restoreSupabaseSession('sanctuary')
          : restoreSession();
        if (cancelled) return;
        if (restoredSession) {
          if (restoredSession.user.status === 'active' && restoredSession.user.emailVerified) {
            setCurrentUser(restoredSession);
            activeWorldRef.current = restoredSession.entryWorld;
            setActiveWorld(restoredSession.entryWorld);
          } else if (!isSupabaseAuthConfigured()) {
            clearStoredSession();
          }
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
    activeWorldRef.current = session.entryWorld;
    setActiveWorld(session.entryWorld);
    setActiveNavigation('feed');
    setPendingEmail(null);
    setPendingTwoFactorEmail(null);
    setPendingTotp(null);
    setSessionError(null);
  };

const loginAsGuest = () => {
    setIsGuest(true);
    const guestSession: UserSession = {
      user: {
        id: 'guest-user-id',
        email: 'guest@guildsanctuary.local',
        status: 'active',
        emailVerified: true,
        twoFactorEnabled: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      profile: {
        id: 'guest-profile-id',
        userId: 'guest-user-id',
        username: 'Guest Explorer',
        avatarUrl: '',
        role: 'user',
      } as any, // Bypass strict optional profile property checks for guest mode
      permissions: [],
      entryWorld: 'sanctuary',
    };
    setCurrentUser(guestSession);
    setActiveNavigation('feed');
    setSessionError(null);
  };

  const toggleWorld = async () => {
    const currentWorld = activeWorldRef.current;
    const nextWorld = currentWorld === 'sanctuary' ? 'guild' : 'sanctuary';

    activeWorldRef.current = nextWorld;
    setActiveWorld(nextWorld);

    if (currentUser && !isGuest) {
      const updatedSession: AuthSession = { ...currentUser, entryWorld: nextWorld };
      setCurrentUser(updatedSession);
      if (!isSupabaseAuthConfigured()) persistActiveSession(updatedSession);
    }

    return toggleWorldRequest(currentWorld);
  };

  const selectWorld = async (world: WorldType) => {
    if (world !== activeWorldRef.current) {
      await toggleWorld();
    }
  };

  const signup = async (input: SignUpInput) => {
    if (isSupabaseAuthConfigured()) {
      await requestSupabaseEmailCode(input.email, input);
      setPendingEmail(input.email.trim().toLowerCase());
      setPendingEntryWorld(input.entryWorld);
      setPendingTwoFactorEmail(null);
      setPendingTotp(null);
      return;
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Production sign-up is disabled until Supabase Auth is configured.');
    }
    const session = registerLocalAccount(input);
    setPendingEmail(session.user.email);
    setPendingEntryWorld(input.entryWorld);
    setPendingTwoFactorEmail(null);
  };

  const login = async (email: string) => {
    if (isSupabaseAuthConfigured()) {
      await requestSupabaseEmailCode(email);
      setPendingEmail(email.trim().toLowerCase());
      setPendingEntryWorld('sanctuary');
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
      const result = await verifySupabaseEmailCode(pendingEmail, code, pendingEntryWorld);
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
        pendingEntryWorld,
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

  const updateProfile = (updates: Partial<Omit<Profile, 'id' | 'userId' | 'role'>>) => {
    if (!currentUser) {
      throw new Error('Sign in before editing your profile.');
    }
    if (isGuest) {
      throw new Error('Profile editing is disabled in Guest Mode.');
    }
    if (isSupabaseAuthConfigured()) {
      throw new Error('Profile editing is not yet enabled for Supabase accounts.');
    }

    const session = updateLocalProfile(currentUser.user.id, updates);
    setCurrentUser(session);
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
    cancelAuthChallenge();
  };

  const deleteAccount = (emailConfirmation: string, phrase: string, twoFactorCode: string) => {
    if (!currentUser) {
      throw new Error('Sign in before deleting your account.');
    }
    if (isGuest) {
      throw new Error('Guest accounts cannot be deleted this way.');
    }
    if (isSupabaseAuthConfigured()) {
      throw new Error('Account deletion must be completed through the verified support process. In-app deletion is not enabled yet.');
    }
    deleteDemoAccount(currentUser.user.id, emailConfirmation, phrase, twoFactorCode);
    lockPrivateProfileVault(currentUser.user.id);
    setCurrentUser(null);
    setIsGuest(false);
    setActiveNavigation('feed');
    cancelAuthChallenge();
  };

  return (
    <AppContext.Provider
      value={{
        activeWorld,
        currentUser,
        isAuthenticated: currentUser !== null,
        isSessionReady,
        sessionError,
        pendingEmail,
        pendingTwoFactorEmail,
        activeNavigation,
        isGuest,
        selectWorld,
        toggleWorld,
        login,
        signup,
        verifyEmailCode,
        verifyTwoFactorCode,
        setTwoFactorEnabled,
        updateProfile,
        cancelAuthChallenge,
        logout,
        deleteAccount,
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