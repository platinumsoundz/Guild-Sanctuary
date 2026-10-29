'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, X } from 'lucide-react';
import styles from './MessagePrivacyNotice.module.css';

/**
 * Deliberately honest disclosure while encrypted messaging is being designed.
 * Do not remove this notice until the client encryption protocol and its
 * end-to-end tests have been reviewed and released.
 */
export function MessagePrivacyNotice() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try { setDismissed(window.sessionStorage.getItem('sanctuary-dismiss-message-privacy') === '1'); }
    catch { /* Dismissal is optional when storage is blocked. */ }
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    try { window.sessionStorage.setItem('sanctuary-dismiss-message-privacy', '1'); }
    catch { /* The notice still closes for this render. */ }
    setDismissed(true);
  };

  return (
    <aside className={styles.notice} aria-label="Message privacy status">
      <ShieldAlert size={18} aria-hidden="true" />
      <div>
        <strong>End-to-end encryption is not active yet</strong>
        <p>Messages in this version are stored in Sanctuary's message database and are not currently end-to-end encrypted. Avoid sending passwords, financial details, medical information, or anything you would not want stored on the service.</p>
        <span>Encrypted messaging is being planned with private keys kept on your devices, not on Sanctuary's servers.</span>
      </div>
      <button className={styles.closeButton} type="button" onClick={dismiss} aria-label="Dismiss message privacy notice"><X size={17} aria-hidden="true" /></button>
    </aside>
  );
}
