'use client';

import type { PublicProfile } from '@/types/database';
import {
  getLocalPublicProfileById,
  isSupabaseAuthConfigured,
  listLocalPublicProfiles,
  mapPublicProfileRow,
  searchLocalPublicProfiles,
} from '@/modules/auth';
import { getSupabaseBrowserClient } from '@/services/supabase';

function escapeSearchTerm(value: string): string {
  // PostgREST `or` filters treat commas and parentheses as syntax. `%` is a
  // wildcard that could match everything, so strip it too. Keep underscores:
  // they are valid username characters and must remain searchable.
  return value.replace(/[%,()]/g, ' ').trim();
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

function publicProfileError(action: string, error: { message: string; code?: string }): Error {
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return new Error(`${action}: the public_profiles view is missing. Apply the pending Supabase migrations.`);
  }
  return new Error(`${action}: ${error.message}`);
}

export async function listPublicProfiles(): Promise<PublicProfile[]> {
  if (!isSupabaseAuthConfigured()) {
    return listLocalPublicProfiles();
  }

  const { data, error } = await getSupabaseBrowserClient()
    .from('public_profiles')
    .select('*')
    .order('username', { ascending: true })
    .limit(30);

  if (error) throw publicProfileError('Public profiles could not be loaded', error);
  return (data ?? []).map(mapPublicProfileRow);
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

  if (error) throw publicProfileError('Profiles could not be searched', error);
  return (data ?? []).map(mapPublicProfileRow);
}
