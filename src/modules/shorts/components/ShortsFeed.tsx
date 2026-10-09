'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { AdPlacement } from '@/modules/ads';
import { ReportContentButton } from '@/modules/moderation';
import type { ShortVideo, SocialComment } from '@/types/database';
import { addShortComment, createShortVideo, fetchShortComments, fetchShortVideos, getShortEngagement, toggleShortLike } from '../service';
import styles from './ShortsFeed.module.css';

interface ShortState {
  liked: boolean;
  likesCount: number;
  commentsCount: number;
}

export function ShortsFeed() {
  const { activeWorld, currentUser } = useAppContext();
  const isPaidMember = currentUser?.profile.vipTier !== undefined && currentUser.profile.vipTier !== 'free';
  const viewerId = currentUser?.user.id ?? '';
  const [videos, setVideos] = useState<ShortVideo[]>([]);
  const [engagement, setEngagement] = useState<Record<string, ShortState>>({});
  const [commentsByVideo, setCommentsByVideo] = useState<Record<string, SocialComment[]>>({});
  const [openCommentsId, setOpenCommentsId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [captionDraft, setCaptionDraft] = useState('');
  const [videoDraft, setVideoDraft] = useState('');
  const [videoFileName, setVideoFileName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);

  useEffect(() => () => {
    recorderRef.current?.stop();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

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
      setVideoDraft(await readFileAsDataUrl(file));
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
        void readBlobAsDataUrl(blob)
          .then((dataUrl) => {
            setVideoDraft(dataUrl);
            setVideoFileName('Recorded clip');
            setError(null);
          })
          .catch(() => setError('The recorded video could not be prepared.'));
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
    if (!viewerId || !videoDraft) {
      setError('Choose a video file before publishing.');
      return;
    }
    try {
      const video = await createShortVideo({
        authorId: viewerId,
        worldType: activeWorld,
        videoUrl: videoDraft,
        caption: captionDraft,
      });
      setVideos((current) => [video, ...current]);
      setEngagement((current) => ({ ...current, [video.id]: { liked: false, likesCount: 0, commentsCount: 0 } }));
      setVideoDraft('');
      setVideoFileName('');
      setCaptionDraft('');
      setError(null);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Your video could not be published.');
    }
  };

  return (
    <main className={styles.page} aria-label="Short-form video feed">
      <header className={styles.header}>
        <div><p>COMMUNITY CLIPS</p><h1>Shorts</h1></div>
        <span>Scroll or swipe to explore</span>
      </header>
      <form className={styles.videoComposer} onSubmit={(event) => void handlePublishVideo(event)}>
        <label>
          <span>Video caption</span>
          <input value={captionDraft} onChange={(event) => setCaptionDraft(event.currentTarget.value)} maxLength={500} placeholder="Add a caption for this world…" />
        </label>
        <label className={styles.videoPicker}>
          <span>{videoFileName || 'Choose a short video (up to 5 MB)'}</span>
          <input type="file" accept="video/*" onChange={(event) => void handleVideoFile(event)} />
        </label>
        <button type="button" onClick={() => void (isRecording ? stopRecording() : startRecording())}>
          {isRecording ? 'Stop recording' : 'Record a clip'}
        </button>
        {isRecording && <p className={styles.recordingStatus} role="status">Recording… camera and microphone are active.</p>}
        {videoDraft && <video className={styles.videoDraftPreview} src={videoDraft} controls muted playsInline />}
        <button type="submit" disabled={!videoDraft}>Publish short</button>
      </form>
      <AdPlacement isPaidMember={isPaidMember} placement="shorts" />
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
              <ReportContentButton targetType="short" targetId={video.id} />
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Invalid file data.'));
    reader.onerror = () => reject(new Error('File read failed.'));
    reader.readAsDataURL(file);
  });
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Invalid video data.'));
    reader.onerror = () => reject(new Error('Video read failed.'));
    reader.readAsDataURL(blob);
  });
}
