'use client';

import { useEffect, useState } from 'react';
import type { Post, PublicProfile } from '@/types/database';
import { fetchPostsByAuthor } from '@/modules/feeds';
import { fetchPublicProfileById } from '../service';
import { fetchPublicDiscoveryInterests } from '../discoveryInterests';
import { ProfileCard } from './ProfileCard';
import styles from './PublicProfilePage.module.css';

interface PublicProfilePageProps {
  profile: PublicProfile;
  onBack: () => void;
  onMessage: (profile: PublicProfile) => void;
}

export function PublicProfilePage({ profile: initialProfile, onBack, onMessage }: PublicProfilePageProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [posts, setPosts] = useState<Post[]>([]);
  const [publicInterests, setPublicInterests] = useState<string[]>([]);
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
      fetchPublicDiscoveryInterests([initialProfile.userId]).catch(() => new Map<string, string[]>()),
    ]).then(([latestProfile, authorPosts, interestMap]) => {
      if (cancelled) return;
      if (!latestProfile) {
        setError('This profile is private or no longer available.');
        setPosts([]);
        return;
      }
      setProfile(latestProfile);
      setPosts(authorPosts);
      setPublicInterests(interestMap.get(initialProfile.userId) ?? []);
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

      {publicInterests.length > 0 && (
        <section className={styles.interests} aria-labelledby="public-interests-heading">
          <h2 id="public-interests-heading">Interests</h2>
          <div className={styles.interestTags}>
            {publicInterests.map((interest) => <span key={interest}>#{interest}</span>)}
          </div>
        </section>
      )}
      <ProfileCard profile={profile} />
    </main>
  );
}
