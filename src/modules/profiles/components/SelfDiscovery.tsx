'use client';

import { useEffect, useMemo, useState } from 'react';
import { Compass, LockKeyhole, ShieldCheck, Trash2, HeartHandshake, Download } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { isSupabaseCommunityStorageConfigured, requireCommunityStorageUser } from '@/services/supabase/communityMedia';
import type { PublicProfile } from '@/types/database';
import styles from './SelfDiscovery.module.css';

type Answers = { connection: string; decisions: string; motivation: string; communication: string; learning: string; zodiac: string };
type Summary = Record<string, string>;
const emptyAnswers: Answers = { connection: '', decisions: '', motivation: '', communication: '', learning: '', zodiac: '' };
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
  { key: 'communication', title: 'What helps you communicate when something matters?', prompt: 'Think about what tends to help you feel understood. You can choose a different answer in another situation.', helper: 'This is a preference to explore, not a fixed communication type.', options: [
    { value: 'direct', label: 'Clear and direct words', detail: 'I appreciate knowing the point and what is being asked.' },
    { value: 'gentle', label: 'A gentle, considerate approach', detail: 'Tone and reassurance help me stay open to the conversation.' },
    { value: 'time', label: 'Time to think before replying', detail: 'I often express myself better after I have had a moment.' },
    { value: 'talk', label: 'Talking it through together', detail: 'I understand my thoughts as I discuss them with someone.' },
  ] },
  { key: 'learning', title: 'How do you most enjoy learning something new?', prompt: 'Choose what often helps you get started. People can learn in several ways.', helper: 'These are learning preferences, not fixed learning styles or limits.', options: [
    { value: 'hands-on', label: 'Trying it out hands-on', detail: 'Experimenting and practising helps it click.' },
    { value: 'reading', label: 'Reading or watching an explanation', detail: 'I like to understand the steps before I try.' },
    { value: 'discussion', label: 'Discussing it with someone', detail: 'Questions and conversation help me connect ideas.' },
    { value: 'examples', label: 'Seeing examples and patterns', detail: 'I learn by comparing examples and noticing how things work.' },
  ] },
  { key: 'zodiac', title: 'Would you like to include a zodiac sign?', prompt: 'Completely optional. We ask for the sign itself, not your date of birth.', helper: 'Astrology is offered as a cultural/reflective lens, not a scientific prediction.', options: [
    ...['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].map((sign) => ({ value: sign, label: sign, detail: '' })),
  ] },
];
const labels: Record<string, Record<string, string>> = {
  connection: { quiet: 'Quiet time on my own', people: 'Time with people', mix: 'A bit of both' },
  decisions: { analysis: 'Evidence and analysis', values: 'Values and people', both: 'A balance of both' },
  motivation: { growth: 'Learning and mastery', belonging: 'Connection and belonging', stability: 'Security and stability', freedom: 'Freedom and meaning' },
  communication: { direct: 'Clear and direct words', gentle: 'A gentle, considerate approach', time: 'Time to think before replying', talk: 'Talking it through together' },
  learning: { 'hands-on': 'Trying it out hands-on', reading: 'Reading or watching an explanation', discussion: 'Discussing it with someone', examples: 'Seeing examples and patterns' },
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
type Reflection = { headline: string; pattern: string; action: string; prompt: string; lesson: string; insights: { title: string; pattern: string; tip: string }[] };
function buildReflection(answers: Answers): Reflection | null {
  const chosen = Object.values(answers).filter(Boolean).length;
  if (!chosen) return null;
  const connection = {
    quiet: ['Quiet space may help you recharge.', 'Protect a small quiet window after demanding moments, and tell people when you need space.', 'What helps me notice that I need a pause?'],
    people: ['Connection may help restore your energy.', 'Plan one intentional check-in with someone you trust, while leaving room to rest too.', 'Which kinds of connection leave me feeling supported rather than drained?'],
    mix: ['Your need for company or quiet may change with the day.', 'Before committing, take a moment to check your energy and choose what fits today.', 'What signs tell me whether I need company or quiet right now?'],
  } as Record<string, string[]>;
  const decisions = {
    analysis: ['You may feel steadier when you can examine the evidence.', 'Set a limit for how much information you need, then choose a next step instead of researching indefinitely.', 'What would count as enough information to make this decision?'],
    values: ['You may give close attention to values and how choices affect people.', 'Name the value that matters most, then check the practical trade-offs before deciding.', 'How can I honour what matters while still being realistic?'],
    both: ['You may try to balance facts with human impact.', 'Write down one important fact and one important personal impact before choosing.', 'What evidence matters, and who is affected by this choice?'],
  } as Record<string, string[]>;
  const motivation = {
    growth: ['Learning and mastery seem important to you right now.', 'Choose one small skill to practise for 15 minutes and note one thing you learned.', 'What would progress look like if I focused on learning rather than perfection?'],
    belonging: ['Connection and belonging seem important to you right now.', 'Try one low-pressure invitation or tell someone clearly what kind of support would help.', 'Where do I feel most able to be myself with other people?'],
    stability: ['Trust and stability seem important to you right now.', 'Make a short plan with one next step and one fallback, while allowing that plans can change.', 'What would help me feel prepared without needing to control everything?'],
    freedom: ['Autonomy and meaning seem important to you right now.', 'Choose one flexible goal and write down why it matters to you personally.', 'Which choice feels meaningful to me, rather than simply expected of me?'],
  } as Record<string, string[]>;
  const communication = {
    direct: ['Clear, direct language may help you feel understood.', 'When a conversation matters, say what you need in one clear sentence and invite the other person to share their view.', 'How can I be clear while staying curious about the other person?'],
    gentle: ['A considerate tone may help you stay engaged in difficult conversations.', 'Try naming both the issue and your intention to work through it respectfully.', 'What helps me feel safe enough to be honest?'],
    time: ['A little thinking time may help you express yourself.', 'It is okay to say, “I want to think about that and come back to you.”', 'What would help me respond thoughtfully without feeling rushed?'],
    talk: ['Talking things through may help you organise your thoughts.', 'Ask someone you trust to listen while you work through an idea, and tell them whether you want advice or just a sounding board.', 'When does talking help me find clarity?'],
  } as Record<string, string[]>;
  const learning = {
    'hands-on': ['Experimenting may help new ideas click for you.', 'Try a short hands-on practice session and note what changed between your first and second attempt.', 'What did I learn by trying rather than only reading?'],
    reading: ['A clear explanation may help you get oriented.', 'Start with a short guide, then test your understanding with one small example.', 'Which explanation helped me understand the idea most clearly?'],
    discussion: ['Questions and conversation may help you connect ideas.', 'Explain the idea in your own words to someone or ask three questions that would clarify it.', 'What became clearer when I talked it through?'],
    examples: ['Comparing examples may help you spot patterns.', 'Look at two examples, identify what they share, and note one meaningful difference.', 'Which pattern did I notice, and where might it not apply?'],
  } as Record<string, string[]>;
  const connectionInsight = connection[answers.connection];
  const decisionInsight = decisions[answers.decisions];
  const motivationInsight = motivation[answers.motivation];
  const communicationInsight = communication[answers.communication];
  const learningInsight = learning[answers.learning];
  const insights: Reflection['insights'] = [];
  if (connectionInsight) insights.push({ title: 'Recharge and energy', pattern: connectionInsight[0], tip: connectionInsight[1] });
  if (decisionInsight) insights.push({ title: 'Decision-making', pattern: decisionInsight[0], tip: decisionInsight[1] });
  if (motivationInsight) insights.push({ title: 'Motivation', pattern: motivationInsight[0], tip: motivationInsight[1] });
  if (communicationInsight) insights.push({ title: 'Communication', pattern: communicationInsight[0], tip: communicationInsight[1] });
  if (learningInsight) insights.push({ title: 'Learning and practice', pattern: learningInsight[0], tip: learningInsight[1] });
  const pattern = [connectionInsight?.[0], decisionInsight?.[0], motivationInsight?.[0], communicationInsight?.[0], learningInsight?.[0]].filter(Boolean).join(' ');
  const action = motivationInsight?.[1] ?? learningInsight?.[1] ?? communicationInsight?.[1] ?? connectionInsight?.[1] ?? decisionInsight?.[1] ?? 'Notice one moment today when your response feels natural, and reflect on what influenced it.';
  const prompt = motivationInsight?.[2] ?? learningInsight?.[2] ?? communicationInsight?.[2] ?? connectionInsight?.[2] ?? decisionInsight?.[2] ?? 'What did I notice about myself today?';
  const lesson = answers.motivation === 'growth'
    ? 'Micro-lesson: make practice small enough to repeat. A short, repeatable session often teaches you more than waiting for the perfect block of time.'
    : answers.motivation === 'belonging'
      ? 'Micro-lesson: specific requests are easier to respond to than hints. Try naming one practical thing that would help you feel supported.'
      : answers.motivation === 'stability'
        ? 'Micro-lesson: preparation works best when it includes a fallback. A plan can give direction without needing to predict everything.'
        : answers.motivation === 'freedom'
          ? 'Micro-lesson: values can act like a compass. Choose a direction that matters, then leave the route flexible.'
          : 'Micro-lesson: a short pause between feeling and action can help you choose a response that fits your priorities.';
  return { headline: 'A reflection from your answers so far', pattern: pattern || 'You are still exploring. As you answer more questions, this reflection can become more specific.', action, prompt, lesson, insights };
}
function readAnswers(value: unknown): Answers {
  if (!value || typeof value !== 'object') return { ...emptyAnswers };
  const raw = value as Record<string, unknown>;
  return {
    connection: typeof raw.connection === 'string' ? raw.connection : '',
    decisions: typeof raw.decisions === 'string' ? raw.decisions : '',
    motivation: typeof raw.motivation === 'string' ? raw.motivation : '',
    communication: typeof raw.communication === 'string' ? raw.communication : '',
    learning: typeof raw.learning === 'string' ? raw.learning : '',
    zodiac: typeof raw.zodiac === 'string' ? raw.zodiac : '',
  };
}

export function SelfDiscoveryPanel({ userId, isGuest = false, onSummaryChange }: { userId: string; isGuest?: boolean; onSummaryChange?: (summary: Summary | null) => void }) {
  const [answers, setAnswers] = useState<Answers>({ ...emptyAnswers });
  const [step, setStep] = useState(0);
  const [showWellbeingGuide, setShowWellbeingGuide] = useState(false);
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
  const reflection = useMemo(() => buildReflection(answers), [answers]);
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
      setStep((current) => Math.min(fields.length, current + 1));
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
        const hideResult = await client.from('profiles').update({ self_discovery_visible: false, updated_at: new Date().toISOString() }).eq('id', userId);
        if (hideResult.error) throw hideResult.error;
        const deleteResult = await client.from('self_discovery_responses').delete().eq('user_id', userId);
        if (deleteResult.error) throw deleteResult.error;
        const clearSummaryResult = await client.from('profiles').update({ self_discovery_summary: null, updated_at: new Date().toISOString() }).eq('id', userId);
        if (clearSummaryResult.error) throw clearSummaryResult.error;
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
      const hideResult = await client.from('profiles').update({ self_discovery_visible: false, updated_at: new Date().toISOString() }).eq('id', userId);
      if (hideResult.error) throw hideResult.error;
      const deleteResult = await client.from('self_discovery_responses').delete().eq('user_id', userId);
      if (deleteResult.error) throw deleteResult.error;
      const clearSummaryResult = await client.from('profiles').update({ self_discovery_summary: null, updated_at: new Date().toISOString() }).eq('id', userId);
      if (clearSummaryResult.error) throw clearSummaryResult.error;
      setAnswers({ ...emptyAnswers }); setStep(0); setConsent(false); setVisible(false); setSelectedFields([]);
      onSummaryChange?.(null);
      setNotice('Your saved self-discovery answers and public summary have been cleared.');
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : 'Your saved answers could not be cleared.');
    } finally { setBusy(false); }
  };

  const exportPrivatePlaybook = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      title: 'My private Sanctuary self-discovery playbook',
      note: 'Personal reflection only. These preferences are not a diagnosis or a fixed description of who you are.',
      answers,
      reflection,
      profileSharing: {
        visible,
        selectedFields,
        summary: toSummary(answers, selectedFields),
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'sanctuary-self-discovery-playbook.json';
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice('Your private playbook was exported to a file on this device. Keep it somewhere safe.');
  };

  const configured = isSupabaseCommunityStorageConfigured() && !isGuest;
  return (
    <section className={styles.panel} aria-labelledby="self-discovery-title">
      <div className={styles.intro}>
        <p className={styles.eyebrow}>PERSONAL GROWTH · ACCOUNT-SAVED</p>
        <h2 id="self-discovery-title">Get to know yourself, at your own pace.</h2>
        <p>Explore your preferences, motivations, and optional zodiac traditions one question at a time. These prompts are for reflection—not a diagnosis, formal MBTI result, or prediction.</p>
        <div className={styles.privacyNotice}><ShieldCheck size={18} /><span><strong>Private by default.</strong> Your full answers are stored with your Sanctuary account and are never shown to other members. Only a separate summary you choose to publish can appear on your profile.</span></div>
        <section className={styles.panel} aria-labelledby="wellbeing-guide-title">
          <div className={styles.intro}><HeartHandshake size={18} /><div><h3 id="wellbeing-guide-title">Want to understand your wellbeing, too?</h3><p>Optional, educational guidance — not a diagnosis or a mental-health test.</p></div></div>
          <button type="button" className={styles.secondary} aria-expanded={showWellbeingGuide} onClick={() => setShowWellbeingGuide((value) => !value)}>{showWellbeingGuide ? 'Hide wellbeing guidance' : 'Explore wellbeing guidance'}</button>
          {showWellbeingGuide && <div className={styles.reflectionCard}>
            <p>Personality preferences cannot tell you whether you have a mental-health condition. Focus, mood, anxiety, sleep and social energy can be affected by many things, and one questionnaire cannot identify the cause.</p>
            <ul>
              <li><strong>Notice patterns:</strong> write down what you experience, when it happens, and what seems to help.</li>
              <li><strong>Try a small support:</strong> choose one manageable change around rest, routine, movement, connection or asking for help.</li>
              <li><strong>Get a qualified view:</strong> if symptoms persist, distress you, or affect daily life, speak with a GP or appropriately qualified professional. A clinician can help decide whether a validated assessment is useful.</li>
            </ul>
            <p>If you feel in immediate danger or may harm yourself, seek urgent local help now. This feature is not monitored and is not an emergency service.</p>
            <small>This guide does not save a mental-health answer or add a condition to your profile.</small>
          </div>}
        </section>
      </div>
      {!configured && <p className={styles.stateNotice}>Sign in with a connected Sanctuary account to save answers to the website. Guest/demo mode does not save this information.</p>}
      {loaded && configured && storageReady && (
        <div className={styles.questionCard}>
          <div className={styles.progressHead}><span>{step < fields.length ? 'A FEW GENTLE QUESTIONS' : 'YOUR PROFILE SUMMARY'}</span><span>{step < fields.length ? `Question ${step + 1} of ${fields.length}` : 'Sharing controls'}</span></div>
          <div className={styles.progress}><span style={{ width: `${Math.min(step + 1, fields.length) / fields.length * 100}%` }} /></div>
          {step < fields.length ? (
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
              {reflection && (
                <section className={styles.reflectionCard} aria-labelledby="self-discovery-reflection-title">
                  <p className={styles.eyebrow}>PRIVATE · BASED ON YOUR ANSWERS</p>
                  <h3 id="self-discovery-reflection-title">{reflection.headline}</h3>
                  <p>{reflection.pattern}</p>
                  {reflection.insights.length > 0 && (
                    <section className={styles.personalPlaybook} aria-label="Practical tips based on your answers">
                      <h4>Your personal playbook</h4>
                      <p>These are flexible ideas to try—not fixed rules about how your brain works. Keep what helps and ignore what does not.</p>
                      <div className={styles.playbookGrid}>
                        {reflection.insights.map((insight) => (
                          <article className={styles.playbookItem} key={insight.title}>
                            <h5>{insight.title}</h5>
                            <p>{insight.pattern}</p>
                            <strong>Try this</strong>
                            <p>{insight.tip}</p>
                          </article>
                        ))}
                      </div>
                    </section>
                  )}
                  <div><strong>One thing to try</strong><p>{reflection.action}</p></div>
                  <div><strong>Micro-lesson</strong><p>{reflection.lesson}</p></div>
                  <div><strong>Journal prompt</strong><p>{reflection.prompt}</p></div>
                  <small>This is a practical reflection generated from your selected preferences, not a mental-health assessment or diagnosis. It stays private and is not included in your public profile summary.</small>
                  <button type="button" className={styles.secondary} onClick={exportPrivatePlaybook}><Download size={15} /> Export my private playbook</button>
                </section>
              )}
              <h3>Choose what belongs on your profile</h3>
              <p>Every item starts private. Select only the details you are comfortable sharing. You can hide the whole summary at any time.</p>
              {Object.entries({ connection: 'How I recharge', decisions: 'How I approach decisions', motivation: 'What motivates me', communication: 'How I communicate', learning: 'How I learn', zodiac: 'My zodiac sign' }).map(([key, label]) => (
                <label key={key} className={styles.shareOption}>
                  <input type="checkbox" checked={selectedFields.includes(key)} onChange={(event) => setSelectedFields((current) => event.target.checked ? [...current, key] : current.filter((item) => item !== key))} />
                  <span><strong>{label}</strong><small>{summary[key] || 'Not answered yet'}</small></span>
                </label>
              ))}
              <label className={styles.visibilityToggle}>
                <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} />
                <span><strong>Show selected summary on my public profile</strong><small>Off by default. This publishes only the selected summary fields, never the raw answers.</small></span>
              </label>
              {visible && Object.keys(summary).length > 0 && <div className={styles.publicPreview}><span>PUBLIC PROFILE PREVIEW</span>{Object.entries(summary).map(([key, value]) => <div key={key}><span>{({ connection: 'Recharge', decisions: 'Decision style', motivation: 'Motivation', communication: 'Communication', learning: 'Learning', zodiac: 'Zodiac' } as Record<string,string>)[key] ?? key}</span><strong>{value}</strong></div>)}</div>}
              <p className={styles.helper}>Your answers and sharing preferences are saved to the Sanctuary website, not your browser's local storage.</p>
            </div>
          )}
          <label className={styles.consent}><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><strong>I agree to save these answers to my Sanctuary account.</strong><small>Optional. You can stop, change your mind, hide your summary, or delete your saved answers at any time.</small></span></label>
          <div className={styles.controls}>
            <button type="button" className={styles.secondary} disabled={step === 0 || busy} onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</button>
            {step < fields.length ? <button type="button" className={styles.primary} disabled={!consent || busy} onClick={() => void advance()}>{busy ? 'Saving…' : 'Save & continue'}</button> : <button type="button" className={styles.primary} disabled={busy} onClick={() => void saveSummary()}>{busy ? 'Saving…' : consent ? 'Save privacy & profile choices' : 'Withdraw consent & delete answers'}</button>}
          </div>
          {step === fields.length && <button type="button" className={styles.clearButton} disabled={busy} onClick={() => void clearAnswers()}><Trash2 size={14} /> Delete my saved answers and hide summary</button>}
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
  const myValues = answers ? toSummary(answers, ['connection','decisions','motivation','communication','learning','zodiac']) : {};
  const rows = Object.entries(profile.selfDiscoverySummary).filter(([key]) => key in myValues);
  return (
    <section className={styles.comparison} aria-labelledby="discovery-compare-title">
      <p className={styles.eyebrow}>OPTIONAL · SHARED INTERESTS</p>
      <h2 id="discovery-compare-title">Compare your self-discovery</h2>
      <p>Only this member's deliberately shared summary is used here. A match means you selected the same answer to this prompt—not that you are the same person.</p>
      {loading ? <p className={styles.helper}>Checking your saved answers…</p> : error ? <p className={styles.error} role="alert">{error}</p> : !answers ? <p className={styles.helper}>Save your own answers in your profile's Self-discovery Centre to compare.</p> : rows.length === 0 ? <p className={styles.helper}>There are no matching questions to compare yet. Answer a question they chose to share.</p> : (
        <div className={styles.comparisonRows}>{rows.map(([key, theirValue]) => {
          const same = myValues[key] === theirValue;
          return <div key={key} className={styles.comparisonRow}><span>{({connection:'How I recharge',decisions:'Decision style',motivation:'Motivation',communication:'Communication preference',learning:'Learning preference',zodiac:'Zodiac sign'} as Record<string,string>)[key] ?? key}</span><strong>{same ? 'You answered the same' : 'You answered differently'}</strong><small>You: {myValues[key]} · {profile.displayName}: {theirValue}</small></div>;
        })}</div>
      )}
    </section>
  );
}
