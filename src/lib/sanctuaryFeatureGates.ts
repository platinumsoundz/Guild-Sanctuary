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


export type SanctuaryPage =
  | 'today' | 'feed' | 'events' | 'shorts' | 'messages' | 'discover'
  | 'games' | 'guild' | 'roadmap' | 'guild-roadmap' | 'profile'
  | 'wallet' | 'shop' | 'support' | 'settings' | 'notifications'
  | 'admin' | 'moderation' | 'planner';

const pageMinimumRole: Record<SanctuaryPage, SanctuaryRole> = {
  today: 'user',
  feed: 'user',
  events: 'vip',
  shorts: 'vip',
  messages: 'user',
  discover: 'user',
  games: 'vip',
  guild: 'user',
  roadmap: 'user',
  'guild-roadmap': 'developer',
  profile: 'user',
  wallet: 'vip',
  shop: 'vip',
  support: 'user',
  settings: 'user',
  notifications: 'user',
  admin: 'admin',
  moderation: 'moderator',
  planner: 'user',
};

/** Fail closed for unknown pages and roles; navigation visibility is not the security boundary. */
export function canAccessSanctuaryPage(page: string, role: string | null | undefined): boolean {
  if (!role || !(role in roleRank)) return false;
  if (role === 'owner') return true;
  if (!(page in pageMinimumRole)) return false;
  return roleRank[role as SanctuaryRole] >= roleRank[pageMinimumRole[page as SanctuaryPage]];
}
