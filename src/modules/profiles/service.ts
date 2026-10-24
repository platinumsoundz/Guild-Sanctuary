import type { PublicProfile } from '@/types/database';
import {
  listPublicProfiles as listProfiles,
  searchPublicProfiles as searchProfiles,
} from '@/services/publicProfiles';

export async function listPublicProfiles(): Promise<PublicProfile[]> {
  return listProfiles();
}

export async function searchPublicProfiles(query: string): Promise<PublicProfile[]> {
  return searchProfiles(query);
}
