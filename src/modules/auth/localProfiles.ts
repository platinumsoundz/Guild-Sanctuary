import type { Profile, PublicProfile } from '@/types/database';
import type { AuthSession } from './sessionSchema';
import { normalizeSocialLink } from './sessionSchema';
import {
  accountsKey,
  getStorage,
  parseSessions,
  persistActiveSession,
  restoreSession,
  saveAccount,
} from './sessionStorage';

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
    role: profile.role,
    equippedFrame: profile.equippedFrame,
    equippedEffect: profile.equippedEffect,
    equippedBadge: profile.equippedBadge,
    equippedBanner: profile.equippedBanner,
  };
}

export function getLocalPublicProfileById(userId: string): PublicProfile | null {
  const session = parseSessions(getStorage().getItem(accountsKey)).find(
    (account) => account.user.id === userId && account.user.emailVerified && account.profile.visibility === 'public',
  );
  return session ? toPublicProfile(session) : null;
}

export function listLocalPublicProfiles(): PublicProfile[] {
  return parseSessions(getStorage().getItem(accountsKey))
    .filter((account) => account.user.emailVerified && account.profile.visibility === 'public')
    .map(toPublicProfile);
}

export function searchLocalPublicProfiles(query: string): PublicProfile[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) {
    return [];
  }

  return listLocalPublicProfiles().filter((profile) => (
    `${profile.username} ${profile.displayName}`.toLowerCase().includes(normalizedQuery)
  ));
}

export function updateLocalProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'userId' | 'role'>>,
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
