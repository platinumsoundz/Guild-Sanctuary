'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Heart, LockKeyhole, RotateCcw, Save } from 'lucide-react';
import { isSupabaseAuthConfigured } from '@/modules/auth';
import { getSupabaseBrowserClient } from '@/services/supabase';
import styles from './DailyReflection.module.css';

type Mood = 'low' | 'heavy' | 'steady' | 'good' | 'bright';
interface ReflectionEntry { id: string; date: string; mood: Mood; intention: string; reflection: string; updatedAt: string; }
interface DailyReflectionProps { userId: string; isGuest: boolean; }
interface LegacyReflectionEntry { date: string; mood: Mood; intention: string; reflection: string; updatedAt: string; }
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
function fromRow(row: { id: string; reflection_date: string; mood: string | null; intention: string; content: string; updated_at: string }): ReflectionEntry | null {
  if (!MOODS.some((option) => option.value === row.mood)) return null;
  return { id: row.id, date: row.reflection_date, mood: row.mood as Mood, intention: row.intention ?? '', reflection: row.content ?? '', updatedAt: row.updated_at };
}
async function verifyReflectionOwner(expectedUserId: string) {
  const { data, error } = await getSupabaseBrowserClient().auth.getUser();
  if (error || !data.user) throw new Error('Sign in again to access your reflection diary.');
  if (data.user.id !== expectedUserId) throw new Error('Your active account changed. Sign out and sign in again before accessing this diary.');
  return data.user.id;
}

export function DailyReflection({ userId, isGuest }: DailyReflectionProps) {
  const today = localDateKey();
  const key = useMemo(() => userId, [userId]);
  const [entries, setEntries] = useState<ReflectionEntry[]>([]);
  const [mood, setMood] = useState<Mood | ''>('');
  const [intention, setIntention] = useState('');
  const [reflection, setReflection] = useState('');
  const [status, setStatus] = useState('');
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const databaseReady = !isGuest && isSupabaseAuthConfigured();
  const sessionReady = loadedKey === key && !loadError;

  useEffect(() => {
    let cancelled = false;
    setLoadedKey(null);
    setEntries([]);
    setMood('');
    setIntention('');
    setReflection('');
    setStatus('');
    setLoadError(false);
    if (!databaseReady) {
      setLoadedKey(key);
      if (!isGuest) setStatus('Database saving is unavailable until account-backed Supabase authentication is configured.');
      return () => { cancelled = true; };
    }
    const load = async () => {
      try {
        const ownerId = await verifyReflectionOwner(userId);
        const client = getSupabaseBrowserClient();
        const { data, error } = await client.from('daily_reflections')
          .select('id, reflection_date, mood, intention, content, updated_at')
          .eq('user_id', ownerId)
          .order('reflection_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(90);
        if (error) throw error;
        if (cancelled) return;
        const loaded = (data ?? []).map((row) => fromRow(row)).filter((row): row is ReflectionEntry => row !== null);
        setEntries(loaded);
        const existing = loaded.find((entry) => entry.date === today);
        setMood(existing?.mood ?? '');
        setIntention(existing?.intention ?? '');
        setReflection(existing?.reflection ?? '');
        setLoadedKey(key);
      } catch {
        if (cancelled) return;
        setLoadError(true);
        setStatus('Your diary could not be loaded from your account. Check your connection and try again.');
        setLoadedKey(key);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [databaseReady, key, userId, today, isGuest, retryCount]);

  const savedToday = entries.some((entry) => entry.date === today);
  const saveReflection = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isGuest) { setStatus('Sign in to keep a reflection in your account.'); return; }
    if (!sessionReady) { setStatus('Your private diary is not ready to edit. Reload it before saving.'); return; }
    if (!databaseReady) { setStatus('Database saving is unavailable until account-backed Supabase authentication is configured.'); return; }
    if (!mood) { setStatus('Choose the mood that feels closest to today.'); return; }
    if (!intention.trim() && !reflection.trim()) { setStatus('Add an intention or a few words to your reflection before saving.'); return; }
    setBusy(true);
    setStatus('');
    try {
      const ownerId = await verifyReflectionOwner(userId);
      const client = getSupabaseBrowserClient();
      const { data, error } = await client.from('daily_reflections').upsert({
        user_id: ownerId,
        reflection_date: today,
        title: intention.trim().slice(0, 160),
        intention: intention.trim().slice(0, 180),
        content: reflection.trim().slice(0, 1200),
        mood,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,reflection_date' }).select('id, reflection_date, mood, intention, content, updated_at').single();
      if (error) throw error;
      const saved = fromRow(data);
      if (!saved) throw new Error('The saved reflection did not contain a supported mood.');
      setEntries((current) => [saved, ...current.filter((entry) => entry.date !== today)].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90));
      setStatus('Your reflection is saved to your Sanctuary account and will be available when you sign in on another device.');
    } catch {
      setStatus('Your reflection could not be saved to the database. Nothing has been saved locally; please try again.');
    } finally {
      setBusy(false);
    }
  };
  const clearHistory = async () => {
    if (!databaseReady || busy || !sessionReady) return;
    if (!window.confirm('Delete all Sanctuary reflections saved to your account? This cannot be undone.')) return;
    setBusy(true);
    try {
      const ownerId = await verifyReflectionOwner(userId);
      const client = getSupabaseBrowserClient();
      const { error } = await client.from('daily_reflections').delete().eq('user_id', ownerId);
      if (error) throw error;
      setEntries([]); setMood(''); setIntention(''); setReflection('');
      setStatus('Your saved diary entries have been deleted from your account.');
    } catch {
      setStatus('The diary history could not be deleted. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const importBrowserReflections = async () => {
    if (!databaseReady || busy || !sessionReady) return;
    let localEntries: LegacyReflectionEntry[];
    try {
      const raw = window.localStorage.getItem(`sanctuary-daily-reflection:v1:${encodeURIComponent(userId)}`);
      if (!raw) { setStatus('No browser-saved reflections were found for this account.'); return; }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Saved reflection data is not a list.');
      localEntries = parsed.filter((item): item is LegacyReflectionEntry =>
        Boolean(item) && typeof item === 'object'
        && typeof item.date === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(item.date)
        && MOODS.some((option) => option.value === item.mood)
        && typeof item.intention === 'string' && typeof item.reflection === 'string'
        && typeof item.updatedAt === 'string',
      ).slice(0, 90);
    } catch {
      setStatus('Browser-saved reflections could not be read. Nothing was uploaded or changed.');
      return;
    }
    const existingDates = new Set(entries.map((entry) => entry.date));
    const importable = localEntries.filter((entry) => !existingDates.has(entry.date));
    if (importable.length === 0) {
      setStatus(localEntries.length ? 'Your account already has entries for all readable browser-saved dates. Existing account entries were left unchanged.' : 'No readable browser-saved reflections were found.');
      return;
    }
    const confirmed = window.confirm(
      `Import ${importable.length} browser-saved reflection(s) into your Sanctuary account? This uploads private mood and reflection text to the account database. Existing account entries are kept, and the browser copies will not be deleted.`,
    );
    if (!confirmed) return;
    setBusy(true);
    try {
      const ownerId = await verifyReflectionOwner(userId);
      const rows = importable.map((entry) => ({
        user_id: ownerId,
        reflection_date: entry.date,
        title: entry.intention.trim().slice(0, 160),
        intention: entry.intention.trim().slice(0, 180),
        content: entry.reflection.trim().slice(0, 1200),
        mood: entry.mood,
        updated_at: entry.updatedAt,
      }));
      const { error } = await getSupabaseBrowserClient().from('daily_reflections')
        .upsert(rows, { onConflict: 'user_id,reflection_date', ignoreDuplicates: true });
      if (error) throw error;
      setStatus(`Import request completed for ${importable.length} reflection(s). Browser copies remain in place. Refreshing your account diary…`);
      setRetryCount((count) => count + 1);
    } catch {
      setStatus('Browser reflections could not be imported. Your browser copies have not been changed.');
    } finally {
      setBusy(false);
    }
  };
  if (isGuest) return (
    <section className={styles.card} aria-labelledby="reflection-title">
      <div className={styles.heading}>
        <span className={styles.icon} aria-hidden="true"><Heart size={19} /></span>
        <div><p className={styles.eyebrow}>A MOMENT FOR YOURSELF</p><h2 id="reflection-title">Daily reflection</h2></div>
      </div>
      <p className={styles.description}>A gentle check-in for your mood, intention and thoughts. Guest browsing stays read-only.</p>
      <p className={styles.notice}>Sign in to save private diary entries to your account.</p>
    </section>
  );
  return (
    <section className={styles.card} aria-labelledby="reflection-title">
      <div className={styles.heading}>
        <span className={styles.icon} aria-hidden="true"><Heart size={19} /></span>
        <div className={styles.headingCopy}>
          <p className={styles.eyebrow}>A MOMENT FOR YOURSELF</p><h2 id="reflection-title">Daily reflection</h2>
          <p className={styles.description}>No streaks or pressure. Just a little space to notice how you are.</p>
        </div>
      </div>
      {!sessionReady ? (loadedKey !== key ? <p className={styles.notice} role="status">Loading your private diary from your account…</p> : <div className={styles.notice} role="status"><p>{status || 'Your private diary could not be loaded. Your existing entries have not been changed.'}</p><button className={styles.clearButton} type="button" onClick={() => { setLoadedKey(null); setLoadError(false); setStatus(''); setRetryCount((count) => count + 1); }}>Retry loading diary</button></div>) : (
        <form className={styles.form} onSubmit={saveReflection}>
          <fieldset className={styles.moodFieldset}>
            <legend>How are you feeling today?</legend>
            <div className={styles.moodOptions}>
              {MOODS.map((option) => (
                <label className={`${styles.moodOption} ${mood === option.value ? styles.moodSelected : ''}`} data-mood={option.value} title={option.description} key={option.value}>
                  <input type="radio" name="reflection-mood" value={option.value} checked={mood === option.value} onChange={() => setMood(option.value)} />
                  <span className={styles.moodLabel}>{option.label}</span><span className={styles.moodDescription}>{option.description}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className={styles.field}>
            <span>One thing I want to give attention to</span>
            <input type="text" value={intention} maxLength={180} onChange={(event) => setIntention(event.target.value)} placeholder="Rest, patience, reconnecting…" />
            <span className={styles.counter}>{intention.length}/180</span>
          </label>
          <label className={styles.field}>
            <span>What would I like to acknowledge today?</span>
            <textarea value={reflection} maxLength={1200} rows={3} onChange={(event) => setReflection(event.target.value)} placeholder="A thought, a small win, something difficult, or anything you want to notice…" />
            <span className={styles.counter}>{reflection.length}/1200</span>
          </label>
          <div className={styles.actions}>
            <button className={styles.saveButton} type="submit" disabled={busy || !databaseReady || !sessionReady}><Save size={16} aria-hidden="true" />{busy ? 'Saving…' : savedToday ? 'Update reflection' : 'Save reflection'}</button>
            {entries.length > 0 && <button className={styles.clearButton} type="button" onClick={clearHistory} disabled={busy}><RotateCcw size={15} aria-hidden="true" />Clear history</button>}
            <button className={styles.clearButton} type="button" onClick={importBrowserReflections} disabled={busy || !databaseReady || !sessionReady}>Import browser-saved reflections</button>
          </div>
          <p className={styles.privacy}><LockKeyhole size={14} aria-hidden="true" /> Private to your account; saved in the database, not browser storage or the public feed.</p>
          {status && <p className={styles.status} role="status" aria-live="polite">{status}</p>}
          <p className={styles.disclaimer}>A personal reflection tool, not medical advice, diagnosis or treatment.</p>
        </form>
      )}
      {sessionReady && entries.some((entry) => entry.date !== today) && (
        <details className={styles.history}>
          <summary>Previous reflections ({entries.filter((entry) => entry.date !== today).length})</summary>
          <ol className={styles.historyList}>
            {entries.filter((entry) => entry.date !== today).map((entry) => (
              <li className={styles.historyEntry} key={entry.id}>
                <div className={styles.historyMeta}>
                  <time dateTime={entry.date}>{new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</time>
                  <span data-mood={entry.mood}>{MOODS.find((option) => option.value === entry.mood)?.label ?? 'Reflection'}</span>
                </div>
                {entry.intention && <p className={styles.historyIntention}>Intention: {entry.intention}</p>}
                {entry.reflection && <p className={styles.historyText}>{entry.reflection}</p>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
