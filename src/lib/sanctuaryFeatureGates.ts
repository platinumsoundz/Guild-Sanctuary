export type SanctuaryFeature = 'wallet' | 'tokenShop' | 'tokenSpending' | 'moderation' | 'memberRoleManagement';
export type SanctuaryRole = 'user' | 'vip' | 'moderator' | 'admin' | 'developer' | 'owner';

const roleRank: Record<SanctuaryRole, number> = {
  user: 0,
  vip: 1,
  moderator: 2,
  admin: 3,
  developer: 4,
  owner: 5,
};

export const SANCTUARY_FEATURE_GATES: Record<SanctuaryFeature, {
  enabled: boolean;
  minimumRole: SanctuaryRole;
  releaseState: 'available' | 'restricted-preview' | 'locked-until-tested';
}> = {
  wallet: { enabled: true, minimumRole: 'vip', releaseState: 'restricted-preview' },
  tokenShop: { enabled: true, minimumRole: 'vip', releaseState: 'restricted-preview' },
  tokenSpending: { enabled: false, minimumRole: 'vip', releaseState: 'locked-until-tested' },
  moderation: { enabled: true, minimumRole: 'moderator', releaseState: 'available' },
  memberRoleManagement: { enabled: true, minimumRole: 'admin', releaseState: 'available' },
};

export function canAccessSanctuaryFeature(feature: SanctuaryFeature, role: string | null | undefined): boolean {
  const gate = SANCTUARY_FEATURE_GATES[feature];
  if (!gate.enabled || !role || !(role in roleRank)) return false;
  return roleRank[role as SanctuaryRole] >= roleRank[gate.minimumRole];
}


/**
 * Navigation access is intentionally allow-listed. Any newly added page must be
 * explicitly assigned a minimum role; unknown pages stay developer/owner-only.
 */
export type SanctuaryPage =
  | 'today' | 'feed' | 'discover' | 'messages' | 'profile' | 'planner'
  | 'support' | 'notifications' | 'roadmap' | 'settings'
  | 'shorts' | 'events' | 'wallet' | 'shop' | 'admin'
  | 'games' | 'guild-roadmap' | 'guild';

const pageMinimumRole: Record<SanctuaryPage, SanctuaryRole> = {
  today: 'user',
  feed: 'user',
  discover: 'user',
  messages: 'user',
  profile: 'user',
  planner: 'user',
  support: 'user',
  notifications: 'user',
  roadmap: 'user',
  settings: 'user',
  shorts: 'vip',
  events: 'vip',
  wallet: 'vip',
  shop: 'vip',
  admin: 'moderator',
  games: 'developer',
  'guild-roadmap': 'developer',
  guild: 'developer',
};

export function canAccessSanctuaryPage(page: string, role: string | null | undefined): boolean {
  if (!role || !(role in roleRank)) return false;
  if (role === 'owner') return true;
  if (!(page in pageMinimumRole)) return role === 'developer';
  const minimumRole = pageMinimumRole[page as SanctuaryPage];
  return roleRank[role as SanctuaryRole] >= roleRank[minimumRole];
}
