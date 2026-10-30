import type { NavigationState } from '@/context/AppContext';
import type { WorldType } from '@/types/database';
import { getSupabaseBrowserClient } from '@/services/supabase';

export type NavigationBadgeCounts = Partial<Record<NavigationState, number>>;

type BadgeKey = keyof NavigationBadgeCounts;

/**
 * Shared badge-count contract for both Sanctuary and Guild.
 * Each inbox is queried independently: one missing/temporarily unavailable
 * table must never prevent other destinations from receiving their counts.
 * New inbox features should add a world-scoped, role-aware count here.
 */
export async function fetchNavigationBadgeCounts(
  userId: string,
  roleValue: string,
  worldType: WorldType,
): Promise<NavigationBadgeCounts> {
  const client = getSupabaseBrowserClient();
  const role = roleValue.toLowerCase();
  const canReviewReports = ['moderator', 'admin', 'developer', 'owner'].includes(role);
  const canReviewFeedback = ['developer', 'owner'].includes(role);
  const counts: NavigationBadgeCounts = {};

  const independently = async (key: BadgeKey, query: () => Promise<number | null | undefined>) => {
    try {
      const count = await query();
      counts[key] = count ?? 0;
    } catch {
      // Keep this destination's badge unavailable without blocking other counts.
    }
  };

  const jobs: Promise<void>[] = [
    independently('notifications', async () => {
      const { count, error } = await client.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', userId).eq('world_type', worldType).is('read_at', null);
      if (error) throw error;
      return count;
    }),
  ];

  if (canReviewReports) jobs.push(independently('moderation', async () => {
    const { count, error } = await client.from('content_reports')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'reviewing']).eq('world_type', worldType);
    if (error) throw error;
    return count;
  }));

  if (canReviewFeedback) jobs.push(independently('feedback', async () => {
    let query = client.from('sanctuary_feedback').select('id', { count: 'exact', head: true })
      .in('status', ['open', 'in_review']);
    query = worldType === 'guild'
      ? query.ilike('page_url', '%environment=guild%')
      : query.or('page_url.is.null,page_url.not.ilike.%environment=guild%');
    const { count, error } = await query;
    if (error) throw error;
    counts.admin = count ?? 0;
    return count;
  }));

  if (process.env.NEXT_PUBLIC_SANCTUARY_PERSISTENT_MESSAGES === 'true') {
    jobs.push(independently('messages', async () => {
      const { data: memberships, error: membershipError } = await client.from('conversation_members')
        .select('conversation_id').eq('user_id', userId).is('left_at', null);
      if (membershipError) throw membershipError;
      const conversationIds = (memberships ?? []).map((item) => item.conversation_id);
      if (!conversationIds.length) return 0;
      const { data: conversations, error: conversationError } = await client.from('conversations')
        .select('id').in('id', conversationIds).eq('world_type', worldType);
      if (conversationError) throw conversationError;
      const scopedIds = (conversations ?? []).map((item) => item.id);
      if (!scopedIds.length) return 0;
      const { count, error } = await client.from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', scopedIds).neq('sender_id', userId).is('read_at', null).eq('state', 'visible');
      if (error) throw error;
      return count;
    }));
  }

  await Promise.all(jobs);
  return counts;
}
