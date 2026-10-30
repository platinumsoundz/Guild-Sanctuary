import { getSupabaseBrowserClient } from '@/services/supabase';

export const MANAGEABLE_PAGE_VISIBILITY = [
  { key: 'today', label: 'Today' },
  { key: 'feed', label: 'Community feed' },
  { key: 'discover', label: 'Discover' },
  { key: 'messages', label: 'Messages' },
  { key: 'profile', label: 'Profile' },
  { key: 'planner', label: 'Daily Planner' },
  { key: 'support', label: 'Support the community' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'settings', label: 'Settings' },
  { key: 'events', label: 'Events' },
  { key: 'shorts', label: 'Shorts' },
  { key: 'games', label: 'Cosmic Arcade' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'shop', label: 'Token Shop' },
  { key: 'guild', label: 'The Guild' },
  { key: 'roadmap', label: 'Sanctuary Roadmap' },
  { key: 'guild-roadmap', label: 'Guild Roadmap' },
  { key: 'admin', label: 'Admin' },
  { key: 'moderation', label: 'Moderation' },
] as const;

export const PAGE_VISIBILITY_ROLES = [
  { value: 'guest', label: 'Guest' },
  { value: 'user', label: 'Basic User' },
  { value: 'vip', label: 'VIP' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'owner', label: 'Owner' },
] as const;

export type PageVisibilityRole = typeof PAGE_VISIBILITY_ROLES[number]['value'];
export type ManagedPageKey = typeof MANAGEABLE_PAGE_VISIBILITY[number]['key'];
export type PageVisibilityMap = Partial<Record<ManagedPageKey, Partial<Record<PageVisibilityRole | 'all', boolean>>>>;

export async function fetchPageVisibility(): Promise<PageVisibilityMap> {
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.from('platform_page_visibility').select('page_key,role_key,is_visible');
  if (error) {
    // A missing migration must not make core navigation disappear.
    if (/platform_page_visibility|schema cache|does not exist|role_key/i.test(error.message)) return {};
    throw error;
  }
  const visibility: PageVisibilityMap = {};
  for (const row of data ?? []) {
    if (MANAGEABLE_PAGE_VISIBILITY.some((page) => page.key === row.page_key)
      && (row.role_key === 'all' || PAGE_VISIBILITY_ROLES.some((role) => role.value === row.role_key))) {
      const pageKey = row.page_key as ManagedPageKey;
      const roleKey = row.role_key as PageVisibilityRole | 'all';
      visibility[pageKey] = { ...(visibility[pageKey] ?? {}), [roleKey]: row.is_visible };
    }
  }
  return visibility;
}

export async function savePageVisibility(pageKey: ManagedPageKey, role: PageVisibilityRole, isVisible: boolean): Promise<void> {
  const client = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) throw new Error('Sign in with a developer or owner account.');
  const { error } = await client.from('platform_page_visibility').upsert({
    page_key: pageKey,
    role_key: role,
    is_visible: isVisible,
    updated_by: authData.user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'page_key,role_key' });
  if (error) throw new Error(error.message);
}

export function isPageVisible(pageKey: string, visibility: PageVisibilityMap, role: string = 'user'): boolean {
  // Feedback is an always-available public destination for members and guests.
  if (pageKey === 'admin' || pageKey === 'feedback') return true;
  const page = visibility[pageKey as ManagedPageKey];
  const roleKey = PAGE_VISIBILITY_ROLES.some((item) => item.value === role) ? role as PageVisibilityRole : 'guest';
  return page?.[roleKey] ?? page?.all ?? true;
}
