import { describe, expect, it } from 'vitest';
import type { Profile } from '@/types/database';
import {
  cosmeticFilterLabel,
  cosmeticKindLabel,
  filterCosmetics,
  getCosmeticSlot,
  getEquippedCosmeticId,
  isProfileCosmeticKind,
  summarizeCosmetics,
} from './catalog';
import type { TokenSpendItem } from './service';

const catalog: TokenSpendItem[] = [
  {
    itemId: 'profile_frame_sanctuary',
    name: 'Sanctuary frame',
    description: 'A frame.',
    priceTokens: 300,
    kind: 'profile_frame',
    enabled: true,
    assetUrl: null,
    assetText: null,
    effectKey: 'sanctuary',
    sortOrder: 10,
  },
  {
    itemId: 'profile_badge_moon',
    name: 'Moon badge',
    description: 'A badge.',
    priceTokens: 150,
    kind: 'profile_badge',
    enabled: true,
    assetUrl: null,
    assetText: '🌙',
    effectKey: null,
    sortOrder: 20,
  },
  {
    itemId: 'profile_banner_aurora',
    name: 'Aurora banner',
    description: 'A banner.',
    priceTokens: 300,
    kind: 'profile_banner',
    enabled: true,
    assetUrl: '/cosmetics/banner-aurora.gif',
    assetText: null,
    effectKey: null,
    sortOrder: 30,
  },
];

const profile = {
  equippedFrame: 'profile_frame_sanctuary',
  equippedEffect: null,
  equippedBadge: 'profile_badge_moon',
  equippedBanner: null,
} as Pick<Profile, 'equippedFrame' | 'equippedEffect' | 'equippedBadge' | 'equippedBanner'>;

describe('economy catalog helpers', () => {
  it('maps server kinds to profile slots', () => {
    expect(getCosmeticSlot('profile_frame')).toBe('frame');
    expect(getCosmeticSlot('profile_effect')).toBe('effect');
    expect(getCosmeticSlot('profile_badge')).toBe('badge');
    expect(getCosmeticSlot('profile_banner')).toBe('banner');
    expect(getCosmeticSlot('chat_item')).toBeNull();
    expect(getCosmeticSlot('gift')).toBeNull();
  });

  it('reads the equipped item for a slot', () => {
    expect(getEquippedCosmeticId(profile, 'profile_frame')).toBe('profile_frame_sanctuary');
    expect(getEquippedCosmeticId(profile, 'profile_effect')).toBeNull();
    expect(getEquippedCosmeticId(profile, 'profile_badge')).toBe('profile_badge_moon');
    expect(getEquippedCosmeticId(profile, 'profile_banner')).toBeNull();
  });

  it('filters by owned state and cosmetic kind', () => {
    const owned = new Set(['profile_badge_moon']);

    expect(filterCosmetics(catalog, 'all', owned)).toHaveLength(3);
    expect(filterCosmetics(catalog, 'owned', owned).map((item) => item.itemId)).toEqual(['profile_badge_moon']);
    expect(filterCosmetics(catalog, 'profile_frame', owned).map((item) => item.itemId)).toEqual(['profile_frame_sanctuary']);
    expect(filterCosmetics(catalog, 'profile_effect', owned)).toEqual([]);
  });

  it('summarizes total, owned, and equipped cosmetics', () => {
    const owned = new Set(['profile_frame_sanctuary', 'profile_badge_moon']);
    expect(summarizeCosmetics(catalog, owned, profile)).toEqual({ total: 3, owned: 2, equipped: 2 });
  });

  it('provides readable labels and only treats profile kinds as cosmetics', () => {
    expect(isProfileCosmeticKind('profile_frame')).toBe(true);
    expect(isProfileCosmeticKind('chat_item')).toBe(false);
    expect(cosmeticFilterLabel('owned')).toBe('Owned');
    expect(cosmeticFilterLabel('profile_banner')).toBe('Banners');
    expect(cosmeticKindLabel('profile_banner')).toBe('GIF banner');
    expect(cosmeticKindLabel('chat_item')).toBe('Chat item');
  });
});
