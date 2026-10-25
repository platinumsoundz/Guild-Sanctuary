import type { ShortVideo, SocialComment, SocialLike } from '@/types/database';

export const shortStore = {
  videos: [
    {
      id: 'short-demo-1',
      authorId: 'community-creator',
      videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      caption: 'A little reminder to take the scenic route today.',
      createdAt: '2026-10-08T11:00:00.000Z',
    },
  ] as ShortVideo[],
  likes: [] as SocialLike[],
  comments: [] as SocialComment[],
  nextId: 1,
};

export function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 40));
}

export function findShort(shortId: string): ShortVideo | undefined {
  return shortStore.videos.find((video) => video.id === shortId);
}
