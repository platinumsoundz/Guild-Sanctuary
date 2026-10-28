'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Heart, LockKeyhole, RotateCcw, Save } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { isSupabaseCommunityStorageConfigured } from '@/services/supabase/communityMedia';
import styles from './DailyReflection.module.css';

type Mood = 'low' | 'heavy' | 'steady' | 'good' | 'bright';
interface ReflectionEntry { date: string; mood: Mood; intention: string; reflection: string; updatedAt: string; }
interface DailyReflectionProps { userId: string; isGuest: boolean; }
type DailyReflectionRow = { reflection_date: string; mood: string | null; intention: string; content: string; updated_at: string };
function mapDatabaseEntries(rows: DailyReflectionRow[]): ReflectionEntry[] {
  return rows.filter((row): row is DailyReflectionRow & { mood: Mood } =>
    typeof row.reflection_date === 'string' && MOODS.some((option) => option.value === row.mood) &&
    typeof row.intention === 'string' && typeof row.content === 'string' && typeof row.updated_at === 'string',
  ).map((row) => ({ date: row.reflection_date, mood: row.mood, intention: row.intention, reflection: row.content, updatedAt: row.updated_at }))
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90);
}
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
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Stored reflection history is not a list.');
    return parsed.filter((item): item is ReflectionEntry =>
      Boolean(item) && typeof item === 'object' && typeof item.date === 'string'
      && MOODS.some((mood) => mood.value === item.mood)
      && typeof item.intention === 'string' && typeof item.reflection === 'string'
      && typeof item.updatedAt === 'string',
  ).slice(0, 90);
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
  const [readableKey, setReadableKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const sessionReady = loadedKey === key && readableKey === key;
  useEffect(() => {
    let cancelled = false;
    setLoadedKey(null);
    setReadableKey(null);
    setEntries([]);
    setMood('');
    setIntention('');
    setReflection('');
    setStatus('');

    const loadReflections = async () => {
      try {
        if (isGuest) {
          if (!cancelled) { setReadableKey(key); setLoadedKey(key); }
          return;
        }
        if (!isSupabaseCommunityStorageConfigured()) {
          throw new Error('Database storage is not configured. Your reflections are locked rather than silently saved only in this browser.');
        }
        const client = getSupabaseBrowserClient();
        const { data: authData, error: authError } = await client.auth.getUser();
        if (authError) throw new Error(`Your sign-in could not be verified: ${authError.message}`);
        if (!authData.user || authData.user.id !== userId) {
          throw new Error('Sign in with the same Sanctuary account to load your private reflections.');
        }

        const { data: savedRows, error: loadError } = await client.from('daily_reflections')
          .select('reflection_date,mood,intention,content,updated_at')
          .eq('user_id', userId)
          .order('reflection_date', { ascending: false })
          .limit(90);
        if (loadError) throw new Error(`Your reflections could not be loaded from the database: ${loadError.message}`);

        let loaded = mapDatabaseEntries((savedRows ?? []) as DailyReflectionRow[]);
        let legacyEntries: ReflectionEntry[] = [];
        let legacyReadable = true;
        try {
          legacyEntries = readEntries(key);
        } catch {
          legacyReadable = false;
        }
        if (legacyEntries.length > 0) {
          const savedDates = new Set(loaded.map((entry) => entry.date));
          const missingEntries = legacyEntries.filter((entry) => !savedDates.has(entry.date));
          if (missingEntries.length > 0) {
            const rows = missingEntries.map((entry) => ({
              user_id: userId,
              reflection_date: entry.date,
              title: '',
              intention: entry.intention.slice(0, 180),
              content: entry.reflection.slice(0, 1200),
              mood: entry.mood,
              prompts: [],
              tags: [],
            }));
            const { error: migrateError } = await client.from('daily_reflections')
              .upsert(rows, { onConflict: 'user_id,reflection_date' });
            if (migrateError) throw new Error(`Your existing reflections could not be transferred to the database: ${migrateError.message}`);
            loaded = [...loaded, ...missingEntries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90);
            try {
              window.localStorage.removeItem(key);
              setStatus('Your existing reflections have been transferred to your account database.');
            } catch {
              setStatus('Your existing reflections have been transferred to your account database, but the old browser copy could not be removed.');
            }
          } else if (loaded.length > 0) {
            // Database rows take precedence for dates already present; the full legacy date set is now covered.
            try { window.localStorage.removeItem(key); } catch {
              setStatus('Your account database is ready, but the old browser copy could not be removed.');
            }
          }
        }
        if (!legacyReadable && loaded.length === 0) {
          setStatus('Your account database is ready, but the previous browser reflection copy could not be read. It has not been changed.');
        }
        if (cancelled) return;
        setEntries(loaded);
        const existing = loaded.find((entry) => entry.date === today);
        setMood(existing?.mood ?? '');
        setIntention(existing?.intention ?? '');
        setReflection(existing?.reflection ?? '');
        setReadableKey(key);
      } catch (loadError) {
        if (cancelled) return;
        setEntries([]);
        setStatus(loadError instanceof Error ? loadError.message : 'The reflections database could not be reached.');
      } finally {
        if (!cancelled) setLoadedKey(key);
      }
    };
    void loadReflections();
    return () => { cancelled = true; };
  }, [isGuest, key, today, userId]);
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
  const saveReflection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sessionReady) { setStatus('Your saved reflections are not ready to edit. Reload this section before trying again.'); return; }
    if (isGuest) { setStatus('Sign in to save a reflection to your account.'); return; }
    if (!mood) { setStatus('Choose the mood that feels closest to today.'); return; }
    setSaving(true);
    setStatus('Saving your reflection to your account…');
    try {
      const client = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user || authData.user.id !== userId) {
        throw new Error('Your active account changed. Sign in again before saving reflections.');
      }
      const payload = {
        user_id: userId,
        reflection_date: today,
        title: '',
        intention: intention.trim().slice(0, 180),
        content: reflection.trim().slice(0, 1200),
        mood,
        prompts: [],
        tags: [],
      };
      const { data: saved, error } = await client.from('daily_reflections')
        .upsert(payload, { onConflict: 'user_id,reflection_date' })
        .select('updated_at')
        .single();
      if (error) throw new Error(error.message);
      const nextEntry: ReflectionEntry = {
        date: today, mood, intention: payload.intention,
        reflection: payload.content, updatedAt: saved.updated_at,
      };
      const nextEntries = [nextEntry, ...entries.filter((entry) => entry.date !== today)]
        .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90);
      setEntries(nextEntries);
      setStatus('Your reflection is saved to your Sanctuary account.');
    } catch (saveError) {
      setStatus(saveError instanceof Error ? `Your reflection was not saved: ${saveError.message}` : 'Your reflection was not saved. Try again.');
    } finally {
      setSaving(false);
    }
  };
  const clearHistory = async () => {
    if (!sessionReady) { setStatus('Your saved reflections are not ready to clear. Reload this section before trying again.'); return; }
    if (!window.confirm('Delete all Sanctuary reflections saved to your account? This cannot be undone.')) return;
    setSaving(true);
    try {
      const client = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user || authData.user.id !== userId) {
        throw new Error('Your active account changed. Sign in again before clearing reflections.');
      }
      const { error } = await client.from('daily_reflections').delete().eq('user_id', userId);
      if (error) throw new Error(error.message);
      try { window.localStorage.removeItem(key); } catch { /* Database deletion is authoritative. */ }
      setEntries([]); setMood(''); setIntention(''); setReflection('');
      setStatus('Your account reflection history has been deleted.');
    } catch (clearError) {
      setStatus(clearError instanceof Error ? `Reflection history was not deleted: ${clearError.message}` : 'Reflection history could not be deleted.');
    } finally {
      setSaving(false);
    }
  };
  if (isGuest) return (
    <section className={styles.card} aria-labelledby="reflection-title">
      <div className={styles.heading}>
        <span className={styles.icon} aria-hidden="true"><Heart size={19} /></span>
        <div><p className={styles.eyebrow}>A MOMENT FOR YOURSELF</p><h2 id="reflection-title">Daily reflection</h2></div>
      </div>
      <p className={styles.description}>A gentle check-in for your mood, intention and thoughts. Guest browsing stays read-only.</p>
      <p className={styles.notice}>Sign in to save a reflection to your Sanctuary account.</p>
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
      {loadedKey !== key ? <p className={styles.notice} role="status">Opening your reflection on this device…</p> : !sessionReady ? <p className={styles.notice} role="status">{status || 'Saved reflections are unavailable. Your existing data has not been changed.'}</p> : (
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
            <button className={styles.saveButton} type="submit" disabled={saving}><Save size={16} aria-hidden="true" />{saving ? 'Saving…' : savedToday ? 'Update today’s reflection' : 'Save reflection'}</button>
            {entries.length > 0 && <button className={styles.clearButton} type="button" onClick={() => void clearHistory()} disabled={saving}><RotateCcw size={15} aria-hidden="true" />Clear history</button>}
          </div>
          <p className={styles.privacy}><LockKeyhole size={14} aria-hidden="true" /> Saved to your Sanctuary account database and protected by row-level security. Your reflections follow your account across devices; avoid sharing your sign-in with anyone you do not trust.</p>
          {status && <p className={styles.status} role="status" aria-live="polite">{status}</p>}
          <p className={styles.disclaimer}>This is a personal reflection tool, not medical advice, diagnosis or treatment.</p>
        </form>
      )}
      {sessionReady && recentEntries.length > 0 && (
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
