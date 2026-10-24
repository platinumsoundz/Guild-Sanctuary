import type { Profile } from '@/types/database';
import type { TokenSpendItem, TokenSpendItemKind } from './service';

export type ProfileCosmeticKind =
  | 'profile_frame'
  | 'profile_effect'
  | 'profile_badge'
  | 'profile_banner';

export type CosmeticFilter = 'all' | 'owned' | ProfileCosmeticKind;

export interface CosmeticSummary {
  total: number;
  owned: number;
  equipped: number;
}

const profileCosmeticKinds: ProfileCosmeticKind[] = [
  'profile_frame',
  'profile_effect',
  'profile_badge',
  'profile_banner',
];

export function isProfileCosmeticKind(kind: TokenSpendItemKind): kind is ProfileCosmeticKind {
  return profileCosmeticKinds.includes(kind as ProfileCosmeticKind);
}

export function getCosmeticSlot(kind: TokenSpendItemKind): 'frame' | 'effect' | 'badge' | 'banner' | null {
  if (kind === 'profile_frame') return 'frame';
  if (kind === 'profile_effect') return 'effect';
  if (kind === 'profile_badge') return 'badge';
  if (kind === 'profile_banner') return 'banner';
  return null;
}

export function getEquippedCosmeticId(
  profile: Pick<Profile, 'equippedFrame' | 'equippedEffect' | 'equippedBadge' | 'equippedBanner'>,
  kind: TokenSpendItemKind,
): string | null {
  if (kind === 'profile_frame') return profile.equippedFrame;
  if (kind === 'profile_effect') return profile.equippedEffect;
  if (kind === 'profile_badge') return profile.equippedBadge;
  if (kind === 'profile_banner') return profile.equippedBanner;
  return null;
}

export function filterCosmetics(
  items: TokenSpendItem[],
  filter: CosmeticFilter,
  ownedItemIds: ReadonlySet<string>,
): TokenSpendItem[] {
  if (filter === 'all') return items;
  if (filter === 'owned') return items.filter((item) => ownedItemIds.has(item.itemId));
  return items.filter((item) => item.kind === filter);
}

export function summarizeCosmetics(
  items: TokenSpendItem[],
  ownedItemIds: ReadonlySet<string>,
  profile: Pick<Profile, 'equippedFrame' | 'equippedEffect' | 'equippedBadge' | 'equippedBanner'>,
): CosmeticSummary {
  const equippedIds = new Set(
    [profile.equippedFrame, profile.equippedEffect, profile.equippedBadge, profile.equippedBanner]
      .filter((itemId): itemId is string => Boolean(itemId)),
  );

  return {
    total: items.length,
    owned: items.filter((item) => ownedItemIds.has(item.itemId)).length,
    equipped: items.filter((item) => equippedIds.has(item.itemId)).length,
  };
}

export function cosmeticFilterLabel(filter: CosmeticFilter): string {
  if (filter === 'all') return 'All';
  if (filter === 'owned') return 'Owned';
  if (filter === 'profile_frame') return 'Frames';
  if (filter === 'profile_effect') return 'Effects';
  if (filter === 'profile_badge') return 'Badges';
  return 'Banners';
}

export function cosmeticKindLabel(kind: TokenSpendItemKind): string {
  if (kind === 'profile_frame') return 'Frame';
  if (kind === 'profile_effect') return 'Effect';
  if (kind === 'profile_badge') return 'Badge';
  if (kind === 'profile_banner') return 'GIF banner';
  if (kind === 'chat_item') return 'Chat item';
  if (kind === 'gift') return 'Gift';
  if (kind === 'vip') return 'VIP';
  return 'Promotion';
}
