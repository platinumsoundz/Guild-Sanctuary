'use client';

import styles from './CallControls.module.css';

/**
 * Calling entry-point foundation.
 *
 * Controls remain unavailable until authenticated signalling, invitation state,
 * and the WebRTC connection lifecycle are implemented and verified. Keeping the
 * state explicit prevents the UI from implying that a call can already connect.
 */
export function CallControls() {
  return (
    <section className={styles.callControls} aria-label="Audio and video calling">
      <div className={styles.callActions}>
        <button type="button" disabled aria-describedby="calling-status" title="Audio calling is not available yet">
          <span aria-hidden="true">☎</span> Audio call
        </button>
        <button type="button" disabled aria-describedby="calling-status" title="Video calling is not available yet">
          <span aria-hidden="true">▣</span> Video call
        </button>
      </div>
      <p id="calling-status" role="status">
        Calling is being built. Calls will be enabled after secure call invitations and device-to-device connection setup are ready.
      </p>
    </section>
  );
}
