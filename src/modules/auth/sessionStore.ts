import type { WorldType } from '@/types';
import type {
  Profile,
  ProfilePrivacy,
  PublicProfile,
  User,
  UserPermission,
} from '@/types/database';

const activeSessionKey = 'guild-sanctuary:active-session:v1';
const accountsKey = 'guild-sanctuary:accounts:v1';
const allowedPermissions: UserPermission[] = [
  'feed:read',
  'post:create',
  'event:rsvp',
  'message:send',
  'profile:edit',
];

export interface AuthSession {
  user: User;
  profile: Profile;
  entryWorld: WorldType;
  permissions: UserPermission[];
}

export interface SignUpInput {
  email: string;
  username: string;
  displayName: string;
  entryWorld: WorldType;
}

export const MOCK_EMAIL_CODE = '000000';
export const MOCK_TWO_FACTOR_CODE = '000000';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function defaultPrivacy(value: unknown): ProfilePrivacy {
  const privacy = isRecord(value) ? value : {};
  return {
    bio: typeof privacy.bio === 'boolean' ? privacy.bio : true,
    location: typeof privacy.location === 'boolean' ? privacy.location : false,
    age: typeof privacy.age === 'boolean' ? privacy.age : false,
    starSign: typeof privacy.starSign === 'boolean' ? privacy.starSign : false,
    belief: typeof privacy.belief === 'boolean' ? privacy.belief : false,
    socialLinks: typeof privacy.socialLinks === 'boolean' ? privacy.socialLinks : false,
    allowDirectMessages: typeof privacy.allowDirectMessages === 'boolean' ? privacy.allowDirectMessages : true,
  };
}

function normalizeSocialLink(value: unknown, provider: keyof Profile['socialLinks']): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }
  const normalizedValue = value.trim();
  if (['xbox', 'playstation', 'steam', 'epicGames'].includes(provider) &&
      /^[A-Za-z0-9_. -]{2,40}$/.test(normalizedValue)) {
    return normalizedValue;
  }
  try {
    const url = new URL(normalizedValue);
    const hosts: Record<keyof Profile['socialLinks'], string[]> = {
      facebook: ['facebook.com', 'www.facebook.com'],
      x: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
      youtube: ['youtube.com', 'www.youtube.com'],
      xbox: ['xbox.com', 'www.xbox.com'],
      playstation: ['playstation.com', 'www.playstation.com'],
      steam: ['steamcommunity.com', 'www.steamcommunity.com'],
      epicGames: ['epicgames.com', 'www.epicgames.com'],
      reddit: ['reddit.com', 'www.reddit.com', 'old.reddit.com'],
    };
    return url.protocol === 'https:' && hosts[provider].includes(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeSession(value: unknown): AuthSession | null {
  if (!isRecord(value) || !isRecord(value.user) || !isRecord(value.profile)) {
    return null;
  }

  const profile = value.profile;
  const socialLinks = isRecord(profile.socialLinks) ? profile.socialLinks : {};
  const normalized: Record<string, unknown> = {
    ...value,
    profile: {
      ...profile,
      statusMessage: typeof profile.statusMessage === 'string' ? profile.statusMessage : null,
      avatarUrl: typeof profile.avatarUrl === 'string' ? profile.avatarUrl : null,
      bannerUrl: typeof profile.bannerUrl === 'string' ? profile.bannerUrl : null,
      themeColor: typeof profile.themeColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(profile.themeColor)
        ? profile.themeColor
        : '#52765c',
      location: typeof profile.location === 'string' ? profile.location : null,
      age: typeof profile.age === 'number' && Number.isInteger(profile.age) ? profile.age : null,
      starSign: typeof profile.starSign === 'string' ? profile.starSign : null,
      belief: typeof profile.belief === 'string' ? profile.belief : null,
      cosmeticFrames: Array.isArray(profile.cosmeticFrames)
        ? profile.cosmeticFrames.filter((frame): frame is string => typeof frame === 'string')
        : [],
      privacy: defaultPrivacy(profile.privacy),
      socialLinks: {
        facebook: normalizeSocialLink(socialLinks.facebook, 'facebook'),
        x: normalizeSocialLink(socialLinks.x, 'x'),
        youtube: normalizeSocialLink(socialLinks.youtube, 'youtube'),
        xbox: normalizeSocialLink(socialLinks.xbox, 'xbox'),
        playstation: normalizeSocialLink(socialLinks.playstation, 'playstation'),
        steam: normalizeSocialLink(socialLinks.steam, 'steam'),
        epicGames: normalizeSocialLink(socialLinks.epicGames, 'epicGames'),
        reddit: normalizeSocialLink(socialLinks.reddit, 'reddit'),
      },
    },
  };

  if (!isRecord(normalized.user) || !isRecord(normalized.profile)) {
    return null;
  }

  const user = normalized.user;
  const normalizedProfile = normalized.profile;
  const permissions = normalized.permissions;

  if (
    (normalized.entryWorld !== 'sanctuary' && normalized.entryWorld !== 'guild') ||
    !Array.isArray(permissions) ||
    !permissions.every((permission) => allowedPermissions.includes(permission as UserPermission)) ||
    typeof user.id !== 'string' ||
    typeof user.email !== 'string' ||
    typeof user.emailVerified !== 'boolean' ||
    typeof user.twoFactorEnabled !== 'boolean' ||
    (user.status !== 'active' && user.status !== 'suspended') ||
    typeof user.createdAt !== 'string' ||
    typeof user.updatedAt !== 'string' ||
    typeof normalizedProfile.id !== 'string' ||
    typeof normalizedProfile.userId !== 'string' ||
    typeof normalizedProfile.username !== 'string' ||
    typeof normalizedProfile.displayName !== 'string' ||
    (typeof normalizedProfile.bio !== 'string' && normalizedProfile.bio !== null) ||
    (typeof normalizedProfile.statusMessage !== 'string' && normalizedProfile.statusMessage !== null) ||
    (typeof normalizedProfile.avatarUrl !== 'string' && normalizedProfile.avatarUrl !== null) ||
    (typeof normalizedProfile.bannerUrl !== 'string' && normalizedProfile.bannerUrl !== null) ||
    typeof normalizedProfile.themeColor !== 'string' ||
    (typeof normalizedProfile.location !== 'string' && normalizedProfile.location !== null) ||
    (typeof normalizedProfile.age !== 'number' && normalizedProfile.age !== null) ||
    (typeof normalizedProfile.starSign !== 'string' && normalizedProfile.starSign !== null) ||
    (typeof normalizedProfile.belief !== 'string' && normalizedProfile.belief !== null) ||
    !isRecord(normalizedProfile.privacy) ||
    (normalizedProfile.visibility !== 'public' && normalizedProfile.visibility !== 'private') ||
    (normalizedProfile.vipTier !== 'free' && normalizedProfile.vipTier !== 'wayfinder' && normalizedProfile.vipTier !== 'champion') ||
    typeof normalizedProfile.role !== 'string'
  ) {
    return null;
  }

  return normalized as unknown as AuthSession;
}

function getStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new Error('Local accounts are only available in the browser.');
  }

  try {
    return window.localStorage;
  } catch {
    throw new Error('Browser storage is unavailable. Check your browser privacy settings.');
  }
}

function parseSessions(rawValue: string | null): AuthSession[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);
    return Array.isArray(parsed)
      ? parsed.map(normalizeSession).filter((session): session is AuthSession => session !== null)
      : [];
  } catch {
    return [];
  }
}

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
      cosmeticFrames: [],
      visibility: 'public',
      vipTier: 'free',
      role: 'member',
    },
    entryWorld: input.entryWorld,
    permissions: [...allowedPermissions],
  };
}

function saveAccount(updatedSession: AuthSession): void {
  const storage = getStorage();
  const accounts = parseSessions(storage.getItem(accountsKey));
  const updatedAccounts = accounts.map((account) => (
    account.user.id === updatedSession.user.id ? updatedSession : account
  ));

  try {
    storage.setItem(accountsKey, JSON.stringify(updatedAccounts));
  } catch {
    throw new Error('Your account could not be updated in this browser.');
  }
}

export function restoreSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return normalizeSession(JSON.parse(window.localStorage.getItem(activeSessionKey) ?? 'null'));
  } catch {
    return null;
  }
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

function toPublicProfile(session: AuthSession): PublicProfile {
  const { profile, user } = session;
  return {
    userId: user.id,
    profileId: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.privacy.bio ? profile.bio : null,
    statusMessage: profile.statusMessage,
    avatarUrl: profile.avatarUrl,
    bannerUrl: profile.bannerUrl,
    themeColor: profile.themeColor,
    location: profile.privacy.location ? profile.location : null,
    age: profile.privacy.age ? profile.age : null,
    starSign: profile.privacy.starSign ? profile.starSign : null,
    belief: profile.privacy.belief ? profile.belief : null,
    socialLinks: profile.privacy.socialLinks ? { ...profile.socialLinks } : {
      facebook: null,
      x: null,
      youtube: null,
      xbox: null,
      playstation: null,
      steam: null,
      epicGames: null,
      reddit: null,
    },
    allowDirectMessages: profile.privacy.allowDirectMessages,
    cosmeticFrames: [...profile.cosmeticFrames],
    vipTier: profile.vipTier,
    role: profile.role,
  };
}

export function getLocalPublicProfileById(userId: string): PublicProfile | null {
  const session = parseSessions(getStorage().getItem(accountsKey)).find(
    (account) => account.user.id === userId && account.user.emailVerified && account.profile.visibility === 'public',
  );
  return session ? toPublicProfile(session) : null;
}

export function searchLocalPublicProfiles(query: string): PublicProfile[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) {
    return [];
  }

  return parseSessions(getStorage().getItem(accountsKey))
    .filter((account) => (
      account.user.emailVerified &&
      account.profile.visibility === 'public' &&
      `${account.profile.username} ${account.profile.displayName}`.toLowerCase().includes(normalizedQuery)
    ))
    .map(toPublicProfile);
}

export function updateLocalProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'userId' | 'role' | 'vipTier'>>,
): AuthSession {
  const session = parseSessions(getStorage().getItem(accountsKey)).find((account) => account.user.id === userId);
  if (!session) {
    throw new Error('The account could not be found in this browser.');
  }

  if (updates.themeColor !== undefined && !/^#[0-9a-fA-F]{6}$/.test(updates.themeColor)) {
    throw new Error('Choose a valid theme color.');
  }
  if (updates.age !== undefined && updates.age !== null && (!Number.isInteger(updates.age) || updates.age < 13 || updates.age > 120)) {
    throw new Error('Age must be between 13 and 120.');
  }
  if (updates.bio && updates.bio.length > 500) {
    throw new Error('Bio cannot exceed 500 characters.');
  }
  if (updates.statusMessage && updates.statusMessage.length > 100) {
    throw new Error('Status cannot exceed 100 characters.');
  }
  if (updates.location && updates.location.length > 80) {
    throw new Error('Location cannot exceed 80 characters.');
  }
  if (updates.belief && updates.belief.length > 120) {
    throw new Error('Belief or philosophy cannot exceed 120 characters.');
  }
  if (updates.socialLinks) {
    const providers: (keyof Profile['socialLinks'])[] = ['facebook', 'x', 'youtube', 'xbox', 'playstation', 'steam', 'epicGames', 'reddit'];
    for (const provider of providers) {
      const value = updates.socialLinks[provider];
      if (value && (value.length > 300 || !normalizeSocialLink(value, provider))) {
        throw new Error('Use a valid gaming handle or HTTPS profile URL no longer than 300 characters.');
      }
    }
  }
  for (const imageUrl of [updates.avatarUrl, updates.bannerUrl]) {
    if (imageUrl && imageUrl.length > 1_500_000) {
      throw new Error('Profile images must be under 1 MB.');
    }
    if (imageUrl && !imageUrl.startsWith('data:image/') && !imageUrl.startsWith('https://')) {
      throw new Error('Use an HTTPS image URL or upload an image file.');
    }
  }

  const updated: AuthSession = { ...session, profile: { ...session.profile, ...updates } };
  saveAccount(updated);
  if (restoreSession()?.user.id === userId) {
    persistActiveSession(updated);
  }
  return updated;
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

export function syncLocalProfileEntitlements(
  userId: string,
  entitlements: Pick<Profile, 'vipTier' | 'cosmeticFrames'>,
): void {
  const session = parseSessions(getStorage().getItem(accountsKey)).find((account) => account.user.id === userId);
  if (!session) {
    throw new Error('The account could not be found in this browser.');
  }

  const updated: AuthSession = { ...session, profile: { ...session.profile, ...entitlements } };
  saveAccount(updated);
  if (restoreSession()?.user.id === userId) {
    persistActiveSession(updated);
  }
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

export function persistActiveSession(session: AuthSession): void {
  try {
    getStorage().setItem(activeSessionKey, JSON.stringify(session));
  } catch {
    throw new Error('Your session could not be saved in this browser.');
  }
}

export function clearStoredSession(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(activeSessionKey);
  } catch {
    // The in-memory session can still be cleared when browser storage is unavailable.
  }
}