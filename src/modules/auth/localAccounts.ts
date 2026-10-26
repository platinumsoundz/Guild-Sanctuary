import type { AuthSession, SignUpInput } from './sessionSchema';
import {
  allowedPermissions,
  defaultPrivacy,
  MOCK_EMAIL_CODE,
  MOCK_TWO_FACTOR_CODE,
} from './sessionSchema';
import {
  accountsKey,
  activeSessionKey,
  getStorage,
  parseSessions,
  persistActiveSession,
  restoreSession,
  saveAccount,
} from './sessionStorage';

function createSession(input: SignUpInput): AuthSession {
  const timestamp = new Date().toISOString();
  const userId = `user-${crypto.randomUUID()}`;

  return {
    user: {
      id: userId,
      email: input.email.trim().toLowerCase(),
      emailVerified: false,
      twoFactorEnabled: false,
      status: 'active',
      createdAt: timestamp,
      updatedAt: timestamp,
      purchaseAgeVerifiedAt: null,
      termsVersion: input.termsVersion ?? null,
      termsAcceptedAt: input.termsVersion ? timestamp : null,
      deletionPurgeAfter: null,
    },
    profile: {
      id: `profile-${crypto.randomUUID()}`,
      userId,
      username: input.username,
      displayName: input.displayName,
      bio: null,
      statusMessage: null,
      avatarUrl: null,
      bannerUrl: null,
      themeColor: '#52765c',
      location: null,
      age: null,
      starSign: null,
      belief: null,
      privacy: defaultPrivacy(null),
      socialLinks: { facebook: null, x: null, youtube: null, xbox: null, playstation: null, steam: null, epicGames: null, reddit: null },
      visibility: 'public',
      role: 'member',
      equippedFrame: null,
      equippedEffect: null,
      equippedBadge: null,
      equippedBanner: null,
    },
    permissions: [...allowedPermissions],
  };
}

export function registerLocalAccount(input: SignUpInput): AuthSession {
  const storage = getStorage();
  const accounts = parseSessions(storage.getItem(accountsKey));
  const email = input.email.trim().toLowerCase();
  const username = input.username.trim();
  const displayName = input.displayName.trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error('Enter a valid email address.');
  }
  if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
    throw new Error('Use 3 to 24 letters, numbers, or underscores for your username.');
  }
  if (displayName.length < 1 || displayName.length > 50) {
    throw new Error('Display name must be between 1 and 50 characters.');
  }
  if (accounts.some((account) => account.profile.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('That username is already registered in this browser. Sign in or choose another.');
  }
  if (accounts.some((account) => account.user.email.toLowerCase() === email)) {
    throw new Error('That email address is already registered in this browser. Sign in instead.');
  }

  const session = createSession({ ...input, email, username, displayName });
  try {
    storage.setItem(accountsKey, JSON.stringify([...accounts, session]));
  } catch {
    throw new Error('Your account could not be saved in this browser.');
  }
  return session;
}

export function findLocalAccountByEmail(email: string): AuthSession | null {
  const normalizedEmail = email.trim().toLowerCase();
  return parseSessions(getStorage().getItem(accountsKey)).find(
    (account) => account.user.email.toLowerCase() === normalizedEmail,
  ) ?? null;
}

export function verifyLocalEmail(email: string, code: string): AuthSession | null {
  if (code !== MOCK_EMAIL_CODE) {
    return null;
  }

  const session = findLocalAccountByEmail(email);
  if (!session) {
    return null;
  }

  const verifiedSession: AuthSession = {
    ...session,
    user: { ...session.user, emailVerified: true, updatedAt: new Date().toISOString() },
  };
  saveAccount(verifiedSession);
  return verifiedSession;
}

export function verifyLocalTwoFactor(email: string, code: string): AuthSession | null {
  if (code !== MOCK_TWO_FACTOR_CODE) {
    return null;
  }
  const session = findLocalAccountByEmail(email);
  return session?.user.twoFactorEnabled && session.user.emailVerified ? session : null;
}

export function setLocalTwoFactor(email: string, enabled: boolean): AuthSession {
  const session = findLocalAccountByEmail(email);
  if (!session) {
    throw new Error('The account could not be found in this browser.');
  }

  const updated: AuthSession = {
    ...session,
    user: { ...session.user, twoFactorEnabled: enabled, updatedAt: new Date().toISOString() },
  };
  saveAccount(updated);
  if (restoreSession()?.user.id === updated.user.id) {
    persistActiveSession(updated);
  }
  return updated;
}

export function assertLocalAccountDeletion(userId: string, emailConfirmation: string, phrase: string, twoFactorCode: string): void {
  const storage = getStorage();
  const session = parseSessions(storage.getItem(accountsKey)).find((account) => account.user.id === userId);
  if (
    !session ||
    restoreSession()?.user.id !== userId ||
    session.user.email.toLowerCase() !== emailConfirmation.trim().toLowerCase() ||
    phrase !== 'DELETE' ||
    (session.user.twoFactorEnabled && twoFactorCode !== MOCK_TWO_FACTOR_CODE)
  ) {
    throw new Error('Account deletion confirmation did not match. No account changes were made.');
  }
}

export function deleteLocalAccount(userId: string, emailConfirmation: string, phrase: string, twoFactorCode: string): void {
  assertLocalAccountDeletion(userId, emailConfirmation, phrase, twoFactorCode);
  const storage = getStorage();
  const accounts = parseSessions(storage.getItem(accountsKey)).filter((account) => account.user.id !== userId);
  try {
    storage.setItem(accountsKey, JSON.stringify(accounts));
    storage.removeItem(activeSessionKey);
  } catch {
    throw new Error('The account could not be deleted from this browser.');
  }
}
