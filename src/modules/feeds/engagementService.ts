import type { SocialComment } from '@/types/database';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { isSupabaseCommunityStorageConfigured, requireCommunityStorageUser } from '@/services/supabase/communityMedia';
import { delay, feedStore } from './feedStore';

export async function getPostEngagement(postId: string, userId: string) {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(userId);
    const client = getSupabaseBrowserClient();
    const [like, likesCount, commentsCount] = await Promise.all([
      client.from('social_likes').select('id').eq('target_type', 'post').eq('target_id', postId).eq('user_id', userId).maybeSingle(),
      client.from('social_likes').select('id', { count: 'exact', head: true }).eq('target_type', 'post').eq('target_id', postId),
      client.from('social_comments').select('id', { count: 'exact', head: true }).eq('target_type', 'post').eq('target_id', postId).eq('state', 'visible'),
    ]);
    if (like.error || likesCount.error || commentsCount.error) {
      throw new Error(`Post reactions could not be loaded: ${like.error?.message ?? likesCount.error?.message ?? commentsCount.error?.message}`);
    }
    return { liked: Boolean(like.data), likesCount: likesCount.count ?? 0, commentsCount: commentsCount.count ?? 0 };
  }
  if (!feedStore.posts.some((post) => post.id === postId)) {
    throw new Error('This post is unavailable.');
  }
  return {
    liked: feedStore.likes.some((like) => like.targetId === postId && like.userId === userId),
    likesCount: feedStore.likes.filter((like) => like.targetId === postId).length,
    commentsCount: feedStore.comments.filter((comment) => comment.targetId === postId).length,
  };
}

export async function togglePostLike(postId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(userId);
    const client = getSupabaseBrowserClient();
    const { data: existing, error: existingError } = await client
      .from('social_likes')
      .select('id')
      .eq('target_type', 'post')
      .eq('target_id', postId)
      .eq('user_id', userId)
      .maybeSingle();
    if (existingError) throw new Error(`Your reaction could not be checked: ${existingError.message}`);
    const mutation = existing
      ? await client.from('social_likes').delete().eq('id', existing.id)
      : await client.from('social_likes').insert({ target_type: 'post', target_id: postId, user_id: userId });
    if (mutation.error) throw new Error(`Your reaction could not be saved: ${mutation.error.message}`);
    const { count, error } = await client
      .from('social_likes')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'post')
      .eq('target_id', postId);
    if (error) throw new Error(`Reaction count could not be loaded: ${error.message}`);
    return { liked: !existing, count: count ?? 0 };
  }
  if (!userId || !feedStore.posts.some((post) => post.id === postId)) {
    throw new Error('This post is unavailable for liking.');
  }
  await delay();
  const existingIndex = feedStore.likes.findIndex((like) => like.targetId === postId && like.userId === userId);
  if (existingIndex >= 0) {
    feedStore.likes.splice(existingIndex, 1);
  } else {
    feedStore.likes.push({
      id: `post-like-${feedStore.nextEngagementId++}`,
      targetType: 'post',
      targetId: postId,
      userId,
      createdAt: new Date().toISOString(),
    });
  }
  return { liked: existingIndex < 0, count: feedStore.likes.filter((like) => like.targetId === postId).length };
}

export async function fetchPostComments(postId: string): Promise<SocialComment[]> {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser();
    const { data, error } = await getSupabaseBrowserClient()
      .from('social_comments')
      .select('*')
      .eq('target_type', 'post')
      .eq('target_id', postId)
      .eq('state', 'visible')
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Comments for this post could not be loaded: ${error.message}`);
    return data.map((comment) => ({
      id: comment.id,
      targetType: 'post',
      targetId: comment.target_id,
      authorId: comment.author_id,
      body: comment.body,
      createdAt: comment.created_at,
    }));
  }
  if (!feedStore.posts.some((post) => post.id === postId)) {
    throw new Error('Comments for this post are unavailable.');
  }
  await delay();
  return feedStore.comments
    .filter((comment) => comment.targetId === postId)
    .map((comment) => ({ ...comment }));
}

export async function addPostComment(postId: string, authorId: string, body: string): Promise<SocialComment> {
  const normalizedBody = body.trim();
  if (!authorId || normalizedBody.length < 1 || normalizedBody.length > 1000) {
    throw new Error('Comments must contain 1 to 1,000 characters.');
  }
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(authorId);
    const { data, error } = await getSupabaseBrowserClient()
      .from('social_comments')
      .insert({ target_type: 'post', target_id: postId, author_id: authorId, body: normalizedBody })
      .select('*')
      .single();
    if (error) throw new Error(`Your comment could not be saved: ${error.message}`);
    return {
      id: data.id,
      targetType: 'post',
      targetId: data.target_id,
      authorId: data.author_id,
      body: data.body,
      createdAt: data.created_at,
    };
  }
  if (!feedStore.posts.some((post) => post.id === postId)) {
    throw new Error('Comments for this post are unavailable.');
  }
  await delay();
  const comment: SocialComment = {
    id: `post-comment-${feedStore.nextEngagementId++}`,
    targetType: 'post',
    targetId: postId,
    authorId,
    body: normalizedBody,
    createdAt: new Date().toISOString(),
  };
  feedStore.comments.push(comment);
  return { ...comment };
}

export function removeUserFeedData(userId: string): void {
  const removedPostIds = new Set(feedStore.posts.filter((post) => post.authorId === userId).map((post) => post.id));
  for (let index = feedStore.posts.length - 1; index >= 0; index -= 1) {
    if (feedStore.posts[index].authorId === userId) feedStore.posts.splice(index, 1);
  }
  for (let index = feedStore.likes.length - 1; index >= 0; index -= 1) {
    if (feedStore.likes[index].userId === userId || removedPostIds.has(feedStore.likes[index].targetId)) {
      feedStore.likes.splice(index, 1);
    }
  }
  for (let index = feedStore.comments.length - 1; index >= 0; index -= 1) {
    if (feedStore.comments[index].authorId === userId || removedPostIds.has(feedStore.comments[index].targetId)) {
      feedStore.comments.splice(index, 1);
    }
  }
}
