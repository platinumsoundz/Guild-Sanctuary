import type { Post } from '@/types/database';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { createCommunityMediaUrls, isSupabaseCommunityStorageConfigured } from '@/services/supabase/communityMedia';
import { delay, feedStore } from './feedStore';

export interface FeedCursor {
  createdAt: string;
  id: string;
}

export interface FeedPage {
  posts: Post[];
  nextCursor: FeedCursor | null;
}

export const FEED_PAGE_SIZE = 20;

function comparePostsNewestFirst(first: Post, second: Post): number {
  return second.createdAt.localeCompare(first.createdAt) || second.id.localeCompare(first.id);
}

/**
 * Keyset pagination. The cursor is the last item the client already has, so a
 * newly published post cannot push older items onto the next page or cause
 * duplicates. The extra row tells us whether another page exists without a
 * separate count query.
 */
export async function fetchFeedPage({
  limit = FEED_PAGE_SIZE,
  cursor = null,
}: {
  limit?: number;
  cursor?: FeedCursor | null;
} = {}): Promise<FeedPage> {
  const pageSize = Math.min(Math.max(Math.trunc(limit), 1), 50);

  if (isSupabaseCommunityStorageConfigured()) {
    let query = getSupabaseBrowserClient()
      .from('posts')
      .select('*')
      .eq('state', 'visible');

    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(pageSize + 1);
    if (error) throw new Error(`The feed could not be loaded: ${error.message}`);

    const hasMore = data.length > pageSize;
    const rows = hasMore ? data.slice(0, pageSize) : data;
    const urls = await createCommunityMediaUrls(rows.flatMap((row) => row.media_url ? [row.media_url] : []));
    const pagePosts = rows.map((row) => ({
      id: row.id,
      authorId: row.author_id,
      content: row.content,
      mediaUrl: row.media_url ? (urls.get(row.media_url) ?? null) : null,
      mediaType: row.media_type,
      storyTag: row.story_tag,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    const last = pagePosts.at(-1);
    return {
      posts: pagePosts,
      nextCursor: hasMore && last ? { createdAt: last.createdAt, id: last.id } : null,
    };
  }

  await delay();
  const sorted = feedStore.posts.slice().sort(comparePostsNewestFirst);
  const remaining = cursor
    ? sorted.filter((post) => post.createdAt < cursor.createdAt ||
      (post.createdAt === cursor.createdAt && post.id < cursor.id))
    : sorted;
  const pagePosts = remaining.slice(0, pageSize).map((post) => ({ ...post }));
  const last = pagePosts.at(-1);
  return {
    posts: pagePosts,
    nextCursor: remaining.length > pageSize && last ? { createdAt: last.createdAt, id: last.id } : null,
  };
}

/** Compatibility helper for callers that still need one array. */
export async function fetchFeed(): Promise<Post[]> {
  return (await fetchFeedPage({ limit: 50 })).posts;
}
