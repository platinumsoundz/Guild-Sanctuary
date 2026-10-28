'use client';

import { ResponsiveShell } from '@/components/ResponsiveShell';
import { Navigation } from '@/components/Navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { Conversation, PublicProfile } from '@/types/database';
import { useAppContext, type NavigationState } from '@/context/AppContext';
import { AuthenticationGateway } from '@/modules/auth';
import { Feed } from '@/modules/feeds';
import { MeetupCalendarPlaceholder } from '@/modules/events';
import { ProfileDashboard, ProfileDiscovery, PublicProfilePage } from '@/modules/profiles';
import { SupportPanel } from '@/modules/support';
import { AdSlot } from '@/modules/ads';
import { DirectMessageThread, MessagesInbox } from '@/modules/messages';
import { ShortsFeed } from '@/modules/shorts';
import { SettingsHub } from '@/modules/settings';
import { PersonalPlanner } from '@/modules/personal-planner/PersonalPlanner';
import { TokenShopPanel, WalletPanel } from '@/modules/economy';
import { GamesHub } from '@/components/GamesHub';
import { CosmicArcade } from '@/components/CosmicArcade';
import { SanctuaryRoadmap } from '@/components/SanctuaryRoadmap';
import { SanctuaryHome } from '@/components/SanctuaryHome';
import { NotificationBar } from '@/components/NotificationBar';
import { AdminDashboard } from '@/modules/moderation/AdminDashboard';
import { fetchPostsByAuthor } from '@/modules/feeds';
import styles from './AppWorkspace.module.css';

export function AppWorkspace() {
  const {
    activeNavigation,
    currentUser,
    isAuthenticated,
    isGuest,
    loginAsGuest,
    isSessionReady,
    sessionError,
    login,
    logout,
    deleteAccount,
    pendingEmail,
    setTwoFactorEnabled,
    setActiveNavigation,
    updateProfile,
    signup,
    resetPassword,
    verifyEmailCode,
    verifyTwoFactorCode,
    cancelAuthChallenge,
  } = useAppContext();
  const [messagePeer, setMessagePeer] = useState<PublicProfile | null>(null);
  const [viewedProfile, setViewedProfile] = useState<PublicProfile | null>(null);
  const [messageConversation, setMessageConversation] = useState<Conversation | null>(null);
  const [profilePosts, setProfilePosts] = useState<import('@/types/database').Post[]>([]);
  const [isProfilePostsLoading, setIsProfilePostsLoading] = useState(false);
  const [profileThemePreview, setProfileThemePreview] = useState<string | null>(null);

  useEffect(() => {
    if (activeNavigation !== 'profile') {
      setProfileThemePreview(null);
    }
  }, [activeNavigation]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tip') === 'success') {
      setActiveNavigation('support');
    }
    const walletResult = new URLSearchParams(window.location.search).get('wallet');
    if (walletResult === 'success' || walletResult === 'cancelled') {
      setActiveNavigation('wallet');
    }
  }, [setActiveNavigation]);

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
    setViewedProfile(null);
    setMessageConversation(null);
    setMessagePeer(profile);
    setActiveNavigation('messages');
  };

  const openNavigation = (navigation: NavigationState) => {
    setViewedProfile(null);
    if (navigation === 'messages') {
      setMessagePeer(null);
      setMessageConversation(null);
    }
    setActiveNavigation(navigation);
  };

  const authenticatedContent = activeNavigation === 'today' ? (
    <SanctuaryHome onNavigate={openNavigation} />
  ) : activeNavigation === 'notifications' ? (
    <main className={styles.supportPage}>
      <NotificationBar fullPage />
    </main>
  ) : activeNavigation === 'support' ? (
    <main className={styles.supportPage}>
      <SupportPanel />
    </main>
  ) : isAuthenticated && currentUser ? (
    <>
      {activeNavigation === 'planner' ? (
        <PersonalPlanner userId={currentUser.user.id} />
      ) : activeNavigation === 'wallet' ? (
        <main className={styles.supportPage}>
          <WalletPanel userId={currentUser.user.id} isGuest={isGuest} />
        </main>
      ) : activeNavigation === 'shop' ? (
        <TokenShopPanel userId={currentUser.user.id} isGuest={isGuest} />
      ) : activeNavigation === 'games' ? (
        <CosmicArcade />
      ) : activeNavigation === 'admin' ? (
        <AdminDashboard role={currentUser.profile.role} />
      ) : activeNavigation === 'roadmap' ? (
        <SanctuaryRoadmap />
      ) : activeNavigation === 'feed' ? (
        <>
          <AdSlot placement="feed-inline" />
          <Feed />
          <AdSlot placement="feed-sidebar" />
        </>
      ) : activeNavigation === 'events' ? (
        <MeetupCalendarPlaceholder />
      ) : activeNavigation === 'profile' ? (
        <ProfileDashboard
          profile={currentUser.profile}
          posts={profilePosts}
          isPostsLoading={isProfilePostsLoading}
          onSave={updateProfile}
          onThemeChange={setProfileThemePreview}
        />
      ) : activeNavigation === 'discover' && viewedProfile ? (
        <PublicProfilePage
          profile={viewedProfile}
          onBack={() => setViewedProfile(null)}
          onMessage={openMessage}
        />
      ) : activeNavigation === 'discover' ? (
        <ProfileDiscovery
          currentUserId={currentUser.user.id}
          onMessage={openMessage}
          onView={(profile) => setViewedProfile(profile)}
        />
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
        <>
          <AdSlot placement="shorts" />
          <ShortsFeed />
        </>
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
      initialError={sessionError}
      onLogin={login}
      onSignup={signup}
      onResetPassword={resetPassword}
      onVerifyEmailCode={verifyEmailCode}
      onVerifyTwoFactorCode={verifyTwoFactorCode}
      onCancelChallenge={cancelAuthChallenge}
    />
  );

  return (
    <MotionConfig reducedMotion="user">
      <ResponsiveShell>
        <div
          className={`${styles.worldSurface} w-full min-w-0 max-w-full overflow-x-clip`}
          data-world="sanctuary"
          style={{ '--profile-accent': profileThemePreview ?? currentUser?.profile.themeColor ?? '#52765c' } as CSSProperties}
        >
        <Navigation
          activeNavigation={activeNavigation}
          currentUser={currentUser}
          isGuest={isGuest}
          onExploreAsGuest={loginAsGuest}
          pendingEmail={pendingEmail}
          isSessionReady={isSessionReady}
          onNavigate={openNavigation}
          onLogin={login}
          onSignup={signup}
          onResetPassword={resetPassword}
          onVerifyEmailCode={verifyEmailCode}
          onVerifyTwoFactorCode={verifyTwoFactorCode}
          onCancelChallenge={cancelAuthChallenge}
          onSetTwoFactorEnabled={setTwoFactorEnabled}
          onLogout={logout}
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeNavigation}
            className={`${styles.worldContent} w-full min-w-0 max-w-full`}
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
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