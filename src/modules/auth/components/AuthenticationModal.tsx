'use client';

import { useEffect, useRef } from 'react';
import type { AuthSession, SignUpInput } from '../sessionStore';
import { AuthenticationForm } from './AuthenticationForm';
import styles from './AuthenticationModal.module.css';

interface AuthenticationModalProps {
  currentUser: AuthSession | null;
  pendingEmail: string | null;
  onClose: () => void;
  onLogin: (email: string) => void | Promise<void>;
  onSignup: (input: SignUpInput) => void | Promise<void>;
  onVerifyEmailCode: (code: string) => boolean | Promise<boolean>;
  onVerifyTwoFactorCode: (code: string) => void | Promise<void>;
  onCancelChallenge: () => void;
  onSetTwoFactorEnabled: (enabled: boolean) => void;
  onLogout: () => void;
}

export function AuthenticationModal({
  currentUser,
  pendingEmail,
  onClose,
  onLogin,
  onSignup,
  onVerifyEmailCode,
  onVerifyTwoFactorCode,
  onCancelChallenge,
  onSetTwoFactorEnabled,
  onLogout,
}: AuthenticationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const modal = modalRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !modal) {
        return;
      }

      const focusableElements = Array.from(
        modal.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'),
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        modal.focus();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        tabIndex={-1}
      >
        <div className={styles.modalHeader}>
          <div>
            <p className={styles.eyebrow}>MEMBER ACCESS</p>
            <h2 id="auth-modal-title">Your account</h2>
          </div>
          <button className={styles.closeButton} type="button" onClick={onClose}>
            Close
          </button>
        </div>
        <AuthenticationForm
          initialMode="login"
          initialEmail={pendingEmail ?? ''}
          onLogin={onLogin}
          onSignup={onSignup}
          onVerifyEmailCode={onVerifyEmailCode}
          onVerifyTwoFactorCode={onVerifyTwoFactorCode}
          onCancelChallenge={onCancelChallenge}
          onSuccess={onClose}
        />
        {currentUser && (
          <div className={styles.accountActions}>
            <div className={styles.accountDetails}>
              <span>Signed in as {currentUser.profile.displayName}</span>
              <span>{currentUser.user.email}</span>
              {!isSupabaseConfigured() && <button
                className={styles.securityButton}
                type="button"
                aria-pressed={currentUser.user.twoFactorEnabled}
                onClick={() => onSetTwoFactorEnabled(!currentUser.user.twoFactorEnabled)}
              >
                {currentUser.user.twoFactorEnabled ? 'Disable demo 2FA' : 'Enable demo 2FA'}
              </button>}
            </div>
            <button className={styles.signOutButton} type="button" onClick={() => {
              onLogout();
              onClose();
            }}>
              Sign out
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}