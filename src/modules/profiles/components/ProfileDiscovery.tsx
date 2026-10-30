'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Post, PublicProfile, WorldType } from '@/types/database';
import { CalendarDays, FileText, Globe2, MapPin, Search, Sparkles, Users } from 'lucide-react';
import { fetchEvents, type EventView } from '@/modules/events';
import { fetchFeed } from '@/modules/feeds';
import { fetchPublicProfileById, searchPublicProfiles } from '../service';
import styles from './ProfileDiscovery.module.css';
import { ProfileSocialLinks } from './ProfileSocialLinks';

type DiscoveryTab = 'people' | 'posts' | 'events';

interface ProfileDiscoveryProps {
  currentUserId: string;
  worldType: WorldType;
  onMessage: (profile: PublicProfile) => void;
  onView: (profile: PublicProfile) => void;
}

export function ProfileDiscovery({ currentUserId, worldType, onMessage, onView }: ProfileDiscoveryProps) {
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('people');
  const [query, setQuery] = useState('');
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [events, setEvents] = useState<EventView[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postAuthors, setPostAuthors] = useState<Record<string, PublicProfile>>({});
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (activeTab !== 'people' || normalizedQuery.length < 2) {
      setProfiles([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setError(null);
    const timeout = setTimeout(() => {
      searchPublicProfiles(normalizedQuery)
        .then((results) => {
          if (!cancelled) setProfiles(results.filter((profile) => profile.userId !== currentUserId));
        })
        .catch(() => {
          if (!cancelled) setError('Profiles could not be searched right now. Please try again.');
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [activeTab, currentUserId, query]);

  useEffect(() => {
    if (activeTab !== 'events') return;
    let cancelled = false;
    setIsLoadingEvents(true);
    setEventsError(null);
    fetchEvents(currentUserId || '', worldType)
      .then((results) => {
        if (!cancelled) setEvents(results);
      })
      .catch(() => {
        if (!cancelled) setEventsError('Gatherings could not be loaded. Please try again shortly.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingEvents(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, currentUserId, worldType]);

  useEffect(() => {
    if (activeTab !== 'posts') return;
    let cancelled = false;
    setIsLoadingPosts(true);
    setPostsError(null);
    fetchFeed(worldType)
      .then(async (results) => {
        const visiblePosts = results
          .filter((post) => (post.worldType ?? 'sanctuary') === worldType)
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
          .slice(0, 30);
        const authorIds = [...new Set(visiblePosts.map((post) => post.authorId))];
        const authorResults = await Promise.all(authorIds.map(async (authorId) => {
          try {
            const profile = await fetchPublicProfileById(authorId);
            return profile ? [authorId, profile] as const : null;
          } catch {
            return null;
          }
        }));
        if (!cancelled) {
          setPosts(visiblePosts);
          setPostAuthors(Object.fromEntries(authorResults.filter((entry): entry is NonNullable<typeof entry> => entry !== null)));
        }
      })
      .catch(() => {
        if (!cancelled) setPostsError('Community posts could not be loaded. Please try again shortly.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPosts(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, worldType]);

  const visiblePosts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return posts
      .filter((post) => (post.worldType ?? 'sanctuary') === worldType)
      .filter((post) => !normalized || `${post.content} ${post.storyTag ?? ''}`.toLocaleLowerCase().includes(normalized))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 30);
  }, [posts, query, worldType]);

  const visibleEvents = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return events
      .filter((event) => Date.parse(event.startsAt) >= Date.now())
      .filter((event) => !normalized || `${event.title} ${event.description}`.toLocaleLowerCase().includes(normalized))
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  }, [events, query]);

  const resetTab = (tab: DiscoveryTab) => {
    setActiveTab(tab);
    setQuery('');
    setError(null);
    setEventsError(null);
    setPostsError(null);
  };

  return (
    <main className={styles.discovery}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>EXPLORE THIS COMMUNITY</p>
          <h1>Discover</h1>
          <p className={styles.intro}>Explore public member profiles, community posts and upcoming gatherings in the space you are currently visiting.</p>
        </div>
        <p className={styles.privacyNote}>Only public profiles, visible posts and visible events appear here. Private reflections are never included.</p>
      </header>

      <section className={styles.discoverHighlights} aria-label="Explore Sanctuary">
        <button type="button" className={styles.highlightCard} onClick={() => resetTab('people')}>
          <span className={styles.highlightIcon}><Users size={18} aria-hidden="true" /></span>
          <span><strong>Meet the community</strong><small>Find public member profiles and shared interests</small></span>
          <span className={styles.highlightArrow} aria-hidden="true">↗</span>
        </button>
        <button type="button" className={styles.highlightCard} onClick={() => resetTab('posts')}>
          <span className={styles.highlightIcon}><FileText size={18} aria-hidden="true" /></span>
          <span><strong>Explore conversations</strong><small>Discover ideas, reflections and questions</small></span>
          <span className={styles.highlightArrow} aria-hidden="true">↗</span>
        </button>
        <button type="button" className={styles.highlightCard} onClick={() => resetTab('events')}>
          <span className={styles.highlightIcon}><CalendarDays size={18} aria-hidden="true" /></span>
          <span><strong>Find gatherings</strong><small>See upcoming public community events</small></span>
          <span className={styles.highlightArrow} aria-hidden="true">↗</span>
        </button>
      </section>

      <div className={styles.tabs} role="tablist" aria-label="Discover">
        <button type="button" role="tab" id="discover-people-tab" aria-controls="discover-panel" aria-selected={activeTab === 'people'}
          className={activeTab === 'people' ? styles.activeTab : styles.tab} onClick={() => resetTab('people')}>
          <Users size={16} aria-hidden="true" /> People
        </button>
        <button type="button" role="tab" id="discover-posts-tab" aria-controls="discover-panel" aria-selected={activeTab === 'posts'}
          className={activeTab === 'posts' ? styles.activeTab : styles.tab} onClick={() => resetTab('posts')}>
          <FileText size={16} aria-hidden="true" /> Community posts
        </button>
        <button type="button" role="tab" id="discover-events-tab" aria-controls="discover-panel" aria-selected={activeTab === 'events'}
          className={activeTab === 'events' ? styles.activeTab : styles.tab} onClick={() => resetTab('events')}>
          <CalendarDays size={16} aria-hidden="true" /> Gatherings
        </button>
      </div>

      <section id="discover-panel" role="tabpanel" aria-labelledby={activeTab === 'people' ? 'discover-people-tab' : activeTab === 'posts' ? 'discover-posts-tab' : 'discover-events-tab'}>
        <label className={styles.searchField} htmlFor="discover-search">
          <span>{activeTab === 'people' ? 'Search public usernames and display names' : activeTab === 'posts' ? 'Search visible community posts' : 'Search upcoming gatherings'}</span>
          <span className={styles.inputWrap}>
            <Search size={16} aria-hidden="true" />
            <input id="discover-search" type="search" autoComplete="off" value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={activeTab === 'people' ? 'Try a username or name' : activeTab === 'posts' ? 'Search post text or tag' : 'Try a title or keyword'} />
          </span>
        </label>

        {activeTab === 'people' ? (
          query.trim().length < 2 ? (
            <div className={styles.emptyState}>
              <Users size={24} aria-hidden="true" />
              <p>Search by a member's public username or display name. Only profiles made public by their owners can appear.</p>
            </div>
          ) : isSearching ? (
            <p className={styles.stateMessage} role="status">Searching public profiles…</p>
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
                  </div>
                  <div className={styles.profileCopy}>
                    <div className={styles.nameLine}><h2>{profile.displayName}</h2><span>@{profile.username}</span></div>
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
                  <div className={styles.profileActions}>
                    <button className={styles.viewButton} type="button" onClick={() => onView(profile)}>View profile</button>
                    <button className={styles.messageButton} type="button" disabled={!profile.allowDirectMessages}
                      title={profile.allowDirectMessages ? undefined : 'This member is not accepting direct messages.'}
                      onClick={() => onMessage(profile)}>
                      {profile.allowDirectMessages ? 'Message' : 'Messages closed'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : activeTab === 'posts' ? (
          isLoadingPosts ? (
            <p className={styles.stateMessage} role="status">Loading visible posts in this community…</p>
          ) : postsError ? (
            <p className={styles.error} role="alert">{postsError}</p>
          ) : visiblePosts.length === 0 ? (
            <div className={styles.emptyState}>
              <FileText size={24} aria-hidden="true" />
              <p>{query.trim() ? 'No visible community posts match that search.' : 'There are no visible posts to discover in this community yet.'}</p>
            </div>
          ) : (
            <div className={styles.discoverPostGrid}>
              {visiblePosts.map((post) => {
                const author = postAuthors[post.authorId];
                return (
                  <article className={styles.discoverPostCard} key={post.id}>
                    <div className={styles.discoverPostAuthor}>
                      <div className={styles.discoverPostAvatar} aria-hidden="true">
                        {author?.avatarUrl ? <img src={author.avatarUrl} alt="" /> : (author?.displayName ?? 'C').slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <strong>{author?.displayName ?? 'Community member'}</strong>
                        <span>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(post.createdAt))}</span>
                      </div>
                      {post.storyTag && <span className={styles.discoverPostTag}>{post.storyTag}</span>}
                    </div>
                    <p className={styles.discoverPostText}>{post.content}</p>
                    {post.mediaType && <span className={styles.discoverPostMedia}>Includes {post.mediaType} attachment</span>}
                    {author && <button className={styles.discoverPostProfile} type="button" onClick={() => onView(author)}>View member profile</button>}
                  </article>
                );
              })}
            </div>
          )
        ) : isLoadingEvents ? (
          <p className={styles.stateMessage} role="status">Loading gatherings in this community…</p>
        ) : eventsError ? (
          <p className={styles.error} role="alert">{eventsError}</p>
        ) : visibleEvents.length === 0 ? (
          <div className={styles.emptyState}>
            <CalendarDays size={24} aria-hidden="true" />
            <p>{query.trim() ? 'No upcoming gatherings match that search.' : 'There are no upcoming public gatherings in this community yet. Check back as members add events.'}</p>
          </div>
        ) : (
          <div className={styles.eventGrid}>
            {visibleEvents.map((event) => (
              <article className={styles.eventCard} key={event.id}>
                <div className={styles.eventCardTop}>
                  <span className={styles.eventEyebrow}><CalendarDays size={13} aria-hidden="true" /> UPCOMING GATHERING</span>
                  <span className={styles.eventRsvpCount}>{event.rsvpCount} going</span>
                </div>
                <h2>{event.title}</h2>
                <p className={styles.eventDescription}>{event.description || 'A community gathering.'}</p>
                <p className={styles.eventMeta}>
                  <CalendarDays size={14} aria-hidden="true" />
                  {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.startsAt))}
                </p>
                <p className={styles.eventMeta}><MapPin size={14} aria-hidden="true" /> Location shared by organiser</p>
                <a className={styles.mapLink}
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.locationCoords.latitude},${event.locationCoords.longitude}`)}`}
                  target="_blank" rel="noreferrer">View location</a>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
