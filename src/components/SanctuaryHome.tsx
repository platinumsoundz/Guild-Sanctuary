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
        <div className={styles.heroArtwork} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><Sun size={14} aria-hidden="true" /> THE SANCTUARY COMMUNITY</p>
          <h1 id="sanctuary-home-title">A safe space for <em>dreamers, creators & explorers.</em></h1>
          <p className={styles.intro}>Find your people, share what you create, discover new worlds and become part of something bigger. There is room here to begin again, find your spark, and grow together.</p>
          <div className={styles.heroActions}>
            <button className={styles.primaryButton} type="button" onClick={() => onNavigate('feed')}>Explore the community <ArrowRight size={16} aria-hidden="true" /></button>
            <button className={styles.secondaryButton} type="button" onClick={() => onNavigate('roadmap')}>Explore roadmap <ArrowRight size={16} aria-hidden="true" /></button>
          </div>
        </div>
        <div className={styles.heroNote}>
          <div className={styles.orbit} aria-hidden="true"><span /><span /><span /><Sun size={34} /></div>
          <p className={styles.noteLabel}>A calmer starting point</p>
          <p>Your daily home stays focused. Feature plans and build progress live in the roadmaps.</p>
        </div>
      </section>

      <section className={styles.quickRow} aria-label="Quick actions">
        <button type="button" onClick={() => onNavigate('feed')}><MessageCircle size={18} /><span><strong>Community</strong><small>Read and share</small></span><ArrowRight size={15} /></button>
        <button type="button" onClick={() => onNavigate('discover')}><Search size={18} /><span><strong>Find people</strong><small>Explore profiles</small></span><ArrowRight size={15} /></button>
        <button type="button" onClick={() => onNavigate('messages')}><MessageSquare size={18} /><span><strong>Messages</strong><small>Open conversations</small></span><ArrowRight size={15} /></button>
        <button type="button" onClick={() => onNavigate('roadmap')}><Layers3 size={18} /><span><strong>Full product map</strong><small>See all systems</small></span><ArrowRight size={15} /></button>
      </section>

    </main>
  );
}
