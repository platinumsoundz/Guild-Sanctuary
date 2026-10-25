'use client';

import type { SocialComment } from '@/types/database';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { isSupabaseCommunityStorageConfigured, requireCommunityStorageUser } from '@/services/supabase/communityMedia';
import { delay, findShort, shortStore } from './shortsStore';

export async function toggleShortLike(shortId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(userId);
    const { data, error } = await getSupabaseBrowserClient().rpc('toggle_short_like', {
      requested_short_id: shortId,
    });
    if (error) throw new Error(`Your reaction could not be saved: ${error.message}`);
    const stats = data?.[0];
    if (!stats) throw new Error('This short video is unavailable for reactions.');
    return { liked: stats.liked, count: stats.likes_count };
  }
  if (!userId || !findShort(shortId)) {
    throw new Error('This short video is unavailable.');
  }
  await delay();
  const existingIndex = shortStore.likes.findIndex((like) => like.targetId === shortId && like.userId === userId);
  if (existingIndex >= 0) {
    shortStore.likes.splice(existingIndex, 1);
  } else {
    shortStore.likes.push({
      id: `short-like-${shortStore.nextId++}`,
      targetType: 'short',
      targetId: shortId,
      userId,
      createdAt: new Date().toISOString(),
    });
  }
  return {
    liked: existingIndex < 0,
    count: shortStore.likes.filter((like) => like.targetId === shortId).length,
  };
}

export async function fetchShortComments(shortId: string): Promise<SocialComment[]> {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser();
    const { data, error } = await getSupabaseBrowserClient()
      .from('social_comments')
      .select('*')
      .eq('target_type', 'short')
      .eq('target_id', shortId)
      .eq('state', 'visible')
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Comments for this short video could not be loaded: ${error.message}`);
    return data.map((comment) => ({
      id: comment.id,
      targetType: 'short',
      targetId: comment.target_id,
      authorId: comment.author_id,
      body: comment.body,
      createdAt: comment.created_at,
    }));
  }
  if (!findShort(shortId)) {
    throw new Error('Comments for this short video are unavailable.');
  }
  await delay();
  return shortStore.comments.filter((comment) => comment.targetId === shortId).map((comment) => ({ ...comment }));
}

export async function addShortComment(shortId: string, authorId: string, body: string): Promise<SocialComment> {
  const normalizedBody = body.trim();
  if (!authorId || normalizedBody.length < 1 || normalizedBody.length > 1000) {
    throw new Error('Comments must contain 1 to 1,000 characters.');
  }
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(authorId);
    const { data, error } = await getSupabaseBrowserClient()
      .from('social_comments')
      .insert({ target_type: 'short', target_id: shortId, author_id: authorId, body: normalizedBody })
      .select('*')
      .single();
    if (error) throw new Error(`Your comment could not be saved: ${error.message}`);
    return {
      id: data.id,
      targetType: 'short',
      targetId: data.target_id,
      authorId: data.author_id,
      body: data.body,
      createdAt: data.created_at,
    };
  }
  if (!findShort(shortId)) throw new Error('Comments for this short video are unavailable.');
  await delay();
  const comment: SocialComment = {
    id: `short-comment-${shortStore.nextId++}`,
    targetType: 'short',
    targetId: shortId,
    authorId,
    body: normalizedBody,
    createdAt: new Date().toISOString(),
  };
  shortStore.comments.push(comment);
  return { ...comment };
}

export async function getShortEngagement(shortId: string, userId: string) {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(userId);
    const { data, error } = await getSupabaseBrowserClient().rpc('get_short_engagement_stats', {
      requested_short_id: shortId,
    });
    if (error) throw new Error(`Short video reactions could not be loaded: ${error.message}`);
    const stats = data?.[0];
    if (!stats) throw new Error('This short video is unavailable for reactions.');
    return {
      liked: stats.liked,
      likesCount: stats.likes_count,
      commentsCount: stats.comments_count,
    };
  }
  return {
    liked: shortStore.likes.some((like) => like.targetId === shortId && like.userId === userId),
    likesCount: shortStore.likes.filter((like) => like.targetId === shortId).length,
    commentsCount: shortStore.comments.filter((comment) => comment.targetId === shortId).length,
  };
}

export function removeUserShortData(userId: string): void {
  const removedShortIds = new Set(shortStore.videos.filter((video) => video.authorId === userId).map((video) => video.id));
  for (let index = shortStore.videos.length - 1; index >= 0; index -= 1) {
    if (shortStore.videos[index].authorId === userId) shortStore.videos.splice(index, 1);
  }
  for (let index = shortStore.likes.length - 1; index >= 0; index -= 1) {
    if (shortStore.likes[index].userId === userId || removedShortIds.has(shortStore.likes[index].targetId)) shortStore.likes.splice(index, 1);
  }
  for (let index = shortStore.comments.length - 1; index >= 0; index -= 1) {
    if (shortStore.comments[index].authorId === userId || removedShortIds.has(shortStore.comments[index].targetId)) shortStore.comments.splice(index, 1);
  }
}
