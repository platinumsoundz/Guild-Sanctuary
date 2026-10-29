'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ModerationAction } from '@/services/supabase';
import { fetchModerationQueue, takeModerationAction, type ModerationQueueItem } from './service';
import styles from './ModerationDashboard.module.css';

export function ModerationDashboard() {
  const [reports, setReports] = useState<ModerationQueueItem[]>([]);
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [busyReportId, setBusyReportId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const queue = await fetchModerationQueue();
      setReports(queue);
      setIsAuthorized(true);
      setError(null);
    } catch (loadError) {
      setIsAuthorized(false);
      setError(loadError instanceof Error ? loadError.message : 'Moderation queue could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const act = async (report: ModerationQueueItem, action: ModerationAction, temporarySuspension = false) => {
    const labels: Record<ModerationAction, string> = {
      warn: 'warn this member',
      hide: 'hide this content',
      remove: 'remove this content',
      restore: 'restore this content',
      suspend: 'suspend this member for 24 hours',
      ban: 'permanently ban this member',
    };
    if (['remove', 'ban', 'suspend'].includes(action) &&
      !window.confirm(`Confirm action: ${labels[action]}? This will be recorded in the moderation audit log.`)) return;

    setBusyReportId(report.id);
    setError(null);
    setOutcome(null);
    try {
      await takeModerationAction({ report, action, rationale: rationales[report.id] ?? '', temporarySuspension });
      setReports((current) => current.filter((item) => item.id !== report.id));
      setOutcome(`Success: ${labels[action]}. The report was resolved and the action was recorded. Affected users will receive an in-app moderation notice.`);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Moderation action could not be applied.');
    } finally {
      setBusyReportId(null);
    }
  };

  return (
    <main className={styles.dashboard}>
      <header>
        <p className={styles.eyebrow}>TRUST & SAFETY</p>
        <h1>Moderation queue</h1>
        <p>Review the reported content and member context before deciding. Every action requires a rationale and is written to the audit log.</p>
      </header>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {outcome && <p className={styles.outcome} role="status">{outcome}</p>}
      {isLoading ? <p role="status">Loading moderation access…</p> : !isAuthorized ? (
        <p className={styles.notice}>This area is restricted to active moderators and administrators.</p>
      ) : reports.length === 0 ? (
        <p className={styles.notice}>No open reports. Refresh to check for newly submitted reports.</p>
      ) : (
        <section className={styles.queue} aria-label="Open reports">
          {reports.map((report) => (
            <article className={styles.report} key={report.id}>
              <div className={styles.reportHeader}>
                <strong>{report.target_type} report</strong>
                <time dateTime={report.created_at}>Reported {new Date(report.created_at).toLocaleString()}</time>
              </div>
              <section className={styles.context} aria-label="Reported content">
                <p className={styles.contextLabel}>REPORTED CONTENT</p>
                <p className={styles.preview}>{report.targetPreview}</p>
                <dl className={styles.metadata}>
                  <div><dt>Author</dt><dd>{report.targetOwnerName ?? 'Member details unavailable'}{report.targetOwnerUsername ? ` (@${report.targetOwnerUsername})` : ''}</dd></div>
                  <div><dt>Content status</dt><dd>{report.targetState ?? 'Unknown'}</dd></div>
                  {report.targetCreatedAt && <div><dt>Content date</dt><dd>{new Date(report.targetCreatedAt).toLocaleString()}</dd></div>}
                  <div><dt>Report ID</dt><dd className={styles.id}>{report.id}</dd></div>
                  <div><dt>Target ID</dt><dd className={styles.id}>{report.target_id}</dd></div>
                </dl>
              </section>
              <p><b>Reason:</b> {report.reason}</p>
              {report.details && <p className={styles.details}><b>Reporter details:</b> {report.details}</p>}
              <label className={styles.rationale}>
                <span>Action rationale (shown to the affected member)</span>
                <textarea
                  value={rationales[report.id] ?? ''}
                  onChange={(event) => setRationales((current) => ({ ...current, [report.id]: event.currentTarget.value }))}
                  minLength={3}
                  maxLength={1000}
                  rows={3}
                  placeholder="Explain the rule or behaviour involved. Avoid including private reporter information."
                />
              </label>
              <div className={styles.actions}>
                <button disabled={busyReportId === report.id || !rationales[report.id]?.trim()} onClick={() => void act(report, 'hide')}>Hide content</button>
                <button disabled={busyReportId === report.id || !rationales[report.id]?.trim()} onClick={() => void act(report, 'remove')}>Remove content</button>
                <button disabled={busyReportId === report.id || !report.targetOwnerId || !rationales[report.id]?.trim()} onClick={() => void act(report, 'warn')}>Warn member</button>
                <button disabled={busyReportId === report.id || !report.targetOwnerId || !rationales[report.id]?.trim()} onClick={() => void act(report, 'suspend', true)}>Suspend 24 hours</button>
                <button disabled={busyReportId === report.id || !report.targetOwnerId || !rationales[report.id]?.trim()} onClick={() => void act(report, 'ban')}>Ban member</button>
              </div>
            </article>
          ))}
        </section>
      )}
      <button className={styles.refresh} type="button" onClick={() => void refresh()} disabled={isLoading || busyReportId !== null}>Refresh report queue</button>
    </main>
  );
}
