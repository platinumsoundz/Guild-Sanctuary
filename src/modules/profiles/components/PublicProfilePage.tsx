'use client';

import { useEffect, useState } from 'react';
import type { Post, PublicProfile } from '@/types/database';
import { fetchPostsByAuthor } from '@/modules/feeds';
import { fetchPublicProfileById } from '../service';
import { ProfileCard } from './ProfileCard';
import { SelfDiscoveryComparison } from './SelfDiscovery';
import styles from './PublicProfilePage.module.css';

interface PublicProfilePageProps {
  profile: PublicProfile;
  onBack: () => void;
  onMessage: (profile: PublicProfile) => void;
  currentUserId: string;
}

export function PublicProfilePage({ profile: initialProfile, onBack, onMessage, currentUserId }: PublicProfilePageProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setProfile(initialProfile), [initialProfile]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([
      fetchPublicProfileById(initialProfile.userId),
      fetchPostsByAuthor(initialProfile.userId),
    ]).then(([latestProfile, authorPosts]) => {
      if (cancelled) return;
      if (!latestProfile) {
        setError('This profile is private or no longer available.');
        setPosts([]);
        return;
      }
      setProfile(latestProfile);
      setPosts(authorPosts);
    }).catch(() => {
      if (!cancelled) setError('This profile could not be loaded right now.');
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [initialProfile.userId]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>COMMUNITY MEMBER</p>
          <h1>{profile.displayName}</h1>
        </div>
        <div className={styles.actions}>
          <button className={styles.secondaryButton} type="button" onClick={onBack}>Back to people</button>
          {profile.allowDirectMessages && <button className={styles.primaryButton} type="button" onClick={() => onMessage(profile)}>Message</button>}
        </div>
      </header>

      <section className={styles.posts} aria-labelledby="public-posts-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>RECENT CONTRIBUTIONS</p>
            <h2 id="public-posts-heading">Posts</h2>
          </div>
          <span>@{profile.username}</span>
        </div>
        {isLoading ? <p className={styles.state} role="status">Loading posts…</p> : error ? <p className={styles.state} role="alert">{error}</p> : posts.length === 0 ? (
          <p className={styles.state}>No public posts to show yet.</p>
        ) : (
          <div className={styles.postGrid}>
            {posts.map((post) => (
              <article className={styles.post} key={post.id}>
                <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString('en-GB')}</time>
                <p>{post.content}</p>
                {post.mediaUrl && post.mediaType === 'image' && <img src={post.mediaUrl} alt="Media shared in this post" loading="lazy" />}
                {post.mediaUrl && post.mediaType === 'audio' && <audio controls preload="none" src={post.mediaUrl}>Audio playback is not supported.</audio>}
                {post.mediaUrl && post.mediaType === 'video' && <video controls playsInline preload="metadata" src={post.mediaUrl}>Video playback is not supported.</video>}
                {post.storyTag && <span className={styles.tag}>{post.storyTag}</span>}
              </article>
            ))}
          </div>
        )}
      </section>

      <ProfileCard profile={profile} />
      <SelfDiscoveryComparison currentUserId={currentUserId} profile={profile} />
    </main>
  );
}
