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
  if (!gate.enabled || !role || !Object.prototype.hasOwnProperty.call(roleRank, role)) return false;
  return roleRank[role as SanctuaryRole] >= roleRank[gate.minimumRole];
}

export type SanctuaryPage =
  | 'today' | 'feed' | 'events' | 'shorts' | 'messages' | 'discover'
  | 'games' | 'guild' | 'roadmap' | 'guild-roadmap' | 'profile'
  | 'wallet' | 'shop' | 'support' | 'settings' | 'notifications'
  | 'admin' | 'moderation' | 'planner' | 'feedback';

const pageMinimumRole: Record<SanctuaryPage, SanctuaryRole> = {
  // Stable member experience.
  today: 'user',
  feed: 'user',
  discover: 'user',
  messages: 'user',
  profile: 'user',
  planner: 'user',
  support: 'user',
  notifications: 'user',
  settings: 'user',
  feedback: 'user',
  // Preview and stewardship areas remain out of the basic-user navigation.
  events: 'vip',
  shorts: 'vip',
  games: 'vip',
  guild: 'user',
  roadmap: 'user',
  'guild-roadmap': 'developer',
  wallet: 'vip',
  shop: 'vip',
  admin: 'admin',
  moderation: 'moderator',
};

/** Fail closed for unknown pages and roles; navigation visibility is not the security boundary. */
export function canAccessSanctuaryPage(page: string, role: string | null | undefined): boolean {
  if (!role || !Object.prototype.hasOwnProperty.call(roleRank, role)) return false;
  if (!Object.prototype.hasOwnProperty.call(pageMinimumRole, page)) return false;
  return roleRank[role as SanctuaryRole] >= roleRank[pageMinimumRole[page as SanctuaryPage]];
}
