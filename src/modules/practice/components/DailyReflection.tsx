'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Heart, LockKeyhole, RotateCcw, Save } from 'lucide-react';
import { deleteDailyReflections, fetchDailyReflections, saveDailyReflection, type ReflectionEntry, type ReflectionMood } from '../service';
import styles from './DailyReflection.module.css';

const MOODS: { value: ReflectionMood; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'A difficult day' },
  { value: 'heavy', label: 'Heavy', description: 'A lot on my mind' },
  { value: 'steady', label: 'Steady', description: 'Taking things as they come' },
  { value: 'good', label: 'Good', description: 'Some things feel positive' },
  { value: 'bright', label: 'Bright', description: 'Feeling hopeful or energised' },
];

function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface DailyReflectionProps { userId: string; isGuest: boolean; }

export function DailyReflection({ userId, isGuest }: DailyReflectionProps) {
  const today = localDateKey();
  const [entries, setEntries] = useState<ReflectionEntry[]>([]);
  const [mood, setMood] = useState<ReflectionMood | ''>('');
  const [intention, setIntention] = useState('');
  const [reflection, setReflection] = useState('');
  const [status, setStatus] = useState('');
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isGuest || !userId) {
      setEntries([]);
      setMood('');
      setIntention('');
      setReflection('');
      setLoadedUserId(userId);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setLoadedUserId(null);
    setEntries([]);
    setStatus('');
    fetchDailyReflections(userId).then((loaded) => {
      if (cancelled) return;
      setEntries(loaded);
      const existing = loaded.find((entry) => entry.date === today);
      setMood(existing?.mood ?? '');
      setIntention(existing?.intention ?? '');
      setReflection(existing?.reflection ?? '');
      setLoadedUserId(userId);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setStatus(error instanceof Error ? error.message : 'Your reflection diary could not be loaded. Please try again.');
      setLoadedUserId(userId);
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId, isGuest, today]);

  const savedToday = entries.some((entry) => entry.date === today);
  const previousEntries = entries.filter((entry) => entry.date !== today);

  const saveReflection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isGuest) { setStatus('Sign in to save your reflections to your account.'); return; }
    if (!mood) { setStatus('Choose the mood that feels closest to today.'); return; }
    if (!intention.trim() && !reflection.trim()) {
      setStatus('Add an intention or a few words before saving your reflection.');
      return;
    }
    setIsSaving(true);
    setStatus('');
    try {
      const saved = await saveDailyReflection(userId, {
        date: today, mood, intention: intention.trim(), reflection: reflection.trim(),
      });
      setEntries((current) => [saved, ...current.filter((entry) => entry.date !== today)]
        .sort((a, b) => b.date.localeCompare(a.date)));
      setStatus('Your reflection has been saved to your Sanctuary account.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Your reflection could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const clearHistory = async () => {
    if (!window.confirm('Permanently delete every daily reflection in your Sanctuary account? This cannot be undone.')) return;
    setIsDeleting(true);
    setStatus('');
    try {
      await deleteDailyReflections(userId);
      setEntries([]);
      setMood('');
      setIntention('');
      setReflection('');
      setStatus('Your reflection diary has been deleted from your account.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Your reflection history could not be deleted.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isGuest) return (
    <section className={styles.card} aria-labelledby="reflection-title">
      <div className={styles.heading}>
        <span className={styles.icon} aria-hidden="true"><Heart size={19} /></span>
        <div><p className={styles.eyebrow}>A MOMENT FOR YOURSELF</p><h2 id="reflection-title">Daily reflection</h2></div>
      </div>
      <p className={styles.description}>A gentle check-in for your mood, intention and thoughts. Your diary is account-backed, so sign in to save it and revisit it on another device.</p>
      <p className={styles.notice}>Guest browsing is read-only. Sign in to keep a private reflection diary.</p>
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
      {isLoading || loadedUserId !== userId ? <p className={styles.notice} role="status">Loading your private reflection diary…</p> : (
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
            <button className={styles.saveButton} type="submit" disabled={isSaving || isDeleting}>
              <Save size={16} aria-hidden="true" />{isSaving ? 'Saving…' : savedToday ? 'Update today’s reflection' : 'Save reflection'}
            </button>
            {entries.length > 0 && <button className={styles.clearButton} type="button" disabled={isSaving || isDeleting} onClick={clearHistory}>
              <RotateCcw size={15} aria-hidden="true" />{isDeleting ? 'Deleting…' : 'Delete diary'}
            </button>}
          </div>
          <p className={styles.privacy}><LockKeyhole size={14} aria-hidden="true" /> Saved to your Sanctuary account and restricted by database access policies to your account. Use a trusted device and sign out when sharing a device. Reflections are not shared to the public feed.</p>
          {status && <p className={styles.status} role="status" aria-live="polite">{status}</p>}
          <p className={styles.disclaimer}>This is a personal reflection tool, not medical advice, diagnosis or treatment.</p>
        </form>
      )}
      {!isLoading && loadedUserId === userId && previousEntries.length > 0 && (
        <details className={styles.history}>
          <summary>Diary history ({previousEntries.length} previous {previousEntries.length === 1 ? 'entry' : 'entries'})</summary>
          <ol className={styles.historyList}>
            {previousEntries.slice(0, 7).map((entry) => (
              <li className={styles.historyEntry} key={entry.id}>
                <div className={styles.historyMeta}>
                  <time dateTime={entry.date}>{new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</time>
                  <span>{MOODS.find((option) => option.value === entry.mood)?.label ?? 'Reflection'}</span>
                </div>
                {entry.intention && <p className={styles.historyIntention}>Intention: {entry.intention}</p>}
                {entry.reflection && <p className={styles.historyText}>{entry.reflection}</p>}
              </li>
            ))}
          </ol>
          {previousEntries.length > 7 && <p className={styles.historyNote}>Showing the latest 7 previous entries. All {previousEntries.length} previous entries remain saved to your account.</p>}
        </details>
      )}
    </section>
  );
}
