'use client';

import { ResponsiveShell } from '@/components/ResponsiveShell';
import { Navigation } from '@/components/Navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import type { Conversation, PublicProfile } from '@/types/database';
import { useAppContext, type NavigationState } from '@/context/AppContext';
import { AuthenticationGateway } from '@/modules/auth';
import { DualWorldFeed } from '@/modules/feeds';
import { MeetupCalendarPlaceholder } from '@/modules/events';
import { ProfileDashboard, ProfileDiscovery } from '@/modules/profiles';
import { WalletPanel } from '@/modules/economy';
import { DirectMessageThread, MessagesInbox } from '@/modules/messages';
import { ShortsFeed } from '@/modules/shorts';
import { SettingsHub } from '@/modules/settings';
import { fetchPostsByAuthor } from '@/modules/feeds';
import styles from './AppWorkspace.module.css';

export function AppWorkspace() {
  const {
    activeWorld,
    activeNavigation,
    currentUser,
    isAuthenticated,
    isSessionReady,
    login,
    logout,
    deleteAccount,
    pendingEmail,
    selectWorld,
    setTwoFactorEnabled,
    setActiveNavigation,
    updateProfile,
    signup,
    verifyEmailCode,
    verifyTwoFactorCode,
    cancelAuthChallenge,
  } = useAppContext();
  const [messagePeer, setMessagePeer] = useState<PublicProfile | null>(null);
  const [messageConversation, setMessageConversation] = useState<Conversation | null>(null);
  const [profilePosts, setProfilePosts] = useState<import('@/types/database').Post[]>([]);
  const [isProfilePostsLoading, setIsProfilePostsLoading] = useState(false);

  useEffect(() => {
    if (activeNavigation !== 'profile' || !currentUser) {
      return;
    }

    let cancelled = false;
    setIsProfilePostsLoading(true);
    fetchPostsByAuthor(currentUser.user.id)
      .then((posts) => {
        if (!cancelled) setProfilePosts(posts);
      })
      .finally(() => {
        if (!cancelled) setIsProfilePostsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeNavigation, currentUser]);

  const openMessage = (profile: PublicProfile) => {
    setMessageConversation(null);
    setMessagePeer(profile);
    setActiveNavigation('messages');
  };

  const openNavigation = (navigation: NavigationState) => {
    if (navigation === 'messages') {
      setMessagePeer(null);
      setMessageConversation(null);
    }
    setActiveNavigation(navigation);
  };

  const authenticatedContent = isAuthenticated && currentUser ? (
    <>
      {activeNavigation === 'feed' ? (
        <DualWorldFeed />
      ) : activeNavigation === 'events' ? (
        <MeetupCalendarPlaceholder />
      ) : activeNavigation === 'profile' ? (
        <ProfileDashboard
          profile={currentUser.profile}
          posts={profilePosts}
          isPostsLoading={isProfilePostsLoading}
          onSave={updateProfile}
        />
      ) : activeNavigation === 'wallet' ? (
        <main className={styles.walletPage}>
          <WalletPanel userId={currentUser.user.id} />
        </main>
      ) : activeNavigation === 'discover' ? (
        <ProfileDiscovery currentUserId={currentUser.user.id} onMessage={openMessage} />
      ) : activeNavigation === 'messages' && messagePeer ? (
        <DirectMessageThread peer={messagePeer} onBack={() => setMessagePeer(null)} />
      ) : activeNavigation === 'messages' && messageConversation ? (
        <DirectMessageThread conversation={messageConversation} onBack={() => setMessageConversation(null)} />
      ) : activeNavigation === 'messages' ? (
        <MessagesInbox
          currentUserId={currentUser.user.id}
          onDiscoverPeople={() => setActiveNavigation('discover')}
          onOpenConversation={(conversation) => {
            setMessagePeer(null);
            setMessageConversation(conversation);
          }}
        />
      ) : activeNavigation === 'shorts' ? (
        <ShortsFeed />
      ) : activeNavigation === 'settings' ? (
        <SettingsHub
          userId={currentUser.user.id}
          email={currentUser.user.email}
          twoFactorEnabled={currentUser.user.twoFactorEnabled}
          privacy={currentUser.profile.privacy}
          visibility={currentUser.profile.visibility}
          socialLinks={currentUser.profile.socialLinks}
          onUpdateProfile={updateProfile}
          onDeleteAccount={deleteAccount}
        />
      ) : (
        <main className={styles.sectionPage}>
          <p className={styles.sectionEyebrow}>YOUR CONVERSATIONS</p>
          <h1>Messages</h1>
          <p className={styles.sectionDescription}>Private conversations with your community will appear here.</p>
        </main>
      )}
    </>
  ) : (
    <AuthenticationGateway
      onLogin={login}
      onSignup={signup}
      onVerifyEmailCode={verifyEmailCode}
      onVerifyTwoFactorCode={verifyTwoFactorCode}
      onCancelChallenge={cancelAuthChallenge}
    />
  );

  return (
    <MotionConfig reducedMotion="user">
      <ResponsiveShell>
        <div className={`${styles.worldSurface} w-full min-w-0 max-w-full overflow-x-clip`} data-world={activeWorld}>
        <Navigation
          activeWorld={activeWorld}
          activeNavigation={activeNavigation}
          currentUser={currentUser}
          pendingEmail={pendingEmail}
          isSessionReady={isSessionReady}
          onSelectWorld={(world) => void selectWorld(world)}
          onNavigate={openNavigation}
          onLogin={login}
          onSignup={signup}
          onVerifyEmailCode={verifyEmailCode}
          onVerifyTwoFactorCode={verifyTwoFactorCode}
          onCancelChallenge={cancelAuthChallenge}
          onSetTwoFactorEnabled={setTwoFactorEnabled}
          onLogout={logout}
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeWorld}
            className={`${styles.worldContent} w-full min-w-0 max-w-full`}
            initial={activeWorld === 'sanctuary'
              ? { opacity: 0, y: 7 }
              : { opacity: 0, x: 12, scale: 0.99 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={activeWorld === 'sanctuary'
              ? { opacity: 0, y: -4 }
              : { opacity: 0, x: -8, scale: 0.995 }}
            transition={activeWorld === 'sanctuary'
              ? { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.2, ease: 'easeOut' }}
          >
            {isSessionReady ? authenticatedContent : (
              <main className={styles.sessionLoading} role="status">
                Restoring your session...
              </main>
            )}
          </motion.div>
        </AnimatePresence>
        </div>
      </ResponsiveShell>
    </MotionConfig>
  );
}