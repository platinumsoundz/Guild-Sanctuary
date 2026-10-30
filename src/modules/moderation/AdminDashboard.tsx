'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Search, ShieldCheck, UserCog } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { fetchPageVisibility, isPageVisible, MANAGEABLE_PAGE_VISIBILITY, PAGE_VISIBILITY_ROLES, savePageVisibility, type PageVisibilityMap, type ManagedPageKey, type PageVisibilityRole } from '@/lib/pageVisibility';
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

function PageVisibilityPanel() {
  const [visibility, setVisibility] = useState<PageVisibilityMap>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ManagedPageKey | null>(null);
  const [selectedRole, setSelectedRole] = useState<PageVisibilityRole>('user');
  const [message, setMessage] = useState('');
  useEffect(() => {
    let cancelled = false;
    void fetchPageVisibility().then((result) => {
      if (!cancelled) setVisibility(result);
    }).catch((error) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : 'Page visibility settings could not be loaded.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const update = async (key: ManagedPageKey, visible: boolean) => {
    setSavingKey(key);
    setMessage('');
    try {
      await savePageVisibility(key, selectedRole, visible);
      setVisibility((current) => ({ ...current, [key]: { ...(current[key] ?? {}), [selectedRole]: visible } }));
      setMessage(`${MANAGEABLE_PAGE_VISIBILITY.find((page) => page.key === key)?.label ?? key} is now ${visible ? 'visible' : 'hidden'} for ${PAGE_VISIBILITY_ROLES.find((item) => item.value === selectedRole)?.label ?? selectedRole}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The setting could not be saved. Check that the page-visibility migration is deployed.');
    } finally {
      setSavingKey(null);
    }
  };
  return <section className={styles.rolePanel} aria-labelledby="page-visibility-title">
    <div className={styles.sectionHeading}><ShieldCheck size={21} aria-hidden="true" /><div>
      <h2 id="page-visibility-title">Page & system visibility</h2>
      <p>Choose a permission role, then control the pages and systems visible to that role. Role permissions still apply when a page is shown.</p>
    </div></div>
    <div className={styles.roleEditor}>
      <label htmlFor="visibility-role-select">Permission role to configure</label>
      <select id="visibility-role-select" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value as PageVisibilityRole)} disabled={savingKey !== null}>
        {PAGE_VISIBILITY_ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <p>Only this role’s navigation is affected. Other roles keep their own setting or the existing default.</p>
    </div>
    {loading ? <p role="status">Loading page visibility…</p> : <div className={styles.memberList}>
      {MANAGEABLE_PAGE_VISIBILITY.map((page) => <label key={page.key} className={styles.memberRow}>
        <span><strong>{page.label}</strong><small>{page.key === 'admin' ? 'Always available to staff for recovery' : isPageVisible(page.key, visibility, selectedRole) ? 'Shown in navigation' : 'Hidden from navigation'}</small></span>
        <input type="checkbox" checked={isPageVisible(page.key, visibility, selectedRole)} disabled={savingKey !== null || page.key === 'admin'} onChange={(event) => void update(page.key, event.currentTarget.checked)} aria-label={`Show ${page.label}`} />
      </label>)}
    </div>}
    {message && <p className={styles.message} role="status">{message}</p>}
  </section>;
}

export function AdminDashboard({ role }: { role: string }) {
  const canManageRoles = ['admin', 'developer', 'owner'].includes(role);
  const canManageVisibility = ['developer', 'owner'].includes(role);

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>SANCTUARY CONTROL CENTRE</p>
        <h1><UserCog size={27} aria-hidden="true" /> Admin</h1>
        <p>Manage member permissions and, for Developers and the Owner, global page and system visibility.</p>
      </header>
      {canManageRoles ? <RoleManagement /> : <section className={styles.notice} role="status"><strong>Member permission controls are restricted.</strong><p>Admin, Developer or Owner access is required. Moderation work is available separately in the Moderation page.</p></section>}
      {canManageVisibility && <PageVisibilityPanel />}
      <footer className={styles.footer}>Role changes and moderation actions must be validated by the connected Supabase project. If access is denied, confirm that the security migration is applied and your account has been assigned its role.</footer>
    </div>
  );
}
