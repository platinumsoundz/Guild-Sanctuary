'use client';

import { useEffect, useState } from 'react';
import type { PublicProfile } from '@/types/database';
import { Globe2, MapPin, Sparkles } from 'lucide-react';
import { isSupabaseAuthConfigured } from '@/modules/auth';
import { profileCosmeticMeta } from '@/modules/economy';
import { listPublicProfiles, searchPublicProfiles } from '../service';
import styles from './ProfileDiscovery.module.css';
import { ProfileSocialLinks } from './ProfileSocialLinks';

interface ProfileDiscoveryProps {
  currentUserId: string;
  onMessage: (profile: PublicProfile) => void;
}

export function ProfileDiscovery({ currentUserId, onMessage }: ProfileDiscoveryProps) {
  const [query, setQuery] = useState('');
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [isSearching, setIsSearching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabaseConfigured = isSupabaseAuthConfigured();

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length === 1) {
      setProfiles([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setError(null);

    const load = () => {
      const request = normalizedQuery.length >= 2
        ? searchPublicProfiles(normalizedQuery)
        : listPublicProfiles();

      request
        .then((results) => {
          if (!cancelled) {
            setProfiles(results.filter((profile) => profile.userId !== currentUserId));
          }
        })
        .catch((loadError) => {
          if (!cancelled) {
            setProfiles([]);
            setError(loadError instanceof Error ? loadError.message : 'Profiles could not be loaded right now.');
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearching(false);
          }
        });
    };

    const timeout = normalizedQuery.length >= 2 ? setTimeout(load, 180) : undefined;
    if (!timeout) load();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [currentUserId, query]);

  return (
    <main className={styles.discovery}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>MEET YOUR COMMUNITY</p>
          <h1>Find people</h1>
        </div>
        <p className={styles.privacyNote}>
          {supabaseConfigured
            ? 'Public profiles with discovery enabled are shown.'
            : 'Supabase is not configured. This browser only shows local demo profiles.'}
        </p>
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
      {query.trim().length === 1 ? (
        <p className={styles.stateMessage}>Enter one more character to search.</p>
      ) : isSearching ? (
        <p className={styles.stateMessage} role="status">{query.trim() ? 'Searching public profiles...' : 'Loading public profiles...'}</p>
      ) : error ? (
        <p className={styles.error} role="alert">{error}</p>
      ) : profiles.length === 0 ? (
        <p className={styles.stateMessage}>
          {query.trim()
            ? 'No public profiles match that search.'
            : 'No public profiles are discoverable yet. A profile must be public and have discovery enabled.'}
        </p>
      ) : (
        <div className={styles.results}>
          {profiles.map((profile) => {
            const frame = profile.equippedFrame ? profileCosmeticMeta[profile.equippedFrame] : undefined;
            const effect = profile.equippedEffect ? profileCosmeticMeta[profile.equippedEffect] : undefined;
            const badge = profile.equippedBadge ? profileCosmeticMeta[profile.equippedBadge] : undefined;
            return (
              <article className={styles.profileRow} key={profile.profileId}>
                <div className={styles.avatar} data-frame={frame?.effectKey} data-effect={effect?.effectKey} aria-hidden="true">
                  {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : profile.displayName.slice(0, 1).toUpperCase()}
                </div>
                <div className={styles.profileCopy}>
                  <div className={styles.nameLine}>
                    <h2>
                      {profile.displayName}
                      {badge?.badgeText && <span className={styles.profileBadge} aria-label="Profile badge">{badge.badgeText}</span>}
                    </h2>
                    <span>@{profile.username}</span>
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
            );
          })}
        </div>
      )}
    </main>
  );
}
