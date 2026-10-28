'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PublicProfile, Post } from '@/types/database';
import { Ban, Bookmark, CalendarDays, Check, Compass, EyeOff, Globe2, MapPin, MessageCircle, Search, Sparkles, UserCheck, UserMinus, UserPlus, Users, X } from 'lucide-react';
import { fetchFeed } from '@/modules/feeds';
import { fetchEvents } from '@/modules/events';
import type { EventView } from '@/modules/events';
import { fetchPublicProfileById, searchPublicProfiles } from '../service';
import { fetchMemberDiscoveryInterests, fetchPublicDiscoveryInterests, findUserIdsByPublicInterest, findUserIdsBySharedPublicInterests } from '../discoveryInterests';
import { DISCOVERY_INTENTIONS, fetchMemberDiscoveryIntentions, fetchPublicDiscoveryIntentions, findUserIdsBySharedPublicIntentions, type DiscoveryIntentionId } from '../discoveryIntentions';
import { blockProfile, fetchBlockedProfileIds, fetchIncomingConnectionRequests, fetchPrivateDiscoveryProfileIds, fetchRelationshipStates, followProfile, hideProfileFromDiscovery, requestConnection, respondToConnection, saveProfileForLater, unblockProfile, unhideProfileInDiscovery, unfollowProfile, unsaveProfile, type RelationshipState } from '../connectionService';
import styles from './ProfileDiscovery.module.css';
import { ProfileSocialLinks } from './ProfileSocialLinks';
import { ReportContentButton } from '@/modules/moderation/ReportContentButton';

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
  const [publicIntentions, setPublicIntentions] = useState<Map<string, DiscoveryIntentionId[]>>(new Map());
  const [suggestedProfiles, setSuggestedProfiles] = useState<PublicProfile[]>([]);
  const [suggestedInterests, setSuggestedInterests] = useState<Map<string, string[]>>(new Map());
  const [sharedInterestMatches, setSharedInterestMatches] = useState<Map<string, string[]>>(new Map());
  const [sharedIntentionMatches, setSharedIntentionMatches] = useState<Map<string, DiscoveryIntentionId[]>>(new Map());
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [relationshipStates, setRelationshipStates] = useState<Map<string, RelationshipState>>(new Map());
  const [incomingRequests, setIncomingRequests] = useState<Array<{ id: string; requesterId: string; displayName: string; username: string }>>([]);
  const [relationshipBusyId, setRelationshipBusyId] = useState<string | null>(null);
  const [relationshipError, setRelationshipError] = useState<string | null>(null);
  const [blockedProfiles, setBlockedProfiles] = useState<Array<{ userId: string; displayName: string; username: string }>>([]);
  const [hiddenProfiles, setHiddenProfiles] = useState<Array<{ userId: string; displayName: string; username: string }>>([]);
  const [savedProfiles, setSavedProfiles] = useState<Array<{ userId: string; displayName: string; username: string }>>([]);
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
      setPublicIntentions(new Map());
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
        findUserIdsByPublicInterest(normalizedQuery).catch(() => []),
      ])
        .then(async ([nameResults, interestUserIds]) => {
          const interestProfiles = await Promise.all(interestUserIds.map((userId) => fetchPublicProfileById(userId)));
          const unique = new Map<string, PublicProfile>();
          for (const profile of [...nameResults, ...interestProfiles.filter((item): item is PublicProfile => item !== null)]) {
            if (profile.userId !== currentUserId) unique.set(profile.userId, profile);
          }
          const merged = [...unique.values()].slice(0, 40);
          const [interests, intentions] = await Promise.all([
            fetchPublicDiscoveryInterests(merged.map((profile) => profile.userId)).catch(() => new Map<string, string[]>()),
            fetchPublicDiscoveryIntentions(merged.map((profile) => profile.userId)).catch(() => new Map<string, DiscoveryIntentionId[]>()),
          ]);
          if (!cancelled) {
            setProfiles(merged);
            setPublicInterests(interests);
            setPublicIntentions(intentions);
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
    if (activeTab !== 'people' || query.trim().length >= 2) return;
    let cancelled = false;
    setIsLoadingSuggestions(true);
    setSuggestionError(null);
    Promise.all([
      findUserIdsBySharedPublicInterests(currentUserId),
      findUserIdsBySharedPublicIntentions(currentUserId).catch(() => []),
    ])
      .then(async ([interestIds, intentionIds]) => {
        const userIds = [...new Set([...interestIds, ...intentionIds])];
        const found = await Promise.all(userIds.map((userId) => fetchPublicProfileById(userId)));
        const unique = new Map<string, PublicProfile>();
        for (const profile of found) {
          if (profile && profile.userId !== currentUserId) unique.set(profile.userId, profile);
        }
        const profilesToShow = [...unique.values()].slice(0, 12);
        const [interests, ownInterests, intentions, ownIntentions] = await Promise.all([
          fetchPublicDiscoveryInterests(profilesToShow.map((profile) => profile.userId)),
          fetchMemberDiscoveryInterests(currentUserId),
          fetchPublicDiscoveryIntentions(profilesToShow.map((profile) => profile.userId)),
          fetchMemberDiscoveryIntentions(currentUserId),
        ]);
        const ownPublic = new Set(ownInterests.filter((item) => item.isPublic).map((item) => item.interest));
        const shared = new Map<string, string[]>();
        for (const profile of profilesToShow) {
          const overlap = (interests.get(profile.userId) ?? []).filter((interest) => ownPublic.has(interest));
          if (overlap.length) shared.set(profile.userId, overlap);
        }
        const ownPublicIntentions = new Set(ownIntentions.filter((item) => item.isPublic).map((item) => item.intention));
        const sharedIntentions = new Map<string, DiscoveryIntentionId[]>();
        for (const profile of profilesToShow) {
          const overlap = (intentions.get(profile.userId) ?? []).filter((intention) => ownPublicIntentions.has(intention));
          if (overlap.length) sharedIntentions.set(profile.userId, overlap);
        }
        if (!cancelled) {
          setSuggestedProfiles(profilesToShow);
          setSuggestedInterests(interests);
          setSharedInterestMatches(shared);
          setPublicIntentions(intentions);
          setSharedIntentionMatches(sharedIntentions);
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestionError('Interest-based suggestions could not be loaded right now.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSuggestions(false);
      });
    return () => { cancelled = true; };
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

  useEffect(() => {
    if (activeTab !== 'people') return;
    let cancelled = false;
    const visibleProfiles = query.trim().length >= 2 ? profiles : suggestedProfiles;
    fetchRelationshipStates(currentUserId, visibleProfiles.map((profile) => profile.userId))
      .then((states) => { if (!cancelled) setRelationshipStates(states); })
      .catch(() => { if (!cancelled) setRelationshipError('Relationship controls could not be loaded. Please retry.'); });
    fetchBlockedProfileIds(currentUserId)
      .then(async (ids) => {
        const profiles = await Promise.all(ids.map((id) => fetchPublicProfileById(id)));
        if (!cancelled) setBlockedProfiles(ids.map((id, index) => { const profile = profiles[index]; return { userId: id, displayName: profile?.displayName ?? 'Blocked member', username: profile ? `@${profile.username}` : `Member ${id.slice(0, 8)}` }; }));
      })
      .catch(() => { if (!cancelled) setRelationshipError('Blocked members could not be loaded.'); });
    Promise.all([
      fetchPrivateDiscoveryProfileIds(currentUserId, 'hidden'),
      fetchPrivateDiscoveryProfileIds(currentUserId, 'saved'),
    ]).then(async ([hiddenIds, savedIds]) => {
      const [hidden, saved] = await Promise.all([
        Promise.all(hiddenIds.map((id) => fetchPublicProfileById(id))),
        Promise.all(savedIds.map((id) => fetchPublicProfileById(id))),
      ]);
      if (!cancelled) {
        setHiddenProfiles(hiddenIds.map((id, index) => ({ userId: id, displayName: hidden[index]?.displayName ?? 'Hidden member', username: hidden[index] ? `@${hidden[index]!.username}` : `Member ${id.slice(0, 8)}` })));
        setSavedProfiles(savedIds.map((id, index) => ({ userId: id, displayName: saved[index]?.displayName ?? 'Saved member', username: saved[index] ? `@${saved[index]!.username}` : `Member ${id.slice(0, 8)}` })));
      }
    }).catch(() => { if (!cancelled) setRelationshipError('Saved and hidden profiles could not be loaded.'); });
    fetchIncomingConnectionRequests(currentUserId)
      .then(async (requests) => {
        const hydrated = await Promise.all(requests.map(async (request) => {
          const profile = await fetchPublicProfileById(request.requesterId);
          return profile ? { ...request, displayName: profile.displayName, username: profile.username } : null;
        }));
        if (!cancelled) setIncomingRequests(hydrated.filter((item): item is { id: string; requesterId: string; createdAt: string; displayName: string; username: string } => item !== null));
      })
      .catch(() => { if (!cancelled) setRelationshipError('Incoming connection requests could not be loaded.'); });
    return () => { cancelled = true; };
  }, [activeTab, currentUserId, profiles, query, suggestedProfiles]);

  const runRelationshipAction = async (targetId: string, action: 'follow' | 'unfollow' | 'connect' | 'accept' | 'decline' | 'block' | 'unblock' | 'hide' | 'unhide' | 'save' | 'unsave', connectionId?: string) => {
    setRelationshipBusyId(connectionId ?? targetId);
    setRelationshipError(null);
    try {
      if (action === 'follow') await followProfile(currentUserId, targetId);
      if (action === 'unfollow') await unfollowProfile(currentUserId, targetId);
      if (action === 'connect') await requestConnection(currentUserId, targetId);
      if (action === 'accept' && connectionId) await respondToConnection(currentUserId, connectionId, 'accepted');
      if (action === 'decline' && connectionId) await respondToConnection(currentUserId, connectionId, 'declined');
      if (action === 'block') {
        if (!window.confirm('Block this member? This removes follows and closes connection requests between you.')) return;
        await blockProfile(currentUserId, targetId);
      }
      if (action === 'unblock') await unblockProfile(currentUserId, targetId);
      if (action === 'hide') await hideProfileFromDiscovery(currentUserId, targetId);
      if (action === 'unhide') await unhideProfileInDiscovery(currentUserId, targetId);
      if (action === 'save') await saveProfileForLater(currentUserId, targetId);
      if (action === 'unsave') await unsaveProfile(currentUserId, targetId);
      const visibleProfiles = query.trim().length >= 2 ? profiles : suggestedProfiles;
      setRelationshipStates(await fetchRelationshipStates(currentUserId, visibleProfiles.map((profile) => profile.userId)));
      const blockedIds = await fetchBlockedProfileIds(currentUserId);
      const blocked = await Promise.all(blockedIds.map((id) => fetchPublicProfileById(id)));
      setBlockedProfiles(blockedIds.map((id, index) => { const profile = blocked[index]; return { userId: id, displayName: profile?.displayName ?? 'Blocked member', username: profile ? `@${profile.username}` : `Member ${id.slice(0, 8)}` }; }));
      const [hiddenIds, savedIds] = await Promise.all([
        fetchPrivateDiscoveryProfileIds(currentUserId, 'hidden'),
        fetchPrivateDiscoveryProfileIds(currentUserId, 'saved'),
      ]);
      const [hidden, saved] = await Promise.all([
        Promise.all(hiddenIds.map((id) => fetchPublicProfileById(id))),
        Promise.all(savedIds.map((id) => fetchPublicProfileById(id))),
      ]);
      setHiddenProfiles(hiddenIds.map((id, index) => ({ userId: id, displayName: hidden[index]?.displayName ?? 'Hidden member', username: hidden[index] ? `@${hidden[index]!.username}` : `Member ${id.slice(0, 8)}` })));
      setSavedProfiles(savedIds.map((id, index) => ({ userId: id, displayName: saved[index]?.displayName ?? 'Saved member', username: saved[index] ? `@${saved[index]!.username}` : `Member ${id.slice(0, 8)}` })));
      const requests = await fetchIncomingConnectionRequests(currentUserId);
      const hydrated = await Promise.all(requests.map(async (request) => {
        const profile = await fetchPublicProfileById(request.requesterId);
        return profile ? { ...request, displayName: profile.displayName, username: profile.username } : null;
      }));
      setIncomingRequests(hydrated.filter((item): item is { id: string; requesterId: string; createdAt: string; displayName: string; username: string } => item !== null));
    } catch (actionError) {
      setRelationshipError(actionError instanceof Error ? actionError.message : 'That relationship action could not be completed.');
    } finally {
      setRelationshipBusyId(null);
    }
  };

  const openSavedProfile = async (userId: string) => {
    try {
      const profile = await fetchPublicProfileById(userId);
      if (!profile) {
        setRelationshipError('This saved profile is no longer publicly available.');
        return;
      }
      onView(profile);
    } catch {
      setRelationshipError('This saved profile could not be opened right now.');
    }
  };

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

  const renderProfileResults = (items: PublicProfile[], interestMap: Map<string, string[]>, sharedMap?: Map<string, string[]>, intentionMap: Map<string, DiscoveryIntentionId[]> = new Map(), sharedIntentionMap: Map<string, DiscoveryIntentionId[]> = new Map()) => {
    const visibleItems = items.filter((profile) => !relationshipStates.get(profile.userId)?.hidden);
    if (visibleItems.length === 0) return <p className={styles.stateMessage}>{items.length ? 'You have hidden these profiles from discovery.' : 'No public profiles are available to show yet.'}</p>;
    return (
    <div className={styles.results}>
      {visibleItems.map((profile) => (
        <article className={styles.profileRow} key={profile.profileId}>
          <div className={styles.avatar} aria-hidden="true">
            {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : profile.displayName.slice(0, 1).toUpperCase()}
          </div>
          <div className={styles.profileCopy}>
            <div className={styles.nameLine}><h2>{profile.displayName}</h2><span>@{profile.username}</span></div>
            <p>{profile.statusMessage || profile.bio || 'A community member.'}</p>
            {(interestMap.get(profile.userId) ?? []).length > 0 && (
              <div className={styles.interestTags} aria-label="Public interests">
                {(interestMap.get(profile.userId) ?? []).map((interest) => <span key={interest}>#{interest}</span>)}
              </div>
            )}
            {(sharedMap?.get(profile.userId) ?? []).length > 0 && (
              <p className={styles.matchReason}>You both list {(sharedMap?.get(profile.userId) ?? []).map((interest) => `#${interest}`).join(', ')}</p>
            )}
            {(intentionMap.get(profile.userId) ?? []).length > 0 && (
              <div className={styles.intentionTags} aria-label="Public connection intentions">
                {(intentionMap.get(profile.userId) ?? []).map((intention) => (
                  <span key={intention}>{DISCOVERY_INTENTIONS.find((item) => item.id === intention)?.label ?? intention}</span>
                ))}
              </div>
            )}
            {(sharedIntentionMap.get(profile.userId) ?? []).length > 0 && (
              <p className={styles.matchReason}>You share intentions: {(sharedIntentionMap.get(profile.userId) ?? []).map((intention) => DISCOVERY_INTENTIONS.find((item) => item.id === intention)?.label ?? intention).join(', ')}</p>
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
            <button className={styles.relationshipButton} type="button" disabled={relationshipBusyId === profile.userId || relationshipStates.get(profile.userId)?.blocked}
              onClick={() => runRelationshipAction(profile.userId, relationshipStates.get(profile.userId)?.following ? 'unfollow' : 'follow')}>
              {relationshipStates.get(profile.userId)?.following ? <UserMinus size={13} aria-hidden="true" /> : <UserPlus size={13} aria-hidden="true" />} {relationshipStates.get(profile.userId)?.following ? 'Following' : 'Follow'}
            </button>
            <button className={styles.relationshipButton} type="button" disabled={relationshipBusyId === profile.userId || ['outgoing', 'incoming', 'connected'].includes(relationshipStates.get(profile.userId)?.connection ?? 'none') || relationshipStates.get(profile.userId)?.blocked}
              onClick={() => runRelationshipAction(profile.userId, 'connect')}>
              {relationshipStates.get(profile.userId)?.connection === 'connected' ? <UserCheck size={13} aria-hidden="true" /> : <UserPlus size={13} aria-hidden="true" />}
              {relationshipStates.get(profile.userId)?.connection === 'connected' ? 'Connected' : relationshipStates.get(profile.userId)?.connection === 'outgoing' ? 'Request sent' : relationshipStates.get(profile.userId)?.connection === 'incoming' ? 'Respond below' : 'Connect'}
            </button>
            <button className={styles.messageButton} type="button" disabled={!profile.allowDirectMessages || relationshipStates.get(profile.userId)?.blocked}
              title={relationshipStates.get(profile.userId)?.blocked ? 'Unblock this member to enable messaging.' : profile.allowDirectMessages ? undefined : 'This member is not accepting direct messages.'}
              onClick={() => onMessage(profile)}><MessageCircle size={13} aria-hidden="true" /> {relationshipStates.get(profile.userId)?.blocked ? 'Blocked' : profile.allowDirectMessages ? 'Message' : 'Messages closed'}</button>
            <button className={styles.relationshipButton} type="button" disabled={relationshipBusyId === profile.userId || relationshipStates.get(profile.userId)?.hidden}
              onClick={() => runRelationshipAction(profile.userId, relationshipStates.get(profile.userId)?.hidden ? 'unhide' : 'hide')}
              title={relationshipStates.get(profile.userId)?.hidden ? 'Unhide from discovery' : 'Hide from discovery'}>
              <EyeOff size={13} aria-hidden="true" /> {relationshipStates.get(profile.userId)?.hidden ? 'Hidden' : 'Hide'}
            </button>
            <button className={styles.relationshipButton} type="button" disabled={relationshipBusyId === profile.userId}
              onClick={() => runRelationshipAction(profile.userId, relationshipStates.get(profile.userId)?.saved ? 'unsave' : 'save')}
              title={relationshipStates.get(profile.userId)?.saved ? 'Remove saved profile' : 'Save profile'}>
              <Bookmark size={13} aria-hidden="true" /> {relationshipStates.get(profile.userId)?.saved ? 'Saved' : 'Save'}
            </button>
            <button className={styles.blockButton} type="button" disabled={relationshipBusyId === profile.userId || relationshipStates.get(profile.userId)?.blocked}
              onClick={() => runRelationshipAction(profile.userId, 'block')} aria-label={`Block ${profile.displayName}`} title="Block member"><Ban size={13} aria-hidden="true" /></button>
            <ReportContentButton targetType="user" targetId={profile.userId} />
          </div>
        </article>
      ))}
    </div>
    );
  };

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

        {activeTab === 'people' && hiddenProfiles.length > 0 && (
          <section className={styles.requestsPanel} aria-labelledby="hidden-members-heading">
            <h2 id="hidden-members-heading">Hidden from discovery</h2>
            {hiddenProfiles.map((profile) => (
              <div className={styles.requestRow} key={profile.userId}>
                <span><strong>{profile.displayName}</strong> <span>{profile.username}</span></span>
                <div><button type="button" disabled={relationshipBusyId === profile.userId} onClick={() => runRelationshipAction(profile.userId, 'unhide')}>Unhide</button></div>
              </div>
            ))}
          </section>
        )}
        {activeTab === 'people' && savedProfiles.length > 0 && (
          <section className={styles.requestsPanel} aria-labelledby="saved-members-heading">
            <h2 id="saved-members-heading">Saved profiles</h2>
            {savedProfiles.map((profile) => (
              <div className={styles.requestRow} key={profile.userId}>
                <span><strong>{profile.displayName}</strong> <span>{profile.username}</span></span>
                <div>
                  <button type="button" onClick={() => void openSavedProfile(profile.userId)}>View</button>
                  <button type="button" disabled={relationshipBusyId === profile.userId} onClick={() => runRelationshipAction(profile.userId, 'unsave')}>Remove</button>
                </div>
              </div>
            ))}
          </section>
        )}
        {activeTab === 'people' && blockedProfiles.length > 0 && (
          <section className={styles.requestsPanel} aria-labelledby="blocked-members-heading">
            <h2 id="blocked-members-heading">Blocked members</h2>
            {blockedProfiles.map((profile) => (
              <div className={styles.requestRow} key={profile.userId}>
                <span><strong>{profile.displayName}</strong> <span>@{profile.username}</span></span>
                <div><button type="button" disabled={relationshipBusyId === profile.userId} onClick={() => runRelationshipAction(profile.userId, 'unblock')}>Unblock</button></div>
              </div>
            ))}
          </section>
        )}
        {activeTab === 'people' && incomingRequests.length > 0 && (
          <section className={styles.requestsPanel} aria-labelledby="connection-requests-heading">
            <h2 id="connection-requests-heading">Connection requests</h2>
            {incomingRequests.map((request) => (
              <div className={styles.requestRow} key={request.id}>
                <span><strong>{request.displayName}</strong> <span>@{request.username}</span></span>
                <div>
                  <button type="button" disabled={relationshipBusyId === request.id} onClick={() => runRelationshipAction(request.requesterId, 'accept', request.id)}><Check size={13} aria-hidden="true" /> Accept</button>
                  <button type="button" disabled={relationshipBusyId === request.id} onClick={() => runRelationshipAction(request.requesterId, 'decline', request.id)}><X size={13} aria-hidden="true" /> Decline</button>
                </div>
              </div>
            ))}
          </section>
        )}
        {activeTab === 'people' && relationshipError && <p className={styles.error} role="alert">{relationshipError}</p>}
        {activeTab === 'people' && (query.trim().length < 2 ? (
          isLoadingSuggestions ? <p className={styles.stateMessage} role="status">Finding people who share your public interests…</p>
          : suggestionError ? <p className={styles.error} role="alert">{suggestionError}</p>
          : suggestedProfiles.length > 0 ? (
            <>
              <p className={styles.stateMessage}>Suggested because you share public interests</p>
              {renderProfileResults(suggestedProfiles, suggestedInterests, sharedInterestMatches, publicIntentions, sharedIntentionMatches)}
            </>
          ) : (
            <div className={styles.emptyState}><Users size={23} aria-hidden="true" /><p>Add public interests on your profile to discover people with similar interests, or search for a public name or username. You can explore topics and gatherings without contacting anyone.</p></div>
          )
        ) : isSearching ? (
          <p className={styles.stateMessage} role="status">Searching public profiles and interests…</p>
        ) : error ? (
          <p className={styles.error} role="alert">{error}</p>
        ) : profiles.length === 0 ? (
          <p className={styles.stateMessage}>No public profiles or interests match that search.</p>
        ) : renderProfileResults(profiles, publicInterests, undefined, publicIntentions))}

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
