import { ShieldAlert } from 'lucide-react';
import styles from './MessagePrivacyNotice.module.css';

/**
 * Deliberately honest disclosure while encrypted messaging is being designed.
 * Do not remove this notice until the client encryption protocol and its
 * end-to-end tests have been reviewed and released.
 */
export function MessagePrivacyNotice() {
  return (
    <aside className={styles.notice} aria-label="Message privacy status">
      <ShieldAlert size={18} aria-hidden="true" />
      <div>
        <strong>End-to-end encryption is not active yet</strong>
        <p>Messages are stored and delivered through the platform's Supabase services so they can sync between your signed-in devices. Avoid sending passwords, payment details, or highly sensitive information.</p>
        <span>Private conversations are restricted by account and conversation access controls, but the service itself can process message contents. This is not end-to-end encryption.</span>
      </div>
    </aside>
  );
}
