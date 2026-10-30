'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { PostMediaType, PublicProfile, WorldType } from '@/types/database';
import { useAppContext } from '@/context/AppContext';
import { fetchPublicProfileById } from '@/modules/profiles';
import { useFeed } from '@/modules/feeds';
import { ReportContentButton } from '@/modules/moderation';
import { PostEngagement } from './PostEngagement';
import { buildCommunityPost, type CommunityPostMode } from '@/modules/feeds/communityConnection';
import styles from './FeedContent.module.css';

function formatPostTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  const elapsed = Date.now() - date.getTime();
  if (elapsed < 0) return date.toLocaleString();
  if (elapsed < 60_000) return 'Just now';
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;
  if (elapsed < 604_800_000) return `${Math.floor(elapsed / 86_400_000)}d ago`;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const PLACEHOLDER_HEADING = 'A little room to begin';
const PLACEHOLDER_MESSAGE = 'Thoughts and reflections from your community will find a home here.';

export function FeedContent({ worldType = 'sanctuary' }: { worldType?: WorldType }) {
  const { currentUser, isGuest } = useAppContext();
  const { posts, isLoading, error, publishPost, editPost, removePost } = useFeed(isGuest ? null : currentUser?.user.id ?? null, worldType);
  const [draft, setDraft] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState<PostMediaType | ''>('');
  const [attachmentName, setAttachmentName] = useState('');
  const [storyTag, setStoryTag] = useState('');
  const [postMode, setPostMode] = useState<CommunityPostMode>('open');
  const [lessonContext, setLessonContext] = useState('');
  const [lessonLearned, setLessonLearned] = useState('');
  const [lessonHelpfulNow, setLessonHelpfulNow] = useState('');
  const [lessonQuestion, setLessonQuestion] = useState('');
  const [conversationContext, setConversationContext] = useState('');
  const [communityQuestion, setCommunityQuestion] = useState('');
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [authors, setAuthors] = useState<Record<string, PublicProfile>>({});
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const uniqueAuthorIds = [...new Set(posts.map((post) => post.authorId))];
    void Promise.all(uniqueAuthorIds.map(async (authorId) => {
      try {
        const profile = await fetchPublicProfileById(authorId);
        return profile ? [authorId, profile] as const : null;
      } catch {
        // A missing/unavailable profile should not prevent the feed itself rendering.
        return null;
      }
    })).then((profiles) => {
      if (!cancelled) setAuthors(Object.fromEntries(profiles.filter((profile): profile is NonNullable<typeof profile> => profile !== null)));
    });
    return () => {
      cancelled = true;
    };
  }, [posts]);

  useEffect(() => () => {
    if (attachmentUrl) URL.revokeObjectURL(attachmentUrl);
  }, [attachmentUrl]);

  const handlePublish = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    const preparedPost = buildCommunityPost({
      mode: postMode,
      context: postMode === 'conversation' ? conversationContext : lessonContext,
      lesson: lessonLearned,
      helpfulNow: lessonHelpfulNow,
      question: postMode === 'conversation' ? communityQuestion : lessonQuestion,
    }, draft, storyTag, Boolean(attachmentFile));
    if (preparedPost.error) {
      setActionError(preparedPost.error);
      return;
    }
    try {
      await publishPost({
        content: preparedPost.content,
        mediaUrl: null,
        mediaType: attachmentUrl.trim() ? attachmentType || null : null,
        mediaFile: attachmentFile,
        storyTag: preparedPost.storyTag,
      });
      setDraft('');
      setAttachmentUrl('');
      setAttachmentFile(null);
      setAttachmentType('');
      setAttachmentName('');
      setStoryTag('');
      setPostMode('open');
      setLessonContext('');
      setLessonLearned('');
      setLessonHelpfulNow('');
      setLessonQuestion('');
      setConversationContext('');
      setCommunityQuestion('');
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
      const previewUrl = URL.createObjectURL(file);
      setAttachmentUrl(previewUrl);
      setAttachmentFile(file);
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
      {currentUser && !isGuest && <form className={`${styles.composer} w-full min-w-0 max-w-full`} onSubmit={handlePublish}>
        {postMode === 'open' ? <label className={styles.composerLabel} htmlFor="post-content">Share with Sanctuary</label> : <p className={styles.composerLabel}>Share with Sanctuary</p>}
        <div className={styles.connectionToolkit} role="group" aria-labelledby="connection-toolkit-heading">
          <p className={styles.toolkitHeading} id="connection-toolkit-heading">A little structure can help people connect</p>
          <div className={styles.templateChoices}>
            <button className={styles.templateChoice} type="button" aria-pressed={postMode === 'open'} onClick={() => setPostMode('open')}>Free-form</button>
            <button className={styles.templateChoice} type="button" aria-pressed={postMode === 'life-lesson'} onClick={() => setPostMode('life-lesson')}>Life lesson</button>
            <button className={styles.templateChoice} type="button" aria-pressed={postMode === 'conversation'} onClick={() => setPostMode('conversation')}>Conversation starter</button>
          </div>
          {postMode === 'open' && (
            <p className={styles.templateHint}>Share however feels natural. You can leave this completely unstructured.</p>
          )}
          {postMode === 'life-lesson' && (
            <div className={styles.guidedFields}>
              <p className={styles.templateHint}>Share only what feels comfortable. The optional details help others understand the lesson without needing your whole story.</p>
              <label className={styles.guidedField} htmlFor="lesson-context">
                <span>What was happening? <em>(optional)</em></span>
                <textarea id="lesson-context" value={lessonContext} maxLength={1200} onChange={(event) => setLessonContext(event.currentTarget.value)} placeholder="A little context, only if useful..." />
              </label>
              <label className={styles.guidedField} htmlFor="lesson-learned">
                <span>What did you learn? <em>(required)</em></span>
                <textarea id="lesson-learned" value={lessonLearned} maxLength={1200} onChange={(event) => setLessonLearned(event.currentTarget.value)} placeholder="The part you want to pass on..." required />
              </label>
              <label className={styles.guidedField} htmlFor="lesson-helpful">
                <span>What helps you now? <em>(optional)</em></span>
                <textarea id="lesson-helpful" value={lessonHelpfulNow} maxLength={1200} onChange={(event) => setLessonHelpfulNow(event.currentTarget.value)} placeholder="A practice, reminder, or small step..." />
              </label>
              <label className={styles.guidedField} htmlFor="lesson-question">
                <span>Invite a conversation <em>(optional)</em></span>
                <textarea id="lesson-question" value={lessonQuestion} maxLength={1200} onChange={(event) => setLessonQuestion(event.currentTarget.value)} placeholder="What would you ask others about this?" />
              </label>
            </div>
          )}
          {postMode === 'conversation' && (
            <div className={styles.guidedFields}>
              <p className={styles.templateHint}>A genuine question is enough. Keep it kind, open, and comfortable to answer.</p>
              <label className={styles.guidedField} htmlFor="conversation-context">
                <span>A little context <em>(optional)</em></span>
                <textarea id="conversation-context" value={conversationContext} maxLength={1200} onChange={(event) => setConversationContext(event.currentTarget.value)} placeholder="What made you think about this?" />
              </label>
              <label className={styles.guidedField} htmlFor="community-question">
                <span>What would you like to ask? <em>(required)</em></span>
                <textarea id="community-question" value={communityQuestion} maxLength={1200} onChange={(event) => setCommunityQuestion(event.currentTarget.value)} placeholder="What would you like to hear from others?" required />
              </label>
            </div>
          )}
        </div>
        {postMode === 'open' && (
          <textarea
            className="w-full max-w-full"
            id="post-content"
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            maxLength={2800}
            placeholder="A reflection, thought, or moment..."
          />
        )}
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
                setAttachmentFile(null);
                setAttachmentType('');
                setAttachmentName('');
              }}
            >
              Remove media
            </button>
          )}
        </div>
        {postMode === 'open' && <label className={styles.storyTagField}>
          <span>Story tag</span>
          <select value={storyTag} onChange={(event) => setStoryTag(event.currentTarget.value)}>
            <option value="">No tag</option>
            <option value="Reflection">Reflection</option>
            <option value="Question">Question</option>
            <option value="Story">Story</option>

          </select>
        </label>}
        {(attachmentError || actionError) && <p className={styles.error} role="alert">{attachmentError ?? actionError}</p>}
        {attachmentFile && <p className={styles.attachmentName}>Selected {attachmentType}: {attachmentName}</p>}
        <div className={styles.composerFooter}>
          <span>{postMode === 'open' ? draft.length : postMode === 'life-lesson' ? lessonContext.length + lessonLearned.length + lessonHelpfulNow.length + lessonQuestion.length : conversationContext.length + communityQuestion.length} characters</span>
          <button className={styles.actionButton} type="submit">{postMode === 'life-lesson' ? 'Share life lesson' : postMode === 'conversation' ? 'Start conversation' : 'Publish'}</button>
        </div>
      </form>}
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.sectionEyebrow}>COMMUNITY</p>
          <h2 id="feed-heading">Everyone’s posts</h2>
        </div>
        <span className={styles.sortLabel}>LATEST</span>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {isLoading && <p className={styles.feedStatus}>Loading your feed...</p>}
      {!isLoading && posts.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyMark} aria-hidden="true">S</span>
          <div>
            <h3>{PLACEHOLDER_HEADING}</h3>
            <p>{PLACEHOLDER_MESSAGE}</p>
          </div>
          <span className={styles.sanctuaryLabel}>SANCTUARY</span>
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
                  <time dateTime={post.createdAt} title={new Date(post.createdAt).toLocaleString()}>{formatPostTime(post.createdAt)}</time>
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
                {currentUser && !isGuest && <PostEngagement postId={post.id} userId={currentUser.user.id} worldType={worldType} />}
                {currentUser && !isGuest && (
                  <details className={styles.postOverflow}>
                    <summary aria-label="More post actions">More</summary>
                    <ReportContentButton targetType="post" targetId={post.id} />
                  </details>
                )}
                {currentUser && !isGuest && post.authorId === currentUser.user.id && editingPostId !== post.id && (
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
