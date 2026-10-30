'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Heart, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { ReportContentButton } from '@/modules/moderation';
import { getLocalPublicProfileById } from '@/modules/auth';
import type { SocialComment } from '@/types/database';
import { addPostComment, deletePostComment, fetchPostComments, getPostEngagement, togglePostLike, updatePostComment } from '../service';
import { getCommentEngagement, toggleCommentLike } from '../commentEngagement';
import styles from './PostEngagement.module.css';

interface PostEngagementProps {
  postId: string;
  userId: string;
}

export function PostEngagement({ postId, userId }: PostEngagementProps) {
  const [stats, setStats] = useState({ liked: false, likesCount: 0, commentsCount: 0 });
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [loadedCommentsForPostId, setLoadedCommentsForPostId] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [commentEngagement, setCommentEngagement] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [pendingCommentLikes, setPendingCommentLikes] = useState<Record<string, boolean>>({});
  const pendingCommentLikesRef = useRef(new Set<string>());

  useEffect(() => {
    setComments([]);
    setCommentAuthors({});
    setIsOpen(false);
    setIsLoadingComments(false);
    setLoadedCommentsForPostId(null);
    setIsSubmittingComment(false);
    setError(null);
    setEditingCommentId(null);
    setEditingBody('');
  }, [postId, userId]);

  useEffect(() => {
    let cancelled = false;
    getPostEngagement(postId, userId, worldType).then((value) => {
      if (!cancelled) setStats(value);
    }).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Post reactions could not be loaded.');
    });
    return () => { cancelled = true; };
  }, [postId, userId]);

  const toggleComments = async () => {
    if (isLoadingComments) return;
    const nextIsOpen = !isOpen;
    setIsOpen(nextIsOpen);
    if (nextIsOpen && loadedCommentsForPostId !== postId) {
      setIsLoadingComments(true);
      setError(null);
      try {
        const items = await fetchPostComments(postId, worldType);
        setComments(items);
        const authorNames = Object.fromEntries(items.flatMap((comment) => {
          if (comment.authorId === userId) return [];
          try {
            const profile = getLocalPublicProfileById(comment.authorId);
            return profile ? [[comment.authorId, profile.displayName] as const] : [];
          } catch {
            return [];
          }
        }));
        setCommentAuthors(authorNames);
        const engagement = await Promise.all(items.map(async (comment) => [
          comment.id,
          await getCommentEngagement(comment.id, userId),
        ] as const));
        setCommentEngagement((current) => ({ ...current, ...Object.fromEntries(engagement) }));
        setLoadedCommentsForPostId(postId);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Comments could not be loaded.');
      } finally {
        setIsLoadingComments(false);
      }
    }
  };

  const handleLike = async () => {
    try {
      const result = await togglePostLike(postId, userId, worldType);
      setStats((current) => ({ ...current, liked: result.liked, likesCount: result.count }));
      setError(null);
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : 'Your like could not be saved.');
    }
  };


  const saveCommentEdit = async (commentId: string) => {
    try {
      const updated = await updatePostComment(commentId, userId, editingBody);
      setComments((current) => current.map((comment) => comment.id === commentId ? updated : comment));
      setEditingCommentId(null);
      setEditingBody('');
      setError(null);
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : 'Your comment could not be updated.');
    }
  };

  const removeComment = async (commentId: string) => {
    if (!window.confirm('Delete your comment? This cannot be undone.')) return;
    try {
      await deletePostComment(commentId, userId);
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      setStats((current) => ({ ...current, commentsCount: Math.max(0, current.commentsCount - 1) }));
      setError(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Your comment could not be deleted.');
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!commentId || pendingCommentLikesRef.current.has(commentId)) return;
    pendingCommentLikesRef.current.add(commentId);
    setPendingCommentLikes((current) => ({ ...current, [commentId]: true }));
    try {
      const result = await toggleCommentLike(commentId, userId);
      setCommentEngagement((current) => ({ ...current, [commentId]: result }));
      setError(null);
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : 'Comment reaction could not be saved.');
    } finally {
      pendingCommentLikesRef.current.delete(commentId);
      setPendingCommentLikes((current) => ({ ...current, [commentId]: false }));
    }
  };

  const handleComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const comment = await addPostComment(postId, userId, body, worldType);
      setComments((current) => [...current, comment]);
      setLoadedCommentsForPostId(postId);
      setCommentEngagement((current) => ({ ...current, [comment.id]: { liked: false, count: 0 } }));
      setStats((current) => ({ ...current, commentsCount: current.commentsCount + 1 }));
      setDraft('');
      setError(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your comment could not be posted.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <section className={styles.engagement} aria-label="Post reactions">
      <div className={styles.actions}>
        <button type="button" aria-pressed={stats.liked} onClick={() => void handleLike()}>
          <Heart size={15} fill={stats.liked ? 'currentColor' : 'none'} /> Like <span>{stats.likesCount}</span>
        </button>
        <button type="button" aria-expanded={isOpen} aria-busy={isLoadingComments} disabled={isLoadingComments} onClick={() => void toggleComments()}>
          <MessageCircle size={15} /> Comments <span>{stats.commentsCount}</span>
        </button>
      </div>
      {isOpen && (
        <div className={styles.commentPanel}>
          {isLoadingComments ? <p className={styles.empty} role="status">Loading comments…</p> : comments.length === 0 && loadedCommentsForPostId === postId && !error ? <p className={styles.empty}>No comments yet.</p> : comments.map((comment) => (
            <article className={styles.commentItem} key={comment.id}>
              <p className={styles.comment}><strong>{commentAuthors[comment.authorId] ?? (comment.authorId === userId ? 'You' : 'Community member')}</strong></p>
              {editingCommentId === comment.id ? (
                <div className={styles.commentEdit}>
                  <textarea value={editingBody} maxLength={1000} onChange={(event) => setEditingBody(event.currentTarget.value)} aria-label="Edit your comment" />
                  <button type="button" onClick={() => void saveCommentEdit(comment.id)}>Save</button>
                  <button type="button" onClick={() => { setEditingCommentId(null); setEditingBody(''); }}>Cancel</button>
                </div>
              ) : <p className={styles.commentBody}>{comment.body}</p>}
              <div className={styles.commentTools}>
                <button type="button" disabled={Boolean(pendingCommentLikes[comment.id])} aria-busy={Boolean(pendingCommentLikes[comment.id])} aria-pressed={commentEngagement[comment.id]?.liked ?? false} onClick={() => void handleCommentLike(comment.id)} aria-label={`${commentEngagement[comment.id]?.liked ? 'Unlike' : 'Like'} comment`}>
                  <Heart size={12} fill={commentEngagement[comment.id]?.liked ? 'currentColor' : 'none'} /> Like <span>{commentEngagement[comment.id]?.count ?? 0}</span>
                </button>
                {comment.authorId === userId && editingCommentId !== comment.id && <>
                  <button type="button" onClick={() => { setEditingCommentId(comment.id); setEditingBody(comment.body); }} aria-label="Edit your comment"><Pencil size={12} /> Edit</button>
                  <button type="button" onClick={() => void removeComment(comment.id)} aria-label="Delete your comment"><Trash2 size={12} /> Delete</button>
                </>}
                <ReportContentButton targetType="comment" targetId={comment.id} />
              </div>
            </article>
          ))}
          <form onSubmit={handleComment}>
            <input value={draft} onChange={(event) => setDraft(event.currentTarget.value)} maxLength={1000} placeholder="Write a comment…" required disabled={isSubmittingComment} />
            <button type="submit" disabled={isSubmittingComment || !draft.trim()}>{isSubmittingComment ? 'Posting…' : 'Post'}</button>
          </form>
        </div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  );
}
