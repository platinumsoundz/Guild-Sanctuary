import type { WorldType } from '@/types';
import type { Post, PostMediaType, SocialComment, SocialLike } from '@/types/database';

export interface CreatePostInput {
  authorId: string;
  worldType: WorldType;
  content: string;
  mediaUrl?: string | null;
  mediaType?: PostMediaType | null;
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

function validateAttachment(mediaUrl: string | null | undefined, mediaType: PostMediaType | null | undefined): void {
  if (!mediaUrl && mediaType) {
    throw new Error('Choose a valid attachment before publishing.');
  }
  if (mediaUrl && mediaType !== 'image' && mediaType !== 'audio' && mediaType !== 'video') {
    throw new Error('Attachments must be an image, audio, or video file.');
  }
  if (mediaUrl && mediaUrl.length > 8_000_000) {
    throw new Error('Attachments must be smaller than 6 MB.');
  }
}

export async function fetchFeed(worldType: WorldType): Promise<Post[]> {
  await delay();
  return postsByWorld[worldType]
    .slice()
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export async function fetchPostsByAuthor(authorId: string): Promise<Post[]> {
  await delay();
  return Object.values(postsByWorld).flat()
    .filter((post) => post.authorId === authorId)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

export async function createPost(input: CreatePostInput): Promise<Post> {
  const content = input.content.trim();
  validateAttachment(input.mediaUrl, input.mediaType);
  if (!input.authorId || (content.length < 1 && !input.mediaUrl) || content.length > 2800) {
    throw new Error('Posts must contain text or an attachment, with no more than 2,800 text characters.');
  }

  await delay();
  const timestamp = new Date().toISOString();
  const post: Post = {
    id: `post-local-${nextPostId++}`,
    authorId: input.authorId,
    worldType: input.worldType,
    content,
    mediaUrl: input.mediaUrl ?? null,
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
  if (!Object.values(postsByWorld).some((items) => items.some((post) => post.id === postId))) {
    throw new Error('Comments for this post are unavailable.');
  }
  await delay();
  return comments.filter((comment) => comment.targetId === postId).map((comment) => ({ ...comment }));
}

export async function addPostComment(postId: string, authorId: string, body: string): Promise<SocialComment> {
  const normalizedBody = body.trim();
  if (!authorId || !Object.values(postsByWorld).some((items) => items.some((post) => post.id === postId)) || normalizedBody.length < 1 || normalizedBody.length > 1000) {
    throw new Error('Comments must contain 1 to 1,000 characters.');
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