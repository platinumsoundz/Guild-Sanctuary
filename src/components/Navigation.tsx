'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Gamepad2, Sparkles, Sun, UserRound, type LucideIcon } from 'lucide-react';
import type { WorldType } from '@/types';
import { AuthenticationModal, type AuthSession, type SignUpInput } from '@/modules/auth';
import styles from './Navigation.module.css';

const worlds: { type: WorldType; name: string; descriptor: string; icon: LucideIcon; accentIcon: LucideIcon }[] = [
  { type: 'sanctuary', name: 'The Sanctuary', descriptor: 'Reflect & grow', icon: Sun, accentIcon: Sparkles },
  { type: 'guild', name: 'The Guild Hall', descriptor: 'Play & connect', icon: Gamepad2, accentIcon: Flame },
];

interface NavigationProps {
  activeWorld: WorldType;
  currentUser: AuthSession | null;
  pendingEmail: string | null;
  isSessionReady: boolean;
  onSelectWorld: (world: WorldType) => void;
  onLogin: (email: string) => void;
  onSignup: (input: SignUpInput) => void;
  onVerifyEmailCode: (code: string) => boolean;
  onVerifyTwoFactorCode: (code: string) => void;
  onCancelChallenge: () => void;
  onSetTwoFactorEnabled: (enabled: boolean) => void;
  onLogout: () => void;
}

export function Navigation({
  activeWorld,
  currentUser,
  pendingEmail,
  isSessionReady,
  onSelectWorld,
  onLogin,
  onSignup,
  onVerifyEmailCode,
  onVerifyTwoFactorCode,
  onCancelChallenge,
  onSetTwoFactorEnabled,
  onLogout,
}: NavigationProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  return (
    <>
      <header className={styles.header}>
        <p className={styles.headerLabel}>CHOOSE YOUR WORLD</p>
        <nav className={`${styles.switcher} min-w-0 max-w-full flex-wrap sm:flex-nowrap`} aria-label="Choose a world">
          {worlds.map((world) => (
            <button
              key={world.type}
              className={`${styles.worldButton} min-w-0 max-w-full flex-1`}
              type="button"
              aria-pressed={activeWorld === world.type}
              onClick={() => onSelectWorld(world.type)}
            >
              {activeWorld === world.type && (
                <motion.span
                  className={styles.worldIndicator}
                  layoutId="active-world-indicator"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  aria-hidden="true"
                />
              )}
              <span className={styles.worldMark} aria-hidden="true">
                <world.icon size={18} strokeWidth={1.8} />
                <world.accentIcon className={styles.worldAccentIcon} size={10} strokeWidth={2} />
              </span>
              <span className={styles.worldCopy}>
                <span className={styles.worldName}>{world.name}</span>
                <span className={styles.worldDescriptor}>{world.descriptor}</span>
              </span>
            </button>
          ))}
        </nav>
        <div className={styles.accountArea}>
          {!isSessionReady ? (
            <span className={styles.accountPlaceholder} role="status">Restoring session</span>
          ) : (
            <button
              className={styles.accountButton}
              type="button"
              aria-haspopup="dialog"
              onClick={() => setIsAuthModalOpen(true)}
            >
              {currentUser ? (
                <>
                  <span className={styles.accountMark} aria-hidden="true">
                    <UserRound size={15} strokeWidth={1.8} />
                  </span>
                  <span>{currentUser.profile.displayName}</span>
                </>
              ) : 'Sign in / Register'}
            </button>
          )}
        </div>
      </header>
      {isAuthModalOpen && (
        <AuthenticationModal
          currentUser={currentUser}
          pendingEmail={pendingEmail}
          onClose={closeAuthModal}
          onLogin={onLogin}
          onSignup={onSignup}
          onVerifyEmailCode={onVerifyEmailCode}
          onVerifyTwoFactorCode={onVerifyTwoFactorCode}
          onCancelChallenge={onCancelChallenge}
          onSetTwoFactorEnabled={onSetTwoFactorEnabled}
          onLogout={onLogout}
        />
      )}
    </>
  );
}