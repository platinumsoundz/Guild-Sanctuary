'use client';

import { useState } from 'react';
import { ExternalLink, EyeOff, RotateCcw, Search, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { canAccessSanctuaryFeature } from '@/lib/sanctuaryFeatureGates';
import { ModerationDashboard } from './ModerationDashboard';
import styles from './AdminDashboard.module.css';

type SanctuaryRole = 'user' | 'vip' | 'moderator' | 'admin' | 'developer' | 'owner';
type MemberRow = { id: string; username: string; display_name: string; role: SanctuaryRole; status: string };

const roles: { value: SanctuaryRole; label: string; description: string }[] = [
  { value: 'user', label: 'Basic User', description: 'Standard community access' },
  { value: 'vip', label: 'VIP', description: 'Elevated community status' },
  { value: 'moderator', label: 'Moderator', description: 'Review reports and moderate content' },
  { value: 'admin', label: 'Admin', description: 'Community administration' },
  { value: 'developer', label: 'Developer', description: 'Technical administration' },
  { value: 'owner', label: 'Owner', description: 'Highest level of platform authority' },
];

function RoleManagement() {
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [role, setRole] = useState<SanctuaryRole>('user');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const searchMembers = async () => {
    setLoading(true);
    setMessage('');
    setSelected(null);
    try {
      const client = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user) throw new Error('Sign in with your Sanctuary account first.');
      const { data, error } = await client.rpc('search_members_for_admin', { requested_query: query.trim() });
      if (error) throw new Error(error.message);
      setMembers((data ?? []) as MemberRow[]);
      if (!data?.length) setMessage('No matching members found.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Member search failed.');
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async () => {
    if (!selected) return;
    setSaving(true);
    setMessage('');
    try {
      const { error } = await getSupabaseBrowserClient().rpc('set_member_role', {
        requested_user_id: selected.id,
        requested_role: role,
      });
      if (error) throw new Error(error.message);
      setMembers((current) => current.map((member) => member.id === selected.id ? { ...member, role } : member));
      setSelected({ ...selected, role });
      setMessage(`Role updated for @${selected.username} to ${roles.find((item) => item.value === role)?.label ?? role}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Role change was rejected.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.rolePanel} aria-labelledby="role-management-title">
      <div className={styles.sectionHeading}>
        <UserCog size={21} aria-hidden="true" />
        <div>
          <h2 id="role-management-title">Member permissions</h2>
          <p>Search by username, then request a role change. The database checks your authority and records the change.</p>
        </div>
      </div>
      <form className={styles.searchForm} onSubmit={(event) => { event.preventDefault(); void searchMembers(); }}>
        <label className={styles.srOnly} htmlFor="member-search">Search member usernames</label>
        <input id="member-search" value={query} onChange={(event) => setQuery(event.target.value)} minLength={1} maxLength={24} placeholder="Search username…" required />
        <button type="submit" disabled={loading}><Search size={16} aria-hidden="true" /> {loading ? 'Searching…' : 'Search'}</button>
      </form>
      {message && <p className={styles.message} role="status">{message}</p>}
      {members.length > 0 && (
        <div className={styles.memberList}>
          {members.map((member) => (
            <button type="button" key={member.id} className={`${styles.memberRow} ${selected?.id === member.id ? styles.selectedMember : ''}`} onClick={() => { setSelected(member); setRole(member.role); setMessage(''); }}>
              <span><strong>{member.display_name}</strong><small>@{member.username} · {member.status}</small></span>
              <span className={styles.rolePill}>{roles.find((item) => item.value === member.role)?.label ?? member.role}</span>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className={styles.roleEditor}>
          <label htmlFor="role-select">New role for @{selected.username}</label>
          <select id="role-select" value={role} onChange={(event) => setRole(event.target.value as SanctuaryRole)}>
            {roles.map((item) => <option key={item.value} value={item.value}>{item.label} — {item.description}</option>)}
          </select>
          <button type="button" onClick={() => void changeRole()} disabled={saving || role === selected.role}>{saving ? 'Saving…' : 'Save role change'}</button>
          <p>Higher roles and Owner assignment are restricted by database policy. Your account may not be permitted to grant every role.</p>
        </div>
      )}
    </section>
  );
}

function DirectContentModeration() {
  const [targetType, setTargetType] = useState<'post' | 'short' | 'event' | 'comment'>('post');
  const [targetId, setTargetId] = useState('');
  const [rationale, setRationale] = useState('');
  const [action, setAction] = useState<'hide' | 'remove' | 'restore'>('hide');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = targetId.trim();
    const reason = rationale.trim();
    if (!id || reason.length < 3) {
      setError('Enter the content ID and a rationale of at least three characters.');
      return;
    }
    if (action !== 'hide' && !window.confirm(action === 'remove' ? 'Remove this content from public view? This action will be audited.' : 'Restore this content to public view? This action will be audited.')) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const { error: rpcError } = await getSupabaseBrowserClient().rpc('apply_moderation_action', {
        requested_report_id: null,
        requested_target_type: targetType,
        requested_target_id: id,
        requested_action: action,
        requested_rationale: reason,
        requested_expires_at: null,
      });
      if (rpcError) throw new Error(rpcError.message);
      setMessage('Action recorded. The content state was updated and the audit trail was written.');
      setTargetId('');
      setRationale('');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'The content action was rejected. Check the ID, your role, and the deployed moderation migration.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.rolePanel} aria-labelledby="direct-content-moderation-title">
      <div className={styles.sectionHeading}>
        <EyeOff size={21} aria-hidden="true" />
        <div><h2 id="direct-content-moderation-title">Moderate content by ID</h2><p>Use this when a post or clip needs action but has not been reported. Server-side role checks and the audit log still apply.</p></div>
      </div>
      <form className={styles.directModerationForm} onSubmit={(event) => void applyAction(event)}>
        <label>Content type<select value={targetType} onChange={(event) => setTargetType(event.currentTarget.value as typeof targetType)}><option value="post">Post</option><option value="short">Short video</option><option value="event">Event</option><option value="comment">Comment</option></select></label>
        <label>Content ID<input value={targetId} onChange={(event) => setTargetId(event.currentTarget.value)} required placeholder="Paste the content UUID" /></label>
        <label>Action<select value={action} onChange={(event) => setAction(event.currentTarget.value as typeof action)}><option value="hide">Hide from public view</option><option value="remove">Remove from public view</option><option value="restore">Restore to public view</option></select></label>
        <label className={styles.directRationale}>Reason for the audit log<textarea value={rationale} onChange={(event) => setRationale(event.currentTarget.value)} minLength={3} maxLength={1000} rows={2} required placeholder="Explain the policy reason…" /></label>
        <button type="submit" disabled={busy || !targetId.trim() || rationale.trim().length < 3}>{busy ? 'Applying…' : action === 'hide' ? 'Hide content' : action === 'remove' ? <><Trash2 size={15} /> Remove content</> : <><RotateCcw size={15} /> Restore content</>}</button>
      </form>
      {error && <p className={styles.message} role="alert">{error}</p>}
      {message && <p className={styles.message} role="status">{message}</p>}
    </section>
  );
}

export function AdminDashboard({ role }: { role: string }) {
  const canManageRoles = canAccessSanctuaryFeature('memberRoleManagement', role);
  const canModerate = canAccessSanctuaryFeature('moderation', role);

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>SANCTUARY CONTROL CENTRE</p>
        <h1><ShieldCheck size={27} aria-hidden="true" /> Admin & Moderation</h1>
        <p>Manage reports and member permissions with server-enforced access checks.</p>
      </header>
      {!canModerate && (
        <section className={styles.notice} role="status" aria-label="Admin access requirements">
          <strong>This account does not have moderation access.</strong>
          <p>Admin and moderation permissions are assigned by an authorized owner. They cannot be claimed from this screen. During initial setup, the first owner must be assigned out of band after the target Sanctuary account is verified.</p>
        </section>
      )}
      {canManageRoles && <RoleManagement />}
      {canModerate && <><ModerationDashboard /><DirectContentModeration /></>}
      <footer className={styles.footer}>Role changes and moderation actions must be validated by the connected Supabase project. If access is denied, confirm that the security migration is applied and your account has been assigned its role.</footer>
    </div>
  );
}
