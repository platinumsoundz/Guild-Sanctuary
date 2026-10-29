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

export type ManagedPageKey = typeof MANAGEABLE_PAGE_VISIBILITY[number]['key'];
export type PageVisibilityMap = Partial<Record<ManagedPageKey, boolean>>;

export async function fetchPageVisibility(): Promise<PageVisibilityMap> {
  const client = getSupabaseBrowserClient();
  const { data, error } = await client.from('platform_page_visibility').select('page_key,is_visible');
  if (error) {
    // A missing migration must not make core navigation disappear.
    if (/platform_page_visibility|schema cache|does not exist/i.test(error.message)) return {};
    throw error;
  }
  const visibility: PageVisibilityMap = {};
  for (const row of data ?? []) {
    if (MANAGEABLE_PAGE_VISIBILITY.some((page) => page.key === row.page_key)) {
      visibility[row.page_key as ManagedPageKey] = row.is_visible;
    }
  }
  return visibility;
}

export async function savePageVisibility(pageKey: ManagedPageKey, isVisible: boolean): Promise<void> {
  const client = getSupabaseBrowserClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) throw new Error('Sign in with a developer or owner account.');
  const { error } = await client.from('platform_page_visibility').upsert({
    page_key: pageKey,
    is_visible: isVisible,
    updated_by: authData.user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'page_key' });
  if (error) throw new Error(error.message);
}

export function isPageVisible(pageKey: string, visibility: PageVisibilityMap): boolean {
  // Preserve an always-available recovery surface for staff if a visibility rule is misconfigured.
  if (pageKey === 'admin') return true;
  return visibility[pageKey as ManagedPageKey] !== false;
}
