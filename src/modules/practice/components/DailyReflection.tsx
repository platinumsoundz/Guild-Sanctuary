'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Heart, LockKeyhole, RotateCcw, Save } from 'lucide-react';
import styles from './DailyReflection.module.css';

type Mood = 'low' | 'heavy' | 'steady' | 'good' | 'bright';
interface ReflectionEntry { date: string; mood: Mood; intention: string; reflection: string; updatedAt: string; }
interface DailyReflectionProps { userId: string; isGuest: boolean; }
const MOODS: { value: Mood; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'A difficult day' },
  { value: 'heavy', label: 'Heavy', description: 'A lot on my mind' },
  { value: 'steady', label: 'Steady', description: 'Taking things as they come' },
  { value: 'good', label: 'Good', description: 'Some things feel positive' },
  { value: 'bright', label: 'Bright', description: 'Feeling hopeful or energised' },
];
function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function storageKey(userId: string): string { return `sanctuary-daily-reflection:v1:${encodeURIComponent(userId)}`; }
function readEntries(key: string): ReflectionEntry[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ReflectionEntry =>
      Boolean(item) && typeof item === 'object' && typeof item.date === 'string'
      && MOODS.some((mood) => mood.value === item.mood)
      && typeof item.intention === 'string' && typeof item.reflection === 'string'
      && typeof item.updatedAt === 'string',
    ).slice(0, 90);
  } catch { return []; }
}
export function DailyReflection({ userId, isGuest }: DailyReflectionProps) {
  const today = localDateKey();
  const key = useMemo(() => storageKey(userId), [userId]);
  const [entries, setEntries] = useState<ReflectionEntry[]>([]);
  const [mood, setMood] = useState<Mood | ''>('');
  const [intention, setIntention] = useState('');
  const [reflection, setReflection] = useState('');
  const [status, setStatus] = useState('');
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  useEffect(() => {
    const loaded = readEntries(key);
    setEntries(loaded);
    const existing = loaded.find((entry) => entry.date === today);
    setMood(existing?.mood ?? '');
    setIntention(existing?.intention ?? '');
    setReflection(existing?.reflection ?? '');
    setStatus('');
    setLoadedKey(key);
  }, [key, today]);
  const savedToday = entries.some((entry) => entry.date === today);
  const recentEntries = entries
    .filter((entry) => entry.date <= today)
    .slice(0, 7);
  const moodCounts = MOODS.map((option) => ({
    ...option,
    count: recentEntries.filter((entry) => entry.mood === option.value).length,
  })).filter((option) => option.count > 0);
  const mostFrequentMood = [...moodCounts].sort((a, b) => b.count - a.count)[0];
  const reflectionDays = recentEntries.length;
  const saveReflection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isGuest) { setStatus('Sign in to keep a reflection on this device.'); return; }
    if (!mood) { setStatus('Choose the mood that feels closest to today.'); return; }
    const nextEntry: ReflectionEntry = {
      date: today, mood, intention: intention.trim().slice(0, 180),
      reflection: reflection.trim().slice(0, 1200), updatedAt: new Date().toISOString(),
    };
    const nextEntries = [nextEntry, ...entries.filter((entry) => entry.date !== today)]
      .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90);
    try {
      window.localStorage.setItem(key, JSON.stringify(nextEntries));
      setEntries(nextEntries);
      setStatus('Your reflection is saved in this browser.');
    } catch { setStatus('This browser could not save the reflection. Check its storage settings and try again.'); }
  };
  const clearHistory = () => {
    if (!window.confirm('Delete all Sanctuary reflections saved in this browser for this account? This cannot be undone.')) return;
    try {
      window.localStorage.removeItem(key);
      setEntries([]); setMood(''); setIntention(''); setReflection('');
      setStatus('Your locally saved reflections have been deleted.');
    } catch { setStatus('The browser could not delete the saved reflections.'); }
  };
  if (isGuest) return (
    <section className={styles.card} aria-labelledby="reflection-title">
      <div className={styles.heading}>
        <span className={styles.icon} aria-hidden="true"><Heart size={19} /></span>
        <div><p className={styles.eyebrow}>A MOMENT FOR YOURSELF</p><h2 id="reflection-title">Daily reflection</h2></div>
      </div>
      <p className={styles.description}>A gentle check-in for your mood, intention and thoughts. Guest browsing stays read-only.</p>
      <p className={styles.notice}>Sign in to write and save a reflection on this device.</p>
    </section>
  );
  return (
    <section className={styles.card} aria-labelledby="reflection-title">
      <div className={styles.heading}>
        <span className={styles.icon} aria-hidden="true"><Heart size={19} /></span>
        <div>
          <p className={styles.eyebrow}>A MOMENT FOR YOURSELF</p><h2 id="reflection-title">Daily reflection</h2>
          <p className={styles.description}>No streaks, scores or pressure. Just a little space to notice how you are.</p>
        </div>
      </div>
      {loadedKey !== key ? <p className={styles.notice} role="status">Opening your reflection on this device…</p> : (
        <form className={styles.form} onSubmit={saveReflection}>
          <fieldset className={styles.moodFieldset}>
            <legend>How are you feeling today?</legend>
            <div className={styles.moodOptions}>
              {MOODS.map((option) => (
                <label className={`${styles.moodOption} ${mood === option.value ? styles.moodSelected : ''}`} key={option.value}>
                  <input type="radio" name="reflection-mood" value={option.value} checked={mood === option.value} onChange={() => setMood(option.value)} />
                  <span className={styles.moodLabel}>{option.label}</span><span className={styles.moodDescription}>{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className={styles.field}>
            <span>One thing I want to give attention to</span>
            <input type="text" value={intention} maxLength={180} onChange={(event) => setIntention(event.target.value)} placeholder="For example, rest, patience, or reconnecting" />
            <span className={styles.counter}>{intention.length}/180</span>
          </label>
          <label className={styles.field}>
            <span>What would I like to acknowledge today?</span>
            <textarea value={reflection} maxLength={1200} rows={4} onChange={(event) => setReflection(event.target.value)} placeholder="A thought, a small win, something difficult, or anything you want to notice…" />
            <span className={styles.counter}>{reflection.length}/1200</span>
          </label>
          <div className={styles.actions}>
            <button className={styles.saveButton} type="submit"><Save size={16} aria-hidden="true" />{savedToday ? 'Update today’s reflection' : 'Save reflection'}</button>
            {entries.length > 0 && <button className={styles.clearButton} type="button" onClick={clearHistory}><RotateCcw size={15} aria-hidden="true" />Clear history</button>}
          </div>
          <p className={styles.privacy}><LockKeyhole size={14} aria-hidden="true" /> Saved only in this browser on this device. It is not synced to your account or sent to Sanctuary servers. Anyone with access to this browser profile may be able to read it, so avoid entering details you would not want them to see.</p>
          {status && <p className={styles.status} role="status" aria-live="polite">{status}</p>}
          <p className={styles.disclaimer}>This is a personal reflection tool, not medical advice, diagnosis or treatment.</p>
        </form>
      )}
      {loadedKey === key && recentEntries.length > 0 && (
        <section className={styles.insights} aria-labelledby="reflection-insights-title">
          <div className={styles.insightsHeading}>
            <div>
              <p className={styles.eyebrow}>A GENTLE LOOK BACK</p>
              <h3 id="reflection-insights-title">Your recent check-ins</h3>
            </div>
            <span className={styles.insightsCount}>{reflectionDays} {reflectionDays === 1 ? 'day' : 'days'} noted</span>
          </div>
          <p className={styles.insightsDescription}>
            {reflectionDays === 1
              ? 'You have made space for one check-in. There is no target to reach—come back whenever it feels useful.'
              : `You have made space for ${reflectionDays} check-ins in your latest entries. This is a snapshot, not a score or a measure of progress.`}
          </p>
          <div className={styles.moodSummary} aria-label="Mood selections in your latest check-ins">
            {moodCounts.map((item) => (
              <div className={styles.moodSummaryItem} key={item.value}>
                <div className={styles.moodSummaryLabel}>
                  <span>{item.label}</span><span>{item.count} {item.count === 1 ? 'check-in' : 'check-ins'}</span>
                </div>
                <div className={styles.moodTrack} aria-hidden="true">
                  <span className={styles.moodBar} style={{ width: `${(item.count / reflectionDays) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          {mostFrequentMood && (
            <p className={styles.reflectionPrompt}>
              <strong>A prompt to consider:</strong> {mostFrequentMood.value === 'low' || mostFrequentMood.value === 'heavy'
                ? 'What kind of support or small kindness might make today feel a little more manageable?'
                : mostFrequentMood.value === 'steady'
                  ? 'What has helped you feel grounded lately, and how could you make room for a little more of it?'
                  : mostFrequentMood.value === 'good'
                    ? 'What is one thing you would like to remember about what has been going well?'
                    : 'What has been giving you energy or hope, and is there a gentle way to nurture it?'}
            </p>
          )}
          <p className={styles.insightsPrivacy}>Calculated from reflections stored in this browser only. These patterns do not diagnose or explain your mental health.</p>
        </section>
      )}
      {loadedKey === key && entries.some((entry) => entry.date !== today) && (
        <details className={styles.history}>
          <summary>Previous reflections ({entries.filter((entry) => entry.date !== today).length})</summary>
          <ol className={styles.historyList}>
            {entries.filter((entry) => entry.date !== today).slice(0, 7).map((entry) => (
              <li className={styles.historyEntry} key={entry.date}>
                <div className={styles.historyMeta}>
                  <time dateTime={entry.date}>{new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</time>
                  <span>{MOODS.find((option) => option.value === entry.mood)?.label ?? 'Reflection'}</span>
                </div>
                {entry.intention && <p className={styles.historyIntention}>Intention: {entry.intention}</p>}
                {entry.reflection && <p className={styles.historyText}>{entry.reflection}</p>}
              </li>
            ))}
          </ol>
          {entries.filter((entry) => entry.date !== today).length > 7 && (
            <p className={styles.historyNote}>Showing the latest 7 previous entries. The rest remain stored locally until cleared or aged out of the 90-entry limit.</p>
          )}
        </details>
      )}
    </section>
  );
}
