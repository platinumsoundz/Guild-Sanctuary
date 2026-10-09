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
} from '@/modules/auth';
import type { AuthSession, SignUpInput } from '@/modules/auth';
import type { Profile } from '@/types/database';
import { toggleWorld as toggleWorldRequest } from '@/services/mockApi';
import { deleteDemoAccount } from '@/services/accountDeletion';

export type NavigationState = 'feed' | 'events' | 'shorts' | 'messages' | 'discover' | 'profile' | 'wallet' | 'settings';

export type UserSession = AuthSession;

interface AppContextValue {
  activeWorld: WorldType;
  currentUser: UserSession | null;
  isAuthenticated: boolean;
  isSessionReady: boolean;
  pendingEmail: string | null;
  pendingTwoFactorEmail: string | null;
  activeNavigation: NavigationState;
  selectWorld: (world: WorldType) => Promise<void>;
  toggleWorld: () => Promise<WorldType>;
  login: (email: string) => void;
  signup: (input: SignUpInput) => void;
  verifyEmailCode: (code: string) => boolean;
  verifyTwoFactorCode: (code: string) => void;
  setTwoFactorEnabled: (enabled: boolean) => void;
  updateProfile: (updates: Partial<Omit<Profile, 'id' | 'userId' | 'role' | 'vipTier'>>) => void;
  cancelAuthChallenge: () => void;
  logout: () => void;
  deleteAccount: (emailConfirmation: string, phrase: string, twoFactorCode: string) => void;
  setActiveNavigation: (navigation: NavigationState) => void;
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
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingTwoFactorEmail, setPendingTwoFactorEmail] = useState<string | null>(null);

  useEffect(() => {
    const restoredSession = restoreSession();

    if (restoredSession) {
      if (restoredSession.user.status === 'active' && restoredSession.user.emailVerified) {
        setCurrentUser(restoredSession);
        activeWorldRef.current = restoredSession.entryWorld;
        setActiveWorld(restoredSession.entryWorld);
      } else {
        clearStoredSession();
      }
    }

    setIsSessionReady(true);
  }, []);

  const activateSession = (session: AuthSession) => {
    persistActiveSession(session);
    setCurrentUser(session);
    activeWorldRef.current = session.entryWorld;
    setActiveWorld(session.entryWorld);
    setActiveNavigation('feed');
    setPendingEmail(null);
    setPendingTwoFactorEmail(null);
  };

  const toggleWorld = async () => {
    const currentWorld = activeWorldRef.current;
    const nextWorld = currentWorld === 'sanctuary' ? 'guild' : 'sanctuary';

    activeWorldRef.current = nextWorld;
    setActiveWorld(nextWorld);

    if (currentUser) {
      const updatedSession: AuthSession = { ...currentUser, entryWorld: nextWorld };
      setCurrentUser(updatedSession);
      persistActiveSession(updatedSession);
    }

    return toggleWorldRequest(currentWorld);
  };

  const selectWorld = async (world: WorldType) => {
    if (world !== activeWorldRef.current) {
      await toggleWorld();
    }
  };

  const signup = (input: SignUpInput) => {
    const session = registerLocalAccount(input);
    setPendingEmail(session.user.email);
    setPendingTwoFactorEmail(null);
  };

  const login = (email: string) => {
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

  const verifyEmailCode = (code: string) => {
    if (!pendingEmail) {
      throw new Error('Start sign in or registration before verifying your email.');
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

  const verifyTwoFactorCode = (code: string) => {
    if (!pendingTwoFactorEmail) {
      throw new Error('No two-factor challenge is pending.');
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

    const session = setLocalTwoFactor(currentUser.user.email, enabled);
    setCurrentUser(session);
  };

  const updateProfile = (updates: Partial<Omit<Profile, 'id' | 'userId' | 'role' | 'vipTier'>>) => {
    if (!currentUser) {
      throw new Error('Sign in before editing your profile.');
    }

    const session = updateLocalProfile(currentUser.user.id, updates);
    setCurrentUser(session);
  };

  const cancelAuthChallenge = () => {
    setPendingEmail(null);
    setPendingTwoFactorEmail(null);
  };

  const logout = () => {
    clearStoredSession();
    setCurrentUser(null);
    setActiveNavigation('feed');
    cancelAuthChallenge();
  };

  const deleteAccount = (emailConfirmation: string, phrase: string, twoFactorCode: string) => {
    if (!currentUser) {
      throw new Error('Sign in before deleting your account.');
    }
    deleteDemoAccount(currentUser.user.id, emailConfirmation, phrase, twoFactorCode);
    setCurrentUser(null);
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
        pendingEmail,
        pendingTwoFactorEmail,
        activeNavigation,
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