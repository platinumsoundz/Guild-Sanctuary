import type { AccountPreferences, Profile, ProfilePrivacy, SocialLinks } from '@/types/database';

export const preferenceLabels = {
  allowProfileDiscovery: 'Include my profile in community discovery',
  allowDirectMessages: 'Allow direct messages',
  showOnlineStatus: 'Show my online status',
  emailNotifications: 'Email notifications',
  personalizedFeed: 'Personalize my feed',
} as const;

export type PreferenceKey = keyof typeof preferenceLabels;
export type ProfilePrivacyDisplayKey = Exclude<keyof ProfilePrivacy, 'allowDirectMessages'>;
export type ProfileUpdate = Partial<Pick<Profile, 'privacy' | 'visibility' | 'socialLinks'>>;
export type UpdatePreferences = (updates: Partial<AccountPreferences>) => Promise<unknown>;
export type SettingsErrorHandler = (message: string | null) => void;

export const privacyLabels: Record<ProfilePrivacyDisplayKey, string> = {
  bio: 'Show my bio',
  location: 'Show my location',
  age: 'Show my age',
  starSign: 'Show my star sign',
  belief: 'Show my belief or philosophy',
  socialLinks: 'Show my connected social links',
};

export const linkLabels: { key: keyof SocialLinks; label: string; host: string }[] = [
  { key: 'facebook', label: 'Facebook', host: 'facebook.com' },
  { key: 'x', label: 'X / Twitter', host: 'x.com or twitter.com' },
  { key: 'youtube', label: 'YouTube', host: 'youtube.com' },
  { key: 'xbox', label: 'Xbox gamertag', host: 'gamertag or xbox.com profile URL' },
  { key: 'playstation', label: 'PlayStation ID', host: 'Online ID or playstation.com profile URL' },
  { key: 'steam', label: 'Steam', host: 'username or steamcommunity.com profile URL' },
  { key: 'epicGames', label: 'Epic Games', host: 'display name or epicgames.com profile URL' },
  { key: 'reddit', label: 'Reddit', host: 'reddit.com/u/username' },
];

const allowedSocialHosts: Record<keyof SocialLinks, string[]> = {
  facebook: ['facebook.com', 'www.facebook.com'],
  x: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
  youtube: ['youtube.com', 'www.youtube.com'],
  xbox: ['xbox.com', 'www.xbox.com'],
  playstation: ['playstation.com', 'www.playstation.com'],
  steam: ['steamcommunity.com', 'www.steamcommunity.com'],
  epicGames: ['epicgames.com', 'www.epicgames.com'],
  reddit: ['reddit.com', 'www.reddit.com', 'old.reddit.com'],
};

const gamertagKeys = new Set<keyof SocialLinks>(['xbox', 'playstation', 'steam', 'epicGames']);

export function isGamertagKey(key: keyof SocialLinks): boolean {
  return gamertagKeys.has(key);
}

export function normalizeSocialLinks(draft: SocialLinks): SocialLinks {
  const normalized: SocialLinks = {
    facebook: null,
    x: null,
    youtube: null,
    xbox: null,
    playstation: null,
    steam: null,
    epicGames: null,
    reddit: null,
  };

  for (const item of linkLabels) {
    const value = draft[item.key]?.trim() ?? '';
    if (!value) continue;
    if (gamertagKeys.has(item.key) && /^[A-Za-z0-9_. -]{2,40}$/.test(value)) {
      normalized[item.key] = value;
      continue;
    }
    const url = new URL(value);
    if (url.protocol !== 'https:' || !allowedSocialHosts[item.key].includes(url.hostname)) {
      throw new Error(`Enter a secure ${item.label} profile URL (${item.host}).`);
    }
    normalized[item.key] = url.toString();
  }

  return normalized;
}
