'use client';

import { getSupabaseBrowserClient } from '@/services/supabase';
import { isSupabaseCommunityStorageConfigured, requireCommunityStorageUser } from '@/services/supabase/communityMedia';

export interface CommentEngagement {
  liked: boolean;
  count: number;
}

const localLikes = new Map<string, Set<string>>();

function getLocalLikes(commentId: string): Set<string> {
  let users = localLikes.get(commentId);
  if (!users) {
    users = new Set<string>();
    localLikes.set(commentId, users);
  }
  return users;
}

export async function getCommentEngagement(commentId: string, userId: string): Promise<CommentEngagement> {
  if (!commentId || !userId) throw new Error('Sign in to view comment reactions.');
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(userId);
    const client = getSupabaseBrowserClient();
    const [mine, total] = await Promise.all([
      client.from('social_likes').select('id')
        .eq('target_type', 'comment').eq('target_id', commentId).eq('user_id', userId).maybeSingle(),
      client.from('social_likes').select('id', { count: 'exact', head: true })
        .eq('target_type', 'comment').eq('target_id', commentId),
    ]);
    if (mine.error || total.error) {
      throw new Error(`Comment reactions could not be loaded: ${mine.error?.message ?? total.error?.message}`);
    }
    return { liked: Boolean(mine.data), count: total.count ?? 0 };
  }
  const users = getLocalLikes(commentId);
  return { liked: users.has(userId), count: users.size };
}

export async function toggleCommentLike(commentId: string, userId: string): Promise<CommentEngagement> {
  if (!commentId || !userId) throw new Error('Sign in before liking a comment.');
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(userId);
    const client = getSupabaseBrowserClient();
    const { data: existing, error: readError } = await client.from('social_likes').select('id')
      .eq('target_type', 'comment').eq('target_id', commentId).eq('user_id', userId).maybeSingle();
    if (readError) throw new Error(`Your comment reaction could not be checked: ${readError.message}`);
    const mutation = existing
      ? await client.from('social_likes').delete().eq('id', existing.id)
      : await client.from('social_likes').insert({ target_type: 'comment', target_id: commentId, user_id: userId });
    if (mutation.error) throw new Error(`Your comment reaction could not be saved: ${mutation.error.message}`);
    return getCommentEngagement(commentId, userId);
  }
  const users = getLocalLikes(commentId);
  if (users.has(userId)) users.delete(userId);
  else users.add(userId);
  return { liked: users.has(userId), count: users.size };
}
