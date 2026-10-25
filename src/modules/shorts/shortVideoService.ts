'use client';

import type { ShortVideo } from '@/types/database';
import { getSupabaseBrowserClient } from '@/services/supabase';
import {
  createCommunityMediaUrls,
  isSupabaseCommunityStorageConfigured,
  removeCommunityMedia,
  requireCommunityStorageUser,
  uploadCommunityMedia,
} from '@/services/supabase/communityMedia';
import { delay, findShort, shortStore } from './shortsStore';

export async function fetchShortVideos(): Promise<ShortVideo[]> {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser();
    const { data, error } = await getSupabaseBrowserClient()
      .from('short_videos')
      .select('*')
      .eq('state', 'visible')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Short videos could not be loaded: ${error.message}`);
    const urls = await createCommunityMediaUrls(data.map((row) => row.video_url));
    return data.map((row) => ({
      id: row.id,
      authorId: row.author_id,
      videoUrl: urls.get(row.video_url) ?? '',
      caption: row.caption,
      createdAt: row.created_at,
    }));
  }
  await delay();
  return shortStore.videos.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createShortVideo(
  input: Pick<ShortVideo, 'authorId' | 'caption'> & { videoFile: File; videoUrl?: string },
): Promise<ShortVideo> {
  const caption = input.caption.trim();
  if (!input.authorId || !input.videoFile || input.videoFile.size > 5 * 1024 * 1024 || caption.length > 500) {
    throw new Error('Choose a video and add a caption of no more than 500 characters.');
  }
  if (!input.videoFile.type.startsWith('video/')) throw new Error('Choose a valid video file.');
  if (isSupabaseCommunityStorageConfigured()) {
    const userId = await requireCommunityStorageUser(input.authorId);
    const videoPath = await uploadCommunityMedia(userId, input.videoFile, 'shorts');
    let videoUrl: string;
    try {
      const signedUrls = await createCommunityMediaUrls([videoPath]);
      const signed = signedUrls.get(videoPath);
      if (!signed) throw new Error('A signed video URL was not returned.');
      videoUrl = signed;
    } catch (error) {
      try {
        const { error: cleanupError } = await getSupabaseBrowserClient()
          .storage.from('community-media').remove([videoPath]);
        if (cleanupError) throw cleanupError;
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], 'Video signing failed and the uploaded file could not be cleaned up.');
      }
      throw error;
    }
    const { data, error } = await getSupabaseBrowserClient()
      .from('short_videos')
      .insert({
        author_id: userId,
        video_url: videoPath,
        caption,
      })
      .select('*')
      .single();
    if (error) {
      const { error: cleanupError } = await getSupabaseBrowserClient()
        .storage.from('community-media').remove([videoPath]);
      if (cleanupError) {
        throw new Error(`Video save failed: ${error.message}. Uploaded media cleanup also failed: ${cleanupError.message}`);
      }
      throw new Error(`Video could not be saved: ${error.message}`);
    }
    return {
      id: data.id,
      authorId: data.author_id,
      videoUrl,
      caption: data.caption,
      createdAt: data.created_at,
    };
  }
  await delay();
  const video: ShortVideo = {
    authorId: input.authorId,
    videoUrl: URL.createObjectURL(input.videoFile),
    caption,
    id: `short-local-${shortStore.nextId++}`,
    createdAt: new Date().toISOString(),
  };
  shortStore.videos.unshift(video);
  return video;
}

export async function deleteShortVideo(shortId: string, authorId: string): Promise<void> {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(authorId);
    const { data, error } = await getSupabaseBrowserClient()
      .from('short_videos')
      .delete()
      .eq('id', shortId)
      .eq('author_id', authorId)
      .select('video_url')
      .maybeSingle();
    if (error) throw new Error(`Short video could not be deleted: ${error.message}`);
    if (!data) throw new Error('This short video could not be deleted.');
    await removeCommunityMedia(data.video_url);
    return;
  }
  const videoIndex = shortStore.videos.findIndex((video) => video.id === shortId && video.authorId === authorId);
  if (videoIndex < 0) throw new Error('This short video could not be deleted.');
  shortStore.videos.splice(videoIndex, 1);
  for (let index = shortStore.likes.length - 1; index >= 0; index -= 1) {
    if (shortStore.likes[index].targetId === shortId) shortStore.likes.splice(index, 1);
  }
  for (let index = shortStore.comments.length - 1; index >= 0; index -= 1) {
    if (shortStore.comments[index].targetId === shortId) shortStore.comments.splice(index, 1);
  }
}

export async function updateShortVideo(shortId: string, authorId: string, caption: string): Promise<ShortVideo> {
  const normalizedCaption = caption.trim();
  if (normalizedCaption.length > 500) throw new Error('Captions cannot exceed 500 characters.');
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(authorId);
    const { data, error } = await getSupabaseBrowserClient()
      .from('short_videos')
      .update({ caption: normalizedCaption })
      .eq('id', shortId)
      .eq('author_id', authorId)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(`Short video could not be updated: ${error.message}`);
    if (!data) throw new Error('This short video could not be edited.');
    const videoUrl = (await createCommunityMediaUrls([data.video_url])).get(data.video_url);
    if (!videoUrl) throw new Error('The caption was saved, but the video playback URL could not be created.');
    return {
      id: data.id,
      authorId: data.author_id,
      videoUrl,
      caption: data.caption,
      createdAt: data.created_at,
    };
  }
  const video = findShort(shortId);
  if (!video || video.authorId !== authorId) throw new Error('This short video could not be edited.');
  video.caption = normalizedCaption;
  return { ...video };
}
