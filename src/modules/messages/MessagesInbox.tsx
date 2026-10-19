'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Conversation, PublicProfile } from '@/types/database';
import { searchPublicProfiles } from '@/modules/profiles';
import { createGroupConversation, fetchUserConversations } from './service';
import styles from './MessagesInbox.module.css';

interface MessagesInboxProps {
  currentUserId: string;
  onDiscoverPeople: () => void;
  onOpenConversation: (conversation: Conversation) => void;
}

export function MessagesInbox({ currentUserId, onDiscoverPeople, onOpenConversation }: MessagesInboxProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<PublicProfile[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setConversations(await fetchUserConversations(currentUserId));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Conversations could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [currentUserId]);

  const search = async (value: string) => {
    setQuery(value);
    try {
      setResults(value.trim().length >= 2 ? await searchPublicProfiles(value) : []);
      setError(null);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'People could not be searched.');
    }
  };

  const toggleMember = (profile: PublicProfile) => {
    setSelectedMembers((current) => current.some((member) => member.userId === profile.userId)
      ? current.filter((member) => member.userId !== profile.userId)
      : [...current, profile]);
  };

  const handleCreateGroup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const conversation = await createGroupConversation(currentUserId, selectedMembers.map((member) => member.userId), groupName);
      setGroupName('');
      setSelectedMembers([]);
      setQuery('');
      setResults([]);
      await refresh();
      onOpenConversation(conversation);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'The group conversation could not be created.');
    }
  };

  return (
    <main className={styles.inbox}>
      <p className={styles.eyebrow}>PRIVATE MESSAGES</p>
      <h1>Your conversations</h1>
      <p className={styles.description}>Start a private conversation from a public profile.</p>
      <button className={styles.actionButton} type="button" onClick={onDiscoverPeople}>Find people</button>
      <section className={styles.groups} aria-labelledby="group-title">
        <h2 id="group-title">Start a group conversation</h2>
        <form onSubmit={(event) => void handleCreateGroup(event)}>
          <label>
            <span>Group name</span>
            <input value={groupName} onChange={(event) => setGroupName(event.currentTarget.value)} minLength={2} maxLength={60} required />
          </label>
          <label>
            <span>Find members by name or username</span>
            <input value={query} onChange={(event) => void search(event.currentTarget.value)} minLength={2} placeholder="Search community…" />
          </label>
          {results.length > 0 && (
            <ul className={styles.searchResults}>
              {results.filter((profile) => profile.userId !== currentUserId).map((profile) => (
                <li key={profile.userId}>
                  <label>
                    <input type="checkbox" checked={selectedMembers.some((member) => member.userId === profile.userId)} onChange={() => toggleMember(profile)} />
                    {profile.displayName} <span>@{profile.username}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className={styles.selected}>{selectedMembers.length} member{selectedMembers.length === 1 ? '' : 's'} selected (choose at least two)</p>
          <button className={styles.actionButton} type="submit" disabled={selectedMembers.length < 2}>Create group</button>
        </form>
      </section>
      <section className={styles.conversations} aria-labelledby="conversations-title">
        <h2 id="conversations-title">Your conversations</h2>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {isLoading ? <p className={styles.description}>Loading conversations…</p> : conversations.length === 0 ? (
          <p className={styles.description}>No conversations yet.</p>
        ) : conversations.map((conversation) => (
          <button className={styles.conversation} key={conversation.id} type="button" onClick={() => onOpenConversation(conversation)}>
            <strong>{conversation.name ?? 'Direct message'}</strong>
            <span>{conversation.kind === 'group' ? `${conversation.participantIds.length} members` : 'Private conversation'}</span>
          </button>
        ))}
      </section>
    </main>
  );
}