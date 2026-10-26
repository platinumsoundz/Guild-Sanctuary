'use client';

import {
  createContext,
  useEffect,
  useContext,
  useState,
  type ReactNode,
} from 'react';
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
  CURRENT_TERMS_VERSION,
  requestSupabaseEmailCode,
  restoreSupabaseSession,
  verifySupabaseEmailCode,
  verifySupabaseTotpCode,
} from '@/modules/auth';
import type { AuthSession, SignUpInput } from '@/modules/auth';
import type { Profile } from '@/types/database';
import { deleteDemoAccount } from '@/services/accountDeletion';
import { getSupabaseBrowserClient } from '@/services/supabase';
import type { Database } from '@/services/supabase/database.types';
import { normalizeSocialLinks } from '@/lib/socialLinks';

export type NavigationState = 'feed' | 'events' | 'shorts' | 'messages' | 'discover' | 'profile' | 'wallet' | 'support' | 'settings';

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
      } as any,
      permissions: [],
    };
    setCurrentUser(guestSession);
    setActiveNavigation('feed');
    setSessionError(null);
  };

  const signup = async (input: SignUpInput) => {
    if (input.termsVersion !== CURRENT_TERMS_VERSION) {
      throw new Error('Accept the current Terms draft before creating an account.');
    }
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
      const databaseUpdates: Database['public']['Tables']['profiles']['Update'] = {};
      if ('username' in updates && updates.username !== undefined) databaseUpdates.username = updates.username.trim();
      if ('displayName' in updates && updates.displayName !== undefined) databaseUpdates.display_name = updates.displayName.trim();
      if ('bio' in updates) databaseUpdates.bio = updates.bio?.trim() || null;
      if ('statusMessage' in updates) databaseUpdates.status_message = updates.statusMessage?.trim() || null;
      if ('avatarUrl' in updates) databaseUpdates.avatar_url = updates.avatarUrl;
      if ('bannerUrl' in updates) databaseUpdates.banner_url = updates.bannerUrl;
      if ('themeColor' in updates && updates.themeColor !== undefined) databaseUpdates.theme_color = updates.themeColor;
      if ('location' in updates) databaseUpdates.location = updates.location?.trim() || null;
      if ('age' in updates) databaseUpdates.age = updates.age;
      if ('starSign' in updates) databaseUpdates.star_sign = updates.starSign;
      if ('belief' in updates) databaseUpdates.belief = updates.belief?.trim() || null;
      if ('socialLinks' in updates && updates.socialLinks) {
        databaseUpdates.social_links = { ...normalizeSocialLinks(updates.socialLinks) };
      }
      if ('privacy' in updates && updates.privacy) {
        const { bio, location, age, starSign, belief, socialLinks, allowDirectMessages } = updates.privacy;
        databaseUpdates.privacy = { bio, location, age, starSign, belief, socialLinks, allowDirectMessages };
        databaseUpdates.allow_direct_messages = allowDirectMessages;
      }
      if ('visibility' in updates && updates.visibility !== undefined) {
        databaseUpdates.visibility = updates.visibility;
        databaseUpdates.allow_profile_discovery = updates.visibility === 'public';
      }
      if (Object.keys(databaseUpdates).length === 0) return;
      const { error } = await getSupabaseBrowserClient()
        .from('profiles')
        .update(databaseUpdates)
        .eq('id', currentUser.user.id)
        .select('id')
        .single();
      if (error) throw new Error(`Profile changes could not be saved: ${error.message}`);
      const refreshedSession = await restoreSupabaseSession();
      if (!refreshedSession) throw new Error('Your profile was saved, but the account session could not be refreshed. Reload the page.');
      setCurrentUser(refreshedSession);
      return;
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
