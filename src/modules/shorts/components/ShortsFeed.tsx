'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import type { ShortVideo, SocialComment } from '@/types/database';
import { addShortComment, fetchShortComments, fetchShortVideos, getShortEngagement, toggleShortLike } from '../service';
import styles from './ShortsFeed.module.css';

interface ShortState {
  liked: boolean;
  likesCount: number;
  commentsCount: number;
}

export function ShortsFeed() {
  const { activeWorld, currentUser } = useAppContext();
  const viewerId = currentUser?.user.id ?? '';
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [engagement, setEngagement] = useState<Record<string, ShortState>>({});
  const [commentsByVideo, setCommentsByVideo] = useState<Record<string, SocialComment[]>>({});
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchShortVideos(activeWorld).then((items) => {
      if (cancelled) return;
      setVideos(items);
      setEngagement(Object.fromEntries(items.map((item) => [item.id, getShortEngagement(item.id, viewerId)])));
    }).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Short videos could not be loaded.');
    });
    return () => { cancelled = true; };
  }, [activeWorld, viewerId]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!(entry.target instanceof HTMLVideoElement)) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
          void entry.target.play().catch(() => {
            setError('A clip could not autoplay. Use its playback controls to start it.');
          });
        } else {
          entry.target.pause();
        }
      });
    }, { root: feed, threshold: [0, 0.65, 1] });

    feed.querySelectorAll('video').forEach((video) => observer.observe(video));
    return () => {
      observer.disconnect();
      feed.querySelectorAll('video').forEach((video) => video.pause());
    };
  }, [videos]);

  const handleLike = async (videoId: string) => {
    try {
      const result = await toggleShortLike(videoId, viewerId);
      setEngagement((current) => ({
        ...current,
        [videoId]: { ...current[videoId], liked: result.liked, likesCount: result.count },
      }));
      setError(null);
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : 'Your like could not be saved.');
    }
  };

  const showComments = async (videoId: string) => {
    const nextId = openCommentsId === videoId ? null : videoId;
    setOpenCommentsId(nextId);
    if (nextId && !commentsByVideo[nextId]) {
      try {
        const items = await fetchShortComments(nextId);
        setCommentsByVideo((current) => ({ ...current, [nextId]: items }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Comments could not be loaded.');
      }
    }
  };

  const handleComment = async (event: FormEvent<HTMLFormElement>, videoId: string) => {
    event.preventDefault();
    try {
      const comment = await addShortComment(videoId, viewerId, draft);
      setCommentsByVideo((current) => ({ ...current, [videoId]: [...(current[videoId] ?? []), comment] }));
      setEngagement((current) => ({ ...current, [videoId]: { ...current[videoId], commentsCount: (current[videoId]?.commentsCount ?? 0) + 1 } }));
      setDraft('');
      setError(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your comment could not be posted.');
    }
  };

  return (
    <main className={styles.page} aria-label="Short-form video feed">
      <header className={styles.header}>
        <div><p>COMMUNITY CLIPS</p><h1>Shorts</h1></div>
        <span>Scroll or swipe to explore</span>
      </header>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.feed} ref={feedRef}>
        {videos.map((video, index) => {
          const stats = engagement[video.id] ?? { liked: false, likesCount: 0, commentsCount: 0 };
          const isCommentsOpen = openCommentsId === video.id;
          return (
            <article className={styles.clip} key={video.id}>
              <video className={styles.video} src={video.videoUrl} controls loop muted playsInline preload={index === 0 ? 'metadata' : 'none'} aria-label={`Short video: ${video.caption}`} />
              <div className={styles.scrim} aria-hidden="true" />
              <div className={styles.caption}>
                <span>@{video.authorId}</span>
                <p>{video.caption}</p>
              </div>
              <div className={styles.actions}>
                <button type="button" aria-pressed={stats.liked} aria-label={`${stats.liked ? 'Unlike' : 'Like'} short, ${stats.likesCount} likes`} onClick={() => void handleLike(video.id)}>
                  <Heart fill={stats.liked ? 'currentColor' : 'none'} />
                  <span>{stats.likesCount}</span>
                </button>
                <button type="button" aria-expanded={isCommentsOpen} aria-label={`Comments, ${stats.commentsCount}`} onClick={() => void showComments(video.id)}>
                  <MessageCircle />
                  <span>{stats.commentsCount}</span>
                </button>
              </div>
              {isCommentsOpen && (
                <aside className={styles.comments} aria-label="Short video comments">
                  <h2>Comments</h2>
                  <div className={styles.commentList}>
                    {(commentsByVideo[video.id] ?? []).length ? commentsByVideo[video.id].map((comment) => (
                      <p key={comment.id}><strong>{comment.authorId === viewerId ? 'You' : comment.authorId}</strong> {comment.body}</p>
                    )) : <p>Be the first to comment.</p>}
                  </div>
                  <form onSubmit={(event) => void handleComment(event, video.id)}>
                    <input value={draft} onChange={(event) => setDraft(event.currentTarget.value)} maxLength={1000} placeholder="Add a comment…" required />
                    <button type="submit">Post</button>
                  </form>
                </aside>
              )}
            </article>
          );
        })}
        {videos.length === 0 && <p className={styles.empty}>No short videos in this world yet.</p>}
      </div>
    </main>
  );
}
