'use client';

import { getSupabaseBrowserClient } from '@/services/supabase';
import { isSupabaseCommunityStorageConfigured, requireCommunityStorageUser } from '@/services/supabase/communityMedia';

export interface MemberDiscoveryInterest {
  interest: string;
  isPublic: boolean;
}

const MAX_INTERESTS = 12;
const MAX_LENGTH = 32;

function normalizeInterest(value: string): string | null {
  const interest = value.trim().replace(/^#/, '').replace(/\s+/g, ' ').toLowerCase();
  if (interest.length < 2 || interest.length > MAX_LENGTH) return null;
  return /^[a-z0-9][a-z0-9 _-]*$/.test(interest) ? interest : null;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
function localKey(userId: string): string {
  return `sanctuary-discovery-interests:${userId}`;
}

const LOCAL_PUBLIC_INDEX = 'sanctuary-public-discovery-interest-users';

function readLocalPublicIndex(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(LOCAL_PUBLIC_INDEX) ?? '[]');
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function readLocal(userId: string): MemberDiscoveryInterest[] {
  if (typeof window === 'undefined') return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(localKey(userId)) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is MemberDiscoveryInterest =>
      typeof item === 'object' && item !== null &&
      'interest' in item && typeof item.interest === 'string' &&
      'isPublic' in item && typeof item.isPublic === 'boolean');
  } catch {
    return [];
  }
}

function normalizeList(values: string[], isPublic: boolean): MemberDiscoveryInterest[] {
  const unique = new Set<string>();
  for (const value of values) {
    const interest = normalizeInterest(value);
    if (interest) unique.add(interest);
    if (unique.size >= MAX_INTERESTS) break;
  }
  return [...unique].map((interest) => ({ interest, isPublic }));
}

export async function fetchMemberDiscoveryInterests(userId: string): Promise<MemberDiscoveryInterest[]> {
  if (!userId) return [];
  if (!isSupabaseCommunityStorageConfigured()) return readLocal(userId);
  await requireCommunityStorageUser();
  const { data, error } = await getSupabaseBrowserClient()
    .from('profile_interests').select('interest, is_public').eq('user_id', userId).order('interest');
  if (error) throw new Error(`Your discovery interests could not be loaded: ${error.message}`);
  return data.map((row) => ({ interest: row.interest, isPublic: row.is_public }));
}

export async function saveMemberDiscoveryInterests(userId: string, values: string[], isPublic: boolean): Promise<MemberDiscoveryInterest[]> {
  if (!userId) throw new Error('Sign in before saving discovery interests.');
  const normalizedValues = values.map(normalizeInterest).filter((value): value is string => value !== null);
  if (new Set(normalizedValues).size > MAX_INTERESTS) {
    throw new Error(`Choose up to ${MAX_INTERESTS} interests.`);
  }
  const interests = normalizeList(values, isPublic);
  if (values.some((value) => value.trim() && !normalizeInterest(value))) {
    throw new Error('Interests must be 2–32 characters and use letters, numbers, spaces, hyphens, or underscores.');
  }
  if (!isSupabaseCommunityStorageConfigured()) {
    if (typeof window === 'undefined') throw new Error('Interests can only be saved in a browser session.');
    try {
      window.localStorage.setItem(localKey(userId), JSON.stringify(interests));
      const publicIds = new Set(readLocalPublicIndex());
      if (interests.some((item) => item.isPublic)) publicIds.add(userId);
      else publicIds.delete(userId);
      window.localStorage.setItem(LOCAL_PUBLIC_INDEX, JSON.stringify([...publicIds]));
      return interests;
    } catch {
      throw new Error('Your discovery interests could not be saved in this browser.');
    }
  }

  await requireCommunityStorageUser(userId);
  const client = getSupabaseBrowserClient();
  if (interests.length) {
    const { error } = await client.from('profile_interests').upsert(
      interests.map((item) => ({ user_id: userId, interest: item.interest, is_public: item.isPublic })),
      { onConflict: 'user_id,interest' },
    );
    if (error) throw new Error(`Your discovery interests could not be saved: ${error.message}`);
  }
  const { data: existing, error: readError } = await client.from('profile_interests').select('interest').eq('user_id', userId);
  if (readError) throw new Error(`Saved interests could not be reconciled: ${readError.message}`);
  const keep = interests.map((item) => item.interest);
  const stale = existing.filter((item) => !keep.includes(item.interest)).map((item) => item.interest);
  if (stale.length) {
    const { error } = await client.from('profile_interests').delete().eq('user_id', userId).in('interest', stale);
    if (error) throw new Error(`Outdated interests could not be removed: ${error.message}`);
  }
  return interests;
}

export async function fetchPublicDiscoveryInterests(userIds: string[]): Promise<Map<string, string[]>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const result = new Map<string, string[]>();
  if (!ids.length) return result;
  if (!isSupabaseCommunityStorageConfigured()) {
    ids.forEach((id) => result.set(id, readLocal(id).filter((item) => item.isPublic).map((item) => item.interest)));
    return result;
  }
  await requireCommunityStorageUser();
  const { data, error } = await getSupabaseBrowserClient().from('profile_interests')
    .select('user_id, interest').in('user_id', ids).eq('is_public', true).order('interest');
  if (error) throw new Error(`Public discovery interests could not be loaded: ${error.message}`);
  data.forEach((item) => result.set(item.user_id, [...(result.get(item.user_id) ?? []), item.interest]));
  return result;
}

export async function findUserIdsByPublicInterest(query: string): Promise<string[]> {
  const interest = normalizeInterest(query);
  if (!interest) return [];
  if (!isSupabaseCommunityStorageConfigured()) {
    return readLocalPublicIndex().filter((userId) => readLocal(userId).some((item) => item.isPublic && item.interest.includes(interest)));
  }
  await requireCommunityStorageUser();
  const { data, error } = await getSupabaseBrowserClient().from('profile_interests')
    .select('user_id').eq('is_public', true).ilike('interest', `%${escapeLikePattern(interest)}%`).limit(30);
  if (error) throw new Error(`People could not be searched by interest: ${error.message}`);
  return [...new Set(data.map((item) => item.user_id))];
}
