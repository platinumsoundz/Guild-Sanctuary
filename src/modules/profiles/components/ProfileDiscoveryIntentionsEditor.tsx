'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { LockKeyhole, Save, Sparkles, Users } from 'lucide-react';
import { DISCOVERY_INTENTIONS, fetchMemberDiscoveryIntentions, saveMemberDiscoveryIntentions, type DiscoveryIntentionId } from '../discoveryIntentions';
import styles from './ProfileInterestsEditor.module.css';

interface ProfileDiscoveryIntentionsEditorProps {
  userId: string;
}

export function ProfileDiscoveryIntentionsEditor({ userId }: ProfileDiscoveryIntentionsEditorProps) {
  const [selected, setSelected] = useState<DiscoveryIntentionId[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchMemberDiscoveryIntentions(userId).then((items) => {
      if (cancelled) return;
      setSelected(items.map((item) => item.intention));
      setIsPublic(items.length > 0 && items.every((item) => item.isPublic));
      setError(null);
    }).catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Discovery intentions could not be loaded.');
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const toggle = (id: DiscoveryIntentionId, checked: boolean) => {
    setSelected((current) => checked
      ? current.length < 3 ? [...current, id] : current
      : current.filter((item) => item !== id));
    setMessage(null);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const saved = await saveMemberDiscoveryIntentions(userId, selected, isPublic);
      setSelected(saved.map((item) => item.intention));
      setMessage(isPublic ? 'Intentions saved for public discovery.' : 'Intentions saved privately.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Discovery intentions could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className={styles.card} aria-labelledby="profile-discovery-intentions-heading">
      <div className={styles.heading}>
        <span className={styles.icon} aria-hidden="true"><Users size={18} /></span>
        <div>
          <p className={styles.eyebrow}>CONNECTION INTENTIONS</p>
          <h2 id="profile-discovery-intentions-heading">What would you like to find here?</h2>
        </div>
      </div>
      <p className={styles.description}>Choose up to three intentions to guide discovery. These are flexible preferences, not labels or compatibility scores, and they are private unless you choose to share them.</p>
      <form onSubmit={save}>
        <div className={styles.intentionsGrid}>
          {DISCOVERY_INTENTIONS.map((item) => {
            const checked = selected.includes(item.id);
            return (
              <label className={styles.intentionOption} key={item.id}>
                <input type="checkbox" checked={checked} disabled={isLoading || (!checked && selected.length >= 3)}
                  onChange={(event) => toggle(item.id, event.currentTarget.checked)} />
                <span className={styles.intentionCopy}><strong>{item.label}</strong><small>{item.description}</small></span>
              </label>
            );
          })}
        </div>
        <label className={styles.visibility}>
          <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.currentTarget.checked)} disabled={isLoading || selected.length === 0} />
          <span className={styles.visibilityIcon} aria-hidden="true">{isPublic ? <Sparkles size={15} /> : <LockKeyhole size={15} />}</span>
          <span><strong>{isPublic ? 'Show these intentions in discovery' : 'Keep these intentions private'}</strong><small>{isPublic ? 'Other signed-in members may see these intentions on your discovery card.' : 'Private intentions are not used to suggest you to other members.'}</small></span>
        </label>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {message && <p className={styles.success} role="status">{message}</p>}
        <div className={styles.footer}>
          <span>{selected.length} of 3 intentions</span>
          <button type="submit" disabled={isLoading || isSaving}><Save size={14} aria-hidden="true" /> {isLoading ? 'Loading…' : isSaving ? 'Saving…' : 'Save intentions'}</button>
        </div>
      </form>
    </section>
  );
}
