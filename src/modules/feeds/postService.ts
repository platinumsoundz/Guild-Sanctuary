import type { Post, PostMediaType } from '@/types/database';
import { getSupabaseBrowserClient } from '@/services/supabase';
import {
  createCommunityMediaUrls,
  isSupabaseCommunityStorageConfigured,
  removeCommunityMedia,
  requireCommunityStorageUser,
  uploadCommunityMedia,
} from '@/services/supabase/communityMedia';
import { delay, feedStore, validateAttachment } from './feedStore';

export interface CreatePostInput {
  authorId: string;
  content: string;
  mediaUrl?: string | null;
  mediaType?: PostMediaType | null;
  mediaFile?: File | null;
  storyTag?: string | null;
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
      content: row.content,
      mediaUrl: row.media_url ? (urls.get(row.media_url) ?? null) : null,
      mediaType: row.media_type,
      storyTag: row.story_tag,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
  await delay();
  return feedStore.posts
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
    id: `post-local-${feedStore.nextPostId++}`,
    authorId: input.authorId,
    content,
    mediaUrl: input.mediaFile ? URL.createObjectURL(input.mediaFile) : input.mediaUrl ?? null,
    mediaType: input.mediaType ?? null,
    storyTag: input.storyTag?.trim().slice(0, 32) || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  feedStore.posts.unshift(post);
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
      content: data.content,
      mediaUrl,
      mediaType: data.media_type,
      storyTag: data.story_tag,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  await delay();
  const post = feedStore.posts.find((item) => item.id === postId);
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
  const postIndex = feedStore.posts.findIndex((item) => item.id === postId && item.authorId === authorId);
  if (postIndex < 0) {
    throw new Error('This post could not be deleted.');
  }
  feedStore.posts.splice(postIndex, 1);
  for (let index = feedStore.likes.length - 1; index >= 0; index -= 1) {
    if (feedStore.likes[index].targetId === postId) feedStore.likes.splice(index, 1);
  }
  for (let index = feedStore.comments.length - 1; index >= 0; index -= 1) {
    if (feedStore.comments[index].targetId === postId) feedStore.comments.splice(index, 1);
  }
}
