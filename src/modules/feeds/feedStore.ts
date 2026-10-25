import type { Post, PostMediaType, SocialComment, SocialLike } from '@/types/database';

/**
 * Browser-local demo store used only when Supabase is not configured.
 * Keeping the mutable state here prevents pagination, post mutations, and
 * engagement code from owning each other's counters.
 */
export const feedStore = {
  posts: [
    {
      id: 'post-demo-1',
      authorId: 'community-member',
      content: 'A quiet moment can change the shape of a whole day.',
      mediaUrl: null,
      mediaType: null,
      storyTag: null,
      createdAt: '2026-10-08T09:00:00.000Z',
      updatedAt: '2026-10-08T09:00:00.000Z',
    },
  ] as Post[],
  likes: [] as SocialLike[],
  comments: [] as SocialComment[],
  nextPostId: 1,
  nextEngagementId: 1,
};

export function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 60));
}

export function validateAttachment(
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
