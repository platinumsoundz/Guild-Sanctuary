'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight, ArrowRight, BookOpen, CalendarDays, Check, CircleHelp, CheckCircle2, Circle, RotateCcw,
  Compass, Heart, Layers3, MessageCircle, MessageSquare, Search, ShieldCheck,
  Sparkles, Sun, Users, Video, WalletCards, X, LockKeyhole, type LucideIcon,
} from 'lucide-react';
import type { NavigationState } from '@/context/AppContext';
import styles from './SanctuaryHome.module.css';

type FeatureStatus = 'Available' | 'In preview' | 'In design' | 'Safety gated';
type Feature = {
  title: string; group: string; status: FeatureStatus; description: string;
  outcome: string; icon: LucideIcon; target?: NavigationState; preview: string[];
};

const features: Feature[] = [
  { title: 'Community', group: 'Connection', status: 'Available', description: 'Share what matters, read life lessons, and find people who understand.', outcome: 'A calm, chronological community space that puts people before engagement numbers.', icon: MessageCircle, target: 'feed', preview: ['Life lessons and everyday updates', 'Replies that keep a conversation together', 'A feed designed around people, not rankings'] },
  { title: 'People & discovery', group: 'Connection', status: 'Available', description: 'Explore member profiles and find new voices across the Sanctuary.', outcome: 'A place to discover shared interests without public popularity scores.', icon: Search, target: 'discover', preview: ['Browse member profiles', 'Start with a shared interest', 'Choose when to continue a conversation'] },
  { title: 'Messages', group: 'Connection', status: 'In preview', description: 'A dedicated space for one-to-one conversations with community members.', outcome: 'Private conversation tools with clearer requests, unread state, and delivery feedback as the system matures.', icon: MessageSquare, target: 'messages', preview: ['Conversation inbox', 'Message requests and privacy controls', 'Read state and delivery improvements are planned'] },
  { title: 'Events & meetups', group: 'Community', status: 'In preview', description: 'Bring online and real-world gatherings into one easy-to-find place.', outcome: 'Events that explain where, when, and how people can take part.', icon: CalendarDays, target: 'events', preview: ['Upcoming community gatherings', 'Online or in-person details', 'Time-zone-aware reminders are planned'] },
  { title: 'Notifications', group: 'Community', status: 'In preview', description: 'Keep up with replies and meaningful activity without needing to watch the feed.', outcome: 'A useful activity centre with room for quiet hours and delivery preferences.', icon: Heart, target: 'notifications', preview: ['Recent likes and comments', 'Unread and read activity', 'Notification preferences and push delivery are planned'] },
  { title: 'Daily reflection', group: 'Personal growth', status: 'In design', description: 'A gentle daily check-in for mood, intention, and what is on your mind.', outcome: 'Private reflection without streak pressure, public scores, or forced sharing.', icon: Sun, preview: ['Choose how today feels', 'Set one small intention', 'Write a private reflection and return when ready'] },
  { title: 'Practice library', group: 'Personal growth', status: 'In design', description: 'Short guided practices for grounding, breathwork, journaling, and quiet moments.', outcome: 'Free, approachable practices with clear duration and source information.', icon: BookOpen, preview: ['A 2-minute grounding pause', 'A 5-minute breathing practice', 'A journal prompt to take into your day'] },
  { title: 'Circles', group: 'Belonging', status: 'In design', description: 'Small, topic-led spaces for people who want to grow and support one another.', outcome: 'Curated groups with a shared intention, named stewards, and clear community norms.', icon: Users, preview: ['Creativity & making', 'Grief, change & remembrance', 'Mindful living and philosophy'] },
  { title: 'Self-discovery', group: 'Personal growth', status: 'In design', description: 'A gradual, opt-in way to explore personality, motivations, interests, and zodiac traditions.', outcome: 'Useful insights from information a member chooses to share—not diagnoses or predictions. Answers stay private unless the member separately chooses to show a summary.', icon: Compass, preview: ['Short 16-type-style and Enneagram-inspired prompts over time', 'Optional zodiac lens and values you choose', 'Private by default; profile summary visibility is a separate opt-in'] },
  { title: 'The 5 Sleeves universe', group: 'Connected projects', status: 'In preview', description: 'A home for connected game experiences and future shared identity features.', outcome: 'A clearer bridge between Sanctuary community features and the game projects.', icon: Layers3, target: 'games', preview: ['Open the current Games Hub', '2D and 3D experiences shown with honest status labels', 'Shared saves and account links remain future work'] },
  { title: 'Shorts', group: 'Create & share', status: 'Available', description: 'Discover short-form video in the Sanctuary.', outcome: 'A media surface alongside the community—not a replacement for real connection.', icon: Video, target: 'shorts', preview: ['Browse short videos', 'React to content', 'Creator tools can expand as feedback comes in'] },
  { title: 'Privacy & settings', group: 'Your account', status: 'In preview', description: 'Manage your profile, appearance, and account preferences.', outcome: 'Make personal choices understandable and easy to revisit.', icon: ShieldCheck, target: 'settings', preview: ['Profile and appearance options', 'Account preferences', 'More privacy controls will be clearly explained as they ship'] },
  { title: 'Wallet & purchases', group: 'Future systems', status: 'Safety gated', description: 'A visible place for account balance and future cosmetic purchases.', outcome: 'Commerce stays behind release checks; tokens will not buy reach, attention, or influence.', icon: WalletCards, target: 'wallet', preview: ['Wallet interface is available to explore', 'Purchases remain gated pending end-to-end checks', 'No transfers, trading, marketplace, or cash-out'] },
];

const filters = ['Everything', 'Available', 'In preview', 'In design', 'Safety gated'] as const;
const onboardingKey = 'sanctuary.beta.onboarding.v1';
const onboardingTasks = [
  { id: 'community', title: 'Explore the community', detail: 'See how people share and connect.', action: 'Visit community', target: 'feed' as NavigationState },
  { id: 'discover', title: 'Find people and interests', detail: 'Explore profiles and discover what connects members.', action: 'Discover people', target: 'discover' as NavigationState },
  { id: 'concept', title: 'Open a concept preview', detail: 'See one of the experiences being shaped for the future.', action: 'Preview an idea', target: 'concept' as const },
  { id: 'direction', title: 'Explore the feature statuses', detail: 'Understand what is live, in preview, or still in design.', action: 'Browse features', target: 'features' as const },
  { id: 'feedback', title: 'Share one piece of feedback', detail: 'Help make the next iteration more useful.', action: 'Give feedback', target: 'feedback' as const },
  { id: 'roadmap', title: 'Look at the product map', detail: 'See the broader systems planned for the Sanctuary.', action: 'Open product map', target: 'roadmap' as NavigationState },
] as const;

export function SanctuaryHome({ onNavigate }: { onNavigate: (navigation: NavigationState) => void }) {
  const [filter, setFilter] = useState<(typeof filters)[number]>('Everything');
  const [activeFeature, setActiveFeature] = useState<Feature | null>(null);
  const [feedbackType, setFeedbackType] = useState('Idea or improvement');
  const [nextFeatureChoice, setNextFeatureChoice] = useState('Daily Reflection');
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackDetails, setFeedbackDetails] = useState('');
  const [copyState, setCopyState] = useState('');
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  const visibleFeatures = useMemo(() => filter === 'Everything' ? features : features.filter((feature) => feature.status === filter), [filter]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(onboardingKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) setCompletedTasks(parsed.filter((item): item is string => typeof item === 'string' && onboardingTasks.some((task) => task.id === item)));
      }
    } catch {
      // Onboarding remains usable for this session if storage is unavailable.
    } finally {
      setOnboardingLoaded(true);
    }
  }, []);

  const toggleTask = (id: string) => {
    setCompletedTasks((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      try { window.localStorage.setItem(onboardingKey, JSON.stringify(next)); } catch { /* Keep progress in memory for this session. */ }
      return next;
    });
  };

  const startTask = (task: (typeof onboardingTasks)[number]) => {
    toggleTask(task.id);
    if (task.target === 'concept') {
      setActiveFeature(features.find((feature) => feature.title === 'Daily reflection') ?? null);
    } else if (task.target === 'features') {
      setFilter('Everything');
      document.getElementById('feature-explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (task.target === 'feedback') {
      document.getElementById('beta-feedback-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      onNavigate(task.target);
    }
  };

  const resetOnboarding = () => {
    setCompletedTasks([]);
    try { window.localStorage.removeItem(onboardingKey); } catch { /* No persistent state to clear. */ }
  };

  useEffect(() => {
    if (!activeFeature) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveFeature(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeFeature]);

  const feedbackReport = () => [
    'The Sanctuary beta feedback',
    'Type: ' + feedbackType,
    'Title: ' + (feedbackTitle.trim() || '(add a short title)'),
    '',
    feedbackDetails.trim() || '(describe what happened, what you expected, or what you would like to see)',
    '',
    'Page: ' + (typeof window !== 'undefined' ? window.location.href : 'The Sanctuary'),
    'Date: ' + new Date().toISOString(),
  ].join('\n');

  const copyFeedback = async () => {
    try {
      await navigator.clipboard.writeText(feedbackReport());
      setCopyState('Copied. Paste this into your beta feedback message or GitHub issue.');
    } catch {
      setCopyState('Clipboard access was blocked. Select and copy the feedback text below, then paste it into your beta feedback message or GitHub issue.');
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="sanctuary-home-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><Sun size={14} aria-hidden="true" /> THE SANCTUARY · BETA</p>
          <h1 id="sanctuary-home-title">A calmer place to <em>grow together.</em></h1>
          <p className={styles.intro}>Explore what is here today, try the current previews, and help shape what comes next. This is a living product showcase—not just a roadmap.</p>
          <div className={styles.heroActions}>
            <button className={styles.primaryButton} type="button" onClick={() => onNavigate('feed')}>Explore the community <ArrowRight size={16} aria-hidden="true" /></button>
            <a className={styles.secondaryButton} href="#feature-explorer">Explore upcoming features <ArrowDownRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
        <div className={styles.heroNote}>
          <div className={styles.orbit} aria-hidden="true"><span /><span /><span /><Sun size={34} /></div>
          <p className={styles.noteLabel}>A platform in progress</p>
          <p>Some areas are working features. Others are clickable concepts to make the direction tangible. Each card tells you which is which.</p>
          <div className={styles.statusLegend}><span><i className={styles.dotAvailable} /> Available</span><span><i className={styles.dotPreview} /> Preview</span><span><i className={styles.dotDesign} /> In design</span></div>
        </div>
      </section>

      <section className={styles.onboarding} aria-labelledby="onboarding-title">
        <div className={styles.onboardingHeader}>
          <div><p className={styles.eyebrow}>YOUR FIRST FEW MINUTES</p><h2 id="onboarding-title">Make the Sanctuary yours</h2><p>A short, optional tour for beta testers. Your progress is saved only in this browser.</p></div>
          <div className={styles.progressBlock} aria-label={onboardingLoaded ? completedTasks.length + ' of ' + onboardingTasks.length + ' steps complete' : 'Loading your progress'}>
            <div className={styles.progressText}><strong>{completedTasks.length}/{onboardingTasks.length}</strong><span>{completedTasks.length === onboardingTasks.length ? 'Tour complete' : 'steps explored'}</span></div>
            <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={onboardingTasks.length} aria-valuenow={completedTasks.length}><span style={{ width: ((completedTasks.length / onboardingTasks.length) * 100) + '%' }} /></div>
          </div>
        </div>
        <div className={styles.onboardingList}>
          {onboardingTasks.map((task, index) => {
            const done = completedTasks.includes(task.id);
            return <div className={done ? styles.onboardingTaskDone : styles.onboardingTask} key={task.id}>
              <button type="button" className={styles.taskCheck} onClick={() => toggleTask(task.id)} aria-label={(done ? 'Mark incomplete: ' : 'Mark complete: ') + task.title} aria-pressed={done}>{done ? <CheckCircle2 size={20} /> : <Circle size={20} />}</button>
              <span className={styles.taskNumber}>0{index + 1}</span>
              <div className={styles.taskCopy}><strong>{task.title}</strong><span>{task.detail}</span></div>
              <button className={styles.taskAction} type="button" onClick={() => startTask(task)}>{done ? 'Visit again' : task.action} <ArrowRight size={14} /></button>
            </div>;
          })}
        </div>
        <div className={styles.onboardingFooter}><span><CircleHelp size={14} /> Optional guide · not a public score</span><button type="button" onClick={resetOnboarding}><RotateCcw size={13} /> Reset progress</button></div>
      </section>

      <section className={styles.discoveryStudio} aria-labelledby="discovery-studio-title">
        <div className={styles.discoveryIntro}>
          <p className={styles.eyebrow}>PERSONAL GROWTH · ACCOUNT-SAVED</p>
          <h2 id="discovery-studio-title">Get to know yourself, at your own pace.</h2>
          <p>Explore personality, motivations, values, and optional zodiac traditions in short sessions. Your answers are stored with your Sanctuary account, not in browser storage.</p>
          <div className={styles.discoveryPrivacy}><ShieldCheck size={17} /><span><strong>Private by default.</strong> Only a summary you explicitly choose to share can appear on your profile. You can compare answers with other members only where they have chosen to share them.</span></div>
        </div>
        <div className={styles.discoveryCard}>
          <div className={styles.discoveryResultIcon}><Compass size={22} /></div>
          <h3>Make your profile more meaningful</h3>
          <p>Answer one question at a time, choose which details belong on your profile, and discover where you connect or differ from other people.</p>
          <button type="button" className={styles.primaryButton} onClick={() => onNavigate('profile')}>Open my Self-discovery Centre <ArrowRight size={15} /></button>
          <p className={styles.discoveryStorageNote}><LockKeyhole size={14} /> Account saving requires a signed-in Sanctuary account. Guest mode does not save answers.</p>
        </div>
      </section>

      <section className={styles.quickRow} aria-label="Quick actions">
        <button type="button" onClick={() => onNavigate('feed')}><MessageCircle size={18} /><span><strong>Community</strong><small>Read and share</small></span><ArrowRight size={15} /></button>
        <button type="button" onClick={() => onNavigate('discover')}><Search size={18} /><span><strong>Find people</strong><small>Explore profiles</small></span><ArrowRight size={15} /></button>
        <button type="button" onClick={() => onNavigate('messages')}><MessageSquare size={18} /><span><strong>Messages</strong><small>Open conversations</small></span><ArrowRight size={15} /></button>
        <button type="button" onClick={() => onNavigate('roadmap')}><Layers3 size={18} /><span><strong>Full product map</strong><small>See all systems</small></span><ArrowRight size={15} /></button>
      </section>

      <section className={styles.explorer} id="feature-explorer" aria-labelledby="feature-explorer-title">
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>THE EXPERIENCE</p><h2 id="feature-explorer-title">Explore the Sanctuary</h2><p>Open a working area or tap a concept to see how it could feel.</p></div>
          <span className={styles.featureCount}>{visibleFeatures.length} features</span>
        </div>
        <div className={styles.filters} aria-label="Filter features">
          {filters.map((item) => <button key={item} type="button" className={filter === item ? styles.filterActive : styles.filter} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}
        </div>
        <div className={styles.featureGrid}>
          {visibleFeatures.map((feature) => {
            const Icon = feature.icon;
            const isOpenable = Boolean(feature.target);
            const statusClass = feature.status === 'Available' ? styles.statusAvailable : feature.status === 'In preview' ? styles.statusPreview : feature.status === 'Safety gated' ? styles.statusGated : styles.statusDesign;
            return (
              <article className={styles.featureCard} key={feature.title}>
                <div className={styles.cardTop}><span className={styles.featureIcon}><Icon size={19} aria-hidden="true" /></span><span className={statusClass}>{feature.status}</span></div>
                <p className={styles.group}>{feature.group}</p><h3>{feature.title}</h3>
                <p className={styles.cardDescription}>{feature.description}</p>
                <button className={styles.cardAction} type="button" onClick={() => isOpenable ? onNavigate(feature.target!) : setActiveFeature(feature)}>{isOpenable ? 'Open area' : 'Explore concept'} <ArrowRight size={15} aria-hidden="true" /></button>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.communityVote} aria-labelledby="community-vote-title">
        <div className={styles.voteCopy}>
          <p className={styles.eyebrow}>HELP SET THE DIRECTION</p>
          <h2 id="community-vote-title">What would you like to explore next?</h2>
          <p>Choose the concept you are most interested in. This is a local preference picker, not a live public poll—your choice is only shared if you add it to a feedback report and send that report yourself.</p>
        </div>
        <fieldset className={styles.voteChoices}>
          <legend>Pick one idea</legend>
          {['Daily Reflection', 'Practice Library', 'Circles', 'Self-discovery'].map((choice) => (
            <label className={nextFeatureChoice === choice ? styles.voteChoiceSelected : styles.voteChoice} key={choice}>
              <input type="radio" name="next-feature-choice" value={choice} checked={nextFeatureChoice === choice} onChange={() => setNextFeatureChoice(choice)} />
              <span>{choice}</span>
              <span className={styles.voteRadio} aria-hidden="true" />
            </label>
          ))}
          <button className={styles.primaryButton} type="button" onClick={() => {
            setFeedbackType('Idea or improvement');
            setFeedbackTitle('My next-feature preference: ' + nextFeatureChoice);
            setFeedbackDetails('The concept I would most like to explore next is ' + nextFeatureChoice + '.\n\nWhy this matters to me: ');
            document.getElementById('beta-feedback-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}>Add my choice to feedback <ArrowRight size={15} /></button>
        </fieldset>
      </section>

      <section className={styles.buildRadar} aria-labelledby="build-radar-title">
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>WHERE WE ARE HEADING</p><h2 id="build-radar-title">The build radar</h2><p>A visual snapshot of product priorities—not release promises. The labels on each feature card remain the source of truth for implementation status.</p></div>
          <span className={styles.featureCount}>Direction, not deadlines</span>
        </div>
        <div className={styles.radarGrid}>
          <article className={styles.radarCard}>
            <div className={styles.radarLabel}><span className={styles.radarDotNow} /> NOW · EXPERIENCE</div>
            <h3>Make the core feel complete</h3>
            <p>Improve Today, navigation, theme consistency, empty states, and the feedback loop so testers can understand and use what exists.</p>
            <button type="button" onClick={() => { setFilter('Available'); document.getElementById('feature-explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Explore available areas <ArrowRight size={14} /></button>
          </article>
          <article className={styles.radarCard}>
            <div className={styles.radarLabel}><span className={styles.radarDotNext} /> NEXT · PERSONAL GROWTH</div>
            <h3>Turn concepts into experiences</h3>
            <p>Shape Daily Reflection and the Practice Library into useful, private tools with clear states and no pressure to share.</p>
            <button type="button" onClick={() => { setFilter('In design'); document.getElementById('feature-explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Explore design concepts <ArrowRight size={14} /></button>
          </article>
          <article className={styles.radarCard}>
            <div className={styles.radarLabel}><span className={styles.radarDotLater} /> LATER · BELONGING</div>
            <h3>Build smaller communities</h3>
            <p>Develop Circles, self-discovery, and richer events after the first experiences are tested and their needs are understood.</p>
            <button type="button" onClick={() => { setActiveFeature(features.find((feature) => feature.title === 'Circles') ?? null); }}>Preview Circles <ArrowRight size={14} /></button>
          </article>
        </div>
        <div className={styles.radarGuardrail}><ShieldCheck size={17} /><p><strong>Trust before transactions.</strong> Wallet purchases, high-impact moderation, and role changes stay behind explicit release checks. Showing a future idea does not enable it.</p></div>
      </section>

      <section className={styles.feedbackSection} aria-labelledby="beta-feedback-title">
        <div className={styles.feedbackIntro}>
          <p className={styles.eyebrow}>HELP SHAPE THE BETA</p><h2 id="beta-feedback-title">Your feedback becomes the next task.</h2>
          <p>Found a bug, got an idea, or unsure how something should work? Prepare a clear report here. Nothing is sent automatically; copy it and share it with Ashley or the project team.</p>
          <p className={styles.feedbackPrivacy}><CircleHelp size={15} aria-hidden="true" /> This form stays in your browser until you copy it. It does not submit to a server.</p>
        </div>
        <div className={styles.feedbackForm}>
          <label>Feedback type<select value={feedbackType} onChange={(event) => setFeedbackType(event.target.value)}><option>Idea or improvement</option><option>Bug report</option><option>Confusing experience</option><option>Accessibility issue</option></select></label>
          <label>Short title<input value={feedbackTitle} onChange={(event) => setFeedbackTitle(event.target.value)} maxLength={100} placeholder="e.g. I couldn't find my notifications" /></label>
          <label>Details<textarea value={feedbackDetails} onChange={(event) => setFeedbackDetails(event.target.value)} maxLength={2000} rows={4} placeholder="What did you try? What happened? What would you expect instead?" /></label>
          <button className={styles.primaryButton} type="button" onClick={() => void copyFeedback()}><Check size={16} aria-hidden="true" /> Copy feedback report</button>
          {copyState && <p className={styles.copyState} role="status">{copyState}</p>}
          {copyState.startsWith('Clipboard access') && <textarea className={styles.copyFallback} readOnly value={feedbackReport()} aria-label="Feedback report to copy manually" />}
        </div>
      </section>

      <footer className={styles.footer}><Sparkles size={17} aria-hidden="true" /><p><strong>Built with the community.</strong> Honest status labels, small releases, and useful feedback matter more than pretending everything is finished.</p><button type="button" onClick={() => onNavigate('roadmap')}>See product direction <ArrowRight size={14} aria-hidden="true" /></button></footer>

      {activeFeature && (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveFeature(null); }}>
          <section className={styles.previewModal} role="dialog" aria-modal="true" aria-labelledby="preview-title">
            <div className={styles.modalHeader}><div><p className={styles.eyebrow}>CONCEPT PREVIEW · NOT A LIVE FEATURE</p><h2 id="preview-title">{activeFeature.title}</h2></div><button type="button" className={styles.closeButton} onClick={() => setActiveFeature(null)} aria-label="Close preview"><X size={19} /></button></div>
            <p className={styles.modalIntro}>{activeFeature.outcome}</p>
            <div className={styles.mockPanel}><span className={styles.mockLabel}>A glimpse of the experience</span>{activeFeature.preview.map((item, index) => <div className={styles.mockRow} key={item}><span className={styles.mockNumber}>0{index + 1}</span><span>{item}</span><ArrowRight size={15} aria-hidden="true" /></div>)}</div>
            <div className={styles.modalNote}><CircleHelp size={16} aria-hidden="true" /><p>This is a visual concept to help beta testers react to the direction. It does not create data, invite members, or claim the feature is implemented.</p></div>
            <button className={styles.primaryButton} type="button" onClick={() => { setActiveFeature(null); setFeedbackTitle('Feedback: ' + activeFeature.title); document.getElementById('beta-feedback-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Give feedback on this idea <ArrowRight size={15} aria-hidden="true" /></button>
          </section>
        </div>
      )}
    </main>
  );
}
