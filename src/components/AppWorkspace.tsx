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
import { CosmicArcade } from '@/components/CosmicArcade';
import { GuildWorld } from '@/components/GuildWorld';
import { SanctuaryRoadmap } from '@/components/SanctuaryRoadmap';
import { GuildRoadmap } from '@/components/GuildRoadmap';
import { SanctuaryHome } from '@/components/SanctuaryHome';
import { NotificationBar } from '@/components/NotificationBar';
import { AdminDashboard } from '@/modules/moderation/AdminDashboard';
import { fetchPostsByAuthor } from '@/modules/feeds';
import { getSupabaseBrowserClient } from '@/services/supabase';
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
  const [accountAccessStatus, setAccountAccessStatus] = useState<'checking' | 'active' | 'suspended' | 'banned' | 'error'>('checking');
  const [accountSuspendedUntil, setAccountSuspendedUntil] = useState<string | null>(null);

  useEffect(() => {
    if (!isSessionReady) return;
    if (!isAuthenticated || isGuest || !currentUser ||
        !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setAccountAccessStatus('active');
      setAccountSuspendedUntil(null);
      return;
    }
    let cancelled = false;
    setAccountAccessStatus('checking');
    getSupabaseBrowserClient().from('profiles').select('status,suspended_until').eq('id', currentUser.user.id).maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) { setAccountAccessStatus('error'); return; }
        setAccountSuspendedUntil(data.suspended_until);
        if (data.status === 'banned') setAccountAccessStatus('banned');
        else if (data.status === 'suspended' && (!data.suspended_until || new Date(data.suspended_until).getTime() > Date.now())) setAccountAccessStatus('suspended');
        else setAccountAccessStatus('active');
      })
      .catch(() => { if (!cancelled) setAccountAccessStatus('error'); });
    return () => { cancelled = true; };
  }, [currentUser?.user.id, isAuthenticated, isGuest, isSessionReady]);

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
    if (isGuest || activeNavigation !== 'profile' || !currentUser) {
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
  }, [activeNavigation, currentUser, isGuest]);

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
  ) : isGuest && !['support', 'games', 'guild', 'roadmap', 'guild-roadmap'].includes(activeNavigation) ? (
    <main className={styles.sectionPage} aria-labelledby="guest-access-title">
      <p className={styles.sectionEyebrow}>GUEST EXPLORATION</p>
      <h1 id="guest-access-title">Explore before you join</h1>
      <p className={styles.sectionDescription}>
        Guest mode is read-only. You can explore the Cosmic Arcade, review the Sanctuary and Guild roadmaps,
        and learn about the community without creating an account.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="rounded-lg border px-4 py-3" onClick={() => setActiveNavigation('games')}>Explore Cosmic Arcade</button>
        <button type="button" className="rounded-lg border px-4 py-3" onClick={() => setActiveNavigation('roadmap')}>Sanctuary Roadmap</button>
        <button type="button" className="rounded-lg border px-4 py-3" onClick={() => setActiveNavigation('guild-roadmap')}>Guild Roadmap</button>
      </div>
      <p className={styles.sectionDescription}>
        Sign in to post, react, comment, message, manage your profile, use the planner, or access wallet and shop features.
      </p>
    </main>
  ) : activeNavigation === 'notifications' ? (
    <main className={styles.supportPage}>
      <NotificationBar fullPage />
    </main>
  ) : activeNavigation === 'support' ? (
    <main className={styles.supportPage}>
      <SupportPanel />
    </main>
  ) : isGuest && activeNavigation === 'guild' ? (
    <GuildWorld userId={null} isAuthenticated={false} />
  ) : isAuthenticated && currentUser ? (
    <>
      {activeNavigation === 'planner' ? (
        <PersonalPlanner userId={currentUser.user.id} />
      ) : activeNavigation === 'wallet' ? (
        ['vip', 'moderator', 'admin', 'developer', 'owner'].includes(currentUser.profile.role) ? (
          <main className={styles.supportPage}><WalletPanel userId={currentUser.user.id} isGuest={isGuest} /></main>
        ) : (
          <main className={styles.sectionPage} role="status"><p className={styles.sectionEyebrow}>VIP FEATURE</p><h1>Wallet access is restricted</h1><p className={styles.sectionDescription}>The Wallet is temporarily available to VIP members and above while purchases and spending are being tested. Your account and community access are unchanged.</p></main>
        )
      ) : activeNavigation === 'shop' ? (
        ['vip', 'moderator', 'admin', 'developer', 'owner'].includes(currentUser.profile.role) ? <TokenShopPanel userId={currentUser.user.id} isGuest={isGuest} /> : (
          <main className={styles.sectionPage} role="status"><p className={styles.sectionEyebrow}>VIP FEATURE</p><h1>Token Shop access is restricted</h1><p className={styles.sectionDescription}>The Token Shop is temporarily available to VIP members and above while its payment and redemption systems are being verified. Token spending remains disabled until testing is complete.</p></main>
        )
      ) : activeNavigation === 'games' ? (
        <CosmicArcade />
      ) : activeNavigation === 'guild' ? (
        <GuildWorld userId={currentUser?.user.id ?? null} isAuthenticated={isAuthenticated && !isGuest} />
      ) : activeNavigation === 'admin' ? (
        <AdminDashboard role={currentUser.profile.role} />
      ) : activeNavigation === 'roadmap' ? (
        <SanctuaryRoadmap />
      ) : activeNavigation === 'guild-roadmap' ? (
        <GuildRoadmap />
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
            {!isSessionReady || accountAccessStatus === 'checking' ? (
              <main className={styles.sessionLoading} role="status">Verifying your account access…</main>
            ) : accountAccessStatus === 'error' ? (
              <main className={styles.sectionPage} role="alert"><h1>Account status unavailable</h1><p className={styles.sectionDescription}>We could not verify your account status. Protected features are paused until your account can be checked. Please refresh and try again.</p><button type="button" onClick={() => window.location.reload()}>Retry verification</button></main>
            ) : accountAccessStatus === 'banned' ? (
              <main className={styles.sectionPage} role="alert"><p className={styles.sectionEyebrow}>ACCOUNT RESTRICTED</p><h1>This account is banned</h1><p className={styles.sectionDescription}>Access to Sanctuary is disabled because of a moderation decision. If you believe this is a mistake, contact support and include your account email. Do not create another account to bypass this restriction.</p><button type="button" onClick={() => setActiveNavigation('support')}>Contact support</button></main>
            ) : accountAccessStatus === 'suspended' ? (
              <main className={styles.sectionPage} role="alert"><p className={styles.sectionEyebrow}>TEMPORARY ACCOUNT RESTRICTION</p><h1>Account suspended</h1><p className={styles.sectionDescription}>Your access is temporarily limited following a moderation decision{accountSuspendedUntil ? ' until ' + new Date(accountSuspendedUntil).toLocaleString() : ''}. If you believe this is a mistake, contact support.</p><button type="button" onClick={() => setActiveNavigation('support')}>Contact support</button></main>
            ) : authenticatedContent}
          </motion.div>
        </AnimatePresence>
        </div>
      </ResponsiveShell>
    </MotionConfig>
  );
}