'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { Conversation, PublicProfile, WorldType } from '@/types/database';
import { fetchPublicProfileById, searchPublicProfiles } from '@/modules/profiles';
import { createGroupConversation, fetchUserConversations } from './service';
import styles from './MessagesInbox.module.css';
import { MessagePrivacyNotice } from './MessagePrivacyNotice';

interface MessagesInboxProps {
  currentUserId: string;
  onDiscoverPeople: () => void;
  onOpenConversation: (conversation: Conversation) => void;
  worldType?: WorldType;
}

export function MessagesInbox({ currentUserId, onDiscoverPeople, onOpenConversation, worldType = 'sanctuary' }: MessagesInboxProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [participantProfiles, setParticipantProfiles] = useState<Record<string, PublicProfile>>({});
  const [sessionUserId, setSessionUserId] = useState(currentUserId);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<PublicProfile[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inboxRequest = useRef(0);
  const searchRequest = useRef(0);
  const groupRequest = useRef(0);
  const activeUserId = useRef(currentUserId);
  const sessionReady = sessionUserId === currentUserId;
  const visibleConversations = sessionReady ? conversations : [];
  const visibleSelectedMembers = sessionReady ? selectedMembers : [];

  useEffect(() => {
    let cancelled = false;
    const participantIds = [...new Set(conversations.flatMap((conversation) =>
      conversation.participantIds.filter((participantId) => participantId !== currentUserId),
    ))];
    void Promise.all(participantIds.map(async (participantId) => {
      try {
        const profile = await fetchPublicProfileById(participantId);
        return profile ? [participantId, profile] as const : null;
      } catch {
        return null;
      }
    })).then((profiles) => {
      if (!cancelled) {
        setParticipantProfiles(Object.fromEntries(
          profiles.filter((profile): profile is NonNullable<typeof profile> => profile !== null),
        ));
      }
    });
    return () => { cancelled = true; };
  }, [conversations, currentUserId]);

  const refresh = useCallback(async () => {
    const requestId = ++inboxRequest.current;
    const requestedUserId = currentUserId;
    try {
      const nextConversations = await fetchUserConversations(requestedUserId, worldType);
      if (requestId !== inboxRequest.current || activeUserId.current !== requestedUserId) return;
      setConversations(nextConversations);
      setError(null);
    } catch (loadError) {
      if (requestId === inboxRequest.current && activeUserId.current === requestedUserId) {
        setError(loadError instanceof Error ? loadError.message : 'Conversations could not be loaded.');
      }
    } finally {
      if (requestId === inboxRequest.current && activeUserId.current === requestedUserId) {
        setIsLoading(false);
      }
    }
  }, [currentUserId, worldType]);

  useEffect(() => {
    activeUserId.current = currentUserId;
    setSessionUserId(currentUserId);
    inboxRequest.current += 1;
    searchRequest.current += 1;
    groupRequest.current += 1;
    setConversations([]);
    setParticipantProfiles({});
    setQuery('');
    setResults([]);
    setSelectedMembers([]);
    setGroupName('');
    setIsLoading(true);
    setIsSearching(false);
    setIsCreatingGroup(false);
    setError(null);
    void refresh();
    return () => {
      inboxRequest.current += 1;
      searchRequest.current += 1;
      groupRequest.current += 1;
    };
  }, [currentUserId, refresh]);

  // Keep the inbox current when a new conversation arrives on another device.
  // Poll only while this account is active and the tab is visible.
  useEffect(() => {
    if (!currentUserId || !sessionReady) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const interval = window.setInterval(refreshWhenVisible, 30_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [currentUserId, refresh, sessionReady]);

  const search = async (value: string) => {
    setQuery(value);
    const requestId = ++searchRequest.current;
    const requestedUserId = currentUserId;
    const normalizedQuery = value.trim();
    setResults([]);
    setError(null);
    if (normalizedQuery.length < 2) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const nextResults = await searchPublicProfiles(normalizedQuery);
      if (requestId === searchRequest.current && activeUserId.current === requestedUserId) {
        setResults(nextResults.filter((profile) => profile.userId !== requestedUserId));
        setError(null);
      }
    } catch (searchError) {
      if (requestId === searchRequest.current && activeUserId.current === requestedUserId) {
        setError(searchError instanceof Error ? searchError.message : 'People could not be searched.');
      }
    } finally {
      if (requestId === searchRequest.current && activeUserId.current === requestedUserId) setIsSearching(false);
    }
  };

  const toggleMember = (profile: PublicProfile) => {
    setSelectedMembers((current) => current.some((member) => member.userId === profile.userId)
      ? current.filter((member) => member.userId !== profile.userId)
      : [...current, profile]);
  };

  const handleCreateGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionReady || isCreatingGroup || selectedMembers.length < 2) return;
    const requestId = ++groupRequest.current;
    const requestedUserId = currentUserId;
    const requestedMembers = selectedMembers.map((member) => member.userId);
    const requestedName = groupName;
    setIsCreatingGroup(true);
    setError(null);
    try {
      const conversation = await createGroupConversation(requestedUserId, requestedMembers, requestedName, worldType);
      if (requestId !== groupRequest.current || activeUserId.current !== requestedUserId) return;
      setGroupName('');
      setSelectedMembers([]);
      setQuery('');
      setResults([]);
      await refresh();
      if (requestId === groupRequest.current && activeUserId.current === requestedUserId) {
        onOpenConversation(conversation);
      }
    } catch (createError) {
      if (requestId === groupRequest.current && activeUserId.current === requestedUserId) {
        setError(createError instanceof Error ? createError.message : 'The group conversation could not be created.');
      }
    } finally {
      if (requestId === groupRequest.current && activeUserId.current === requestedUserId) setIsCreatingGroup(false);
    }
  };

  return (
    <main className={styles.inbox} data-world={worldType}>
      <p className={styles.eyebrow}>PRIVATE MESSAGES</p>
      <h1>Messages</h1>
      <p className={styles.description}>Choose a one-to-one conversation or start a group chat.</p>
      <MessagePrivacyNotice />
      <section className={styles.groups} aria-labelledby="direct-title">
        <h2 id="direct-title">Start a one-to-one conversation</h2>
        <p className={styles.description}>Find a public profile and choose Message to start a private chat.</p>
        <button className={styles.actionButton} type="button" onClick={onDiscoverPeople}>Find someone to message</button>
      </section>
      <section className={styles.groups} aria-labelledby="group-title">
        <h2 id="group-title">Start a group conversation</h2>
        <form onSubmit={(event) => void handleCreateGroup(event)}>
          <label>
            <span>Group name</span>
            <input value={sessionReady ? groupName : ''} onChange={(event) => setGroupName(event.currentTarget.value)} minLength={2} maxLength={60} required disabled={!sessionReady} />
          </label>
          <label>
            <span>Find members by name or username</span>
            <input value={sessionReady ? query : ''} onChange={(event) => void search(event.currentTarget.value)} minLength={2} placeholder="Search community…" disabled={!sessionReady} />
          </label>
          {sessionReady && isSearching && <p className={styles.description} role="status">Searching…</p>}
          {sessionReady && results.length > 0 && (
            <ul className={styles.searchResults}>
              {results.map((profile) => (
                <li key={profile.userId}>
                  <label>
                    <input type="checkbox" checked={selectedMembers.some((member) => member.userId === profile.userId)} onChange={() => toggleMember(profile)} />
                    {profile.displayName} <span>@{profile.username}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.selected}>{visibleSelectedMembers.length} member{visibleSelectedMembers.length === 1 ? '' : 's'} selected (choose at least two)</p>
          <button className={styles.actionButton} type="submit" disabled={!sessionReady || selectedMembers.length < 2 || isCreatingGroup}>
            {isCreatingGroup ? 'Creating group…' : 'Create group'}
          </button>
        </form>
      </section>
      <section className={styles.conversations} aria-labelledby="conversations-title">
        <h2 id="conversations-title">Your conversations</h2>
        {sessionReady && error && <p className={styles.error} role="alert">{error}</p>}
        {!sessionReady || isLoading ? <p className={styles.description}>Loading conversations…</p> : visibleConversations.length === 0 ? (
          <p className={styles.description}>No conversations yet.</p>
        ) : visibleConversations.map((conversation) => (
          <button className={styles.conversation} key={conversation.id} type="button" onClick={() => onOpenConversation(conversation)}>
            <strong>{conversation.kind === 'group'
              ? conversation.name ?? 'Group conversation'
              : (() => {
                  const peerId = conversation.participantIds.find((participantId) => participantId !== currentUserId);
                  return (peerId && participantProfiles[peerId]?.displayName) || (peerId && participantProfiles[peerId]?.username && `@${participantProfiles[peerId].username}`) || 'Member profile unavailable';
                })()}</strong>
            <span>{conversation.kind === 'group'
              ? `${conversation.participantIds.length} members`
              : (() => {
                  const peerId = conversation.participantIds.find((participantId) => participantId !== currentUserId);
                  const profile = peerId ? participantProfiles[peerId] : undefined;
                  return profile ? `@${profile.username} · Private conversation` : 'Private conversation';
                })()}</span>
          </button>
        ))}
      </section>
    </main>
  );
}
