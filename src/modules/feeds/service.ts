import type { WorldType } from '@/types';
import type { Post, PostMediaType, SocialComment, SocialLike } from '@/types/database';
import { getSupabaseBrowserClient } from '@/services/supabase';
import {
  createCommunityMediaUrls,
  isSupabaseCommunityStorageConfigured,
  removeCommunityMedia,
  requireCommunityStorageUser,
  uploadCommunityMedia,
} from '@/services/supabase/communityMedia';

export interface CreatePostInput {
  authorId: string;
  worldType: WorldType;
  content: string;
  mediaUrl?: string | null;
  mediaType?: PostMediaType | null;
  mediaFile?: File | null;
  storyTag?: string | null;
}

const postsByWorld: Record<WorldType, Post[]> = {
  sanctuary: [
    {
      id: 'post-demo-sanctuary',
      authorId: 'community-member',
      worldType: 'sanctuary',
      content: 'A quiet moment can change the shape of a whole day.',
      mediaUrl: null,
      mediaType: null,
      storyTag: null,
      createdAt: '2026-10-08T09:00:00.000Z',
      updatedAt: '2026-10-08T09:00:00.000Z',
    },
  ],
  guild: [
    {
      id: 'post-demo-guild',
      authorId: 'community-member',
      worldType: 'guild',
      content: "Looking for a few more people for tonight's co-op run.",
      mediaUrl: null,
      mediaType: null,
      storyTag: null,
      createdAt: '2026-10-08T10:30:00.000Z',
      updatedAt: '2026-10-08T10:30:00.000Z',
    },
  ],
};

let nextPostId = 1;
const likes: SocialLike[] = [];
const comments: SocialComment[] = [];
let nextEngagementId = 1;

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 60));
}

function validateAttachment(
  mediaUrl: string | null | undefined,
  mediaType: PostMediaType | null | undefined,
  mediaFile?: File | null,
): void {
  if (!mediaUrl && !mediaFile && mediaType) {
    throw new Error('Choose a valid attachment before publishing.');
  }
  if ((mediaUrl || mediaFile) && mediaType !== 'image' && mediaType !== 'audio' && mediaType !== 'video') {
    throw new Error('Attachments must be an image, audio, or video file.');
  }
  if (mediaUrl && mediaUrl.length > 8_000_000) {
    throw new Error('Attachments must be smaller than 6 MB.');
  }
}

export async function fetchFeed(worldType: WorldType): Promise<Post[]> {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser();
    const { data, error } = await getSupabaseBrowserClient()
      .from('posts')
      .select('*')
      .eq('world_type', worldType)
      .eq('state', 'visible')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`The feed could not be loaded: ${error.message}`);
    const urls = await createCommunityMediaUrls(data.flatMap((row) => row.media_url ? [row.media_url] : []));
    return data.map((row) => ({
      id: row.id,
      authorId: row.author_id,
      worldType: row.world_type,
      content: row.content,
      mediaUrl: row.media_url ? (urls.get(row.media_url) ?? null) : null,
      mediaType: row.media_type,
      storyTag: row.story_tag,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
  await delay();
  return postsByWorld[worldType]
    .slice()
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export async function fetchPostsByAuthor(authorId: string): Promise<Post[]> {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser();
    const { data, error } = await getSupabaseBrowserClient()
      .from('posts')
      .select('*')
      .eq('author_id', authorId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Your posts could not be loaded: ${error.message}`);
    const urls = await createCommunityMediaUrls(data.flatMap((row) => row.media_url ? [row.media_url] : []));
    return data.map((row) => ({
      id: row.id,
      authorId: row.author_id,
      worldType: row.world_type,
      content: row.content,
      mediaUrl: row.media_url ? (urls.get(row.media_url) ?? null) : null,
      mediaType: row.media_type,
      storyTag: row.story_tag,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
  await delay();
  return Object.values(postsByWorld).flat()
    .filter((post) => post.authorId === authorId)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const content = input.content.trim();
  const hasMedia = Boolean(input.mediaFile || input.mediaUrl);
  validateAttachment(input.mediaUrl, input.mediaType, input.mediaFile);
  if (!input.authorId || (content.length < 1 && !hasMedia) || content.length > 2800) {
    throw new Error('Posts must contain text or an attachment, with no more than 2,800 text characters.');
  }

  if (isSupabaseCommunityStorageConfigured()) {
    if (input.mediaUrl && !input.mediaFile) {
      throw new Error('Choose the original media file to upload it to your community library.');
    }
    const userId = await requireCommunityStorageUser(input.authorId);
    let mediaPath: string | null = null;
    if (input.mediaFile) mediaPath = await uploadCommunityMedia(userId, input.mediaFile, 'posts');
    let mediaUrl: string | null = null;
    if (mediaPath) {
      try {
        mediaUrl = (await createCommunityMediaUrls([mediaPath])).get(mediaPath) ?? null;
      } catch (error) {
        try {
          await removeCommunityMedia(mediaPath);
        } catch (cleanupError) {
          throw new AggregateError([error, cleanupError], 'Media signing failed and the uploaded file could not be cleaned up.');
        }
        throw error;
      }
    }
    const { data, error } = await getSupabaseBrowserClient()
      .from('posts')
      .insert({
        author_id: userId,
        world_type: input.worldType,
        content,
        media_url: mediaPath,
        media_type: input.mediaFile ? input.mediaType ?? null : null,
        story_tag: input.storyTag?.trim().slice(0, 32) || null,
      })
      .select('*')
      .single();
    if (error) {
      if (mediaPath) {
        try {
          await removeCommunityMedia(mediaPath);
        } catch (cleanupError) {
          throw new AggregateError(
            [new Error(`Post save failed: ${error.message}`), cleanupError],
            'Post creation failed and the uploaded media could not be cleaned up.',
          );
        }
      }
      throw new Error(`Post could not be saved: ${error.message}`);
    }
    return {
      id: data.id,
      authorId: data.author_id,
      worldType: data.world_type,
      content: data.content,
      mediaUrl,
      mediaType: data.media_type,
      storyTag: data.story_tag,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  await delay();
  const timestamp = new Date().toISOString();
  const post: Post = {
    id: `post-local-${nextPostId++}`,
    authorId: input.authorId,
    worldType: input.worldType,
    content,
    mediaUrl: input.mediaFile ? URL.createObjectURL(input.mediaFile) : input.mediaUrl ?? null,
    mediaType: input.mediaType ?? null,
    storyTag: input.storyTag?.trim().slice(0, 32) || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  postsByWorld[input.worldType].unshift(post);
  return post;
}

export async function updatePost(postId: string, authorId: string, content: string): Promise<Post> {
  const normalizedContent = content.trim();
  if (normalizedContent.length < 1 || normalizedContent.length > 2800) {
    throw new Error('Posts must contain 1 to 2,800 characters.');
  }

  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(authorId);
    const { data, error } = await getSupabaseBrowserClient()
      .from('posts')
      .update({ content: normalizedContent })
      .eq('id', postId)
      .eq('author_id', authorId)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(`Post could not be updated: ${error.message}`);
    if (!data) throw new Error('This post could not be edited.');
    const mediaUrl = data.media_url ? (await createCommunityMediaUrls([data.media_url])).get(data.media_url) ?? null : null;
    return {
      id: data.id,
      authorId: data.author_id,
      worldType: data.world_type,
      content: data.content,
      mediaUrl,
      mediaType: data.media_type,
      storyTag: data.story_tag,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  await delay();
  const post = Object.values(postsByWorld).flat().find((item) => item.id === postId);
  if (!post || post.authorId !== authorId) {
    throw new Error('This post could not be edited.');
  }

  post.content = normalizedContent;
  post.updatedAt = new Date().toISOString();
  return post;
}

export async function deletePost(postId: string, authorId: string): Promise<void> {
  if (isSupabaseCommunityStorageConfigured()) {
    await requireCommunityStorageUser(authorId);
    const client = getSupabaseBrowserClient();
    const { data, error } = await client
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', authorId)
      .select('media_url')
      .maybeSingle();
    if (error) throw new Error(`Post could not be deleted: ${error.message}`);
    if (!data) throw new Error('This post could not be deleted.');
    if (data.media_url) await removeCommunityMedia(data.media_url);
    return;
  }
  await delay();
  const worldPosts = Object.values(postsByWorld).find((items) => items.some((item) => item.id === postId && item.authorId === authorId));
  const postIndex = worldPosts?.findIndex((item) => item.id === postId && item.authorId === authorId) ?? -1;
  if (!worldPosts || postIndex < 0) {
    throw new Error('This post could not be deleted.');
  }
  worldPosts.splice(postIndex, 1);
  for (let index = likes.length - 1; index >= 0; index -= 1) {
    if (likes[index].targetId === postId) likes.splice(index, 1);
  }
  for (let index = comments.length - 1; index >= 0; index -= 1) {
    if (comments[index].targetId === postId) comments.splice(index, 1);
  }
}

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
  if (!Object.values(postsByWorld).some((items) => items.some((post) => post.id === postId))) {
    throw new Error('This post is unavailable.');
  }
  return {
    liked: likes.some((like) => like.targetId === postId && like.userId === userId),
    likesCount: likes.filter((like) => like.targetId === postId).length,
    commentsCount: comments.filter((comment) => comment.targetId === postId).length,
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
  if (!userId || !Object.values(postsByWorld).some((items) => items.some((post) => post.id === postId))) {
    throw new Error('This post is unavailable for liking.');
  }
  await delay();
  const existingIndex = likes.findIndex((like) => like.targetId === postId && like.userId === userId);
  if (existingIndex >= 0) {
    likes.splice(existingIndex, 1);
  } else {
    likes.push({
      id: `post-like-${nextEngagementId++}`,
      targetType: 'post',
      targetId: postId,
      userId,
      createdAt: new Date().toISOString(),
    });
  }
  return { liked: existingIndex < 0, count: likes.filter((like) => like.targetId === postId).length };
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
  if (!Object.values(postsByWorld).some((items) => items.some((post) => post.id === postId))) {
    throw new Error('Comments for this post are unavailable.');
  }
  await delay();
  return comments.filter((comment) => comment.targetId === postId).map((comment) => ({ ...comment }));
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
  if (!Object.values(postsByWorld).some((items) => items.some((post) => post.id === postId))) {
    throw new Error('Comments for this post are unavailable.');
  }
  await delay();
  const comment: SocialComment = {
    id: `post-comment-${nextEngagementId++}`,
    targetType: 'post',
    targetId: postId,
    authorId,
    body: normalizedBody,
    createdAt: new Date().toISOString(),
  };
  comments.push(comment);
  return { ...comment };
}

export function removeUserFeedData(userId: string): void {
  const removedPostIds = new Set(Object.values(postsByWorld).flat().filter((post) => post.authorId === userId).map((post) => post.id));
  for (const worldPosts of Object.values(postsByWorld)) {
    for (let index = worldPosts.length - 1; index >= 0; index -= 1) {
      if (worldPosts[index].authorId === userId) worldPosts.splice(index, 1);
    }
  }
  for (let index = likes.length - 1; index >= 0; index -= 1) {
    if (likes[index].userId === userId || removedPostIds.has(likes[index].targetId)) likes.splice(index, 1);
  }
  for (let index = comments.length - 1; index >= 0; index -= 1) {
    if (comments[index].authorId === userId || removedPostIds.has(comments[index].targetId)) comments.splice(index, 1);
  }
}