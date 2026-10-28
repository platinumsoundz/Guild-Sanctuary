'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PublicProfile, Post } from '@/types/database';
import { CalendarDays, Compass, Globe2, MapPin, MessageCircle, Search, Sparkles, Users } from 'lucide-react';
import { fetchFeed } from '@/modules/feeds';
import { fetchEvents } from '@/modules/events';
import type { EventView } from '@/modules/events';
import { fetchPublicProfileById, searchPublicProfiles } from '../service';
import { fetchPublicDiscoveryInterests, findUserIdsByPublicInterest } from '../discoveryInterests';
import styles from './ProfileDiscovery.module.css';
import { ProfileSocialLinks } from './ProfileSocialLinks';

type DiscoveryTab = 'people' | 'communities' | 'topics';

interface ProfileDiscoveryProps {
  currentUserId: string;
  onMessage: (profile: PublicProfile) => void;
  onView: (profile: PublicProfile) => void;
  onExploreFeed: () => void;
  onExploreEvents: () => void;
}

function getTopicLabel(post: Post): string {
  const tag = post.storyTag?.trim();
  if (tag) return tag.startsWith('#') ? tag : `#${tag}`;
  const hashtag = post.content.match(/#[\p{L}\p{N}_-]+/u)?.[0];
  return hashtag ?? 'Community reflections';
}

export function ProfileDiscovery({ currentUserId, onMessage, onView, onExploreFeed, onExploreEvents }: ProfileDiscoveryProps) {
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('people');
  const [query, setQuery] = useState('');
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [publicInterests, setPublicInterests] = useState<Map<string, string[]>>(new Map());
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<EventView[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingExplore, setIsLoadingExplore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exploreError, setExploreError] = useState<string | null>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (activeTab !== 'people' || normalizedQuery.length < 2) {
      setProfiles([]);
      setPublicInterests(new Map());
      setError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    setError(null);
    const timeout = setTimeout(() => {
      Promise.all([
        searchPublicProfiles(normalizedQuery),
        findUserIdsByPublicInterest(normalizedQuery),
      ])
        .then(async ([nameResults, interestUserIds]) => {
          const interestProfiles = await Promise.all(interestUserIds.map((userId) => fetchPublicProfileById(userId)));
          const unique = new Map<string, PublicProfile>();
          for (const profile of [...nameResults, ...interestProfiles.filter((item): item is PublicProfile => item !== null)]) {
            if (profile.userId !== currentUserId) unique.set(profile.userId, profile);
          }
          const merged = [...unique.values()].slice(0, 40);
          const interests = await fetchPublicDiscoveryInterests(merged.map((profile) => profile.userId));
          if (!cancelled) {
            setProfiles(merged);
            setPublicInterests(interests);
          }
        })
        .catch(() => {
          if (!cancelled) setError('People could not be searched right now. Please try again.');
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [activeTab, currentUserId, query]);

  useEffect(() => {
    if (activeTab === 'people') return;
    let cancelled = false;
    setIsLoadingExplore(true);
    setExploreError(null);

    const load = activeTab === 'topics'
      ? fetchFeed().then((result) => { if (!cancelled) setPosts(result); })
      : fetchEvents(currentUserId).then((result) => { if (!cancelled) setEvents(result); });

    load.catch(() => {
      if (!cancelled) setExploreError(activeTab === 'topics'
        ? 'Community topics could not be loaded right now.'
        : 'Community events could not be loaded right now.');
    }).finally(() => {
      if (!cancelled) setIsLoadingExplore(false);
    });

    return () => { cancelled = true; };
  }, [activeTab, currentUserId]);

  const filteredPosts = useMemo(() => {
    const term = query.trim().replace(/^#/, '').toLocaleLowerCase();
    return posts.filter((post) => !term || getTopicLabel(post).toLocaleLowerCase().includes(term)
      || post.content.toLocaleLowerCase().includes(term));
  }, [posts, query]);

  const filteredEvents = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    const now = Date.now();
    return events.filter((event) => new Date(event.startsAt).getTime() >= now
      && (!term || event.title.toLocaleLowerCase().includes(term)
        || event.description.toLocaleLowerCase().includes(term)));
  }, [events, query]);

  const tabs: { id: DiscoveryTab; label: string; icon: typeof Users; description: string }[] = [
    { id: 'people', label: 'People', icon: Users, description: 'Find people by public name or username.' },
    { id: 'communities', label: 'Communities & gatherings', icon: CalendarDays, description: 'Find upcoming gatherings where connections can grow.' },
    { id: 'topics', label: 'Topics', icon: Compass, description: 'Explore public reflections and shared ideas.' },
  ];

  return (
    <main className={styles.discovery}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>DISCOVER YOUR PEOPLE, PLACES & IDEAS</p>
          <h1>Find your connections</h1>
          <p className={styles.intro}>Explore people, shared interests, and community gatherings at your own pace.</p>
        </div>
        <p className={styles.privacyNote}>Your private reflections are not used in these searches.</p>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Discovery type">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" id={`discovery-tab-${id}`}
            aria-selected={activeTab === id} aria-controls="discovery-panel"
            className={activeTab === id ? styles.activeTab : styles.tab}
            onClick={() => { setActiveTab(id); setError(null); setExploreError(null); }}>
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <section id="discovery-panel" role="tabpanel" aria-labelledby={`discovery-tab-${activeTab}`}>
        <label className={styles.searchField} htmlFor="discovery-search">
          <span>{activeTab === 'people' ? 'Search public names' : activeTab === 'topics' ? 'Search topics and public reflections' : 'Search upcoming gatherings'}</span>
          <span className={styles.inputWrap}><Search size={16} aria-hidden="true" /><input id="discovery-search" type="search"
            autoComplete="off" value={query} onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder={activeTab === 'people' ? 'Username or display name' : activeTab === 'topics' ? 'Try mindfulness or #philosophy' : 'Try a gathering or interest'} /></span>
        </label>

        {activeTab === 'people' && (query.trim().length < 2 ? (
          <div className={styles.emptyState}><Users size={23} aria-hidden="true" /><p>Start with a name or username. You can explore topics and community gatherings without contacting anyone.</p></div>
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
                  {(publicInterests.get(profile.userId) ?? []).length > 0 && (
                    <div className={styles.interestTags} aria-label="Public interests">
                      {(publicInterests.get(profile.userId) ?? []).map((interest) => <span key={interest}>#{interest}</span>)}
                    </div>
                  )}
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
                    onClick={() => onMessage(profile)}><MessageCircle size={13} aria-hidden="true" /> {profile.allowDirectMessages ? 'Message' : 'Messages closed'}</button>
                </div>
              </article>
            ))}
          </div>
        ))}

        {activeTab === 'topics' && (isLoadingExplore ? <p className={styles.stateMessage} role="status">Exploring public reflections…</p>
          : exploreError ? <p className={styles.error} role="alert">{exploreError}</p>
          : filteredPosts.length === 0 ? <div className={styles.emptyState}><Compass size={23} aria-hidden="true" /><p>No public reflections match yet. Try another topic, or open the community feed to share an idea of your own.</p><button type="button" className={styles.viewButton} onClick={onExploreFeed}>Open community feed</button></div>
          : <div className={styles.topicGrid}>{filteredPosts.slice(0, 12).map((post) => <article className={styles.topicCard} key={post.id}>
              <span className={styles.topicLabel}>{getTopicLabel(post)}</span><p>{post.content}</p>
              <button type="button" className={styles.textAction} onClick={onExploreFeed}>Explore in community feed <span aria-hidden="true">→</span></button>
            </article>)}</div>)}

        {activeTab === 'communities' && (isLoadingExplore ? <p className={styles.stateMessage} role="status">Finding upcoming gatherings…</p>
          : exploreError ? <p className={styles.error} role="alert">{exploreError}</p>
          : filteredEvents.length === 0 ? <div className={styles.emptyState}><CalendarDays size={23} aria-hidden="true" /><p>No upcoming gatherings match those terms. Current community discovery surfaces upcoming events; dedicated group discovery is a later integration.</p><button type="button" className={styles.viewButton} onClick={onExploreEvents}>Explore gatherings and events</button></div>
          : <div className={styles.topicGrid}>{filteredEvents.slice(0, 12).map((event: EventView) => <article className={styles.topicCard} key={event.id}>
              <span className={styles.topicLabel}><CalendarDays size={13} aria-hidden="true" /> {new Date(event.startsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              <h2>{event.title}</h2><p>{event.description || 'A community gathering.'}</p>
              <span className={styles.eventMeta}>{new Date(event.startsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · {event.rsvpCount} attending</span>
              <button type="button" className={styles.textAction} onClick={onExploreEvents}>Explore events <span aria-hidden="true">→</span></button>
            </article>)}</div>)}
      </section>
    </main>
  );
}
