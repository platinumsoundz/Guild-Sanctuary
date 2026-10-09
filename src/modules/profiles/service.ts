import { searchLocalPublicProfiles } from '@/modules/auth';
import type { PublicProfile } from '@/types/database';

export async function searchPublicProfiles(query: string): Promise<PublicProfile[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) {
    return [];
  }

  return searchLocalPublicProfiles(normalizedQuery);
}