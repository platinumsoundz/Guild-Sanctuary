'use client';

import { Gamepad2, Play } from 'lucide-react';
import { ResponsiveShell } from '@/components/ResponsiveShell';
import { Navigation } from '@/components/Navigation';
import { useEffect, useState } from 'react';
import { getConnectedGamepad } from '@/lib/controllerInput';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import type { CSSProperties } from 'react';
import type { Conversation, PublicProfile, WorldType } from '@/types/database';
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
import { GamesHub } from '@/components/GamesHub';
import { GuildCompanionHub } from '@/components/GuildCompanionHub';
import { GuildNavigation, type GuildPage } from '@/components/GuildNavigation';
import { SanctuaryRoadmap } from '@/components/SanctuaryRoadmap';
import { GuildRoadmap } from '@/components/GuildRoadmap';
import { SanctuaryHome } from '@/components/SanctuaryHome';
import { NotificationBar } from '@/components/NotificationBar';
import { FeedbackPage } from '@/components/FeedbackCenter';
import { AdminDashboard } from '@/modules/moderation/AdminDashboard';
import { ModerationDashboard } from '@/modules/moderation/ModerationDashboard';
import { fetchPostsByAuthor } from '@/modules/feeds';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { canAccessSanctuaryFeature, canAccessSanctuaryPage } from '@/lib/sanctuaryFeatureGates';
import { fetchPageVisibility, isPageVisible } from '@/lib/pageVisibility';
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
  const [accountRestrictionReason, setAccountRestrictionReason] = useState<string | null>(null);
  const [guildPage, setGuildPage] = useState<GuildPage>('home');
  const [guildRecentTitle, setGuildRecentTitle] = useState<string | null>(null);
  const [guildAutoLaunchRecent, setGuildAutoLaunchRecent] = useState(false);
  const guildInternalPages: GuildPage[] = ['home', 'arcade', 'trials', 'library', 'music', 'photos', 'tools'];
  const contentNavigation = activeNavigation === 'guild'
    ? (guildInternalPages.includes(guildPage) ? 'guild' : guildPage)
    : activeNavigation;
  const currentRole = currentUser?.profile.role?.toLowerCase() ?? null;
  const worldType: WorldType = activeNavigation === 'guild' ? 'guild' : 'sanctuary';

  useEffect(() => {
    if (!isSessionReady) return;
    let cancelled = false;
    void fetchPageVisibility().then((visibility) => {
      if (cancelled || contentNavigation === 'feedback' || isPageVisible(contentNavigation, visibility, isGuest ? 'guest' : currentRole ?? 'user')) return;
      // Keep the developer/owner's recovery surface reachable even if its nav item was hidden.
      if (contentNavigation === 'admin' && ['developer', 'owner'].includes(currentRole ?? '')) return;
      setActiveNavigation('today');
    }).catch(() => { /* A missing visibility migration defaults to the existing role gates. */ });
    return () => { cancelled = true; };
  }, [contentNavigation, currentRole, currentUser?.user.id, isGuest, isSessionReady, setActiveNavigation]);

  useEffect(() => {
    if (!isSessionReady) return;
    if (isGuest) {
      if (!['today', 'support', 'games', 'roadmap'].includes(contentNavigation)) {
        setActiveNavigation('today');
      }
      return;
    }
    if (!currentUser || !canAccessSanctuaryPage(contentNavigation, currentRole)) {
      if (activeNavigation !== 'today') setActiveNavigation('today');
    }
  }, [activeNavigation, contentNavigation, currentRole, currentUser, isGuest, isSessionReady, setActiveNavigation]);

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
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error || !data) { setAccountAccessStatus('error'); return; }
        setAccountSuspendedUntil(data.suspended_until);
        const blocked = data.status === 'banned' ||
          (data.status === 'suspended' && (!data.suspended_until || new Date(data.suspended_until).getTime() > Date.now()));
        if (blocked) {
          if (cancelled) return;
          // Restriction state comes from the typed profiles contract.
          // Notice detail is omitted until the live notification schema/policy is verified.
          setAccountRestrictionReason(null);
          setAccountSuspendedUntil(data.suspended_until);
          setAccountAccessStatus(data.status === 'banned' ? 'banned' : 'suspended');
        } else {
          setAccountRestrictionReason(null);
          setAccountAccessStatus('active');
        }
      }, () => { if (!cancelled) setAccountAccessStatus('error'); });
    return () => { cancelled = true; };
  }, [currentUser?.user.id, isAuthenticated, isGuest, isSessionReady]);

  useEffect(() => {
    if (!isSessionReady || !isAuthenticated || isGuest || !currentUser) return;
    const accessEnabled = () => {
      try { return window.localStorage.getItem('sanctuary-hidden-guild-access') !== 'disabled'; }
      catch { return true; }
    };
    let wasConnected = false;
    const detectController = () => {
      const connected = Boolean(getConnectedGamepad());
      if (connected && !wasConnected && accessEnabled()) {
        window.localStorage.setItem('sanctuary-open-hidden-guild-entry', '1');
        setGuildPage('home');
        setActiveNavigation('guild');
      }
      wasConnected = connected;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'g')) return;
      if (!accessEnabled()) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      event.preventDefault();
      window.localStorage.setItem('sanctuary-open-hidden-guild-entry', '1');
      setGuildPage('home');
        setActiveNavigation('guild');
    };
    window.addEventListener('keydown', onKeyDown);
    const poll = window.setInterval(detectController, 500);
    detectController();
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.clearInterval(poll);
    };
  }, [currentUser, isAuthenticated, isGuest, isSessionReady, setActiveNavigation]);

  useEffect(() => {
    if (activeNavigation !== 'guild' || guildPage !== 'home') return;
    try {
      const raw = window.localStorage.getItem('guild-library-recents-v1');
      const recent = raw ? JSON.parse(raw) as Array<{ id?: string }> : [];
      const first = Array.isArray(recent) ? recent[0]?.id : null;
      setGuildRecentTitle(first === 'sleeves2d' ? 'The 5 Sleeves 2D' : first === 'sleeves3d' ? 'The 5 Sleeves 3D' : null);
    } catch {
      setGuildRecentTitle(null);
    }
  }, [activeNavigation, guildPage]);

  useEffect(() => {
    if (contentNavigation !== 'profile') {
      setProfileThemePreview(null);
    }
  }, [contentNavigation]);

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
    if (isGuest || contentNavigation !== 'profile' || !currentUser) {
      return;
    }

    let cancelled = false;
    setIsProfilePostsLoading(true);
    fetchPostsByAuthor(currentUser.user.id, worldType)
      .then((posts) => {
        if (!cancelled) setProfilePosts(posts);
      })
      .finally(() => {
        if (!cancelled) setIsProfilePostsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contentNavigation, currentUser, isGuest, worldType]);

  const openMessage = (profile: PublicProfile) => {
    setViewedProfile(null);
    setMessageConversation(null);
    setMessagePeer(profile);
    if (activeNavigation === 'guild') setGuildPage('messages');
    else setActiveNavigation('messages');
  };

  const openNavigation = (navigation: NavigationState) => {
    setViewedProfile(null);
    if (navigation === 'messages') {
      setMessagePeer(null);
      setMessageConversation(null);
    }
    if (activeNavigation === 'guild') {
      setGuildPage(navigation);
      return;
    }
    setActiveNavigation(navigation);
  };

  const authenticatedContent = !isGuest && currentUser && contentNavigation !== 'feedback' && !canAccessSanctuaryPage(contentNavigation, currentRole) ? (
    <main className={styles.sectionPage} role="status">
      <p className={styles.sectionEyebrow}>RESTRICTED DESTINATION</p>
      <h1>This page is not available for your account</h1>
      <p className={styles.sectionDescription}>Your current account role does not include access to this area. You have been returned to Today; contact support if you believe your role is incorrect.</p>
      <button type="button" onClick={() => setActiveNavigation('today')}>Return to Today</button>
    </main>
  ) : contentNavigation === 'today' ? (
    <SanctuaryHome onNavigate={openNavigation} />
  ) : isGuest && !['support', 'games', 'roadmap', 'feedback'].includes(contentNavigation) ? (
    <main className={styles.sectionPage} aria-labelledby="guest-access-title">
      <p className={styles.sectionEyebrow}>GUEST EXPLORATION</p>
      <h1 id="guest-access-title">Explore before you join</h1>
      <p className={styles.sectionDescription}>
        Guest mode is read-only. You can explore the Cosmic Arcade, review the Sanctuary roadmap,
        and learn about the community without creating an account.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="rounded-lg border px-4 py-3" onClick={() => setActiveNavigation('games')}>Explore Cosmic Arcade</button>
        <button type="button" className="rounded-lg border px-4 py-3" onClick={() => setActiveNavigation('roadmap')}>Sanctuary Roadmap</button>
      </div>
      <p className={styles.sectionDescription}>
        Sign in to post, react, comment, message, manage your profile, use the planner, or access wallet and shop features.
      </p>
    </main>
  ) : contentNavigation === 'feedback' ? (
    <FeedbackPage role={isGuest ? 'guest' : currentRole ?? 'user'} isGuest={isGuest} />
  ) : contentNavigation === 'notifications' ? (
    <main className={styles.supportPage}>
      <NotificationBar fullPage worldType={worldType} onNavigate={openNavigation} />
    </main>
  ) : contentNavigation === 'support' ? (
    <main className={styles.supportPage}>
      <SupportPanel />
    </main>
  ) : isAuthenticated && currentUser ? (
    <>
      {contentNavigation === 'planner' ? (
        <PersonalPlanner userId={currentUser.user.id} />
      ) : contentNavigation === 'wallet' ? (
        canAccessSanctuaryFeature('wallet', currentUser.profile.role) ? (
          <main className={styles.supportPage}><WalletPanel userId={currentUser.user.id} isGuest={isGuest} /></main>
        ) : (
          <main className={styles.sectionPage} role="status"><p className={styles.sectionEyebrow}>VIP FEATURE</p><h1>Wallet access is restricted</h1><p className={styles.sectionDescription}>The Wallet is temporarily available to VIP members and above while purchases and spending are being tested. Your account and community access are unchanged.</p></main>
        )
      ) : contentNavigation === 'shop' ? (
        canAccessSanctuaryFeature('tokenShop', currentUser.profile.role) ? <TokenShopPanel userId={currentUser.user.id} isGuest={isGuest} /> : (
          <main className={styles.sectionPage} role="status"><p className={styles.sectionEyebrow}>VIP FEATURE</p><h1>Token Shop access is restricted</h1><p className={styles.sectionDescription}>The Token Shop is temporarily available to VIP members and above while its payment and redemption systems are being verified. Token spending remains disabled until testing is complete.</p></main>
        )
      ) : contentNavigation === 'games' ? (
        <CosmicArcade />
      ) : contentNavigation === 'guild' ? (
        <GuildWorld userId={currentUser?.user.id ?? null} isAuthenticated={isAuthenticated && !isGuest} />
      ) : contentNavigation === 'admin' ? (
        <AdminDashboard role={currentUser.profile.role} />
      ) : contentNavigation === 'moderation' ? (
        <ModerationDashboard role={currentUser.profile.role} worldType={worldType} />
      ) : contentNavigation === 'roadmap' ? (
        <SanctuaryRoadmap />
      ) : contentNavigation === 'guild-roadmap' ? (
        <GuildRoadmap />
      ) : contentNavigation === 'feed' ? (
        <>
          <AdSlot placement="feed-inline" />
          <Feed worldType={worldType} />
          <AdSlot placement="feed-sidebar" />
        </>
      ) : contentNavigation === 'events' ? (
        <MeetupCalendarPlaceholder worldType={worldType} />
      ) : contentNavigation === 'profile' ? (
        <ProfileDashboard
          profile={currentUser.profile}
          posts={profilePosts}
          isPostsLoading={isProfilePostsLoading}
          onSave={updateProfile}
          onThemeChange={setProfileThemePreview}
        />
      ) : contentNavigation === 'discover' && viewedProfile ? (
        <PublicProfilePage
          profile={viewedProfile}
          onBack={() => setViewedProfile(null)}
          onMessage={openMessage}
        />
      ) : contentNavigation === 'discover' ? (
        <ProfileDiscovery
          currentUserId={currentUser.user.id}
          onMessage={openMessage}
          onView={(profile) => setViewedProfile(profile)}
        />
      ) : contentNavigation === 'messages' && messagePeer ? (
        <DirectMessageThread peer={messagePeer} worldType={worldType} onBack={() => setMessagePeer(null)} />
      ) : contentNavigation === 'messages' && messageConversation ? (
        <DirectMessageThread conversation={messageConversation} onBack={() => setMessageConversation(null)} />
      ) : contentNavigation === 'messages' ? (
        <MessagesInbox
          currentUserId={currentUser.user.id}
          worldType={worldType}
          onDiscoverPeople={() => openNavigation('discover')}
          onOpenConversation={(conversation) => {
            setMessagePeer(null);
            setMessageConversation(conversation);
          }}
        />
      ) : contentNavigation === 'shorts' ? (
        <>
          <AdSlot placement="shorts" />
          <ShortsFeed worldType={worldType} />
        </>
      ) : contentNavigation === 'settings' ? (
        <SettingsHub
          userId={currentUser.user.id}
          email={currentUser.user.email}
          twoFactorEnabled={currentUser.user.twoFactorEnabled}
          privacy={currentUser.profile.privacy}
          visibility={currentUser.profile.visibility}
          socialLinks={currentUser.profile.socialLinks}
          onUpdateProfile={updateProfile}
          onDeleteAccount={deleteAccount}
          onLaunchGuild={() => {
            if (isGuest || !isAuthenticated || !currentUser) return;
            try { window.localStorage.setItem('sanctuary-open-hidden-guild-entry', '1'); } catch { /* Direct navigation still works if storage is blocked. */ }
            setGuildPage('home');
        setActiveNavigation('guild');
          }}
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
        {activeNavigation === 'guild' ? (
          <div className={styles.guildExperience} data-world="guild">
            <GuildNavigation selectedPage={guildPage} role={currentUser?.profile.role ?? 'user'} onSelect={(page) => { setGuildAutoLaunchRecent(false); setGuildPage(page); }} onExit={() => { setGuildAutoLaunchRecent(false); setActiveNavigation('today'); }} />
            <motion.div className={styles.guildWorldContent}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={guildPage} className={styles.guildPageContent} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
                {guildPage === 'home' ? (
                  <main className={styles.guildLanding} aria-labelledby="guild-home-title">
                    <section className={styles.guildFeatured} aria-labelledby="guild-home-title">
                      <div className={styles.guildFeaturedCopy}>
                        <p className={styles.sectionEyebrow}>THE GUILD · YOUR CONSOLE</p>
                        <span className={styles.guildLiveLabel}><i /> YOUR GAMING SPACE</span>
                        <h1 id="guild-home-title">Your worlds.<br /><em>One home.</em></h1>
                        <p>A console-first home for your games, collection, music and memories — with Sanctuary always within reach.</p>
                        <div className={styles.guildHeroActions}>
                          <button type="button" className={styles.guildPrimaryAction} onClick={() => setGuildPage('arcade')}><Gamepad2 size={18} /> Open game library</button>
                          <button type="button" className={styles.guildSecondaryAction} onClick={() => setGuildPage('trials')}>Play Guild Trials <span aria-hidden="true">↗</span></button>
                        </div>
                      </div>
                      <div className={styles.guildFeaturedArt} aria-hidden="true"><div className={styles.guildOrbitRing} /><div className={styles.guildOrbitPlanet} /><span className={styles.guildOrbitMoon} /></div>
                    </section>
                    <section className={styles.guildContinue} aria-label="Continue playing">
                      <div><p className={styles.sectionEyebrow}>PICK UP WHERE YOU LEFT OFF</p><h2>{guildRecentTitle ?? 'Your next adventure starts here'}</h2><p>{guildRecentTitle ? 'Your last launch is saved on this device. Open the library to continue.' : 'Launch a game and your recent activity will appear here on this device.'}</p></div>
                      <button type="button" onClick={() => { setGuildAutoLaunchRecent(Boolean(guildRecentTitle)); setGuildPage('arcade'); }}><Play size={16} /> {guildRecentTitle ? 'Continue playing' : 'Explore games'}</button>
                    </section>
                    <div className={styles.guildHomeSectionHead}><div><p className={styles.sectionEyebrow}>QUICK ACCESS</p><h2>Jump back in</h2></div><span>Touch · keyboard · controller</span></div>
                    <div className={styles.guildDestinationGrid}>
                      <button type="button" className={styles.guildDestinationFeatured} onClick={() => setGuildPage('arcade')}><span>01 · PLAY</span><strong>Featured Games</strong><small>Open the game library, launch worlds and review compatibility.</small><b>Open library <span aria-hidden="true">↗</span></b></button>
                      <button type="button" onClick={() => setGuildPage('trials')}><span>02 · PLAY</span><strong>Guild Trials</strong><small>Play the original Orbital Drift and Comet Dodge arcade games.</small></button>
                      <button type="button" onClick={() => setGuildPage('library')}><span>03 · COLLECT</span><strong>My Game Collection</strong><small>Save and organise your personal game catalogue.</small></button>
                      <button type="button" onClick={() => setGuildPage('music')}><span>04 · LISTEN</span><strong>Music Player</strong><small>Play audio files selected from this device.</small></button>
                      <button type="button" onClick={() => setGuildPage('photos')}><span>05 · REMEMBER</span><strong>Photo Slideshow</strong><small>Build a private, in-browser slideshow.</small></button>
                      <button type="button" onClick={() => setGuildPage('tools')}><span>06 · EXPLORE</span><strong>Guild Tools</strong><small>Review gaming destinations and Cloud Lab status.</small></button>
                      <button type="button" onClick={() => setGuildPage('today')}><span>07 · SANCTUARY</span><strong>Return to Sanctuary</strong><small>Community, messages, profile, planner and settings.</small></button>
                    </div>
                  </main>
                ) : guildPage === 'arcade' ? <div className={styles.guildSection}><GamesHub autoLaunchRecent={guildAutoLaunchRecent} /></div>
                : guildPage === 'trials' ? <GuildWorld userId={currentUser?.user.id ?? null} isAuthenticated={isAuthenticated && !isGuest} />
                : guildPage === 'library' ? <div className={styles.guildSection}><GamesHub /></div>
                : ['music', 'photos', 'tools'].some((page) => page === guildPage) ? null
                : authenticatedContent}
                </motion.div>
              </AnimatePresence>
              <GuildCompanionHub view={guildPage === 'library' || guildPage === 'music' || guildPage === 'photos' || guildPage === 'tools' ? guildPage : 'all'} hidden={!(['library', 'music', 'photos', 'tools'] as GuildPage[]).includes(guildPage)} />
            </motion.div>
          </div>
        ) : (
          <div className={`${styles.worldSurface} w-full min-w-0 max-w-full overflow-x-clip`} data-world="sanctuary" style={{ '--profile-accent': profileThemePreview ?? currentUser?.profile.themeColor ?? '#52765c' } as CSSProperties}>
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
            ) : accountAccessStatus === 'banned' && contentNavigation !== 'support' ? (
              <main className={styles.sectionPage} role="alert"><p className={styles.sectionEyebrow}>ACCOUNT RESTRICTED</p><h1>This account is banned</h1><p className={styles.sectionDescription}>Access to Sanctuary is disabled because of a moderation decision. {accountRestrictionReason ? 'Reason: ' + accountRestrictionReason + ' ' : ''}If you believe this is a mistake, contact support and include your account email. Do not create another account to bypass this restriction.</p><button type="button" onClick={() => openNavigation('support')}>Contact support</button></main>
            ) : accountAccessStatus === 'suspended' && contentNavigation !== 'support' ? (
              <main className={styles.sectionPage} role="alert"><p className={styles.sectionEyebrow}>TEMPORARY ACCOUNT RESTRICTION</p><h1>Account suspended</h1><p className={styles.sectionDescription}>Your access is temporarily limited following a moderation decision{accountRestrictionReason ? ': ' + accountRestrictionReason : ''}{accountSuspendedUntil ? ' until ' + new Date(accountSuspendedUntil).toLocaleString() : ''}. If you believe this is a mistake, contact support.</p><button type="button" onClick={() => setActiveNavigation('support')}>Contact support</button></main>
            ) : authenticatedContent}
          </motion.div>
        </AnimatePresence>
          </div>
        )}
      </ResponsiveShell>
    </MotionConfig>
  );
}