'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { MessageSquareText, Send, ShieldCheck } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { getSupabaseBrowserClient } from '@/services/supabase';
import styles from './FeedbackHub.module.css';

type FeedbackCategory = 'idea' | 'bug' | 'confusing' | 'accessibility' | 'other';
type FeedbackRow = {
  id: string;
  submitter_id: string;
  category: FeedbackCategory;
  title: string;
  details: string;
  page_url: string | null;
  status: 'new' | 'in_review' | 'resolved' | 'closed';
  created_at: string;
};

const staffRoles = ['admin', 'developer', 'owner'];

export function FeedbackHub() {
  const { currentUser, isGuest } = useAppContext();
  const userId = currentUser && !isGuest ? currentUser.user.id : '';
  const role = currentUser?.profile.role ?? 'user';
  const isStaff = staffRoles.includes(role);
  const [category, setCategory] = useState<FeedbackCategory>('idea');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
    if (!userId || !isStaff) return;
    setIsLoading(true);
    try {
      const { data, error: loadError } = await getSupabaseBrowserClient()
        .from('platform_feedback')
        .select('id,submitter_id,category,title,details,page_url,status,created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (loadError) throw loadError;
      setItems((data ?? []) as FeedbackRow[]);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The feedback inbox could not be loaded. The feedback migration may need to be applied.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, isStaff]);

  useEffect(() => { void loadInbox(); }, [loadInbox]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userId) {
      setError('Sign in to submit feedback.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const pageUrl = typeof window === 'undefined' ? null : window.location.href;
      const { error: submitError } = await getSupabaseBrowserClient().from('platform_feedback').insert({
        submitter_id: userId,
        category,
        title: title.trim(),
        details: details.trim(),
        page_url: pageUrl,
      });
      if (submitError) throw submitError;
      setTitle('');
      setDetails('');
      setNotice('Feedback submitted. Thank you — it is now available to the Sanctuary team.');
      await loadInbox();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Feedback could not be submitted. If this is a new environment, the platform feedback migration may not be applied yet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span className={styles.icon}><MessageSquareText size={22} aria-hidden="true" /></span>
        <div><p className={styles.eyebrow}>HELP SHAPE THE SANCTUARY</p><h1>Feedback</h1><p>Report a bug, suggest an improvement, or tell us where the experience feels confusing.</p></div>
      </header>

      {!userId ? <p className={styles.notice}>Sign in to send feedback and track it securely.</p> : (
        <form className={styles.form} onSubmit={(event) => void submit(event)}>
          <label>Feedback type
            <select value={category} onChange={(event) => setCategory(event.currentTarget.value as FeedbackCategory)}>
              <option value="idea">Idea or improvement</option><option value="bug">Bug report</option><option value="confusing">Confusing experience</option><option value="accessibility">Accessibility issue</option><option value="other">Other</option>
            </select>
          </label>
          <label>Short title
            <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} minLength={3} maxLength={120} required placeholder="What should we look at?" />
          </label>
          <label>Details
            <textarea value={details} onChange={(event) => setDetails(event.currentTarget.value)} minLength={10} maxLength={4000} rows={5} required placeholder="What happened, what did you expect, and how can we reproduce it?" />
          </label>
          <p className={styles.privacy}><ShieldCheck size={15} aria-hidden="true" /> Feedback is visible to you and the admin, developer, and owner team. Avoid including passwords or sensitive personal information.</p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {notice && <p className={styles.success} role="status">{notice}</p>}
          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send feedback'} <Send size={16} aria-hidden="true" /></button>
        </form>
      )}

      {isStaff && (
        <section className={styles.inbox} aria-labelledby="feedback-inbox-title">
          <div className={styles.inboxHeader}><div><p className={styles.eyebrow}>STAFF ONLY</p><h2 id="feedback-inbox-title">Feedback inbox</h2><p>Newest reports first · up to 100 recent items</p></div><button type="button" onClick={() => void loadInbox()} disabled={isLoading}>{isLoading ? 'Refreshing…' : 'Refresh inbox'}</button></div>
          {isLoading && items.length === 0 ? <p className={styles.notice}>Loading feedback…</p> : items.length === 0 ? <p className={styles.notice}>No feedback submissions yet.</p> : (
            <div className={styles.feedbackList}>{items.map((item) => (
              <article className={styles.feedbackItem} key={item.id}>
                <div className={styles.itemMeta}><span>{item.category}</span><span>{item.status.replace('_', ' ')}</span><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></div>
                <h3>{item.title}</h3><p>{item.details}</p>
                <small>Member ID: {item.submitter_id}</small>
                {item.page_url && <a href={item.page_url} target="_blank" rel="noreferrer">Open reported page</a>}
              </article>
            ))}</div>
          )}
        </section>
      )}
    </main>
  );
}
