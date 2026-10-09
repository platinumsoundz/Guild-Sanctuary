'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WorldType } from '@/types';
import type { Post } from '@/types/database';
import { createPost, deletePost, fetchFeed, updatePost, type CreatePostInput } from './service';

interface UseFeedResult {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  publishPost: (input: Pick<CreatePostInput, 'content' | 'mediaUrl' | 'mediaType' | 'mediaFile' | 'storyTag'>) => Promise<void>;
  editPost: (postId: string, content: string) => Promise<void>;
  removePost: (postId: string) => Promise<void>;
}

export function useFeed(worldType: WorldType, authorId: string | null): UseFeedResult {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setPosts(await fetchFeed(worldType));
    } catch {
      setError('The feed could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [worldType]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const publishPost = async (input: Pick<CreatePostInput, 'content' | 'mediaUrl' | 'mediaType' | 'mediaFile' | 'storyTag'>) => {
    if (!authorId) {
      throw new Error('Sign in before creating a post.');
    }

    const post = await createPost({ ...input, authorId, worldType });
    setPosts((currentPosts) => [post, ...currentPosts]);
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

  return { posts, isLoading, error, publishPost, editPost, removePost };
}