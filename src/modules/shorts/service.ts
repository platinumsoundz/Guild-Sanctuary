import type { WorldType } from '@/types';
import type { ShortVideo, SocialComment, SocialLike } from '@/types/database';

const videos: ShortVideo[] = [
  {
    id: 'short-demo-1',
    authorId: 'community-creator',
    worldType: 'guild',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    caption: 'A quick escape with the crew. What should we play next?',
    createdAt: '2026-10-08T12:00:00.000Z',
  },
  {
    id: 'short-demo-2',
    authorId: 'community-creator',
    worldType: 'sanctuary',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    caption: 'A little reminder to take the scenic route today.',
    createdAt: '2026-10-08T11:00:00.000Z',
  },
];

const likes: SocialLike[] = [];
const comments: SocialComment[] = [];
let nextId = 1;

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 40));
}

export async function fetchShortVideos(worldType?: WorldType): Promise<ShortVideo[]> {
  await delay();
  return videos
    .filter((video) => !worldType || video.worldType === worldType)
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function toggleShortLike(shortId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  if (!userId || !videos.some((video) => video.id === shortId)) {
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
  if (!videos.some((video) => video.id === shortId)) {
    throw new Error('Comments for this short video are unavailable.');
  }
  await delay();
  return comments.filter((comment) => comment.targetId === shortId).map((comment) => ({ ...comment }));
}

export async function addShortComment(shortId: string, authorId: string, body: string): Promise<SocialComment> {
  const normalizedBody = body.trim();
  if (!authorId || !videos.some((video) => video.id === shortId) || normalizedBody.length < 1 || normalizedBody.length > 1000) {
    throw new Error('Comments must contain 1 to 1,000 characters.');
  }
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

export function getShortEngagement(shortId: string, userId: string) {
  return {
    liked: likes.some((like) => like.targetId === shortId && like.userId === userId),
    likesCount: likes.filter((like) => like.targetId === shortId).length,
    commentsCount: comments.filter((comment) => comment.targetId === shortId).length,
  };
}

export function removeUserShortData(userId: string): void {
  const removedShortIds = new Set(videos.filter((video) => video.authorId === userId).map((video) => video.id));
  for (let index = videos.length - 1; index >= 0; index -= 1) {
    if (videos[index].authorId === userId) videos.splice(index, 1);
  }
  for (let index = likes.length - 1; index >= 0; index -= 1) {
    if (likes[index].userId === userId || removedShortIds.has(likes[index].targetId)) likes.splice(index, 1);
  }
  for (let index = comments.length - 1; index >= 0; index -= 1) {
    if (comments[index].authorId === userId || removedShortIds.has(comments[index].targetId)) comments.splice(index, 1);
  }
}
