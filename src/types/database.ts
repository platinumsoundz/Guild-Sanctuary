import type { Coordinates, WorldType } from './index';

export type UserStatus = 'active' | 'suspended';
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';
export type UserPermission = 'feed:read' | 'post:create' | 'event:rsvp' | 'message:send' | 'profile:edit';
export type ProfileVisibility = 'public' | 'private';
export type VipTier = 'free' | 'wayfinder' | 'champion';
export type CosmeticKind = 'frame' | 'vip_badge' | 'sticker';
export type EventRsvpStatus = 'going' | 'interested' | 'cancelled';
export type PostMediaType = 'image' | 'audio' | 'video';
export type ConversationKind = 'direct' | 'group';
export type EngagementTargetType = 'post' | 'event' | 'short';
export type AccountLayout = 'comfortable' | 'compact';

export interface SocialLinks {
  facebook: string | null;
  x: string | null;
  youtube: string | null;
}

export interface AccountPreferences {
  allowProfileDiscovery: boolean;
  allowDirectMessages: boolean;
  showOnlineStatus: boolean;
  emailNotifications: boolean;
  personalizedFeed: boolean;
  layout: AccountLayout;
}

export interface AccountSettings {
  userId: string;
  preferences: AccountPreferences;
  updatedAt: string;
}

export interface ProfilePrivacy {
  bio: boolean;
  location: boolean;
  age: boolean;
  starSign: boolean;
  belief: boolean;
  socialLinks: boolean;
  allowDirectMessages: boolean;
}

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LocationPreference {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  radiusPreferenceKm: number;
}

export interface Profile {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  statusMessage: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  themeColor: string;
  location: string | null;
  age: number | null;
  starSign: string | null;
  belief: string | null;
  privacy: ProfilePrivacy;
  socialLinks: SocialLinks;
  cosmeticFrames: string[];
  visibility: ProfileVisibility;
  vipTier: VipTier;
  role: string;
}

export interface PublicProfile {
  userId: string;
  profileId: string;
  username: string;
  displayName: string;
  bio: string | null;
  statusMessage: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  themeColor: string;
  location: string | null;
  age: number | null;
  starSign: string | null;
  belief: string | null;
  socialLinks: SocialLinks;
  allowDirectMessages: boolean;
  cosmeticFrames: string[];
  vipTier: VipTier;
  role: string;
}

export interface Post {
  id: string;
  authorId: string;
  worldType: WorldType;
  content: string;
  mediaUrl: string | null;
  mediaType: PostMediaType | null;
  storyTag: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLike {
  id: string;
  targetType: EngagementTargetType;
  targetId: string;
  userId: string;
  createdAt: string;
}

export interface SocialComment {
  id: string;
  targetType: EngagementTargetType;
  targetId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface ShortVideo {
  id: string;
  authorId: string;
  worldType: WorldType;
  videoUrl: string;
  caption: string;
  createdAt: string;
}

export interface Event {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  worldType: WorldType;
  locationCoords: Coordinates;
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
}

export interface EventRsvp {
  id: string;
  eventId: string;
  userId: string;
  status: EventRsvpStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  sentAt: string;
  readAt: string | null;
}

export interface Conversation {
  id: string;
  kind: ConversationKind;
  participantIds: string[];
  name: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balanceCredits: number;
  vipTier: VipTier;
  updatedAt: string;
}

export interface WalletLedgerEntry {
  id: string;
  walletId: string;
  amountCredits: number;
  reason: 'top_up' | 'purchase' | 'refund' | 'adjustment';
  referenceId: string;
  createdAt: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  currency: 'USD';
}

export interface CosmeticProduct {
  id: string;
  name: string;
  kind: CosmeticKind;
  priceCredits: number;
  requiredVipTier: Exclude<VipTier, 'free'> | null;
  preview: string;
}

export interface InventoryItem {
  id: string;
  userId: string;
  productId: string;
  acquiredAt: string;
  equipped: boolean;
}