'use client';

import { useState, type FormEvent } from 'react';
import type { PublicProfile } from '@/types/database';
import type { Conversation } from '@/types/database';
import { useAppContext } from '@/context/AppContext';
import { useDirectMessages } from './useDirectMessages';
import { ReportContentButton } from '@/modules/moderation';
import styles from './DirectMessageThread.module.css';

interface DirectMessageThreadProps {
  peer?: PublicProfile;
  conversation?: Conversation;
  onBack: () => void;
}

export function DirectMessageThread({ peer, conversation, onBack }: DirectMessageThreadProps) {
  const { currentUser } = useAppContext();
  const { messages, isLoading, isSending, error, send } = useDirectMessages(peer?.userId ?? null, conversation?.id ?? null);
  const [draft, setDraft] = useState('');
  const title = conversation?.kind === 'group' ? conversation.name ?? 'Group conversation' : peer?.displayName ?? 'Direct conversation';
  const subtitle = conversation?.kind === 'group'
    ? `${conversation.participantIds.length} members`
    : peer ? `@${peer.username}` : 'Private conversation';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await send(draft)) {
      setDraft('');
    }
  };

  return (
    <main className={styles.thread}>
      <header className={styles.threadHeader}>
        <button className={styles.backButton} type="button" onClick={onBack}>Conversations</button>
        <div className={styles.peer}>
          <div className={styles.avatar} aria-hidden="true">{peer?.avatarUrl ? <img src={peer.avatarUrl} alt="" /> : title.slice(0, 1).toUpperCase()}</div>
          <div>
            <h1>{title}</h1>
            <span>{subtitle}</span>
          </div>
        </div>
      </header>
      <aside className={styles.privacyNotice} aria-label="Message privacy notice">
        <div className={styles.privacyNoticeHeading}>
          <span className={styles.privacyStatusDot} aria-hidden="true" />
          <strong>Standard server-stored messages · E2EE not active</strong>
        </div>
        <p>Sanctuary protects conversations with account access controls, but the current message content is not end-to-end encrypted. The service may be able to access server-stored message text. Avoid sending passwords, payment details, or information you would not want exposed.</p>
        <details className={styles.privacyDetails}>
          <summary>What this means and what we are building</summary>
          <ul>
            <li><strong>Now:</strong> messages are delivered through the Sanctuary database and restricted to conversation members.</li>
            <li><strong>Next:</strong> evaluate a maintained, independently reviewed end-to-end encryption protocol. Private keys must stay on your devices; the server should handle ciphertext, not readable message text.</li>
            <li><strong>Local storage:</strong> saving messages only in this browser is not automatically safer and may lose history or expose it on a shared device. It is not a substitute for end-to-end encryption.</li>
            <li><strong>Honest status:</strong> we will not label messaging end-to-end encrypted until key management, multi-device behavior, recovery, reporting, and security review pass.</li>
          </ul>
        </details>
      </aside>
      <section className={styles.messageList} aria-label={`Conversation: ${title}`} aria-live="polite">
        {isLoading ? <p className={styles.emptyMessage}>Opening conversation...</p> : messages.length === 0 ? (
          <p className={styles.emptyMessage}>This is the beginning of your conversation.</p>
        ) : messages.map((message) => (
          <article className={message.senderId === currentUser?.user.id ? styles.ownMessage : styles.peerMessage} key={message.id}>
            {conversation?.kind === 'group' && message.senderId !== currentUser?.user.id && <span className={styles.senderName}>{message.senderId}</span>}
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