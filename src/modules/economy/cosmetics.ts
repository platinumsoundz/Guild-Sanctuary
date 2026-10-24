export type ProfileCosmeticEffectKey =
  | 'sanctuary'
  | 'aurora'
  | 'ember'
  | 'sparkle'
  | 'glow';

export interface ProfileCosmeticMeta {
  label?: string;
  effectKey?: ProfileCosmeticEffectKey;
  badgeText?: string;
  bannerUrl?: string;
}

/**
 * Client-side presentation for server-owned catalog items. Prices, availability,
 * and entitlement checks stay in Supabase; this map only decides how an equipped
 * item is rendered.
 */
export const profileCosmeticMeta: Record<string, ProfileCosmeticMeta> = {
  profile_frame_sanctuary: {
    label: 'Sanctuary supporter',
    effectKey: 'sanctuary',
  },
  profile_frame_aurora: {
    label: 'Aurora frame',
    effectKey: 'aurora',
  },
  profile_frame_ember: {
    label: 'Ember frame',
    effectKey: 'ember',
  },
  profile_effect_sparkle: {
    effectKey: 'sparkle',
  },
  profile_effect_glow: {
    effectKey: 'glow',
  },
  profile_badge_sparkle: {
    badgeText: '✨',
  },
  profile_badge_moon: {
    badgeText: '🌙',
  },
  profile_badge_flame: {
    badgeText: '🔥',
  },
  profile_badge_leaf: {
    badgeText: '🌿',
  },
  profile_banner_aurora: {
    bannerUrl: '/cosmetics/banner-aurora.gif',
  },
  profile_banner_ember: {
    bannerUrl: '/cosmetics/banner-ember.gif',
  },
  profile_banner_tide: {
    bannerUrl: '/cosmetics/banner-tide.gif',
  },
};
