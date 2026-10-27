'use client';

import { useEffect, useMemo, useState } from 'react';
import { Compass, LockKeyhole, ShieldCheck, Trash2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { isSupabaseCommunityStorageConfigured, requireCommunityStorageUser } from '@/services/supabase/communityMedia';
import type { PublicProfile } from '@/types/database';
import styles from './SelfDiscovery.module.css';

type Answers = { connection: string; decisions: string; motivation: string; zodiac: string };
type Summary = Record<string, string>;
const emptyAnswers: Answers = { connection: '', decisions: '', motivation: '', zodiac: '' };
const fields: { key: keyof Answers; title: string; prompt: string; helper: string; options: { value: string; label: string; detail: string }[] }[] = [
  { key: 'connection', title: 'What usually helps you recharge?', prompt: 'Choose what feels most like you lately. There is no right answer.', helper: 'You can change this whenever it feels different.', options: [
    { value: 'quiet', label: 'Quiet time on my own', detail: 'I reset with space to think or do my own thing.' },
    { value: 'people', label: 'Time with people', detail: 'Conversation and shared energy help me recharge.' },
    { value: 'mix', label: 'A bit of both', detail: 'It depends on the day and who I am with.' },
  ] },
  { key: 'decisions', title: 'When making a difficult choice, what do you lean on first?', prompt: 'Most people use both. This is a starting point for reflection.', helper: 'Your decision style can depend on the situation.', options: [
    { value: 'analysis', label: 'Evidence and analysis', detail: 'I want to understand the facts and how things fit together.' },
    { value: 'values', label: 'Values and people', detail: 'I think about what matters and how choices affect people.' },
    { value: 'both', label: 'A balance of both', detail: 'I try to make room for the facts and the human side.' },
  ] },
  { key: 'motivation', title: 'Which motivation feels closest to you right now?', prompt: 'Your answer can change through different seasons of life.', helper: 'This is a reflection prompt, not an Enneagram result.', options: [
    { value: 'growth', label: 'Learning and mastery', detail: 'I want to improve, understand, or create something.' },
    { value: 'belonging', label: 'Connection and belonging', detail: 'I want to feel close to people and make a positive difference.' },
    { value: 'stability', label: 'Security and stability', detail: 'I value trust, preparation, and knowing where I stand.' },
    { value: 'freedom', label: 'Freedom and meaning', detail: 'I want room to be myself and follow what feels meaningful.' },
  ] },
  { key: 'zodiac', title: 'Would you like to include a zodiac sign?', prompt: 'Completely optional. We ask for the sign itself, not your date of birth.', helper: 'Astrology is offered as a cultural/reflective lens, not a scientific prediction.', options: [
    ...['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].map((sign) => ({ value: sign, label: sign, detail: '' })),
  ] },
];
const labels: Record<string, Record<string, string>> = {
  connection: { quiet: 'Quiet time on my own', people: 'Time with people', mix: 'A bit of both' },
  decisions: { analysis: 'Evidence and analysis', values: 'Values and people', both: 'A balance of both' },
  motivation: { growth: 'Learning and mastery', belonging: 'Connection and belonging', stability: 'Security and stability', freedom: 'Freedom and meaning' },
};
function toSummary(answers: Answers, selected: string[]): Summary {
  const summary: Summary = {};
  for (const key of selected) {
    const answer = answers[key as keyof Answers];
    if (!answer) continue;
    summary[key] = key === 'zodiac' ? answer : labels[key]?.[answer] ?? '';
  }
  return summary;
}
function readAnswers(value: unknown): Answers {
  if (!value || typeof value !== 'object') return { ...emptyAnswers };
  const raw = value as Record<string, unknown>;
  return {
    connection: typeof raw.connection === 'string' ? raw.connection : '',
    decisions: typeof raw.decisions === 'string' ? raw.decisions : '',
    motivation: typeof raw.motivation === 'string' ? raw.motivation : '',
    zodiac: typeof raw.zodiac === 'string' ? raw.zodiac : '',
  };
}

export function SelfDiscoveryPanel({ userId, isGuest = false, onSummaryChange }: { userId: string; isGuest?: boolean; onSummaryChange?: (summary: Summary | null) => void }) {
  const [answers, setAnswers] = useState<Answers>({ ...emptyAnswers });
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);
  const [visible, setVisible] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (isGuest || !isSupabaseCommunityStorageConfigured()) {
        setLoaded(true);
        return;
      }
      try {
        await requireCommunityStorageUser(userId);
        const client = getSupabaseBrowserClient();
        const [responseResult, profileResult] = await Promise.all([
          client.from('self_discovery_responses').select('answers').eq('user_id', userId).maybeSingle(),
          client.from('profiles').select('self_discovery_summary,self_discovery_visible').eq('id', userId).single(),
        ]);
        if (responseResult.error) throw responseResult.error;
        if (profileResult.error) throw profileResult.error;
        if (cancelled) return;
        setStorageReady(true);
        if (responseResult.data) {
          setAnswers(readAnswers(responseResult.data.answers));
          setConsent(true);
        }
        const summary = profileResult.data.self_discovery_summary as Summary | null;
        if (summary && typeof summary === 'object') setSelectedFields(Object.keys(summary));
        setVisible(profileResult.data.self_discovery_visible === true);
        onSummaryChange?.(profileResult.data.self_discovery_visible === true && summary && typeof summary === 'object' ? summary : null);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Your self-discovery answers could not be loaded.');
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [userId, isGuest, onSummaryChange]);

  const summary = useMemo(() => toSummary(answers, selectedFields), [answers, selectedFields]);
  const updateAnswer = (key: keyof Answers, value: string) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setNotice('');
  };
  const persistAnswers = async (nextAnswers = answers) => {
    if (isGuest) throw new Error('Guest profiles cannot save self-discovery answers. Sign in to save them to your Sanctuary account.');
    if (!isSupabaseCommunityStorageConfigured()) throw new Error('Account storage is not configured yet. Your answers have not been saved.');
    if (!consent) throw new Error('Please confirm that you want to save these answers to your Sanctuary account.');
    await requireCommunityStorageUser(userId);
    const { error: saveError } = await getSupabaseBrowserClient().from('self_discovery_responses').upsert({
      user_id: userId,
      answers: nextAnswers,
      consent_version: 'self-discovery-v1',
      updated_at: new Date().toISOString(),
    });
    if (saveError) throw new Error(`Your answers could not be saved: ${saveError.message}`);
  };
  const advance = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      await persistAnswers();
      setNotice('Your answers are saved to your Sanctuary account.');
      setStep((current) => Math.min(4, current + 1));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Your answers could not be saved.');
    } finally { setBusy(false); }
  };
  const saveSummary = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      if (!consent) {
        if (isGuest || !isSupabaseCommunityStorageConfigured()) throw new Error('Sign in with your Sanctuary account to manage saved answers.');
        await requireCommunityStorageUser(userId);
        const client = getSupabaseBrowserClient();
        const [deleteResult, profileResult] = await Promise.all([
          client.from('self_discovery_responses').delete().eq('user_id', userId),
          client.from('profiles').update({ self_discovery_summary: null, self_discovery_visible: false, updated_at: new Date().toISOString() }).eq('id', userId),
        ]);
        if (deleteResult.error) throw deleteResult.error;
        if (profileResult.error) throw profileResult.error;
        setAnswers({ ...emptyAnswers }); setStep(0); setVisible(false); setSelectedFields([]);
        onSummaryChange?.(null);
        setNotice('Consent withdrawn. Your saved answers and profile summary have been deleted.');
        return;
      }
      await persistAnswers();
      if (visible && Object.keys(summary).length === 0) throw new Error('Choose at least one summary item before making it visible.');
      await requireCommunityStorageUser(userId);
      const { error: profileError } = await getSupabaseBrowserClient().from('profiles').update({
        self_discovery_summary: Object.keys(summary).length ? summary : null,
        self_discovery_visible: visible && Object.keys(summary).length > 0,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
      if (profileError) throw new Error(`Your profile summary could not be saved: ${profileError.message}`);
      onSummaryChange?.(visible && Object.keys(summary).length > 0 ? summary : null);
      setNotice(visible ? 'Your selected summary is now available on your public profile.' : 'Your answers are saved privately. Your profile summary is hidden.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Your profile summary could not be saved.');
    } finally { setBusy(false); }
  };
  const clearAnswers = async () => {
    if (!window.confirm('Delete your saved self-discovery answers and hide your profile summary? This cannot be undone.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (isGuest || !isSupabaseCommunityStorageConfigured()) throw new Error('Sign in with your Sanctuary account to manage saved answers.');
      await requireCommunityStorageUser(userId);
      const client = getSupabaseBrowserClient();
      const [deleteResult, profileResult] = await Promise.all([
        client.from('self_discovery_responses').delete().eq('user_id', userId),
        client.from('profiles').update({ self_discovery_summary: null, self_discovery_visible: false, updated_at: new Date().toISOString() }).eq('id', userId),
      ]);
      if (deleteResult.error) throw deleteResult.error;
      if (profileResult.error) throw profileResult.error;
      setAnswers({ ...emptyAnswers }); setStep(0); setConsent(false); setVisible(false); setSelectedFields([]);
      onSummaryChange?.(null);
      setNotice('Your saved self-discovery answers and public summary have been cleared.');
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Your saved answers could not be cleared.');
    } finally { setBusy(false); }
  };

  const configured = isSupabaseCommunityStorageConfigured() && !isGuest;
  return (
    <section className={styles.panel} aria-labelledby="self-discovery-title">
      <div className={styles.intro}>
        <p className={styles.eyebrow}>PERSONAL GROWTH · ACCOUNT-SAVED</p>
        <h2 id="self-discovery-title">Get to know yourself, at your own pace.</h2>
        <p>Explore your preferences, motivations, and optional zodiac traditions one question at a time. These prompts are for reflection—not a diagnosis, formal MBTI result, or prediction.</p>
        <div className={styles.privacyNotice}><ShieldCheck size={18} /><span><strong>Private by default.</strong> Your full answers are stored with your Sanctuary account and are never shown to other members. Only a separate summary you choose to publish can appear on your profile.</span></div>
      </div>
      {!configured && <p className={styles.stateNotice}>Sign in with a connected Sanctuary account to save answers to the website. Guest/demo mode does not save this information.</p>}
      {loaded && configured && storageReady && (
        <div className={styles.questionCard}>
          <div className={styles.progressHead}><span>{step < 4 ? 'A FEW GENTLE QUESTIONS' : 'YOUR PROFILE SUMMARY'}</span><span>{step < 4 ? `Question ${step + 1} of 4` : 'Sharing controls'}</span></div>
          <div className={styles.progress}><span style={{ width: `${Math.min(step + 1, 4) / 4 * 100}%` }} /></div>
          {step < 4 ? (
            <fieldset className={styles.question}>
              <legend>{fields[step].title}</legend><p>{fields[step].prompt}</p>
              {fields[step].key === 'zodiac' ? (
                <select className={styles.select} value={answers.zodiac} onChange={(event) => updateAnswer('zodiac', event.target.value)} aria-label="Choose a zodiac sign">
                  <option value="">Skip this question</option>
                  {fields[step].options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : fields[step].options.map((option) => (
                <label key={option.value} className={answers[fields[step].key] === option.value ? styles.optionSelected : styles.option}>
                  <input type="radio" name={fields[step].key} checked={answers[fields[step].key] === option.value} onChange={() => updateAnswer(fields[step].key, option.value)} />
                  <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                </label>
              ))}
              <p className={styles.helper}>{fields[step].helper}</p>
            </fieldset>
          ) : (
            <div className={styles.shareArea}>
              <h3>Choose what belongs on your profile</h3>
              <p>Every item starts private. Select only the details you are comfortable sharing. You can hide the whole summary at any time.</p>
              {Object.entries({ connection: 'How I recharge', decisions: 'How I approach decisions', motivation: 'What motivates me', zodiac: 'My zodiac sign' }).map(([key, label]) => (
                <label key={key} className={styles.shareOption}>
                  <input type="checkbox" checked={selectedFields.includes(key)} onChange={(event) => setSelectedFields((current) => event.target.checked ? [...current, key] : current.filter((item) => item !== key))} />
                  <span><strong>{label}</strong><small>{summary[key] || 'Not answered yet'}</small></span>
                </label>
              ))}
              <label className={styles.visibilityToggle}>
                <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />
                <span><strong>Show selected summary on my public profile</strong><small>Off by default. This publishes only the selected summary fields, never the raw answers.</small></span>
              </label>
              {visible && Object.keys(summary).length > 0 && <div className={styles.publicPreview}><span>PUBLIC PROFILE PREVIEW</span>{Object.entries(summary).map(([key, value]) => <div key={key}><span>{({ connection: 'Recharge', decisions: 'Decision style', motivation: 'Motivation', zodiac: 'Zodiac' } as Record<string,string>)[key] ?? key}</span><strong>{value}</strong></div>)}</div>}
              <p className={styles.helper}>Your answers and sharing preferences are saved to the Sanctuary website, not your browser's local storage.</p>
            </div>
          )}
          <label className={styles.consent}><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><strong>I agree to save these answers to my Sanctuary account.</strong><small>Optional. You can stop, change your mind, hide your summary, or delete your saved answers at any time.</small></span></label>
          <div className={styles.controls}>
            <button type="button" className={styles.secondary} disabled={step === 0 || busy} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</button>
            {step < 4 ? <button type="button" className={styles.primary} disabled={!consent || busy} onClick={() => void advance()}>{busy ? 'Saving…' : 'Save & continue'}</button> : <button type="button" className={styles.primary} disabled={!consent || busy} onClick={() => void saveSummary()}>{busy ? 'Saving…' : consent ? 'Save privacy & profile choices' : 'Withdraw consent & delete answers'}</button>}
          </div>
          {step === 4 && <button type="button" className={styles.clearButton} disabled={busy} onClick={() => void clearAnswers()}><Trash2 size={14} /> Delete my saved answers and hide summary</button>}
          {notice && <p className={styles.success} role="status">{notice}</p>}
          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
      )}
      {loaded && configured && !storageReady && <p className={styles.error} role="alert">{error || 'Your account-backed self-discovery storage is not ready yet. No answers have been saved.'}</p>}
      {loaded && !configured && <p className={styles.stateNotice}>Your answers will only be saved after the account-backed version is available and you sign in. Nothing is being saved locally.</p>}
      <p className={styles.footerNote}><LockKeyhole size={14} /> Raw answers are owner-only in the database. Public comparison uses only fields the other member explicitly shares.</p>
    </section>
  );
}

export function SelfDiscoveryComparison({ currentUserId, profile }: { currentUserId: string; profile: PublicProfile }) {
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!profile.selfDiscoverySummary || !isSupabaseCommunityStorageConfigured()) { setLoading(false); return; }
      try {
        await requireCommunityStorageUser(currentUserId);
        const { data, error: queryError } = await getSupabaseBrowserClient().from('self_discovery_responses').select('answers').eq('user_id', currentUserId).maybeSingle();
        if (queryError) throw queryError;
        if (!cancelled) setAnswers(data ? readAnswers(data.answers) : null);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Comparison is unavailable.');
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [currentUserId, profile.selfDiscoverySummary]);

  if (!profile.selfDiscoverySummary) return null;
  const myValues = answers ? toSummary(answers, ['connection','decisions','motivation','zodiac']) : {};
  const rows = Object.entries(profile.selfDiscoverySummary).filter(([key]) => key in myValues);
  return (
    <section className={styles.comparison} aria-labelledby="discovery-compare-title">
      <p className={styles.eyebrow}>OPTIONAL · SHARED INTERESTS</p>
      <h2 id="discovery-compare-title">Compare your self-discovery</h2>
      <p>Only this member's deliberately shared summary is used here. A match means you selected the same answer to this prompt—not that you are the same person.</p>
      {loading ? <p className={styles.helper}>Checking your saved answers…</p> : error ? <p className={styles.error} role="alert">{error}</p> : !answers ? <p className={styles.helper}>Save your own answers in your profile's Self-discovery Centre to compare.</p> : rows.length === 0 ? <p className={styles.helper}>There are no matching questions to compare yet. Answer a question they chose to share.</p> : (
        <div className={styles.comparisonRows}>{rows.map(([key, theirValue]) => {
          const same = myValues[key] === theirValue;
          return <div key={key} className={styles.comparisonRow}><span>{({connection:'How I recharge',decisions:'Decision style',motivation:'Motivation',zodiac:'Zodiac sign'} as Record<string,string>)[key] ?? key}</span><strong>{same ? 'You answered the same' : 'You answered differently'}</strong><small>You: {myValues[key]} · {profile.displayName}: {theirValue}</small></div>;
        })}</div>
      )}
    </section>
  );
}
