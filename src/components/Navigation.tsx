'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  Clapperboard,
  Flame,
  Gamepad2,
  Menu,
  MessageSquare,
  Newspaper,
  Search,
  Settings,
  Sparkles,
  Sun,
  UserRound,
  HeartHandshake,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { WorldType } from '@/types';
import type { NavigationState } from '@/context/AppContext';
import { AuthenticationModal, type AuthSession, type SignUpInput } from '@/modules/auth';
import styles from './Navigation.module.css';

const worlds: { type: WorldType; name: string; descriptor: string; icon: LucideIcon; accentIcon: LucideIcon }[] = [
  { type: 'sanctuary', name: 'The Sanctuary', descriptor: 'Reflect & grow', icon: Sun, accentIcon: Sparkles },
  { type: 'guild', name: 'The Guild Hall', descriptor: 'Play & connect', icon: Gamepad2, accentIcon: Flame },
];

const navigationItems: { id: NavigationState; label: string; icon: LucideIcon }[] = [
  { id: 'feed', label: 'Feed', icon: Newspaper },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'discover', label: 'Discover', icon: Search },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'shorts', label: 'Shorts', icon: Clapperboard },
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'support', label: 'Support the community', icon: HeartHandshake },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface NavigationProps {
  activeWorld: WorldType;
  activeNavigation: NavigationState;
  currentUser: AuthSession | null;
  pendingEmail: string | null;
  isSessionReady: boolean;
  onSelectWorld: (world: WorldType) => void;
  onNavigate: (navigation: NavigationState) => void;
  onLogin: (email: string) => void | Promise<void>;
  onSignup: (input: SignUpInput) => void | Promise<void>;
  onVerifyEmailCode: (code: string) => boolean | Promise<boolean>;
  onVerifyTwoFactorCode: (code: string) => void | Promise<void>;
  onCancelChallenge: () => void;
  onSetTwoFactorEnabled: (enabled: boolean) => void;
  onLogout: () => void;
}

export function Navigation({
  activeWorld,
  activeNavigation,
  currentUser,
  pendingEmail,
  isSessionReady,
  onSelectWorld,
  onNavigate,
  onLogin,
  onSignup,
  onVerifyEmailCode,
  onVerifyTwoFactorCode,
  onCancelChallenge,
  onSetTwoFactorEnabled,
  onLogout,
}: NavigationProps) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const closeMenuAndRestoreFocus = useCallback(() => {
    closeMenu();
    menuButtonRef.current?.focus();
  }, [closeMenu]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenuAndRestoreFocus();
        return;
      }
      if (event.key === 'Tab') {
        const drawer = document.getElementById('mobile-navigation-drawer');
        const focusableElements = drawer?.querySelectorAll<HTMLElement>('button:not([disabled])');
        if (!focusableElements?.length) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeMenuAndRestoreFocus, isMenuOpen]);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerIdentity}>
          {currentUser && (
            <button
              ref={menuButtonRef}
              className={styles.menuButton}
              type="button"
              aria-label="Open main navigation"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation-drawer"
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu size={21} strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}
          <p className={styles.headerLabel}>CHOOSE YOUR WORLD</p>
        </div>
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
      {currentUser && (
        <>
          <nav className={styles.desktopNavigation} aria-label="Main navigation">
            <div className={styles.desktopNavigationItems}>
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  className={styles.desktopNavigationButton}
                  type="button"
                  aria-current={activeNavigation === item.id ? 'page' : undefined}
                  onClick={() => onNavigate(item.id)}
                >
                  <item.icon size={15} strokeWidth={1.8} aria-hidden="true" />
                  {item.label}
                </button>
              ))}
            </div>
            <span className={styles.accountName}>{currentUser.profile.displayName}</span>
          </nav>
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <motion.button
                  className={styles.drawerOverlay}
                  type="button"
                  aria-label="Close navigation menu"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={closeMenuAndRestoreFocus}
                />
                <motion.aside
                  id="mobile-navigation-drawer"
                  className={styles.mobileDrawer}
                  role="dialog"
                  aria-modal="true"
                  aria-label="Main navigation"
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                >
                  <div className={styles.drawerHeader}>
                    <span className={styles.drawerTitle}>Navigate</span>
                    <button
                      ref={closeButtonRef}
                      className={styles.drawerCloseButton}
                      type="button"
                      aria-label="Close navigation menu"
                      onClick={closeMenuAndRestoreFocus}
                    >
                      <X size={20} aria-hidden="true" />
                    </button>
                  </div>
                  <nav aria-label="Main navigation">
                    <div className={styles.drawerNavigationItems}>
                      {navigationItems.map((item) => (
                        <button
                          key={item.id}
                          className={styles.drawerNavigationButton}
                          type="button"
                          aria-current={activeNavigation === item.id ? 'page' : undefined}
                          onClick={() => {
                            onNavigate(item.id);
                            closeMenuAndRestoreFocus();
                          }}
                        >
                          <item.icon size={19} strokeWidth={1.8} aria-hidden="true" />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </nav>
                  <p className={styles.drawerAccountName}>{currentUser.profile.displayName}</p>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        </>
      )}
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