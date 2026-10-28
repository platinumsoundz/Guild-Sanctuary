'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import type { ModerationAction } from '@/services/supabase';
import { fetchModerationQueue, takeModerationAction, type ModerationQueueItem } from './service';
import styles from './ModerationDashboard.module.css';
import { getSafeModerationMediaUrl } from './media-url';

interface ModerationDashboardProps {
  role?: string;
}

export function ModerationDashboard({ role = 'moderator' }: ModerationDashboardProps) {
  const [reports, setReports] = useState<ModerationQueueItem[]>([]);
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyReportId, setBusyReportId] = useState<string | null>(null);

  const canWarn = ['moderator', 'admin', 'developer', 'owner'].includes(role);
  const canSuspend = ['admin', 'developer', 'owner'].includes(role);
  const canBan = ['developer', 'owner'].includes(role);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queue = await fetchModerationQueue();
      setReports(queue);
      setIsAuthorized(true);
      setNotice(null);
    } catch (loadError) {
      setIsAuthorized(false);
      setError(loadError instanceof Error ? loadError.message : 'Moderation queue could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const availableTypes = useMemo(
    () => Array.from(new Set(reports.map((report) => report.target_type))).sort(),
    [reports],
  );

  const filteredReports = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return reports.filter((report) => {
      if (typeFilter !== 'all' && report.target_type !== typeFilter) return false;
      if (!query) return true;
      const searchable = [
        report.target_type,
        report.reason,
        report.details,
        report.targetTitle,
        report.targetContent,
        report.targetOwnerUsername,
        report.targetOwnerDisplayName,
        report.targetState,
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      return searchable.includes(query);
    });
  }, [reports, searchQuery, typeFilter]);

  const act = async (report: ModerationQueueItem, action: ModerationAction, temporarySuspension = false) => {
    const destructive = action === 'remove' || action === 'ban' || action === 'suspend';
    if (destructive) {
      const actionLabel = action === 'remove' ? 'remove this content' : action === 'ban' ? 'ban this member' : 'suspend this member for 24 hours';
      if (!window.confirm(`Are you sure you want to ${actionLabel}? This action will be recorded in the moderation audit trail.`)) return;
    }

    setBusyReportId(report.id);
    setError(null);
    setNotice(null);
    try {
      await takeModerationAction({ report, action, rationale: rationales[report.id] ?? '', temporarySuspension });
      setReports((current) => current.filter((item) => item.id !== report.id));
      setRationales((current) => {
        const next = { ...current };
        delete next[report.id];
        return next;
      });
      setNotice(`Action “${action}” submitted successfully. The report has been removed from this view.`);
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
        <p>Review reported content and its author before taking action. Every action requires a rationale and is recorded by the server.</p>
      </header>

      <section className={styles.queueTools} aria-label="Moderation queue tools">
        <div className={styles.queueSummary}>
          <div className={styles.summaryCard}>
            <span>Open reports loaded</span>
            <strong>{reports.length}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Showing</span>
            <strong>{filteredReports.length}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span>Report types</span>
            <strong>{availableTypes.length}</strong>
          </div>
        </div>
        <div className={styles.filters}>
          <label className={styles.searchBox}>
            <Search size={17} aria-hidden="true" />
            <span className={styles.srOnly}>Search reports</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.currentTarget.value)}
              placeholder="Search content, member, reason…"
              maxLength={120}
            />
          </label>
          <label className={styles.typeFilter}>
            <span>Content type</span>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.currentTarget.value)}>
              <option value="all">All types</option>
              {availableTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <button className={styles.refreshButton} type="button" onClick={() => void refresh()} disabled={isLoading || busyReportId !== null}>
            <RefreshCw size={16} aria-hidden="true" className={isLoading ? styles.spinning : undefined} />
            {isLoading ? 'Refreshing…' : 'Refresh queue'}
          </button>
        </div>
      </section>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.success} role="status">{notice}</p>}
      {isLoading ? <p role="status">Loading moderation access…</p> : !isAuthorized ? (
        <p className={styles.notice}>This area is restricted to active moderators and administrators. Resolve the access or backend error above, then refresh.</p>
      ) : reports.length === 0 ? (
        <p className={styles.notice}>No open reports were returned by the moderation service.</p>
      ) : filteredReports.length === 0 ? (
        <p className={styles.notice}>No reports match these filters. Try a different search or content type.</p>
      ) : (
        <section className={styles.queue} aria-label="Open reports">
          {filteredReports.map((report) => (
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
                <p className={styles.contentBody}>{report.targetContent?.trim() || 'The original content is unavailable (it may have been deleted). The report and audit record are retained for review.'}</p>
                {(() => {
                  const safeMediaUrl = getSafeModerationMediaUrl(report.targetMediaUrl);
                  if (safeMediaUrl) {
                    return (
                      <p className={styles.mediaLink}>
                        <a href={safeMediaUrl} target="_blank" rel="noopener noreferrer">Open attached media (opens in a new tab)</a>
                      </p>
                    );
                  }
                  if (report.targetMediaUrl) {
                    return <p className={styles.contentMeta}>Media link hidden because its URL is invalid or uses an unsupported protocol.</p>;
                  }
                  return null;
                })()}
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
