'use client';

import type { PublicProfile } from '@/types/database';
import {
  getLocalPublicProfileById,
  isSupabaseAuthConfigured,
  mapPublicProfileRow,
  searchLocalPublicProfiles,
} from '@/modules/auth';
import { getSupabaseBrowserClient } from '@/services/supabase';

function escapeSearchTerm(value: string): string {
  // PostgREST `or` filters treat commas, parentheses, and percent/underscore as
  // syntax or wildcards. Strip them rather than interpolating raw input.
  return value.replace(/[%_,()]/g, ' ').trim();
}

export async function getPublicProfileById(userId: string): Promise<PublicProfile | null> {
  if (!userId) return null;

  if (!isSupabaseAuthConfigured()) {
    return getLocalPublicProfileById(userId);
  }

  const { data, error } = await getSupabaseBrowserClient()
    .from('public_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(`The profile could not be loaded: ${error.message}`);
  return data ? mapPublicProfileRow(data) : null;
}

export async function searchPublicProfiles(query: string): Promise<PublicProfile[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];

  if (!isSupabaseAuthConfigured()) {
    return searchLocalPublicProfiles(normalizedQuery);
  }

  const safeQuery = escapeSearchTerm(normalizedQuery);
  if (safeQuery.length < 2) return [];

  const { data, error } = await getSupabaseBrowserClient()
    .from('public_profiles')
    .select('*')
    .or(`username.ilike.%${safeQuery}%,display_name.ilike.%${safeQuery}%`)
    .order('username', { ascending: true })
    .limit(30);

  if (error) throw new Error(`Profiles could not be searched: ${error.message}`);
  return (data ?? []).map(mapPublicProfileRow);
}
