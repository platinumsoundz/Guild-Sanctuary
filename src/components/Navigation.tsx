'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  CalendarCheck,
  Bell,
  Clapperboard,
  Menu,
  MessageSquare,
  Newspaper,
  Search,
  Settings,
  ShieldCheck,
  ShieldAlert,
  UserRound,
  Wallet,
  ShoppingBag,
  HeartHandshake,
  Gamepad2,
  Sun,
  Map,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { NavigationState } from '@/context/AppContext';
import { canAccessSanctuaryPage } from '@/lib/sanctuaryFeatureGates';
import { fetchPageVisibility, isPageVisible, type PageVisibilityMap } from '@/lib/pageVisibility';
import { AuthenticationModal, type AuthSession, type SignUpInput } from '@/modules/auth';
import styles from './Navigation.module.css';
import { NotificationBar } from '@/components/NotificationBar';

const mobilePrimaryItems: { id: NavigationState; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'feed', label: 'Community', icon: Newspaper },
  { id: 'discover', label: 'Discover', icon: Search },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'profile', label: 'You', icon: UserRound },
];

const navigationItems: { id: NavigationState; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'feed', label: 'Community', icon: Newspaper },
  { id: 'planner', label: 'Daily Planner', icon: CalendarCheck },
  { id: 'shop', label: 'Token Shop', icon: ShoppingBag },
  { id: 'admin', label: 'Admin', icon: ShieldCheck },
  { id: 'moderation', label: 'Moderation', icon: ShieldAlert },
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'discover', label: 'Discover', icon: Search },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'shorts', label: 'Shorts', icon: Clapperboard },
  { id: 'games', label: 'Cosmic Arcade', icon: Gamepad2 },
  { id: 'roadmap', label: 'Sanctuary Roadmap', icon: Map },
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'support', label: 'Support the community', icon: HeartHandshake },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
  { id: 'feedback-inbox', label: 'Feedback inbox', icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const navigationGroups: { label: string; items: NavigationState[] }[] = [
  { label: 'Start here', items: ['today', 'feed'] },
  { label: 'Connect', items: ['discover', 'messages', 'events', 'shorts'] },
  { label: 'Your space', items: ['profile', 'planner', 'wallet'] },
  { label: 'Explore', items: ['games', 'support', 'shop'] },
  { label: 'Sanctuary tools', items: ['notifications', 'roadmap', 'feedback', 'feedback-inbox', 'settings'] },
  { label: 'Stewardship', items: ['admin', 'moderation'] },
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
  const role = currentUser?.profile.role?.toLowerCase() ?? 'user';
  const guestNavigationPages = new Set<NavigationState>(['today', 'feed', 'discover', 'events', 'shorts', 'games', 'roadmap', 'support', 'feedback']);
  const [pageVisibility, setPageVisibility] = useState<PageVisibilityMap>({});
  useEffect(() => {
    let cancelled = false;
    void fetchPageVisibility().then((value) => { if (!cancelled) setPageVisibility(value); }).catch(() => { if (!cancelled) setPageVisibility({}); });
    return () => { cancelled = true; };
  }, [currentUser?.user.id, isGuest]);
  const visibleNavigationItems = (isGuest
    ? navigationItems.filter((item) => guestNavigationPages.has(item.id))
    : navigationItems.filter((item) => item.id === 'feedback-inbox'
      ? ['developer', 'owner'].includes(role)
      : canAccessSanctuaryPage(item.id, currentUser ? role : 'user')))
    .filter((item) => item.id === 'feedback' || item.id === 'feedback-inbox' || isPageVisible(item.id, pageVisibility, isGuest ? 'guest' : role));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEntryMenuOpen, setIsEntryMenuOpen] = useState(false);
  const entryMenuRef = useRef<HTMLDivElement>(null);
  const entryMenuButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);
  const closeEntryMenu = useCallback(() => setIsEntryMenuOpen(false), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const closeMenuAndRestoreFocus = useCallback(() => {
    closeMenu();
    menuButtonRef.current?.focus();
  }, [closeMenu]);

  useEffect(() => {
    if (!isEntryMenuOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || entryMenuRef.current?.contains(target)) return;
      closeEntryMenu();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeEntryMenu();
      entryMenuButtonRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [closeEntryMenu, isEntryMenuOpen]);

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
            <button ref={menuButtonRef} className={styles.menuButton} type="button" aria-label="Open main navigation" aria-expanded={isMenuOpen} aria-controls="mobile-navigation-drawer" onClick={() => setIsMenuOpen(true)}>
              <Menu size={21} strokeWidth={1.8} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className={styles.accountArea}>
          {isSessionReady && <NotificationBar compact />}
          {!isSessionReady ? (
            <span className={styles.accountPlaceholder} role="status">Restoring session</span>
          ) : (
            <>
            {!currentUser && !isGuest ? (
              <div className={styles.accountEntry} ref={entryMenuRef}>
                <button
                  ref={entryMenuButtonRef}
                  className={styles.accountButton}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={isEntryMenuOpen}
                  aria-controls="account-entry-menu"
                  onClick={() => setIsEntryMenuOpen((open) => !open)}
                >
                  <span className={styles.accountMark} aria-hidden="true"><UserRound size={15} strokeWidth={1.8} /></span>
                  <span className={styles.accountButtonLabel}>Sign in / Guest</span>
                </button>
                {isEntryMenuOpen && (
                  <div id="account-entry-menu" className={styles.accountEntryMenu} role="menu" aria-label="Account options">
                    <button type="button" role="menuitem" onClick={() => { closeEntryMenu(); setIsAuthModalOpen(true); }}>Sign in / Register</button>
                    <button type="button" role="menuitem" onClick={() => { closeEntryMenu(); onExploreAsGuest(); }}>Explore as Guest</button>
                  </div>
                )}
              </div>
            ) : (
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
                ) : 'Guest · Sign in'}
              </button>
            )}
            </>
          )}
        </div>
      </header>
      {isSessionReady && (
        <>
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
                    <div className={styles.drawerNavigationGroups}>
                      {navigationGroups.map((group) => {
                        const groupItems = group.items
                          .map((id) => visibleNavigationItems.find((item) => item.id === id))
                          .filter((item): item is typeof navigationItems[number] => Boolean(item));
                        if (!groupItems.length) return null;
                        return (
                          <section className={styles.drawerNavigationGroup} key={group.label} aria-label={group.label}>
                            <h2 className={styles.drawerGroupLabel}>{group.label}</h2>
                            <div className={styles.drawerNavigationItems}>
                              {groupItems.map((item) => (
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
                          </section>
                        );
                      })}
                    </div>
                  </nav>
                  <p className={styles.drawerAccountName}>{currentUser?.profile.displayName ?? (isGuest ? 'Guest mode · exploring' : 'Welcome to the Sanctuary')}</p>
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        </>
      )}
      {isSessionReady && (
        <nav className={styles.mobileBottomNavigation} aria-label="Quick navigation">
          {mobilePrimaryItems.filter((item) => visibleNavigationItems.some((visible) => visible.id === item.id)).map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.mobileBottomButton}
              aria-current={activeNavigation === item.id ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <item.icon size={20} strokeWidth={1.8} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
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
