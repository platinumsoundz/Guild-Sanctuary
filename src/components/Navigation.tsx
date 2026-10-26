'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  Bell,
  Clapperboard,
  Menu,
  MessageSquare,
  Newspaper,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
  Wallet,
  HeartHandshake,
  Gamepad2,
  Map,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { NavigationState } from '@/context/AppContext';
import { AuthenticationModal, type AuthSession, type SignUpInput } from '@/modules/auth';
import styles from './Navigation.module.css';

const navigationItems: { id: NavigationState; label: string; icon: LucideIcon }[] = [
  { id: 'feed', label: 'Feed', icon: Newspaper },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'discover', label: 'Discover', icon: Search },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'shorts', label: 'Shorts', icon: Clapperboard },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'roadmap', label: 'Systems & Roadmap', icon: Map },
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'support', label: 'Support the community', icon: HeartHandshake },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'admin', label: 'Admin & Moderation', icon: ShieldCheck },
];

interface NavigationProps {
  activeNavigation: NavigationState;
  currentUser: AuthSession | null;
  isGuest: boolean;
  onExploreAsGuest: () => void;
  pendingEmail: string | null;
  isSessionReady: boolean;
  onNavigate: (navigation: NavigationState) => void;
  onLogin: (email: string, password: string) => void | Promise<void>;
  onSignup: (input: SignUpInput, password: string) => boolean | Promise<boolean>;
  onResetPassword: (email: string) => void | Promise<void>;
  onVerifyEmailCode: (code: string) => boolean | Promise<boolean>;
  onVerifyTwoFactorCode: (code: string) => void | Promise<void>;
  onCancelChallenge: () => void;
  onSetTwoFactorEnabled: (enabled: boolean) => void;
  onLogout: () => void;
}

export function Navigation({
  activeNavigation,
  currentUser,
  isGuest,
  onExploreAsGuest,
  pendingEmail,
  isSessionReady,
  onNavigate,
  onLogin,
  onSignup,
  onResetPassword,
  onVerifyEmailCode,
  onVerifyTwoFactorCode,
  onCancelChallenge,
  onSetTwoFactorEnabled,
  onLogout,
}: NavigationProps) {
  const visibleNavigationItems = navigationItems.filter((item) => item.id !== 'admin' || Boolean(currentUser && ['moderator', 'admin', 'developer', 'owner'].includes(currentUser.profile.role)));
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
          {isSessionReady && (
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
          <div className="flex items-center gap-2">
            <Sun size={18} className="text-amber-400" />
            <p className={styles.headerLabel}>THE SANCTUARY</p>
          </div>
        </div>
        <div className={styles.accountArea}>
          {isSessionReady && (
            <button className={styles.notificationButton} type="button" aria-label="Open notifications" onClick={() => onNavigate('notifications')}>
              <Bell size={19} strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}
          {!isSessionReady ? (
            <span className={styles.accountPlaceholder} role="status">Restoring session</span>
          ) : (
            <>
            {!currentUser && !isGuest && <button className={styles.guestButton} type="button" onClick={onExploreAsGuest}>Explore as Guest</button>}
            <button
              className={styles.accountButton}
              type="button"
              aria-haspopup="dialog"
              onClick={() => setIsAuthModalOpen(true)}
            >
              {currentUser ? (
                <>
                  <span className={styles.accountMark} aria-hidden="true"><UserRound size={15} strokeWidth={1.8} /></span>
                  <span className={styles.accountButtonLabel}>{currentUser.profile.displayName}</span>
                </>
              ) : isGuest ? 'Guest · Sign in' : 'Sign in / Register'}
            </button>
            </>
          )}
        </div>
      </header>
      {isSessionReady && (
        <>
          <nav className={styles.desktopNavigation} aria-label="Main navigation">
            <div className={styles.desktopNavigationItems}>
              {visibleNavigationItems.map((item) => (
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
            <span className={styles.accountName}>{currentUser?.profile.displayName ?? (isGuest ? 'Guest mode' : '')}</span>
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
                  <p className={styles.drawerAccountName}>{currentUser?.profile.displayName ?? (isGuest ? 'Guest mode · exploring' : 'Welcome to the Sanctuary')}</p>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        </>
      )}
      {isAuthModalOpen && (
        <AuthenticationModal
          currentUser={currentUser}
          isGuest={isGuest}
          pendingEmail={pendingEmail}
          onClose={closeAuthModal}
          onLogin={onLogin}
          onSignup={onSignup}
          onResetPassword={onResetPassword}
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