'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ModerationAction } from '@/services/supabase';
import { fetchModerationQueue, takeModerationAction, type ModerationQueueItem } from '../service';
import styles from '../ModerationDashboard.module.css';

export function ReportsPanel() {
  const [reports, setReports] = useState<ModerationQueueItem[]>([]);
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyReportId, setBusyReportId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const queue = await fetchModerationQueue();
      setReports(queue);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Moderation queue could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const act = async (report: ModerationQueueItem, action: ModerationAction, temporarySuspension = false) => {
    setBusyReportId(report.id);
    setError(null);
    try {
      await takeModerationAction({ report, action, rationale: rationales[report.id] ?? '', temporarySuspension });
      setReports((current) => current.filter((item) => item.id !== report.id));
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Moderation action could not be applied.');
    } finally {
      setBusyReportId(null);
    }
  };

  if (isLoading) return <p role="status">Loading reports…</p>;
  if (reports.length === 0) return <p className={styles.notice}>No open reports.</p>;

  return (
    <section className={styles.queue} aria-label="Open reports">
      {error && <p className={styles.error} role="alert">{error}</p>}
      {reports.map((report) => (
        <article className={styles.report} key={report.id}>
          <div className={styles.reportHeader}>
            <strong>{report.target_type} report</strong>
            <time dateTime={report.created_at}>{new Date(report.created_at).toLocaleString()}</time>
          </div>
          <p><b>Reason:</b> {report.reason}</p>
          {report.details && <p className={styles.details}>{report.details}</p>}
          <label className={styles.rationale}>
            <span>Action rationale</span>
            <textarea
              value={rationales[report.id] ?? ''}
              onChange={(event) => setRationales((current) => ({ ...current, [report.id]: event.currentTarget.value }))}
              minLength={3}
              maxLength={1000}
              rows={2}
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
  );
}
