import { getSupabaseBrowserClient } from '@/services/supabase';
import type { AdminMemberOverview, MemberTermsAcceptance } from '@/services/supabase/database.types';

export interface MemberSearchResult {
  id: string;
  username: string;
  displayName: string;
  role: 'member' | 'moderator' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  suspendedUntil: string | null;
  balanceTokens: number;
  createdAt: string;
}

export interface AuditEvent {
  id: number;
  actorId: string | null;
  actorUsername: string | null;
  eventType: string;
  subjectType: string;
  subjectId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

export async function searchMembers(query: string): Promise<MemberSearchResult[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('admin_search_members', {
    requested_query: query.trim(),
    requested_limit: 25,
  });
  if (error) throw new Error(error.message || 'Members could not be searched.');
  return (data ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    suspendedUntil: row.suspended_until,
    balanceTokens: row.balance_tokens,
    createdAt: row.created_at,
  }));
}

export async function fetchMemberOverview(userId: string): Promise<AdminMemberOverview> {
  const { data, error } = await getSupabaseBrowserClient().rpc('admin_member_overview', {
    requested_user_id: userId,
  });
  if (error) throw new Error(error.message || 'The member overview could not be loaded.');
  if (!data || typeof data !== 'object' || !('profile' in data)) {
    throw new Error('The member overview returned no data.');
  }
  return data as AdminMemberOverview;
}

export async function fetchMemberTerms(userId: string): Promise<MemberTermsAcceptance[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('admin_list_terms_acceptances', {
    requested_user_id: userId,
  });
  if (error) throw new Error(error.message || "The member's Terms records could not be loaded.");
  return Array.isArray(data) ? (data as MemberTermsAcceptance[]) : [];
}

export async function setMemberRole(
  userId: string,
  role: 'member' | 'moderator' | 'admin',
): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc('admin_set_member_role', {
    requested_user_id: userId,
    requested_role: role,
  });
  if (error) throw new Error(error.message || 'The member role could not be changed.');
}

export async function addMemberNote(userId: string, body: string): Promise<void> {
  const trimmed = body.trim();
  if (trimmed.length < 2 || trimmed.length > 2000) {
    throw new Error('Add a note between 2 and 2,000 characters.');
  }
  const { error } = await getSupabaseBrowserClient().rpc('admin_add_member_note', {
    requested_user_id: userId,
    requested_body: trimmed,
  });
  if (error) throw new Error(error.message || 'The note could not be saved.');
}

export async function fetchAuditEvents(limit = 50, offset = 0): Promise<AuditEvent[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc('admin_list_audit_events', {
    requested_limit: limit,
    requested_offset: offset,
  });
  if (error) throw new Error(error.message || 'The audit log could not be loaded.');
  return (data ?? []).map((row) => ({
    id: row.id,
    actorId: row.actor_id,
    actorUsername: row.actor_username,
    eventType: row.event_type,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    details: row.details,
    createdAt: row.created_at,
  }));
}
