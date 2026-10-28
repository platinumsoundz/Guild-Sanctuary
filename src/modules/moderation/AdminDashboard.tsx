'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Search, ShieldCheck, UserCog } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/services/supabase';
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
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [role, setRole] = useState<SanctuaryRole>('user');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const filteredMembers = useMemo(() => members.filter((member) => {
    if (roleFilter !== 'all' && member.role !== roleFilter) return false;
    if (statusFilter !== 'all' && member.status !== statusFilter) return false;
    return true;
  }), [members, roleFilter, statusFilter]);

  const availableStatuses = useMemo(() => Array.from(new Set(members.map((member) => member.status))).sort(), [members]);

  const searchMembers = async () => {
    const requestedQuery = query.trim();
    if (!requestedQuery) {
      setMessage('Enter a username to search.');
      setMembers([]);
      setSelected(null);
      return;
    }
    setLoading(true);
    setMessage('');
    setSelected(null);
    try {
      const client = getSupabaseBrowserClient();
      const { data: authData, error: authError } = await client.auth.getUser();
      if (authError || !authData.user) throw new Error('Sign in with your Sanctuary account first.');
      const { data, error } = await client.rpc('search_members_for_admin', { requested_query: requestedQuery });
      if (error) throw new Error(error.message);
      setMembers((data ?? []) as MemberRow[]);
      if (!data?.length) setMessage('No matching members found.');
    } catch (error) {
      setMembers([]);
      setSelected(null);
      setMessage(error instanceof Error ? error.message : 'Member search failed.');
    } finally {
      setLoading(false);
    }
  };

  const changeRole = async () => {
    if (!selected || role === selected.role || saving) return;
    const previousLabel = roles.find((item) => item.value === selected.role)?.label ?? selected.role;
    const nextLabel = roles.find((item) => item.value === role)?.label ?? role;
    const isPrivilegeIncrease = roles.findIndex((item) => item.value === role) > roles.findIndex((item) => item.value === selected.role);
    const warning = isPrivilegeIncrease ? '\n\nThis increases the member’s privilege level. The server must independently authorize this change.' : '\n\nThe server must independently authorize this change.';
    if (!window.confirm('Change @' + selected.username + ' from ' + previousLabel + ' to ' + nextLabel + '?' + warning)) return;
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
        <input id="member-search" value={query} onChange={(event) => setQuery(event.target.value)} minLength={1} maxLength={24} placeholder="Search username…" disabled={loading || saving} required />
        <button type="submit" disabled={loading}><Search size={16} aria-hidden="true" /> {loading ? 'Searching…' : 'Search'}</button>
      </form>
      {message && <p className={styles.message} role="status">{message}</p>}
      {members.length > 0 && (
        <section className={styles.memberResults} aria-label="Member search results">
          <div className={styles.resultsToolbar}>
            <p className={styles.resultsCount} role="status">Showing <strong>{filteredMembers.length}</strong> of <strong>{members.length}</strong> matching members</p>
            <div className={styles.resultFilters}>
              <label><span>Role</span><select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} disabled={saving}><option value="all">All roles</option>{roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} disabled={saving}><option value="all">All statuses</option>{availableStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
              {(roleFilter !== 'all' || statusFilter !== 'all') && <button type="button" className={styles.clearFilters} onClick={() => { setRoleFilter('all'); setStatusFilter('all'); }}>Clear filters</button>}
            </div>
          </div>
          {filteredMembers.length > 0 ? <div className={styles.memberList}>
          {filteredMembers.map((member) => (
            <button type="button" key={member.id} className={`${styles.memberRow} ${selected?.id === member.id ? styles.selectedMember : ''}`} disabled={saving} aria-pressed={selected?.id === member.id} onClick={() => { setSelected(member); setRole(member.role); setMessage(''); }}>
              <span><strong>{member.display_name}</strong><small>@{member.username} · {member.status}</small></span>
              <span className={styles.rolePill}>{roles.find((item) => item.value === member.role)?.label ?? member.role}</span>
            </button>
          ))}
          </div> : <p className={styles.emptyResults}>No members match these role and status filters.</p>}
        </section>
      )}
      {selected && (
        <div className={styles.roleEditor}>
          <label htmlFor="role-select">New role for @{selected.username}</label>
          <select id="role-select" value={role} onChange={(event) => setRole(event.target.value as SanctuaryRole)}>
            {roles.map((item) => <option key={item.value} value={item.value}>{item.label} — {item.description}</option>)}
          </select>
          <div className={styles.roleChangePreview} aria-live="polite"><span>Current: <strong>{roles.find((item) => item.value === selected.role)?.label ?? selected.role}</strong></span><span>Requested: <strong>{roles.find((item) => item.value === role)?.label ?? role}</strong></span></div>
          <button type="button" onClick={() => void changeRole()} disabled={saving || role === selected.role}>{saving ? 'Saving…' : 'Review & save role change'}</button>
          <p>Higher roles and Owner assignment are restricted by database policy. Your account may not be permitted to grant every role.</p>
        </div>
      )}
    </section>
  );
}

export function AdminDashboard({ role }: { role: string }) {
  const canManageRoles = ['admin', 'developer', 'owner'].includes(role);
  const canModerate = ['moderator', 'admin', 'developer', 'owner'].includes(role);

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>SANCTUARY CONTROL CENTRE</p>
        <h1><ShieldCheck size={27} aria-hidden="true" /> Admin & Moderation</h1>
        <p>Manage reports and member permissions with server-enforced access checks.</p>
      </header>
      <section className={styles.overview} aria-label="Admin access overview">
        <article className={styles.overviewCard}><span className={styles.overviewLabel}>Signed-in access tier</span><strong>{roles.find((item) => item.value === role)?.label ?? role}</strong><p>Displayed role only; server policy remains authoritative.</p></article>
        <article className={styles.overviewCard}><span className={styles.overviewLabel}>Member permissions</span><strong>{canManageRoles ? 'Available' : 'Restricted'}</strong><p>{canManageRoles ? 'Member search and role-change requests are available.' : 'An admin, developer or owner role is required to open this panel.'}</p>{canManageRoles && <a href="#role-management-title">Go to member permissions</a>}</article>
        <article className={styles.overviewCard}><span className={styles.overviewLabel}>Moderation</span><strong>{canModerate ? 'Available' : 'Restricted'}</strong><p>{canModerate ? 'Report review controls are available for this role.' : 'A moderator role or higher is required.'}</p>{canModerate && <a href="#moderation-queue-title">Go to moderation queue</a>}</article>
      </section>
      {!canModerate && (
        <section className={styles.notice} role="status" aria-label="Admin access requirements">
          <strong>This account does not have moderation access.</strong>
          <p>Admin and moderation permissions are assigned by an authorized owner. They cannot be claimed from this screen. During initial setup, the first owner must be assigned out of band after the target Sanctuary account is verified.</p>
        </section>
      )}
      {canManageRoles && <RoleManagement />}
      {canModerate && <ModerationDashboard role={role} />}
      <footer className={styles.footer}>Role changes and moderation actions must be validated by the connected Supabase project. If access is denied, confirm that the security migration is applied and your account has been assigned its role.</footer>
    </div>
  );
}
