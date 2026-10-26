'use client';

import { useState, type FormEvent } from 'react';
import type { AdminMemberOverview, MemberTermsAcceptance } from '@/services/supabase/database.types';
import {
  addMemberNote,
  fetchMemberOverview,
  fetchMemberTerms,
  searchMembers,
  setMemberRole,
  type MemberSearchResult,
} from '../adminService';
import { takeMemberAction, type ModerationRole } from '../service';
import styles from '../ModerationDashboard.module.css';

interface MembersPanelProps {
  role: ModerationRole;
  currentUserId: string;
}

export function MembersPanel({ role, currentUserId }: MembersPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberSearchResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminMemberOverview | null>(null);
  const [terms, setTerms] = useState<MemberTermsAcceptance[]>([]);
  const [rationale, setRationale] = useState('');
  const [note, setNote] = useState('');
  const [roleDraft, setRoleDraft] = useState<'member' | 'moderator' | 'admin'>('member');
  const [isSearching, setIsSearching] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSearching(true);
    setError(null);
    try {
      const members = await searchMembers(query);
      setResults(members);
      if (members.length === 0) setNotice('No members matched that search.');
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : 'Members could not be searched.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectMember = async (member: MemberSearchResult) => {
    setSelectedId(member.id);
    setOverview(null);
    setTerms([]);
    setError(null);
    setNotice(null);
    setRoleDraft(member.role);
    try {
      const [nextOverview, nextTerms] = await Promise.all([
        fetchMemberOverview(member.id),
        fetchMemberTerms(member.id),
      ]);
      setOverview(nextOverview);
      setTerms(nextTerms);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The member overview could not be loaded.');
    }
  };

  const reload = async (memberId: string) => {
    const next = await fetchMemberOverview(memberId);
    setOverview(next);
    setResults((current) => current.map((member) => (
      member.id === memberId
        ? {
            ...member,
            role: next.profile.role,
            status: next.profile.status,
            suspendedUntil: next.profile.suspended_until,
            balanceTokens: next.balance_tokens,
          }
        : member
    )));
  };

  const act = async (action: 'warn' | 'suspend' | 'ban') => {
    if (!selectedId) return;
    setIsBusy(true);
    setError(null);
    setNotice(null);
    try {
      await takeMemberAction({
        userId: selectedId,
        action,
        rationale,
        temporarySuspension: action === 'suspend',
      });
      setRationale('');
      setNotice(`Account action "${action}" was recorded.`);
      await reload(selectedId);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'The account action could not be applied.');
    } finally {
      setIsBusy(false);
    }
  };

  const saveRole = async () => {
    if (!selectedId) return;
    setIsBusy(true);
    setError(null);
    setNotice(null);
    try {
      await setMemberRole(selectedId, roleDraft);
      setNotice(`Role changed to ${roleDraft}.`);
      await reload(selectedId);
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : 'The role could not be changed.');
    } finally {
      setIsBusy(false);
    }
  };

  const saveNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId) return;
    setIsBusy(true);
    setError(null);
    try {
      await addMemberNote(selectedId, note);
      setNote('');
      setNotice('Note saved.');
      await reload(selectedId);
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'The note could not be saved.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className={styles.memberLayout}>
      <section className={styles.memberSearch} aria-label="Find a member">
        <form className={styles.searchForm} onSubmit={(event) => void search(event)}>
          <label>
            <span>Search username or display name</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="e.g. ash or Rowan"
              maxLength={80}
            />
          </label>
          <button type="submit" disabled={isSearching || query.trim().length < 2}>
            {isSearching ? 'Searching…' : 'Search'}
          </button>
        </form>
        {results.length > 0 && (
          <ul className={styles.memberList}>
            {results.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  data-selected={selectedId === member.id}
                  onClick={() => void selectMember(member)}
                >
                  <strong>{member.displayName}</strong>
                  <span>@{member.username} · {member.role} · {member.status}</span>
                  <span>{member.balanceTokens.toLocaleString('en-GB')} tokens</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.memberDetail} aria-label="Member detail">
        {error && <p className={styles.error} role="alert">{error}</p>}
        {notice && <p className={styles.notice} role="status">{notice}</p>}
        {!selectedId ? (
          <p className={styles.notice}>Search for a member to review their wallet, role, notes, and recent actions.</p>
        ) : !overview ? (
          <p role="status">Loading member…</p>
        ) : (
          <>
            <div className={styles.memberHeading}>
              <div>
                <p className={styles.eyebrow}>{overview.profile.role} · {overview.profile.status}</p>
                <h2>{overview.profile.display_name}</h2>
                <p className={styles.details}>@{overview.profile.username}</p>
              </div>
              <div className={styles.balanceChip}>
                <span>Wallet</span>
                <strong>{overview.balance_tokens.toLocaleString('en-GB')} tokens</strong>
              </div>
            </div>

            <div className={styles.memberGrid}>
              <div>
                <h3>Account status</h3>
                <p className={styles.details}>
                  {overview.profile.status}
                  {overview.profile.suspended_until ? ` until ${new Date(overview.profile.suspended_until).toLocaleString()}` : ''}
                </p>
                {terms.length > 0 ? (
                  <p className={styles.details}>
                    Terms: {terms.map((entry) => `${entry.terms_version} (${new Date(entry.accepted_at).toLocaleDateString('en-GB')})`).join(', ')}
                  </p>
                ) : (
                  <p className={styles.details}>Terms: no recorded acceptance</p>
                )}
                {overview.profile.deletion_purge_after && (
                  <p className={styles.warning}>Deletion scheduled for {new Date(overview.profile.deletion_purge_after).toLocaleString()}</p>
                )}
                {overview.profile.purchase_age_verified_at && (
                  <p className={styles.details}>18+ verified: {new Date(overview.profile.purchase_age_verified_at).toLocaleDateString('en-GB')}</p>
                )}
              </div>
              <div>
                <h3>Role</h3>
                {role === 'admin' && selectedId !== currentUserId ? (
                  <div className={styles.inlineForm}>
                    <select value={roleDraft} onChange={(event) => setRoleDraft(event.currentTarget.value as typeof roleDraft)}>
                      <option value="member">member</option>
                      <option value="moderator">moderator</option>
                      <option value="admin">admin</option>
                    </select>
                    <button type="button" disabled={isBusy || roleDraft === overview.profile.role} onClick={() => void saveRole()}>
                      Save role
                    </button>
                  </div>
                ) : (
                  <p className={styles.details}>Only administrators can change roles, and never their own.</p>
                )}
              </div>
            </div>

            <h3>Token history</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Type</th><th>Detail</th><th>Tokens</th><th>When</th></tr>
                </thead>
                <tbody>
                  {overview.ledger.map((entry) => (
                    <tr key={`credit-${entry.id}`}>
                      <td>Credit</td>
                      <td>{entry.bundle_id}</td>
                      <td>+{entry.tokens_delta.toLocaleString('en-GB')}</td>
                      <td>{new Date(entry.created_at).toLocaleDateString('en-GB')}</td>
                    </tr>
                  ))}
                  {overview.spends.map((entry) => (
                    <tr key={`spend-${entry.id}`}>
                      <td>Spend</td>
                      <td>{entry.item_name}</td>
                      <td>{entry.tokens_delta.toLocaleString('en-GB')}</td>
                      <td>{new Date(entry.created_at).toLocaleDateString('en-GB')}</td>
                    </tr>
                  ))}
                  {overview.ledger.length === 0 && overview.spends.length === 0 && (
                    <tr><td colSpan={4}>No token activity.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {overview.purchase_reviews.length > 0 && (
              <>
                <h3>Refund / dispute reviews</h3>
                <ul className={styles.plainList}>
                  {overview.purchase_reviews.map((review) => (
                    <li key={review.id}>
                      <strong>{review.reason}</strong> · {review.status} · shortfall {review.shortfall_tokens.toLocaleString('en-GB')} tokens
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h3>Moderation actions</h3>
            <ul className={styles.plainList}>
              {overview.moderation_actions.map((action) => (
                <li key={action.id}>
                  <strong>{action.action}</strong> · {new Date(action.created_at).toLocaleString()} · {action.rationale}
                </li>
              ))}
              {overview.moderation_actions.length === 0 && <li>No recorded actions.</li>}
            </ul>

            <h3>Appeals</h3>
            <ul className={styles.plainList}>
              {overview.appeals.map((appeal) => (
                <li key={appeal.id}>
                  <strong>{appeal.status}</strong> · {new Date(appeal.created_at).toLocaleDateString('en-GB')} · {appeal.message}
                </li>
              ))}
              {overview.appeals.length === 0 && <li>No appeals.</li>}
            </ul>

            <h3>Internal notes</h3>
            <ul className={styles.plainList}>
              {overview.notes.map((item) => (
                <li key={item.id}>
                  {new Date(item.created_at).toLocaleString()} · {item.body}
                </li>
              ))}
              {overview.notes.length === 0 && <li>No notes yet.</li>}
            </ul>
            <form className={styles.inlineForm} onSubmit={(event) => void saveNote(event)}>
              <input
                value={note}
                onChange={(event) => setNote(event.currentTarget.value)}
                placeholder="Add an internal note"
                maxLength={2000}
              />
              <button type="submit" disabled={isBusy || note.trim().length < 2}>Save note</button>
            </form>

            <h3>Account actions</h3>
            <label className={styles.rationale}>
              <span>Rationale (required for every action)</span>
              <textarea
                value={rationale}
                onChange={(event) => setRationale(event.currentTarget.value)}
                minLength={3}
                maxLength={1000}
                rows={2}
              />
            </label>
            <div className={styles.actions}>
              <button type="button" disabled={isBusy || rationale.trim().length < 3} onClick={() => void act('warn')}>Warn</button>
              <button type="button" disabled={isBusy || rationale.trim().length < 3} onClick={() => void act('suspend')}>Suspend 24h</button>
              <button type="button" disabled={isBusy || rationale.trim().length < 3} onClick={() => void act('ban')}>Ban</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
