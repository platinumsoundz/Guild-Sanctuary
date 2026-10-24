'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Post } from '@/types/database';
import {
  createPost,
  deletePost,
  fetchFeedPage,
  updatePost,
  type CreatePostInput,
  type FeedCursor,
} from './service';

interface UseFeedResult {
  posts: Post[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  nextCursor: FeedCursor | null;
  loadMore: () => Promise<void>;
  publishPost: (input: Pick<CreatePostInput, 'content' | 'mediaUrl' | 'mediaType' | 'mediaFile' | 'storyTag'>) => Promise<void>;
  editPost: (postId: string, content: string) => Promise<void>;
  removePost: (postId: string) => Promise<void>;
}

export function useFeed(authorId: string | null): UseFeedResult {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<FeedCursor | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setLoadMoreError(null);
    try {
      const page = await fetchFeedPage();
      setPosts(page.posts);
      setNextCursor(page.nextCursor);
    } catch {
      setError('The feed could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await fetchFeedPage({ cursor: nextCursor });
      setPosts((currentPosts) => {
        const existingIds = new Set(currentPosts.map((post) => post.id));
        return [...currentPosts, ...page.posts.filter((post) => !existingIds.has(post.id))];
      });
      setNextCursor(page.nextCursor);
    } catch {
      setLoadMoreError('More posts could not be loaded.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, nextCursor]);

  const publishPost = async (input: Pick<CreatePostInput, 'content' | 'mediaUrl' | 'mediaType' | 'mediaFile' | 'storyTag'>) => {
    if (!authorId) {
      throw new Error('Sign in before creating a post.');
    }

    const post = await createPost({ ...input, authorId });
    setPosts((currentPosts) => [post, ...currentPosts.filter((currentPost) => currentPost.id !== post.id)]);
  };

  const editPost = async (postId: string, content: string) => {
    if (!authorId) {
      throw new Error('Sign in before editing a post.');
    }

    const updatedPost = await updatePost(postId, authorId, content);
    setPosts((currentPosts) => currentPosts.map((post) => post.id === postId ? updatedPost : post));
  };

  const removePost = async (postId: string) => {
    if (!authorId) {
      throw new Error('Sign in before deleting a post.');
    }

    await deletePost(postId, authorId);
    setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId));
  };

  return {
    posts,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    nextCursor,
    loadMore,
    publishPost,
    editPost,
    removePost,
  };
}
