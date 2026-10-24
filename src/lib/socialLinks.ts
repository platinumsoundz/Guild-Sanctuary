import type { SocialLinks } from '@/types/database';

export const socialLinkFields: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/your-profile' },
  { key: 'x', label: 'X / Twitter', placeholder: 'https://x.com/your-profile' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@your-channel' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/your-profile' },
  { key: 'xbox', label: 'Xbox gamertag', placeholder: 'Gamertag or xbox.com profile URL' },
  { key: 'playstation', label: 'PlayStation ID', placeholder: 'Online ID or PlayStation profile URL' },
  { key: 'steam', label: 'Steam', placeholder: 'Username or Steam profile URL' },
  { key: 'epicGames', label: 'Epic Games', placeholder: 'Display name or Epic Games profile URL' },
  { key: 'reddit', label: 'Reddit', placeholder: 'Reddit username or profile URL' },
];

const profileHosts: Record<keyof SocialLinks, string[]> = {
  facebook: ['facebook.com', 'www.facebook.com'],
  x: ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'],
  youtube: ['youtube.com', 'www.youtube.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
  xbox: ['xbox.com', 'www.xbox.com'],
  playstation: ['playstation.com', 'www.playstation.com'],
  steam: ['steamcommunity.com', 'www.steamcommunity.com'],
  epicGames: ['epicgames.com', 'www.epicgames.com'],
  reddit: ['reddit.com', 'www.reddit.com', 'old.reddit.com'],
};

export function normalizeSocialLink(value: unknown, provider: keyof SocialLinks): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalizedValue = value.trim();
  if (provider === 'instagram') {
    const handle = normalizedValue.replace(/^@/, '');
    if (/^[A-Za-z0-9._]{1,30}$/.test(handle)) return 'https://www.instagram.com/' + handle + '/';
  }
  if (['xbox', 'playstation', 'steam', 'epicGames'].includes(provider) &&
      /^[A-Za-z0-9_. -]{2,40}$/.test(normalizedValue)) {
    return normalizedValue;
  }
  try {
    const url = new URL(normalizedValue);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !profileHosts[provider].includes(url.hostname)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeSocialLinks(input: Partial<SocialLinks>): SocialLinks {
  const normalized = Object.fromEntries(socialLinkFields.map(({ key }) => [key, null])) as SocialLinks;
  for (const { key, label } of socialLinkFields) {
    const value = input[key];
    if (value == null || !value.trim()) continue;
    const link = normalizeSocialLink(value, key);
    if (!link || link.length > 300) {
      throw new Error('Enter a valid ' + label + ' username or secure profile URL.');
    }
    normalized[key] = link;
  }
  return normalized;
}
