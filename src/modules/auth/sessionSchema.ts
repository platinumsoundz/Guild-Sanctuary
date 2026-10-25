import type {
  Profile,
  ProfilePrivacy,
  User,
  UserPermission,
} from '@/types/database';

export const allowedPermissions: UserPermission[] = [
  'feed:read',
  'post:create',
  'event:rsvp',
  'message:send',
  'profile:edit',
];

export interface AuthSession {
  user: User;
  profile: Profile;
  permissions: UserPermission[];
}

export interface SignUpInput {
  email: string;
  username: string;
  displayName: string;
}

export const MOCK_EMAIL_CODE = '000000';
export const MOCK_TWO_FACTOR_CODE = '000000';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function defaultPrivacy(value: unknown): ProfilePrivacy {
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

export function normalizeSocialLink(value: unknown, provider: keyof Profile['socialLinks']): string | null {
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

export function normalizeSession(value: unknown): AuthSession | null {
  if (!isRecord(value) || !isRecord(value.user) || !isRecord(value.profile)) {
    return null;
  }

  const profile = { ...value.profile };
  delete profile.cosmeticFrames;
  delete profile.vipTier;
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
      equippedFrame: typeof profile.equippedFrame === 'string' ? profile.equippedFrame : null,
      equippedEffect: typeof profile.equippedEffect === 'string' ? profile.equippedEffect : null,
      equippedBadge: typeof profile.equippedBadge === 'string' ? profile.equippedBadge : null,
      equippedBanner: typeof profile.equippedBanner === 'string' ? profile.equippedBanner : null,
      location: typeof profile.location === 'string' ? profile.location : null,
      age: typeof profile.age === 'number' && Number.isInteger(profile.age) ? profile.age : null,
      starSign: typeof profile.starSign === 'string' ? profile.starSign : null,
      belief: typeof profile.belief === 'string' ? profile.belief : null,
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
    (typeof normalizedProfile.equippedFrame !== 'string' && normalizedProfile.equippedFrame !== null) ||
    (typeof normalizedProfile.equippedEffect !== 'string' && normalizedProfile.equippedEffect !== null) ||
    (typeof normalizedProfile.equippedBadge !== 'string' && normalizedProfile.equippedBadge !== null) ||
    (typeof normalizedProfile.equippedBanner !== 'string' && normalizedProfile.equippedBanner !== null) ||
    (typeof normalizedProfile.location !== 'string' && normalizedProfile.location !== null) ||
    (typeof normalizedProfile.age !== 'number' && normalizedProfile.age !== null) ||
    (typeof normalizedProfile.starSign !== 'string' && normalizedProfile.starSign !== null) ||
    (typeof normalizedProfile.belief !== 'string' && normalizedProfile.belief !== null) ||
    !isRecord(normalizedProfile.privacy) ||
    (normalizedProfile.visibility !== 'public' && normalizedProfile.visibility !== 'private') ||
    typeof normalizedProfile.role !== 'string'
  ) {
    return null;
  }

  return normalized as unknown as AuthSession;
}
