'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Hash, LockKeyhole, Save, Sparkles } from 'lucide-react';
import { fetchMemberDiscoveryInterests, saveMemberDiscoveryInterests } from '../discoveryInterests';
import styles from './ProfileInterestsEditor.module.css';

interface ProfileInterestsEditorProps {
  userId: string;
}

export function ProfileInterestsEditor({ userId }: ProfileInterestsEditorProps) {
  const [value, setValue] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchMemberDiscoveryInterests(userId).then((items) => {
      if (cancelled) return;
      setValue(items.map((item) => item.interest).join(', '));
      setIsPublic(items.length > 0 && items.every((item) => item.isPublic));
      setError(null);
    }).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Interests could not be loaded.');
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const interests = value.split(',').map((item) => item.trim()).filter(Boolean);
      const saved = await saveMemberDiscoveryInterests(userId, interests, isPublic);
      setValue(saved.map((item) => item.interest).join(', '));
      setMessage(isPublic ? 'Interests saved and visible in discovery.' : 'Interests saved privately.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Interests could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={styles.card} aria-labelledby="profile-interests-heading">
      <div className={styles.heading}>
        <span className={styles.icon} aria-hidden="true"><Hash size={18} /></span>
        <div>
          <p className={styles.eyebrow}>DISCOVERY PROFILE</p>
          <h2 id="profile-interests-heading">Your interests</h2>
        </div>
      </div>
      <p className={styles.description}>Add up to 12 topics that you enjoy exploring. These are separate from private reflections and questionnaire answers. Public interests are searchable only while your profile is publicly discoverable.</p>
      <form onSubmit={save}>
        <label className={styles.field} htmlFor="discovery-interests">
          <span>Interests, separated by commas</span>
          <textarea id="discovery-interests" value={value} onChange={(event) => setValue(event.currentTarget.value)}
            maxLength={480} rows={3} disabled={isLoading} placeholder="meditation, philosophy, consciousness" />
        </label>
        <label className={styles.visibility}>
          <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.currentTarget.checked)} disabled={isLoading} />
          <span className={styles.visibilityIcon} aria-hidden="true">{isPublic ? <Sparkles size={15} /> : <LockKeyhole size={15} />}</span>
          <span><strong>{isPublic ? 'Show these interests in discovery' : 'Keep these interests private'}</strong><small>{isPublic ? 'Other signed-in members can find you through these topics.' : 'Only you can see these interests. You can change this any time.'}</small></span>
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.success} role="status">{message}</p>}
        <div className={styles.footer}>
          <span>{value.split(',').map((item) => item.trim()).filter(Boolean).length} of 12 interests</span>
          <button type="submit" disabled={isLoading || isSaving}><Save size={14} aria-hidden="true" /> {isLoading ? 'Loading…' : isSaving ? 'Saving…' : 'Save interests'}</button>
        </div>
      </form>
    </section>
  );
}
