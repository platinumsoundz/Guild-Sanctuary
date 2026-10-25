'use client';

import type { SocialComment } from '@/types/database';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { isSupabaseCommunityStorageConfigured, requireCommunityStorageUser } from '@/services/supabase/communityMedia';
import { delay, eventStore, findEvent } from './eventStore';

export async function getEventEngagement(eventId: string, userId: string) {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(userId);
    const client = getSupabaseBrowserClient();
    const [like, likesCount, commentsCount] = await Promise.all([
      client.from('social_likes').select('id').eq('target_type', 'event').eq('target_id', eventId).eq('user_id', userId).maybeSingle(),
      client.from('social_likes').select('id', { count: 'exact', head: true }).eq('target_type', 'event').eq('target_id', eventId),
      client.from('social_comments').select('id', { count: 'exact', head: true }).eq('target_type', 'event').eq('target_id', eventId).eq('state', 'visible'),
    ]);
    if (like.error || likesCount.error || commentsCount.error) {
      throw new Error(`Event reactions could not be loaded: ${like.error?.message ?? likesCount.error?.message ?? commentsCount.error?.message}`);
    }
    return { liked: Boolean(like.data), likesCount: likesCount.count ?? 0, commentsCount: commentsCount.count ?? 0 };
  }
  if (!findEvent(eventId)) {
    throw new Error('This event is unavailable.');
  }
  return {
    liked: eventStore.likes.some((like) => like.targetId === eventId && like.userId === userId),
    likesCount: eventStore.likes.filter((like) => like.targetId === eventId).length,
    commentsCount: eventStore.comments.filter((comment) => comment.targetId === eventId).length,
  };
}

export async function toggleEventLike(eventId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(userId);
    const client = getSupabaseBrowserClient();
    const { data: existing, error: existingError } = await client
      .from('social_likes')
      .select('id')
      .eq('target_type', 'event')
      .eq('target_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();
    if (existingError) throw new Error(`Your event reaction could not be checked: ${existingError.message}`);
    const mutation = existing
      ? await client.from('social_likes').delete().eq('id', existing.id)
      : await client.from('social_likes').insert({ target_type: 'event', target_id: eventId, user_id: userId });
    if (mutation.error) throw new Error(`Your event reaction could not be saved: ${mutation.error.message}`);
    const { count, error } = await client.from('social_likes')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'event')
      .eq('target_id', eventId);
    if (error) throw new Error(`Event reaction count could not be loaded: ${error.message}`);
    return { liked: !existing, count: count ?? 0 };
  }
  if (!userId || !findEvent(eventId)) throw new Error('This event is unavailable for liking.');
  await delay();
  const existingIndex = eventStore.likes.findIndex((like) => like.targetId === eventId && like.userId === userId);
  if (existingIndex >= 0) eventStore.likes.splice(existingIndex, 1);
  else eventStore.likes.push({ id: `event-like-${Date.now()}`, targetType: 'event', targetId: eventId, userId, createdAt: new Date().toISOString() });
  return { liked: existingIndex < 0, count: eventStore.likes.filter((like) => like.targetId === eventId).length };
}

export async function fetchEventComments(eventId: string): Promise<SocialComment[]> {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser();
    const { data, error } = await getSupabaseBrowserClient()
      .from('social_comments')
      .select('*')
      .eq('target_type', 'event')
      .eq('target_id', eventId)
      .eq('state', 'visible')
      .order('created_at', { ascending: true });
    if (error) throw new Error(`Event comments could not be loaded: ${error.message}`);
    return data.map((row) => ({
      id: row.id,
      targetType: 'event',
      targetId: row.target_id,
      authorId: row.author_id,
      body: row.body,
      createdAt: row.created_at,
    }));
  }
  if (!findEvent(eventId)) throw new Error('Comments for this event are unavailable.');
  await delay();
  return eventStore.comments.filter((comment) => comment.targetId === eventId).map((comment) => ({ ...comment }));
}

export async function addEventComment(eventId: string, authorId: string, body: string): Promise<SocialComment> {
  const normalizedBody = body.trim();
  if (!authorId || normalizedBody.length < 1 || normalizedBody.length > 1000) {
    throw new Error('Comments must contain 1 to 1,000 characters.');
  }
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(authorId);
    const { data, error } = await getSupabaseBrowserClient()
      .from('social_comments')
      .insert({ target_type: 'event', target_id: eventId, author_id: authorId, body: normalizedBody })
      .select('*')
      .single();
    if (error) throw new Error(`Your event comment could not be saved: ${error.message}`);
    return {
      id: data.id,
      targetType: 'event',
      targetId: data.target_id,
      authorId: data.author_id,
      body: data.body,
      createdAt: data.created_at,
    };
  }
  if (!findEvent(eventId)) throw new Error('Comments for this event are unavailable.');
  await delay();
  const comment: SocialComment = {
    id: `event-comment-${Date.now()}`,
    targetType: 'event',
    targetId: eventId,
    authorId,
    body: normalizedBody,
    createdAt: new Date().toISOString(),
  };
  eventStore.comments.push(comment);
  return { ...comment };
}

export function removeUserEventData(userId: string): void {
  if (isSupabaseCommunityStorageConfigured()) return;

  for (let index = eventStore.events.length - 1; index >= 0; index -= 1) {
    if (eventStore.events[index].creatorId === userId) eventStore.events.splice(index, 1);
  }
  for (let index = eventStore.rsvps.length - 1; index >= 0; index -= 1) {
    if (eventStore.rsvps[index].userId === userId) eventStore.rsvps.splice(index, 1);
  }
}
