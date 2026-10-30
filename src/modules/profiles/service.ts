import { searchLocalPublicProfiles, getLocalPublicProfileById } from '@/modules/auth';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { isSupabaseCommunityStorageConfigured, requireCommunityStorageUser } from '@/services/supabase/communityMedia';
import type { PublicProfile, SocialLinks } from '@/types/database';

const emptySocialLinks: SocialLinks = {
  facebook: null,
  x: null,
  youtube: null,
  instagram: null,
  xbox: null,
  playstation: null,
  steam: null,
  epicGames: null,
  reddit: null,
};

type PublicProfileRow = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  status_message: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  theme_color: string;
  location: string | null;
  age: number | null;
  star_sign: string | null;
  belief: string | null;
  social_links: Record<string, string | null> | null;
  allow_direct_messages: boolean;
  equipped_frame?: string | null;
  equipped_effect?: string | null;
  equipped_badge?: string | null;
  equipped_banner?: string | null;
  equipped_border?: string | null;
  equipped_profile_theme?: string | null;
  equipped_palette?: string | null;
  custom_accent_color?: string | null;
};

function toPublicProfile(row: PublicProfileRow): PublicProfile {
  return {
    userId: row.id,
    profileId: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    statusMessage: row.status_message,
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    themeColor: row.theme_color,
    location: row.location,
    age: row.age,
    starSign: row.star_sign,
    belief: row.belief,
    socialLinks: { ...emptySocialLinks, ...(row.social_links ?? {}) },
    allowDirectMessages: row.allow_direct_messages,
    equippedFrame: row.equipped_frame ?? null,
    equippedEffect: row.equipped_effect ?? null,
    equippedBadge: row.equipped_badge ?? null,
    equippedBanner: row.equipped_banner ?? null,
    equippedBorder: row.equipped_border ?? null,
    equippedProfileTheme: row.equipped_profile_theme ?? null,
    equippedPalette: row.equipped_palette ?? null,
    customAccentColor: row.custom_accent_color ?? null,
    role: 'member',
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export async function searchPublicProfiles(query: string): Promise<PublicProfile[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];
  if (!isSupabaseCommunityStorageConfigured()) return searchLocalPublicProfiles(normalizedQuery);

  await requireCommunityStorageUser();
  const pattern = `%${escapeLikePattern(normalizedQuery)}%`;
  const client = getSupabaseBrowserClient();
  const [usernameResults, displayNameResults] = await Promise.all([
    client.from('public_profiles').select('*').ilike('username', pattern).order('username').limit(25),
    client.from('public_profiles').select('*').ilike('display_name', pattern).order('display_name').limit(25),
  ]);
  if (usernameResults.error || displayNameResults.error) {
    throw new Error(`Public profiles could not be searched: ${usernameResults.error?.message ?? displayNameResults.error?.message}`);
  }

  const rows = [...new Map([...usernameResults.data, ...displayNameResults.data].map((row) => [row.id, row])).values()] as PublicProfileRow[];
  const cosmeticsResult = await client.from('public_profile_cosmetics').select('*').in('id', rows.map((row) => row.id));
  if (cosmeticsResult.error) throw new Error(`Public profile cosmetics could not be loaded: ${cosmeticsResult.error.message}`);
  const cosmetics = new Map((cosmeticsResult.data ?? []).map((row) => [row.id, row]));
  const profiles = new Map<string, PublicProfile>();
  for (const row of rows) {
    const cosmetic = cosmetics.get(row.id);
    profiles.set(row.id, toPublicProfile({ ...row, ...(cosmetic ?? {}) } as PublicProfileRow));
  }
  return [...profiles.values()].sort((first, second) => first.displayName.localeCompare(second.displayName)).slice(0, 40);
}

export async function fetchPublicProfileById(userId: string): Promise<PublicProfile | null> {
  if (!userId) return null;
  if (!isSupabaseCommunityStorageConfigured()) return getLocalPublicProfileById(userId);

  await requireCommunityStorageUser();
  const { data, error } = await getSupabaseBrowserClient()
    .from('public_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(`This public profile could not be loaded: ${error.message}`);
  if (!data) return null;
  const cosmetics = await getSupabaseBrowserClient().from('public_profile_cosmetics').select('*').eq('id', userId).maybeSingle();
  if (cosmetics.error) throw new Error(`Public profile cosmetics could not be loaded: ${cosmetics.error.message}`);
  return toPublicProfile({ ...(data as PublicProfileRow), ...(cosmetics.data ?? {}) } as PublicProfileRow);
}
