import { getSupabaseBrowserClient } from '@/services/supabase';
import { isSupabaseCommunityStorageConfigured, requireCommunityStorageUser } from '@/services/supabase/communityMedia';

export const DISCOVERY_INTENTIONS = [
  { id: 'find_community', label: 'Find my community', description: 'Meet people who share spaces or causes that matter to me.' },
  { id: 'explore_ideas', label: 'Explore ideas', description: 'Exchange perspectives and discover new topics.' },
  { id: 'grow_together', label: 'Grow together', description: 'Share encouragement and learn alongside others.' },
  { id: 'collaborate', label: 'Find collaborators', description: 'Build projects, practices, or creative work together.' },
  { id: 'find_circle', label: 'Find my circle', description: 'Build genuine friendships at a comfortable pace.' },
  { id: 'broaden_perspective', label: 'Broaden my perspective', description: 'Connect with thoughtful people who see things differently.' },
] as const;

export type DiscoveryIntentionId = typeof DISCOVERY_INTENTIONS[number]['id'];
export interface MemberDiscoveryIntention {
  intention: DiscoveryIntentionId;
  isPublic: boolean;
}
const MAX_DISCOVERY_INTENTIONS = 3;
const LOCAL_KEY_PREFIX = 'sanctuary-discovery-intentions:';
const LOCAL_PUBLIC_INDEX = 'sanctuary-public-discovery-intention-users';

function readLocal(userId: string): MemberDiscoveryIntention[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(LOCAL_KEY_PREFIX + userId) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is MemberDiscoveryIntention => Boolean(item)
      && typeof item === 'object'
      && DISCOVERY_INTENTIONS.some((choice) => choice.id === (item as MemberDiscoveryIntention).intention)
      && typeof (item as MemberDiscoveryIntention).isPublic === 'boolean');
  } catch {
    return [];
  }
}
function readPublicIndex(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(LOCAL_PUBLIC_INDEX) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export async function fetchMemberDiscoveryIntentions(userId: string): Promise<MemberDiscoveryIntention[]> {
  if (!isSupabaseCommunityStorageConfigured()) return readLocal(userId);
  await requireCommunityStorageUser(userId);
  const { data, error } = await getSupabaseBrowserClient().from('profile_discovery_intentions')
    .select('intention, is_public').eq('user_id', userId).order('intention');
  if (error) throw new Error(`Your discovery intentions could not be loaded: ${error.message}`);
  return data.map((row) => ({ intention: row.intention, isPublic: row.is_public }));
}

export async function saveMemberDiscoveryIntentions(
  userId: string,
  selectedIntentions: string[],
  showInDiscovery: boolean,
): Promise<MemberDiscoveryIntention[]> {
  const normalized = [...new Set(selectedIntentions)].filter((id): id is DiscoveryIntentionId =>
    DISCOVERY_INTENTIONS.some((choice) => choice.id === id));
  if (normalized.length > MAX_DISCOVERY_INTENTIONS) throw new Error(`Choose up to ${MAX_DISCOVERY_INTENTIONS} intentions.`);

  const rows = normalized.map((intention) => ({ intention, isPublic: showInDiscovery }));
  if (!isSupabaseCommunityStorageConfigured()) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCAL_KEY_PREFIX + userId, JSON.stringify(rows));
      const publicUsers = new Set(readPublicIndex());
      if (rows.some((row) => row.isPublic)) publicUsers.add(userId);
      else publicUsers.delete(userId);
      window.localStorage.setItem(LOCAL_PUBLIC_INDEX, JSON.stringify([...publicUsers]));
    }
    return rows;
  }

  await requireCommunityStorageUser(userId);
  const client = getSupabaseBrowserClient();
  if (rows.length) {
    const { error } = await client.from('profile_discovery_intentions').upsert(
      rows.map((row) => ({ user_id: userId, intention: row.intention, is_public: row.isPublic })),
      { onConflict: 'user_id,intention' },
    );
    if (error) throw new Error(`Your discovery intentions could not be saved: ${error.message}`);
  }
  const { data: existing, error: readError } = await client.from('profile_discovery_intentions')
    .select('intention').eq('user_id', userId);
  if (readError) throw new Error(`Your saved intentions could not be reconciled: ${readError.message}`);
  const stale = existing.map((row) => row.intention).filter((id) => !normalized.includes(id));
  if (stale.length) {
    const { error } = await client.from('profile_discovery_intentions').delete().eq('user_id', userId).in('intention', stale);
    if (error) throw new Error(`Removed intentions could not be saved: ${error.message}`);
  }
  return rows;
}

export async function fetchPublicDiscoveryIntentions(userIds: string[]): Promise<Map<string, DiscoveryIntentionId[]>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const result = new Map<string, DiscoveryIntentionId[]>(ids.map((id): [string, DiscoveryIntentionId[]] => [id, []]));
  if (!ids.length) return result;
  if (!isSupabaseCommunityStorageConfigured()) {
    for (const id of ids) {
      if (!readPublicIndex().includes(id)) continue;
      result.set(id, readLocal(id).filter((row) => row.isPublic).map((row) => row.intention));
    }
    return result;
  }
  await requireCommunityStorageUser();
  const { data, error } = await getSupabaseBrowserClient().from('profile_discovery_intentions')
    .select('user_id, intention').eq('is_public', true).in('user_id', ids);
  if (error) throw new Error(`Public discovery intentions could not be loaded: ${error.message}`);
  for (const row of data) result.get(row.user_id)?.push(row.intention);
  return result;
}

export async function findUserIdsBySharedPublicIntentions(userId: string): Promise<string[]> {
  const own = (await fetchMemberDiscoveryIntentions(userId)).filter((row) => row.isPublic).map((row) => row.intention);
  if (!own.length) return [];
  if (!isSupabaseCommunityStorageConfigured()) {
    return readPublicIndex().filter((id) => id !== userId
      && readLocal(id).some((row) => row.isPublic && own.includes(row.intention)));
  }
  await requireCommunityStorageUser(userId);
  const { data, error } = await getSupabaseBrowserClient().from('profile_discovery_intentions')
    .select('user_id').eq('is_public', true).in('intention', own).neq('user_id', userId).limit(100);
  if (error) throw new Error(`People sharing your public intentions could not be found: ${error.message}`);
  return [...new Set(data.map((row) => row.user_id))];
}
