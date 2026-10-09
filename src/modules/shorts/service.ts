import type { WorldType } from '@/types';
import type { ShortVideo, SocialComment, SocialLike } from '@/types/database';
import { getSupabaseBrowserClient } from '@/services/supabase';
import {
  createCommunityMediaUrls,
  isSupabaseCommunityStorageConfigured,
  removeCommunityMedia,
  requireCommunityStorageUser,
  uploadCommunityMedia,
} from '@/services/supabase/communityMedia';

const videosByWorld: Record<WorldType, ShortVideo[]> = {
  sanctuary: [
    {
      id: 'short-demo-2',
      authorId: 'community-creator',
      worldType: 'sanctuary',
      videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      caption: 'A little reminder to take the scenic route today.',
      createdAt: '2026-10-08T11:00:00.000Z',
    },
  ],
  guild: [
    {
      id: 'short-demo-1',
      authorId: 'community-creator',
      worldType: 'guild',
      videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      caption: 'A quick escape with the crew. What should we play next?',
      createdAt: '2026-10-08T12:00:00.000Z',
    },
  ],
};

const likes: SocialLike[] = [];
const comments: SocialComment[] = [];
let nextId = 1;

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 40));
}

function findShort(shortId: string): ShortVideo | undefined {
  return Object.values(videosByWorld).flat().find((video) => video.id === shortId);
}

export async function fetchShortVideos(worldType: WorldType): Promise<ShortVideo[]> {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser();
    const { data, error } = await getSupabaseBrowserClient()
      .from('short_videos')
      .select('*')
      .eq('world_type', worldType)
      .eq('state', 'visible')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Short videos could not be loaded: ${error.message}`);
    const urls = await createCommunityMediaUrls(data.map((row) => row.video_url));
    return data.map((row) => ({
      id: row.id,
      authorId: row.author_id,
      worldType: row.world_type,
      videoUrl: urls.get(row.video_url) ?? '',
      caption: row.caption,
      createdAt: row.created_at,
    }));
  }
  await delay();
  return videosByWorld[worldType]
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createShortVideo(input: Pick<ShortVideo, 'authorId' | 'worldType' | 'caption'> & { videoFile: File; videoUrl?: string }): Promise<ShortVideo> {
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
        world_type: input.worldType,
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
      worldType: data.world_type,
      videoUrl,
      caption: data.caption,
      createdAt: data.created_at,
    };
  }
  await delay();
  const video: ShortVideo = {
    authorId: input.authorId,
    worldType: input.worldType,
    videoUrl: URL.createObjectURL(input.videoFile),
    caption,
    id: `short-local-${nextId++}`,
    createdAt: new Date().toISOString(),
  };
  videosByWorld[input.worldType].unshift(video);
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
  const worldVideos = Object.values(videosByWorld).find((world) =>
    world.some((video) => video.id === shortId && video.authorId === authorId));
  const videoIndex = worldVideos?.findIndex((video) => video.id === shortId && video.authorId === authorId) ?? -1;
  if (!worldVideos || videoIndex < 0) throw new Error('This short video could not be deleted.');
  worldVideos.splice(videoIndex, 1);
  for (let index = likes.length - 1; index >= 0; index -= 1) {
    if (likes[index].targetId === shortId) likes.splice(index, 1);
  }
  for (let index = comments.length - 1; index >= 0; index -= 1) {
    if (comments[index].targetId === shortId) comments.splice(index, 1);
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
      worldType: data.world_type,
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

export async function toggleShortLike(shortId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(userId);
    const client = getSupabaseBrowserClient();
    const { data: existing, error: existingError } = await client
      .from('social_likes')
      .select('id')
      .eq('target_type', 'short')
      .eq('target_id', shortId)
      .eq('user_id', userId)
      .maybeSingle();
    if (existingError) throw new Error(`Your reaction could not be checked: ${existingError.message}`);
    const mutation = existing
      ? await client.from('social_likes').delete().eq('id', existing.id)
      : await client.from('social_likes').insert({ target_type: 'short', target_id: shortId, user_id: userId });
    if (mutation.error) throw new Error(`Your reaction could not be saved: ${mutation.error.message}`);
    const { count, error } = await client
      .from('social_likes')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'short')
      .eq('target_id', shortId);
    if (error) throw new Error(`Reaction count could not be loaded: ${error.message}`);
    return { liked: !existing, count: count ?? 0 };
  }
  if (!userId || !findShort(shortId)) {
    throw new Error('This short video is unavailable.');
  }
  await delay();
  const existingIndex = likes.findIndex((like) => like.targetId === shortId && like.userId === userId);
  if (existingIndex >= 0) {
    likes.splice(existingIndex, 1);
  } else {
    likes.push({
      id: `short-like-${nextId++}`,
      targetType: 'short',
      targetId: shortId,
      userId,
      createdAt: new Date().toISOString(),
    });
  }
  return {
    liked: existingIndex < 0,
    count: likes.filter((like) => like.targetId === shortId).length,
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
  return comments.filter((comment) => comment.targetId === shortId).map((comment) => ({ ...comment }));
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
    id: `short-comment-${nextId++}`,
    targetType: 'short',
    targetId: shortId,
    authorId,
    body: normalizedBody,
    createdAt: new Date().toISOString(),
  };
  comments.push(comment);
  return { ...comment };
}

export async function getShortEngagement(shortId: string, userId: string) {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(userId);
    const client = getSupabaseBrowserClient();
    const [like, likesCount, commentsCount] = await Promise.all([
      client.from('social_likes').select('id').eq('target_type', 'short').eq('target_id', shortId).eq('user_id', userId).maybeSingle(),
      client.from('social_likes').select('id', { count: 'exact', head: true }).eq('target_type', 'short').eq('target_id', shortId),
      client.from('social_comments').select('id', { count: 'exact', head: true }).eq('target_type', 'short').eq('target_id', shortId).eq('state', 'visible'),
    ]);
    if (like.error || likesCount.error || commentsCount.error) {
      throw new Error(`Short video reactions could not be loaded: ${like.error?.message ?? likesCount.error?.message ?? commentsCount.error?.message}`);
    }
    return { liked: Boolean(like.data), likesCount: likesCount.count ?? 0, commentsCount: commentsCount.count ?? 0 };
  }
  return {
    liked: likes.some((like) => like.targetId === shortId && like.userId === userId),
    likesCount: likes.filter((like) => like.targetId === shortId).length,
    commentsCount: comments.filter((comment) => comment.targetId === shortId).length,
  };
}

export function removeUserShortData(userId: string): void {
  const removedShortIds = new Set(Object.values(videosByWorld).flat().filter((video) => video.authorId === userId).map((video) => video.id));
  for (const worldVideos of Object.values(videosByWorld)) {
    for (let index = worldVideos.length - 1; index >= 0; index -= 1) {
      if (worldVideos[index].authorId === userId) worldVideos.splice(index, 1);
    }
  }
  for (let index = likes.length - 1; index >= 0; index -= 1) {
    if (likes[index].userId === userId || removedShortIds.has(likes[index].targetId)) likes.splice(index, 1);
  }
  for (let index = comments.length - 1; index >= 0; index -= 1) {
    if (comments[index].authorId === userId || removedShortIds.has(comments[index].targetId)) comments.splice(index, 1);
  }
}
