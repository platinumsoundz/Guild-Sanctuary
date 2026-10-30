import { ShieldAlert } from 'lucide-react';
import styles from './MessagePrivacyNotice.module.css';

/**
 * Honest disclosure of the current messaging privacy model.
 * Messages are not end-to-end encrypted.
 */
export function MessagePrivacyNotice() {
  return (
    <aside className={styles.notice} aria-label="Message privacy status">
      <ShieldAlert size={18} aria-hidden="true" />
      <div>
        <strong>End-to-end encryption is not active</strong>
        <p>Messages are stored and delivered through the platform's Supabase services so they can sync between your signed-in devices. Messages are not end-to-end encrypted. Avoid sending passwords, payment details, or highly sensitive information.</p>
        <span>Private conversations are restricted by account and conversation access controls, but the service itself can process message contents. This is not end-to-end encryption.</span>
      </div>
    </aside>
  );
}
