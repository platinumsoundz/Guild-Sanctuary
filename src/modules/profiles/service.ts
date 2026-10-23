import type { PublicProfile } from '@/types/database';
import { searchPublicProfiles as searchProfiles } from '@/services/publicProfiles';

export async function searchPublicProfiles(query: string): Promise<PublicProfile[]> {
  return searchProfiles(query);
}
