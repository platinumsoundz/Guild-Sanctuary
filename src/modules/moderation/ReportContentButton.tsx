'use client';

import { useState, type FormEvent } from 'react';
import type { ReportTarget } from './service';
import { submitContentReport } from './service';
import styles from './ReportContentButton.module.css';

interface ReportContentButtonProps {
  targetType: ReportTarget;
  targetId: string;
}

const reasons = ['Harassment', 'Hate or discrimination', 'Spam or scam', 'Unsafe content', 'Other'];

export function ReportContentButton({ targetType, targetId }: ReportContentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState(reasons[0]);
  const [details, setDetails] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      await submitContentReport({ targetType, targetId, reason, details });
      setMessage('Thank you. Your report has been sent to the moderation team.');
      setIsOpen(false);
      setDetails('');
    } catch (submitError) {
      setMessage(submitError instanceof Error ? submitError.message : 'Your report could not be submitted.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <button className={styles.trigger} type="button" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
        Report
      </button>
      {isOpen && (
        <form className={styles.form} onSubmit={(event) => void handleSubmit(event)}>
          <label>
            <span>Why are you reporting this?</span>
            <select value={reason} onChange={(event) => setReason(event.currentTarget.value)}>{reasons.map((item) => <option key={item}>{item}</option>)}</select>
          </label>
          <label>
            <span>Details (optional)</span>
            <textarea value={details} onChange={(event) => setDetails(event.currentTarget.value)} maxLength={2000} rows={3} />
          </label>
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Submit report'}</button>
        </form>
      )}
      {message && <p className={styles.message} role="status">{message}</p>}
    </div>
  );
}
