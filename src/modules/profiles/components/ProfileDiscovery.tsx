'use client';

import { useEffect, useState } from 'react';
import type { PublicProfile } from '@/types/database';
import { Globe2, MapPin, Sparkles } from 'lucide-react';
import { searchPublicProfiles } from '../service';
import styles from './ProfileDiscovery.module.css';
import { ProfileSocialLinks } from './ProfileSocialLinks';

interface ProfileDiscoveryProps {
  currentUserId: string;
  onMessage: (profile: PublicProfile) => void;
}

export function ProfileDiscovery({ currentUserId, onMessage }: ProfileDiscoveryProps) {
  const [query, setQuery] = useState('');
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setProfiles([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const timeout = setTimeout(() => {
      searchPublicProfiles(normalizedQuery)
        .then((results) => {
          if (!cancelled) {
            setProfiles(results.filter((profile) => profile.userId !== currentUserId));
            setError(null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError('Profiles could not be searched right now.');
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearching(false);
          }
        });
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [currentUserId, query]);

  return (
    <main className={styles.discovery}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>MEET YOUR COMMUNITY</p>
          <h1>Find people</h1>
        </div>
        <p className={styles.privacyNote}>Searches public usernames and display names only.</p>
      </header>
      <label className={styles.searchField} htmlFor="profile-search">
        <span>Username or display name</span>
        <input
          id="profile-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search by handle or name"
        />
      </label>
      {query.trim().length < 2 ? (
        <p className={styles.stateMessage}>Enter at least two characters to search.</p>
      ) : isSearching ? (
        <p className={styles.stateMessage} role="status">Searching public profiles...</p>
      ) : error ? (
        <p className={styles.error} role="alert">{error}</p>
      ) : profiles.length === 0 ? (
        <p className={styles.stateMessage}>No public profiles match that search.</p>
      ) : (
        <div className={styles.results}>
          {profiles.map((profile) => (
            <article className={styles.profileRow} key={profile.profileId}>
              <div className={styles.avatar} aria-hidden="true">
                {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : profile.displayName.slice(0, 1).toUpperCase()}
                {profile.cosmeticFrames[0] && <span className={styles.frameMarker} />}
              </div>
              <div className={styles.profileCopy}>
                <div className={styles.nameLine}>
                  <h2>{profile.displayName}</h2>
                  <span>@{profile.username}</span>
                  {profile.vipTier !== 'free' && <span className={styles.vipBadge}>{profile.vipTier}</span>}
                </div>
                <p>{profile.statusMessage || profile.bio || 'A community member.'}</p>
                <ProfileSocialLinks links={profile.socialLinks} />
                                {(profile.location || profile.age || profile.starSign || profile.belief) && (
                                  <div className={styles.publicDetails}>
                                    {profile.location && <span><MapPin size={12} />{profile.location}</span>}
                                    {profile.age && <span>{profile.age}</span>}
                                    {profile.starSign && <span><Sparkles size={12} />{profile.starSign}</span>}
                                    {profile.belief && <span><Globe2 size={12} />{profile.belief}</span>}
                                  </div>
                                )}
                {profile.cosmeticFrames.length > 0 && <span className={styles.cosmeticLine}>Frame: {profile.cosmeticFrames[0]}</span>}
              </div>
              <button
                className={styles.messageButton}
                type="button"
                disabled={!profile.allowDirectMessages}
                title={profile.allowDirectMessages ? undefined : 'This member is not accepting direct messages.'}
                onClick={() => onMessage(profile)}
              >
                {profile.allowDirectMessages ? 'Message' : 'Messages closed'}
              </button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}