'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Conversation, PublicProfile, WorldType } from '@/types/database';
import { useAppContext } from '@/context/AppContext';
import { fetchPublicProfileById } from '@/modules/profiles';
import { useDirectMessages } from './useDirectMessages';
import { ReportContentButton } from '@/modules/moderation';
import styles from './DirectMessageThread.module.css';
import { MessagePrivacyNotice } from './MessagePrivacyNotice';

interface DirectMessageThreadProps {
  peer?: PublicProfile;
  conversation?: Conversation;
  onBack: () => void;
  worldType?: WorldType;
}

export function DirectMessageThread({ peer, conversation, onBack, worldType = 'sanctuary' }: DirectMessageThreadProps) {
  const { currentUser } = useAppContext();
  const { messages, isLoading, isSending, error, send } = useDirectMessages(peer?.userId ?? null, conversation?.id ?? null, worldType);
  const [draft, setDraft] = useState('');
  const [senderProfiles, setSenderProfiles] = useState<Record<string, PublicProfile>>({});
  const peerId = peer?.userId ?? conversation?.participantIds.find((participantId) => participantId !== currentUser?.user.id);
  const resolvedPeer = peer ?? (peerId ? senderProfiles[peerId] : undefined);
  const title = conversation?.kind === 'group' ? conversation.name ?? 'Group conversation' : resolvedPeer?.displayName ?? (resolvedPeer?.username ? `@${resolvedPeer.username}` : 'Member profile unavailable');
  const subtitle = conversation?.kind === 'group'
    ? `${conversation.participantIds.length} members`
    : resolvedPeer ? `@${resolvedPeer.username}` : 'Private conversation';

  useEffect(() => {
    let cancelled = false;
    const ids = [...new Set([
      ...(conversation?.participantIds ?? []),
      ...messages.map((message) => message.senderId),
    ])].filter((id) => id && id !== currentUser?.user.id);
    void Promise.all(ids.map(async (id) => {
      try {
        const profile = await fetchPublicProfileById(id);
        return profile ? [id, profile] as const : null;
      } catch {
        return null;
      }
    })).then((profiles) => {
      if (!cancelled) {
        setSenderProfiles((current) => ({
          ...current,
          ...Object.fromEntries(profiles.filter((profile): profile is NonNullable<typeof profile> => profile !== null)),
        }));
      }
    });
    return () => { cancelled = true; };
  }, [conversation?.id, conversation?.participantIds, currentUser?.user.id, messages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await send(draft)) {
      setDraft('');
    }
  };

  return (
    <main className={styles.thread} data-world={worldType}>
      <header className={styles.threadHeader}>
        <button className={styles.backButton} type="button" onClick={onBack}>{worldType === 'guild' ? 'Guild conversations' : 'Conversations'}</button>
        <div className={styles.peer}>
          <div className={styles.avatar} aria-hidden="true">{resolvedPeer?.avatarUrl ? <img src={resolvedPeer.avatarUrl} alt="" /> : title.slice(0, 1).toUpperCase()}</div>
          <div>
            <h1>{title}</h1>
            <span>{subtitle}</span>
          </div>
        </div>
      </header>
      <MessagePrivacyNotice />
      <section className={styles.messageList} aria-label={`Conversation: ${title}`} aria-live="polite">
        {isLoading ? <p className={styles.emptyMessage}>Opening conversation...</p> : messages.length === 0 ? (
          <p className={styles.emptyMessage}>This is the beginning of your conversation.</p>
        ) : messages.map((message) => (
          <article className={message.senderId === currentUser?.user.id ? styles.ownMessage : styles.peerMessage} key={message.id}>
            {conversation?.kind === 'group' && <span className={styles.senderName}>{message.senderId === currentUser?.user.id ? currentUser.profile.displayName : senderProfiles[message.senderId]?.displayName ?? (senderProfiles[message.senderId]?.username ? `@${senderProfiles[message.senderId].username}` : 'Member profile unavailable')}</span>}
            <p>{message.body}</p>
            <time dateTime={message.sentAt}>{message.sentAt.slice(11, 16)} UTC</time>
            {message.senderId !== currentUser?.user.id && <ReportContentButton targetType="message" targetId={message.id} />}
          </article>
        ))}
      </section>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <form className={styles.composer} onSubmit={handleSubmit}>
        <label className={styles.srOnly} htmlFor="direct-message">Write a message</label>
        <textarea
          id="direct-message"
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          maxLength={2000}
          rows={2}
          placeholder="Write a private message..."
          required
        />
        <button className={styles.sendButton} type="submit" disabled={isSending || isLoading}>
          {isSending ? 'Sending' : 'Send'}
        </button>
      </form>
    </main>
  );
}