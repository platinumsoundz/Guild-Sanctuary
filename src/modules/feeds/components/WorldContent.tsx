'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { WorldType } from '@/types';
import type { PostMediaType, PublicProfile } from '@/types/database';
import { useAppContext } from '@/context/AppContext';
import { getLocalPublicProfileById } from '@/modules/auth';
import { useFeed } from '@/modules/feeds';
import { AdPlacement } from '@/modules/ads';
import { ReportContentButton } from '@/modules/moderation';
import { PostEngagement } from './PostEngagement';
import styles from './WorldContent.module.css';

interface WorldContentProps {
  worldType: WorldType;
}

const content: Record<WorldType, { heading: string; message: string; mark: string }> = {
  sanctuary: {
    heading: 'A little room to begin',
    message: 'Thoughts and reflections from your community will find a home here.',
    mark: 'S',
  },
  guild: {
    heading: 'The hall is yours',
    message: 'Stories, sessions, and updates from your crew will gather here.',
    mark: 'G',
  },
};

export function WorldContent({ worldType }: WorldContentProps) {
  const view = content[worldType];
  const { currentUser } = useAppContext();
  const isPaidMember = currentUser?.profile.vipTier !== undefined && currentUser.profile.vipTier !== 'free';
  const { posts, isLoading, error, publishPost, editPost, removePost } = useFeed(worldType, currentUser?.user.id ?? null);
  const [draft, setDraft] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentType, setAttachmentType] = useState<PostMediaType | ''>('');
  const [attachmentName, setAttachmentName] = useState('');
  const [storyTag, setStoryTag] = useState('');
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [authors, setAuthors] = useState<Record<string, PublicProfile>>({});
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const uniqueAuthorIds = [...new Set(posts.map((post) => post.authorId))];
    const profiles = uniqueAuthorIds.flatMap((authorId) => {
      try {
        const profile = getLocalPublicProfileById(authorId);
        return profile ? [[authorId, profile] as const] : [];
      } catch {
        return [];
      }
    });

    if (!cancelled) {
      setAuthors(Object.fromEntries(profiles));
    }
    return () => {
      cancelled = true;
    };
  }, [posts]);

  const handlePublish = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    try {
      await publishPost({
        content: draft,
        mediaUrl: attachmentUrl.trim() || null,
        mediaType: attachmentUrl.trim() ? attachmentType || null : null,
        storyTag: storyTag || null,
      });
      setDraft('');
      setAttachmentUrl('');
      setAttachmentType('');
      setAttachmentName('');
      setStoryTag('');
      setAttachmentError(null);
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : 'Post could not be published.');
    }
  };

  const handleAttachmentFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) {
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isAudio = file.type.startsWith('audio/');
    const isVideo = file.type.startsWith('video/');
    const maxBytes = isImage ? 2 * 1024 * 1024 : 5 * 1024 * 1024;

    if (!isImage && !isAudio && !isVideo) {
      setAttachmentError('Choose an image, audio, or video file.');
      return;
    }
    if (file.size > maxBytes) {
      setAttachmentError(isImage ? 'Images must be 2 MB or smaller.' : 'Audio and video files must be 5 MB or smaller.');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAttachmentUrl(dataUrl);
      setAttachmentType(isAudio ? 'audio' : isVideo ? 'video' : 'image');
      setAttachmentName(file.name);
      setAttachmentError(null);
    } catch {
      setAttachmentError('This attachment could not be read.');
    }
  };

  const handleEdit = async (postId: string) => {
    setActionError(null);
    try {
      await editPost(postId, editingContent);
      setEditingPostId(null);
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : 'Post could not be updated.');
    }
  };

  const handleDelete = async (postId: string) => {
    setActionError(null);
    try {
      await removePost(postId);
    } catch (submitError) {
      setActionError(submitError instanceof Error ? submitError.message : 'Post could not be deleted.');
    }
  };

  return (
    <section className={styles.content} aria-live="polite" aria-labelledby="feed-heading">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.sectionEyebrow}>COMMUNITY</p>
          <h2 id="feed-heading">Your feed</h2>
        </div>
        <span className={styles.sortLabel}>LATEST</span>
      </div>
      <form className={`${styles.composer} w-full min-w-0 max-w-full`} onSubmit={handlePublish}>
        <label className={styles.composerLabel} htmlFor="post-content">Share with this world</label>
        <textarea
          className="w-full max-w-full"
          id="post-content"
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          maxLength={2800}
          placeholder={worldType === 'sanctuary' ? 'A reflection, thought, or moment...' : 'Share a story or rally your crew...'}
        />
        <div className={styles.attachmentControls}>
          <label className={styles.uploadButton}>
            <span>{attachmentName ? `Change media: ${attachmentName}` : 'Add an image, audio, or video'}</span>
            <input type="file" accept="image/*,video/*,audio/*" onChange={(event) => void handleAttachmentFile(event)} />
          </label>
          {attachmentName && (
            <button
              className={styles.textButton}
              type="button"
              onClick={() => {
                setAttachmentUrl('');
                setAttachmentType('');
                setAttachmentName('');
              }}
            >
              Remove media
            </button>
          )}
        </div>
        <label className={styles.storyTagField}>
          <span>Story tag</span>
          <select value={storyTag} onChange={(event) => setStoryTag(event.currentTarget.value)}>
            <option value="">No tag</option>
            <option value="Reflection">Reflection</option>
            <option value="Question">Question</option>
            <option value="Story">Story</option>
            <option value="Looking for group">Looking for group</option>
          </select>
        </label>
        {(attachmentError || actionError) && <p className={styles.error} role="alert">{attachmentError ?? actionError}</p>}
        {attachmentUrl.startsWith('data:') && <p className={styles.attachmentName}>Local {attachmentType} selected: {attachmentName}</p>}
        <div className={styles.composerFooter}>
          <span>{draft.length}/2800</span>
          <button className={styles.actionButton} type="submit">Publish</button>
        </div>
      </form>
      <AdPlacement isPaidMember={isPaidMember} placement="feed" />
      {error && <p className={styles.error} role="alert">{error}</p>}
      {isLoading && <p className={styles.feedStatus}>Loading your feed...</p>}
      {!isLoading && posts.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyMark} aria-hidden="true">{view.mark}</span>
          <div>
            <h3>{view.heading}</h3>
            <p>{view.message}</p>
          </div>
          <span className={styles.worldLabel}>{worldType === 'sanctuary' ? 'SANCTUARY' : 'GUILD HALL'}</span>
        </div>
      )}
      {!isLoading && posts.length > 0 && (
        <div className={styles.postList}>
          {posts.map((post) => (
            <article className={styles.post} key={post.id}>
              <div className={styles.postAvatar} aria-hidden="true">
                {authors[post.authorId]?.avatarUrl ? <img src={authors[post.authorId].avatarUrl ?? undefined} alt="" /> : (authors[post.authorId]?.displayName ?? (post.authorId === currentUser?.user.id ? currentUser.profile.displayName : 'Community member')).slice(0, 1).toUpperCase()}
              </div>
              <div className={styles.postBody}>
                <div className={styles.postMeta}>
                  <div className={styles.postAuthor}>
                    <strong>{authors[post.authorId]?.displayName ?? (post.authorId === currentUser?.user.id ? currentUser.profile.displayName : 'Community member')}</strong>
                    <span>@{authors[post.authorId]?.username ?? (post.authorId === currentUser?.user.id ? currentUser.profile.username : 'community')}</span>
                    {post.storyTag && <span className={styles.storyTag}>{post.storyTag}</span>}
                  </div>
                  <time dateTime={post.createdAt}>{post.createdAt.replace('T', ' ').slice(0, 16)} UTC</time>
                </div>
                {editingPostId === post.id ? (
                  <div className={styles.editArea}>
                    <textarea value={editingContent} maxLength={2800} onChange={(event) => setEditingContent(event.currentTarget.value)} />
                    <button className={styles.actionButton} type="button" onClick={() => void handleEdit(post.id)}>Save</button>
                    <button className={styles.textButton} type="button" onClick={() => setEditingPostId(null)}>Cancel</button>
                  </div>
                ) : <p className={styles.postText}>{post.content}</p>}
                {post.mediaUrl && post.mediaType === 'image' && <img className={styles.postImage} src={post.mediaUrl} alt={`Image shared by ${authors[post.authorId]?.displayName ?? 'community member'}`} />}
                {post.mediaUrl && post.mediaType === 'audio' && (
                  <div className={styles.audioAttachment}>
                    <span>Audio track</span>
                    <audio controls preload="none" src={post.mediaUrl}>Your browser does not support audio playback.</audio>
                  </div>
                )}
                {post.mediaUrl && post.mediaType === 'video' && (
                  <video className={styles.postVideo} controls playsInline preload="metadata" src={post.mediaUrl}>
                    Your browser does not support video playback.
                  </video>
                )}
                <PostEngagement postId={post.id} userId={currentUser?.user.id ?? ''} />
                <ReportContentButton targetType="post" targetId={post.id} />
                {post.authorId === currentUser?.user.id && editingPostId !== post.id && (
                  <div className={styles.postActions}>
                    <button className={styles.textButton} type="button" onClick={() => {
                      setEditingPostId(post.id);
                      setEditingContent(post.content);
                    }}>Edit</button>
                    <button className={styles.textButton} type="button" onClick={() => void handleDelete(post.id)}>Delete</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
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