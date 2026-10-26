'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchPurchaseReviews, resolvePurchaseReview, type PurchaseReview } from '../reviewService';
import styles from '../ModerationDashboard.module.css';

export function ReviewsPanel() {
  const [reviews, setReviews] = useState<PurchaseReview[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setReviews(await fetchPurchaseReviews('open'));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Refund reviews could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const resolve = async (review: PurchaseReview, status: 'resolved' | 'dismissed') => {
    setBusyId(review.id);
    setError(null);
    try {
      await resolvePurchaseReview(review.id, status, notes[review.id] ?? '');
      setReviews((current) => current.filter((item) => item.id !== review.id));
    } catch (resolveError) {
      setError(resolveError instanceof Error ? resolveError.message : 'The review could not be updated.');
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) return <p role="status">Loading refund reviews…</p>;

  return (
    <section className={styles.queue} aria-label="Refund and chargeback reviews">
      {error && <p className={styles.error} role="alert">{error}</p>}
      {reviews.length === 0 ? (
        <p className={styles.notice}>No open refund or chargeback reviews.</p>
      ) : reviews.map((review) => (
        <article className={styles.report} key={review.id}>
          <div className={styles.reportHeader}>
            <strong>{review.reason.replaceAll('_', ' ')}</strong>
            <time dateTime={review.created_at}>{new Date(review.created_at).toLocaleString()}</time>
          </div>
          <p>
            Session <code>{review.checkout_session_id}</code> · shortfall{' '}
            {review.shortfall_tokens.toLocaleString('en-GB')} tokens
          </p>
          <p className={styles.details}>
            The unspent balance was clawed back automatically. Review whether any spent tokens need a manual adjustment.
          </p>
          <label className={styles.rationale}>
            <span>Resolution notes</span>
            <textarea
              value={notes[review.id] ?? ''}
              onChange={(event) => setNotes((current) => ({ ...current, [review.id]: event.currentTarget.value }))}
              minLength={3}
              maxLength={2000}
              rows={2}
            />
          </label>
          <div className={styles.actions}>
            <button type="button" disabled={busyId === review.id || (notes[review.id]?.trim().length ?? 0) < 3} onClick={() => void resolve(review, 'resolved')}>Resolve</button>
            <button type="button" disabled={busyId === review.id || (notes[review.id]?.trim().length ?? 0) < 3} onClick={() => void resolve(review, 'dismissed')}>Dismiss</button>
          </div>
        </article>
      ))}
    </section>
  );
}
