'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, MessageSquareText, Send, ShieldCheck } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/services/supabase';
import type { WorldType } from '@/types/database';
import styles from './FeedbackCenter.module.css';

type FeedbackKind = 'Idea or improvement' | 'Bug report' | 'Confusing experience' | 'Accessibility issue';
type FeedbackStatus = 'open' | 'in_review' | 'closed';
type FeedbackRow = {
  id: string;
  feedback_type: FeedbackKind;
  title: string;
  details: string;
  submitter_kind: 'guest' | 'member';
  status: FeedbackStatus;
  page_url: string | null;
  created_at: string;
};

const statusLabels: Record<FeedbackStatus, string> = {
  open: 'Open',
  in_review: 'In review',
  closed: 'Closed',
};

export function FeedbackInbox({ role, worldType = 'sanctuary' }: { role: string; worldType?: WorldType }) {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadFeedback = async () => {
    setLoading(true);
    setMessage('');
    try {
      let query = getSupabaseBrowserClient()
        .from('sanctuary_feedback')
        .select('id,feedback_type,title,details,submitter_kind,status,page_url,created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      query = worldType === 'guild'
        ? query.ilike('page_url', '%environment=guild%')
        : query.not('page_url', 'ilike', '%environment=guild%');
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      setItems((data ?? []) as FeedbackRow[]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Feedback could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!['developer', 'owner'].includes(role.toLowerCase())) {
      setLoading(false);
      setMessage('Feedback inbox access is restricted to Developers and the Owner.');
      return;
    }
    void loadFeedback();
  // loadFeedback intentionally runs on mount and after explicit refresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, worldType]);

  const updateStatus = async (id: string, status: FeedbackStatus) => {
    setMessage('');
    const { error } = await getSupabaseBrowserClient()
      .from('sanctuary_feedback')
      .update({ status })
      .eq('id', id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  };

  return (
    <section className={styles.inbox} aria-labelledby="feedback-inbox-title">
      <div className={styles.inboxHeader}>
        <div>
          <p className={styles.eyebrow}>DEVELOPER & OWNER TOOLS</p>
          <h2 id="feedback-inbox-title"><ShieldCheck size={20} aria-hidden="true" /> {worldType === 'guild' ? 'Guild feedback inbox' : 'Feedback inbox'}</h2>
          <p>Submissions from signed-in members and guests, newest first.</p>
        </div>
        <button type="button" onClick={() => void loadFeedback()} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
      </div>
      {message && <p className={styles.message} role="status">{message}</p>}
      {loading ? <p className={styles.empty}>Loading feedback…</p> : items.length === 0 ? (
        <p className={styles.empty}>No feedback submissions yet. New reports will appear here.</p>
      ) : (
        <div className={styles.feedbackList}>
          {items.map((item) => (
            <article className={styles.feedbackItem} key={item.id}>
              <div className={styles.itemTop}>
                <span className={styles.kind}>{item.feedback_type}</span>
                <span className={styles.submitter}>{item.submitter_kind === 'guest' ? 'Guest submission' : 'Member submission'}</span>
              </div>
              <h3>{item.title}</h3>
              <p className={styles.details}>{item.details}</p>
              <div className={styles.itemMeta}>
                <span>{new Date(item.created_at).toLocaleString()}</span>
                {item.page_url && <span className={styles.pageUrl}>{item.page_url}</span>}
              </div>
              <label className={styles.statusControl}>Status
                <select value={item.status} onChange={(event) => void updateStatus(item.id, event.target.value as FeedbackStatus)}>
                  {(['open', 'in_review', 'closed'] as FeedbackStatus[]).map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}
                </select>
              </label>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function FeedbackPage({ role, isGuest, worldType = 'sanctuary' }: { role: string; isGuest: boolean; worldType?: WorldType }) {
  const [feedbackType, setFeedbackType] = useState<FeedbackKind>('Idea or improvement');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setSubmitted(false);
    try {
      const client = getSupabaseBrowserClient();
      const { data: authData } = await client.auth.getUser();
      const userId = authData.user?.id ?? null;
      const { error } = await client.from('sanctuary_feedback').insert({
        feedback_type: feedbackType,
        title: title.trim(),
        details: details.trim(),
        submitted_by: userId,
        submitter_kind: userId ? 'member' : 'guest',
        page_url: typeof window !== 'undefined' ? `${window.location.pathname}?environment=${worldType}` : null,
      });
      if (error) throw new Error(error.message);
      setTitle('');
      setDetails('');
      setSubmitted(true);
      setMessage('Thank you — your feedback has been sent to the development team.');
    } catch (error) {
      setMessage(error instanceof Error
        ? `Your feedback could not be submitted: ${error.message}. Please try again later.`
        : 'Your feedback could not be submitted. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroIcon}><MessageSquareText size={24} aria-hidden="true" /></span>
        <p className={styles.eyebrow}>{worldType === 'guild' ? 'HELP SHAPE THE GUILD' : 'HELP SHAPE THE SANCTUARY'}</p>
        <h1>Feedback</h1>
        <p>Found a bug, have an idea, or something confusing? Tell us directly. Feedback is available to every account role and to guests.</p>
        <p className={styles.privacy}>Please avoid passwords or other sensitive personal information. Your report is visible to Developers and the Owner.</p>
      </header>
      <section className={styles.formPanel} aria-labelledby="feedback-form-title">
        <div className={styles.formHeading}>
          <h2 id="feedback-form-title">Send feedback</h2>
          <span>All fields required</span>
        </div>
        <form onSubmit={(event) => void submit(event)}>
          <label>What kind of feedback is this?
            <select value={feedbackType} onChange={(event) => setFeedbackType(event.target.value as FeedbackKind)}>
              <option>Idea or improvement</option>
              <option>Bug report</option>
              <option>Confusing experience</option>
              <option>Accessibility issue</option>
            </select>
          </label>
          <label>Short title
            <input value={title} onChange={(event) => setTitle(event.target.value)} minLength={3} maxLength={100} required placeholder="e.g. I couldn't find notifications" />
          </label>
          <label>Details
            <textarea value={details} onChange={(event) => setDetails(event.target.value)} minLength={5} maxLength={2000} required rows={6} placeholder="What did you try? What happened? What would you expect instead?" />
            <span className={styles.counter}>{details.length}/2000</span>
          </label>
          <button className={styles.submitButton} type="submit" disabled={submitting}>
            {submitted ? <CheckCircle2 size={17} /> : <Send size={17} />}
            {submitting ? 'Sending…' : 'Submit feedback'}
          </button>
          {message && <p className={submitted ? styles.success : styles.message} role="status">{message}</p>}
        </form>
        {isGuest && <p className={styles.guestNote}>You are browsing as a guest. You can still submit feedback without creating an account.</p>}
      </section>
      {['developer', 'owner'].includes(role.toLowerCase()) && <FeedbackInbox role={role} worldType={worldType} />}
    </main>
  );
}
