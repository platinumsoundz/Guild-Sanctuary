'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Heart, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { ReportContentButton } from '@/modules/moderation';
import type { SocialComment } from '@/types/database';
import { addPostComment, deletePostComment, fetchPostComments, getPostEngagement, togglePostLike, updatePostComment } from '../service';
import styles from './PostEngagement.module.css';

interface PostEngagementProps {
  postId: string;
  userId: string;
}

export function PostEngagement({ postId, userId }: PostEngagementProps) {
  const [stats, setStats] = useState({ liked: false, likesCount: 0, commentsCount: 0 });
  const [comments, setComments] = useState<SocialComment[]>([]);
  const [draft, setDraft] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');

  useEffect(() => {
    let cancelled = false;
    getPostEngagement(postId, userId).then((value) => {
      if (!cancelled) setStats(value);
    }).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Post reactions could not be loaded.');
    });
    return () => { cancelled = true; };
  }, [postId, userId]);

  const toggleComments = async () => {
    const nextIsOpen = !isOpen;
    setIsOpen(nextIsOpen);
    if (nextIsOpen && comments.length === 0) {
      try {
        setComments(await fetchPostComments(postId));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Comments could not be loaded.');
      }
    }
  };

  const handleLike = async () => {
    try {
      const result = await togglePostLike(postId, userId);
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

  const handleComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const comment = await addPostComment(postId, userId, draft);
      setComments((current) => [...current, comment]);
      setStats((current) => ({ ...current, commentsCount: current.commentsCount + 1 }));
      setDraft('');
      setError(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your comment could not be posted.');
    }
  };

  return (
    <section className={styles.engagement} aria-label="Post reactions">
      <div className={styles.actions}>
        <button type="button" aria-pressed={stats.liked} onClick={() => void handleLike()}>
          <Heart size={15} fill={stats.liked ? 'currentColor' : 'none'} /> Like <span>{stats.likesCount}</span>
        </button>
        <button type="button" aria-expanded={isOpen} onClick={() => void toggleComments()}>
          <MessageCircle size={15} /> Comments <span>{stats.commentsCount}</span>
        </button>
      </div>
      {isOpen && (
        <div className={styles.commentPanel}>
          {comments.length === 0 ? <p className={styles.empty}>No comments yet.</p> : comments.map((comment) => (
            <article className={styles.commentItem} key={comment.id}>
              <p className={styles.comment}><strong>{comment.authorId === userId ? 'You' : comment.authorId}</strong></p>
              {editingCommentId === comment.id ? (
                <div className={styles.commentEdit}>
                  <textarea value={editingBody} maxLength={1000} onChange={(event) => setEditingBody(event.currentTarget.value)} aria-label="Edit your comment" />
                  <button type="button" onClick={() => void saveCommentEdit(comment.id)}>Save</button>
                  <button type="button" onClick={() => { setEditingCommentId(null); setEditingBody(''); }}>Cancel</button>
                </div>
              ) : <p className={styles.commentBody}>{comment.body}</p>}
              <div className={styles.commentTools}>
                {comment.authorId === userId && editingCommentId !== comment.id && <>
                  <button type="button" onClick={() => { setEditingCommentId(comment.id); setEditingBody(comment.body); }} aria-label="Edit your comment"><Pencil size={12} /> Edit</button>
                  <button type="button" onClick={() => void removeComment(comment.id)} aria-label="Delete your comment"><Trash2 size={12} /> Delete</button>
                </>}
                <ReportContentButton targetType="comment" targetId={comment.id} />
              </div>
            </article>
          ))}
          <form onSubmit={handleComment}>
            <input value={draft} onChange={(event) => setDraft(event.currentTarget.value)} maxLength={1000} placeholder="Write a comment…" required />
            <button type="submit">Post</button>
          </form>
        </div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  );
}
