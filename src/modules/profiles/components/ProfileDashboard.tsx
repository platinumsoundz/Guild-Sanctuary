'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { Post, Profile } from '@/types/database';
import { ProfileCard } from './ProfileCard';
import styles from './ProfileDashboard.module.css';

interface ProfileDashboardProps {
  profile: Profile;
  posts: Post[];
  isPostsLoading: boolean;
  onSave: (updates: Partial<Omit<Profile, 'id' | 'userId' | 'role'>>) => void | Promise<void>;
  onThemeChange: (themeColor: string) => void;
}

const starSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

export function ProfileDashboard({ profile, posts, isPostsLoading, onSave, onThemeChange }: ProfileDashboardProps) {
  const [draft, setDraft] = useState(profile);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => setDraft(profile), [profile]);

  const updateDraft = (changes: Partial<Profile>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setSaved(false);
  };

  const openEditor = () => {
    setDraft(profile);
    setError(null);
    setSaved(false);
    setIsEditing(true);
  };

  const closeEditor = () => {
    if (isSaving) return;
    onThemeChange(profile.themeColor);
    setDraft(profile);
    setError(null);
    setIsEditing(false);
  };

  const readImage = async (event: ChangeEvent<HTMLInputElement>, target: 'avatarUrl' | 'bannerUrl') => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) {
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      setError('Choose a JPEG, PNG, or WebP image under 1 MB.');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      updateDraft({ [target]: dataUrl });
      setError(null);
    } catch {
      setError('That image could not be read.');
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        bio: draft.bio?.trim() || null,
        statusMessage: draft.statusMessage?.trim() || null,
        avatarUrl: draft.avatarUrl,
        bannerUrl: draft.bannerUrl,
        themeColor: draft.themeColor,
        location: draft.location?.trim() || null,
        age: draft.age,
        starSign: draft.starSign,
        belief: draft.belief?.trim() || null,
        privacy: draft.privacy,
      });
      setSaved(true);
      setIsEditing(false);
    } catch (saveError) {
      setSaved(false);
      setError(saveError instanceof Error ? saveError.message : 'Profile changes could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className={styles.dashboard} style={{ '--profile-color': draft.themeColor } as React.CSSProperties}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>PROFILE</p>
          <h1>Your profile</h1>
          {saved && <span className={styles.savedNotice} role="status">Profile saved</span>}
        </div>
        <button className={styles.editButton} type="button" onClick={openEditor}>
          Edit profile
        </button>
      </header>

      <ProfileCard profile={draft} />

      <section className={styles.showcase} aria-labelledby="showcase-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>YOUR CONTRIBUTIONS</p>
            <h2 id="showcase-heading">Posts and media</h2>
          </div>
        </div>
        {isPostsLoading ? <p className={styles.emptyShowcase}>Loading your showcase...</p> : posts.length === 0 ? (
          <p className={styles.emptyShowcase}>Your posts and shared media will appear here.</p>
        ) : (
          <div className={styles.showcaseGrid}>
            {posts.map((post) => (
              <article className={styles.showcaseItem} key={post.id}>
                <span className={styles.showcaseWorld}>SANCTUARY</span>
                <p>{post.content}</p>
                {post.mediaUrl && post.mediaType === 'image' && <img src={post.mediaUrl} alt="Your uploaded post" />}
                {post.mediaUrl && post.mediaType === 'audio' && <audio controls preload="none" src={post.mediaUrl}>Audio playback is not supported.</audio>}
                {post.storyTag && <span className={styles.storyTag}>{post.storyTag}</span>}
              </article>
            ))}
          </div>
        )}
      </section>

      {isEditing && (
        <div
          className={styles.editorOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeEditor();
          }}
        >
          <section className={styles.editorDialog} role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
            <header className={styles.editorHeader}>
              <div>
                <p className={styles.eyebrow}>PROFILE SETTINGS</p>
                <h2 id="edit-profile-title">Edit profile</h2>
              </div>
              <button className={styles.closeButton} type="button" onClick={closeEditor} aria-label="Close profile editor" disabled={isSaving}>
                ×
              </button>
            </header>

            <form className={styles.editor} onSubmit={handleSave}>
              <section className={styles.editorSection} aria-labelledby="appearance-heading">
                <div className={styles.sectionHeading}>
                  <div>
                    <p className={styles.eyebrow}>PERSONALIZE</p>
                    <h2 id="appearance-heading">Appearance</h2>
                  </div>
                  <label className={styles.themeControl}>
                    <span>Profile theme</span>
                    <input
                      type="color"
                      value={draft.themeColor}
                      onChange={(event) => {
                        const themeColor = event.currentTarget.value;
                        updateDraft({ themeColor });
                        onThemeChange(themeColor);
                      }}
                    />
                  </label>
                </div>
                <div className={styles.imageFields}>
                  <label className={styles.field}>
                    <span>Profile picture URL</span>
                    <input type="text" value={draft.avatarUrl ?? ''} onChange={(event) => updateDraft({ avatarUrl: event.currentTarget.value || null })} placeholder="https://... or upload below" />
                    <span className={styles.uploadLabel}>Upload image <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void readImage(event, 'avatarUrl')} /></span>
                  </label>
                  <label className={styles.field}>
                    <span>Banner image URL</span>
                    <input type="text" value={draft.bannerUrl ?? ''} onChange={(event) => updateDraft({ bannerUrl: event.currentTarget.value || null })} placeholder="https://... or upload below" />
                    <span className={styles.uploadLabel}>Upload banner <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void readImage(event, 'bannerUrl')} /></span>
                  </label>
                </div>
              </section>

              <section className={styles.editorSection} aria-labelledby="details-heading">
                <div className={styles.sectionHeading}>
                  <div>
                    <p className={styles.eyebrow}>ABOUT YOU</p>
                    <h2 id="details-heading">Personal details</h2>
                  </div>
                </div>
                <label className={styles.field}>
                  <span>Bio</span>
                  <textarea maxLength={500} rows={3} value={draft.bio ?? ''} onChange={(event) => updateDraft({ bio: event.currentTarget.value || null })} />
                  <PrivacyToggle label="Show bio publicly" checked={draft.privacy.bio} onChange={(bio) => updateDraft({ privacy: { ...draft.privacy, bio } })} />
                </label>
                <label className={styles.field}>
                  <span>Location</span>
                  <input maxLength={80} value={draft.location ?? ''} onChange={(event) => updateDraft({ location: event.currentTarget.value || null })} placeholder="City or region" />
                  <PrivacyToggle label="Show location publicly" checked={draft.privacy.location} onChange={(location) => updateDraft({ privacy: { ...draft.privacy, location } })} />
                </label>
                <div className={styles.detailGrid}>
                  <label className={styles.field}>
                    <span>Age</span>
                    <input type="number" min="13" max="120" value={draft.age ?? ''} onChange={(event) => updateDraft({ age: event.currentTarget.value ? Number(event.currentTarget.value) : null })} />
                    <PrivacyToggle label="Show age publicly" checked={draft.privacy.age} onChange={(age) => updateDraft({ privacy: { ...draft.privacy, age } })} />
                  </label>
                  <label className={styles.field}>
                    <span>Star sign</span>
                    <select value={draft.starSign ?? ''} onChange={(event) => updateDraft({ starSign: event.currentTarget.value || null })}>
                      <option value="">Prefer not to say</option>
                      {starSigns.map((sign) => <option key={sign} value={sign}>{sign}</option>)}
                    </select>
                    <PrivacyToggle label="Show star sign publicly" checked={draft.privacy.starSign} onChange={(starSign) => updateDraft({ privacy: { ...draft.privacy, starSign } })} />
                  </label>
                </div>
                <label className={styles.field}>
                  <span>Belief or philosophy</span>
                  <input maxLength={120} value={draft.belief ?? ''} onChange={(event) => updateDraft({ belief: event.currentTarget.value || null })} placeholder="Optional" />
                  <PrivacyToggle label="Show belief publicly" checked={draft.privacy.belief} onChange={(belief) => updateDraft({ privacy: { ...draft.privacy, belief } })} />
                </label>
                <label className={styles.field}>
                  <span>Status</span>
                  <input maxLength={100} value={draft.statusMessage ?? ''} onChange={(event) => updateDraft({ statusMessage: event.currentTarget.value || null })} placeholder="A short note for your community" />
                </label>
              </section>

              {error && <p className={styles.error} role="alert">{error}</p>}
              <div className={styles.saveRow}>
                {saved && <span role="status">Profile saved</span>}
                <button className={styles.cancelButton} type="button" onClick={closeEditor} disabled={isSaving}>Cancel</button>
                <button className={styles.saveButton} type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save profile'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

interface PrivacyToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function PrivacyToggle({ label, checked, onChange }: PrivacyToggleProps) {
  return (
    <label className={styles.privacyToggle}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.currentTarget.checked)} />
      <span>{label}</span>
    </label>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Invalid file data.'));
    reader.onerror = () => reject(new Error('File read failed.'));
    reader.readAsDataURL(file);
  });
}
