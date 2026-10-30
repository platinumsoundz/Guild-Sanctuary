'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Heart, MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import type { WorldType } from '@/types/database';
import { ReportContentButton } from '@/modules/moderation';
import type { ShortVideo, SocialComment } from '@/types/database';
import { addShortComment, createShortVideo, deleteShortComment, deleteShortVideo, fetchShortComments, fetchShortVideos, getShortEngagement, toggleShortLike, updateShortComment } from '../service';
import { getCommentEngagement, toggleCommentLike } from '@/modules/feeds/commentEngagement';
import styles from './ShortsFeed.module.css';

interface ShortState {
  liked: boolean;
  likesCount: number;
  commentsCount: number;
}

export function ShortsFeed({ worldType = 'sanctuary' }: { worldType?: WorldType }) {
  const { currentUser, isGuest } = useAppContext();
  const viewerId = currentUser?.user.id ?? '';
  const canEngage = Boolean(viewerId) && !isGuest;
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [engagement, setEngagement] = useState<Record<string, ShortState>>({});
  const [commentsByVideo, setCommentsByVideo] = useState<Record<string, SocialComment[]>>({});
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [commentEngagement, setCommentEngagement] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [pendingCommentLikes, setPendingCommentLikes] = useState<Record<string, boolean>>({});
  const pendingCommentLikesRef = useRef(new Set<string>());
  const [captionDraft, setCaptionDraft] = useState('');
  const [videoDraft, setVideoDraft] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoFileName, setVideoFileName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const recordingPreviewRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  useEffect(() => () => {
    recorderRef.current?.stop();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => () => {
    if (videoDraft) URL.revokeObjectURL(videoDraft);
  }, [videoDraft]);

  useEffect(() => {
    const preview = recordingPreviewRef.current;
    if (!preview) return;
    preview.srcObject = isRecording ? recordingStreamRef.current : null;
    if (isRecording) void preview.play().catch(() => undefined);
    return () => { preview.srcObject = null; };
  }, [isRecording]);

  useEffect(() => {
    let cancelled = false;
    fetchShortVideos(worldType).then(async (items) => {
      if (cancelled) return;
      const stats = await Promise.all(items.map(async (item) => [
        item.id,
        await getShortEngagement(item.id, viewerId),
      ] as const));
      if (cancelled) return;
      setVideos(items);
      setEngagement(Object.fromEntries(stats));
    }).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Short videos could not be loaded.');
    });
    return () => { cancelled = true; };
  }, [viewerId]);

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
    if (!canEngage) {
      setError('Sign in with your Sanctuary account to like Shorts.');
      return;
    }
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
    if (!canEngage) {
      setError('Sign in with your Sanctuary account to view and comment on Shorts.');
      return;
    }
    const nextId = openCommentsId === videoId ? null : videoId;
    setOpenCommentsId(nextId);
    if (nextId && !commentsByVideo[nextId]) {
      try {
        const items = await fetchShortComments(nextId);
        setCommentsByVideo((current) => ({ ...current, [nextId]: items }));
        const engagement = await Promise.all(items.map(async (comment) => [
          comment.id,
          await getCommentEngagement(comment.id, viewerId),
        ] as const));
        setCommentEngagement((current) => ({ ...current, ...Object.fromEntries(engagement) }));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Comments could not be loaded.');
      }
    }
  };

  const handleCommentLike = async (commentId: string) => {
    if (!canEngage || !commentId || pendingCommentLikesRef.current.has(commentId)) return;
    pendingCommentLikesRef.current.add(commentId);
    setPendingCommentLikes((current) => ({ ...current, [commentId]: true }));
    try {
      const result = await toggleCommentLike(commentId, viewerId);
      setCommentEngagement((current) => ({ ...current, [commentId]: result }));
      setError(null);
    } catch (likeError) {
      setError(likeError instanceof Error ? likeError.message : 'Comment reaction could not be saved.');
    } finally {
      pendingCommentLikesRef.current.delete(commentId);
      setPendingCommentLikes((current) => ({ ...current, [commentId]: false }));
    }
  };

  const handleComment = async (event: FormEvent<HTMLFormElement>, videoId: string) => {
    event.preventDefault();
    if (!canEngage) {
      setError('Sign in with your Sanctuary account to comment on Shorts.');
      return;
    }
    try {
      const comment = await addShortComment(videoId, viewerId, draft);
      setCommentsByVideo((current) => ({ ...current, [videoId]: [...(current[videoId] ?? []), comment] }));
      setCommentEngagement((current) => ({ ...current, [comment.id]: { liked: false, count: 0 } }));
      setEngagement((current) => ({ ...current, [videoId]: { ...current[videoId], commentsCount: (current[videoId]?.commentsCount ?? 0) + 1 } }));
      setDraft('');
      setError(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Your comment could not be posted.');
    }
  };


  const saveShortCommentEdit = async (videoId: string, commentId: string) => {
    try {
      const updated = await updateShortComment(commentId, viewerId, editingBody);
      setCommentsByVideo((current) => ({
        ...current,
        [videoId]: (current[videoId] ?? []).map((comment) => comment.id === commentId ? updated : comment),
      }));
      setEditingCommentId(null);
      setEditingBody('');
      setError(null);
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : 'Your comment could not be updated.');
    }
  };

  const removeShortComment = async (videoId: string, commentId: string) => {
    if (!window.confirm('Delete your comment? This cannot be undone.')) return;
    try {
      await deleteShortComment(commentId, viewerId, worldType);
      setCommentsByVideo((current) => ({
        ...current,
        [videoId]: (current[videoId] ?? []).filter((comment) => comment.id !== commentId),
      }));
      setEngagement((current) => ({
        ...current,
        [videoId]: { ...current[videoId], commentsCount: Math.max(0, (current[videoId]?.commentsCount ?? 0) - 1) },
      }));
      setError(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Your comment could not be deleted.');
    }
  };

  const handleVideoFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setError('Choose a video file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Short videos must be 5 MB or smaller.');
      return;
    }
    try {
      setVideoDraft(URL.createObjectURL(file));
      setVideoFile(file);
      setVideoFileName(file.name);
      setError(null);
    } catch {
      setError('This video could not be read.');
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Video recording is not supported by this browser. Choose a video file instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
        .find((candidate) => MediaRecorder.isTypeSupported(candidate));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setError('The browser could not record this video.');
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'video/webm' });
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        if (blob.size > 5 * 1024 * 1024) {
          setError('Recorded videos must be 5 MB or smaller. Record a shorter clip.');
          return;
        }
        const file = new File([blob], 'recorded-clip.webm', { type: blob.type || 'video/webm' });
        setVideoDraft(URL.createObjectURL(file));
        setVideoFile(file);
            setVideoFileName('Recorded clip');
            setError(null);
      };
      recorder.start(500);
      setIsRecording(true);
      setError(null);
    } catch (recordingError) {
      setError(recordingError instanceof Error
        ? `Camera and microphone access failed: ${recordingError.message}`
        : 'Camera and microphone access failed.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const handlePublishVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEngage) {
      setError('Sign in with your Sanctuary account to publish a Short.');
      return;
    }
    if (!videoDraft || !videoFile) {
      setError('Choose a video file before publishing.');
      return;
    }
    try {
      const video = await createShortVideo({
        authorId: viewerId,
        worldType,
        videoFile,
        caption: captionDraft,
      });
      setVideos((current) => [video, ...current]);
      setEngagement((current) => ({ ...current, [video.id]: { liked: false, likesCount: 0, commentsCount: 0 } }));
      setVideoDraft('');
      setVideoFile(null);
      setVideoFileName('');
      setCaptionDraft('');
      setError(null);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Your video could not be published.');
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!canEngage) {
      setError('Sign in with your Sanctuary account to delete a Short.');
      return;
    }
    if (!window.confirm('Delete this video and its uploaded media? This cannot be undone.')) return;
    try {
      await deleteShortVideo(videoId, viewerId, worldType);
      setVideos((current) => current.filter((video) => video.id !== videoId));
      setEngagement((current) => {
        const next = { ...current };
        delete next[videoId];
        return next;
      });
      setCommentsByVideo((current) => {
        const next = { ...current };
        delete next[videoId];
        return next;
      });
      setError(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'The video could not be deleted.');
    }
  };

  return (
    <main className={styles.page} aria-label="Short-form video feed">
      <header className={styles.header}>
        <div><p>COMMUNITY CLIPS</p><h1>Shorts</h1></div>
        <span>Scroll or swipe to explore</span>
      </header>
      {canEngage ? (
        <form className={styles.videoComposer} onSubmit={(event) => void handlePublishVideo(event)}>
          <label>
            <span>Video caption</span>
            <input value={captionDraft} onChange={(event) => setCaptionDraft(event.currentTarget.value)} maxLength={500} placeholder="Add a caption…" />
          </label>
          <label className={styles.videoPicker}>
            <span>{videoFileName || 'Choose a short video (up to 5 MB)'}</span>
            <input type="file" accept="video/*" onChange={(event) => void handleVideoFile(event)} />
          </label>
          <button type="button" onClick={() => void (isRecording ? stopRecording() : startRecording())}>
            {isRecording ? 'Stop recording' : 'Record a clip'}
          </button>
          {isRecording && <p className={styles.recordingStatus} role="status">Recording… camera and microphone are active.</p>}
          {isRecording && <video ref={recordingPreviewRef} className={styles.videoDraftPreview} autoPlay muted playsInline />}
          {videoDraft && !isRecording && <video className={styles.videoDraftPreview} src={videoDraft} controls muted playsInline />}
          <button type="submit" disabled={!videoDraft}>Publish short</button>
        </form>
      ) : (
        <p className={styles.empty} role="status">Sign in with your Sanctuary account to publish, like, or comment on Shorts.</p>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.feed} ref={feedRef}>
        {videos.map((video, index) => {
          const stats = engagement[video.id] ?? { liked: false, likesCount: 0, commentsCount: 0 };
          const isCommentsOpen = openCommentsId === video.id;
          return (
            <article className={styles.clip} key={video.id}>
              <video className={styles.video} src={video.videoUrl} controls muted playsInline preload={index === 0 ? 'metadata' : 'none'} aria-label={`Short video: ${video.caption}`} />
              <div className={styles.scrim} aria-hidden="true" />
              <div className={styles.caption}>
                <span>@{video.authorId}</span>
                <p>{video.caption}</p>
              </div>
              <div className={styles.actions}>
                <button type="button" disabled={!canEngage} aria-pressed={stats.liked} aria-label={`${stats.liked ? 'Unlike' : 'Like'} short, ${stats.likesCount} likes`} onClick={() => void handleLike(video.id)}>
                  <Heart fill={stats.liked ? 'currentColor' : 'none'} />
                  <span>{stats.likesCount}</span>
                </button>
                <button type="button" disabled={!canEngage} aria-expanded={isCommentsOpen} aria-label={`Comments, ${stats.commentsCount}`} onClick={() => void showComments(video.id)}>
                  <MessageCircle />
                  <span>{stats.commentsCount}</span>
                </button>
                {video.authorId === viewerId && (
                  <button type="button" disabled={!canEngage} aria-label="Delete your short video" onClick={() => void handleDeleteVideo(video.id)}>
                    <Trash2 />
                    <span>Delete</span>
                  </button>
                )}
              </div>
              <ReportContentButton targetType="short" targetId={video.id} />
              {isCommentsOpen && (
                <aside className={styles.comments} aria-label="Short video comments">
                  <h2>Comments</h2>
                  <div className={styles.commentList}>
                    {(commentsByVideo[video.id] ?? []).length ? commentsByVideo[video.id].map((comment) => (
                      <article className={styles.commentItem} key={comment.id}>
                        <p><strong>{comment.authorId === viewerId ? 'You' : comment.authorId}</strong></p>
                        {editingCommentId === comment.id ? (
                          <div className={styles.commentEdit}>
                            <textarea value={editingBody} maxLength={1000} onChange={(event) => setEditingBody(event.currentTarget.value)} aria-label="Edit your comment" />
                            <button type="button" onClick={() => void saveShortCommentEdit(video.id, comment.id)}>Save</button>
                            <button type="button" onClick={() => { setEditingCommentId(null); setEditingBody(''); }}>Cancel</button>
                          </div>
                        ) : <p>{comment.body}</p>}
                        <div className={styles.commentTools}>
                          <button type="button" disabled={Boolean(pendingCommentLikes[comment.id])} aria-busy={Boolean(pendingCommentLikes[comment.id])} aria-pressed={commentEngagement[comment.id]?.liked ?? false} onClick={() => void handleCommentLike(comment.id)} aria-label={`${commentEngagement[comment.id]?.liked ? 'Unlike' : 'Like'} comment`}>
                            <Heart size={12} fill={commentEngagement[comment.id]?.liked ? 'currentColor' : 'none'} /> Like <span>{commentEngagement[comment.id]?.count ?? 0}</span>
                          </button>
                          {comment.authorId === viewerId && editingCommentId !== comment.id && <>
                            <button type="button" onClick={() => { setEditingCommentId(comment.id); setEditingBody(comment.body); }} aria-label="Edit your comment"><Pencil size={12} /> Edit</button>
                            <button type="button" onClick={() => void removeShortComment(video.id, comment.id)} aria-label="Delete your comment"><Trash2 size={12} /> Delete</button>
                          </>}
                          <ReportContentButton targetType="comment" targetId={comment.id} />
                        </div>
                      </article>
                    )) : <p>Be the first to comment.</p>}
                  </div>
                  <form onSubmit={(event) => void handleComment(event, video.id)}>
                    <input value={draft} onChange={(event) => setDraft(event.currentTarget.value)} maxLength={1000} placeholder="Add a comment…" required disabled={!canEngage} />
                    <button type="submit" disabled={!canEngage}>Post</button>
                  </form>
                </aside>
              )}
            </article>
          );
        })}
        {videos.length === 0 && <p className={styles.empty}>No short videos yet.</p>}
      </div>
    </main>
  );
}
