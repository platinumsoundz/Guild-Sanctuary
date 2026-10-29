'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ModerationAction } from '@/services/supabase';
import { fetchModerationQueue, takeModerationAction, type ModerationQueueItem } from './service';
import styles from './ModerationDashboard.module.css';

interface ModerationDashboardProps {
  role?: string;
}

export function ModerationDashboard({ role = 'moderator' }: ModerationDashboardProps) {
  const [reports, setReports] = useState<ModerationQueueItem[]>([]);
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyReportId, setBusyReportId] = useState<string | null>(null);

  const canWarn = ['moderator', 'admin', 'developer', 'owner'].includes(role);
  const canSuspend = ['admin', 'developer', 'owner'].includes(role);
  const canBan = ['developer', 'owner'].includes(role);

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
    setBusyReportId(report.id);
    setError(null);
    try {
      await takeModerationAction({ report, action, rationale: rationales[report.id] ?? '', temporarySuspension });
      setReports((current) => current.filter((item) => item.id !== report.id));
      setRationales((current) => {
        const next = { ...current };
        delete next[report.id];
        return next;
      });
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
        <p>Review the reported content and its author before taking action. Every action requires a rationale and is written to the audit log.</p>
      </header>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {isLoading ? <p role="status">Loading moderation access…</p> : !isAuthorized ? (
        <p className={styles.notice}>This area is restricted to active moderators and administrators.</p>
      ) : reports.length === 0 ? (
        <p className={styles.notice}>No open reports.</p>
      ) : (
        <section className={styles.queue} aria-label="Open reports">
          {reports.map((report) => (
            <article className={styles.report} key={report.id}>
              <div className={styles.reportHeader}>
                <strong>{report.target_type} report</strong>
                <time dateTime={report.created_at}>{new Date(report.created_at).toLocaleString()}</time>
              </div>
              <section className={styles.contentPreview} aria-label="Reported content">
                <div className={styles.contentHeading}>
                  <strong>Reported content</strong>
                  <span className={styles.statePill}>{report.targetState ?? 'Unavailable'}</span>
                </div>
                {report.targetTitle && <h2>{report.targetTitle}</h2>}
                <p className={styles.contentBody}>{report.targetContent?.trim() || 'A preview is unavailable here or the original content may no longer be accessible. The report and audit record are retained for review.'}</p>
                {report.targetMediaUrl && (
                  <p className={styles.mediaLink}>
                    <a href={report.targetMediaUrl} target="_blank" rel="noreferrer">Open attached media</a>
                  </p>
                )}
                {report.targetCreatedAt && <p className={styles.contentMeta}>Published {new Date(report.targetCreatedAt).toLocaleString()}</p>}
              </section>
              <p><b>Reason:</b> {report.reason}</p>
              {report.details && <p className={styles.details}><b>Reporter’s details:</b> {report.details}</p>}
              <div className={styles.authorPanel}>
                <b>Content owner</b>
                <span>{report.targetOwnerDisplayName || 'Unknown member'}{report.targetOwnerUsername ? ` (@${report.targetOwnerUsername})` : ''}</span>
              </div>
              <label className={styles.rationale}>
                <span>Action rationale (required)</span>
                <textarea
                  value={rationales[report.id] ?? ''}
                  onChange={(event) => setRationales((current) => ({ ...current, [report.id]: event.currentTarget.value }))}
                  minLength={3}
                  maxLength={1000}
                  rows={2}
                  aria-describedby={`rationale-help-${report.id}`}
                />
                <small id={`rationale-help-${report.id}`}>Use at least 3 characters. This is stored in the moderation audit trail.</small>
              </label>
              <div className={styles.actions}>
                <button disabled={busyReportId === report.id || !rationales[report.id]?.trim()} onClick={() => void act(report, 'hide')}>Hide content</button>
                <button disabled={busyReportId === report.id || !rationales[report.id]?.trim()} onClick={() => void act(report, 'remove')}>Remove content</button>
                {canWarn && <button disabled={busyReportId === report.id || !report.targetOwnerId || !rationales[report.id]?.trim()} onClick={() => void act(report, 'warn')}>Warn member</button>}
                {canSuspend && <button disabled={busyReportId === report.id || !report.targetOwnerId || !rationales[report.id]?.trim()} onClick={() => void act(report, 'suspend', true)}>Suspend 24 hours</button>}
                {canBan && <button disabled={busyReportId === report.id || !report.targetOwnerId || !rationales[report.id]?.trim()} onClick={() => void act(report, 'ban')}>Ban member</button>}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
