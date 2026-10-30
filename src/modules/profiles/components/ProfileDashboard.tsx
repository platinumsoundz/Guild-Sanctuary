'use client';

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { Post, Profile, WorldType } from '@/types/database';
import { normalizeSocialLinks, socialLinkFields } from '@/lib/socialLinks';
import { ProfileCard } from './ProfileCard';
import { SelfDiscoveryCentre } from '@/modules/self-discovery/components/SelfDiscoveryCentre';
import styles from './ProfileDashboard.module.css';
import { getSupabaseBrowserClient } from '@/services/supabase';

interface ProfileDashboardProps {
  profile: Profile;
  posts: Post[];
  isPostsLoading: boolean;
  onSave: (updates: Partial<Omit<Profile, 'id' | 'userId' | 'role'>>) => void | Promise<void>;
  onThemeChange: (themeColor: string) => void;
  worldType?: WorldType;
}

const starSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

export function ProfileDashboard({ profile, posts, isPostsLoading, onSave, onThemeChange, worldType = 'sanctuary' }: ProfileDashboardProps) {
  const [draft, setDraft] = useState(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasCustomAccentPicker, setHasCustomAccentPicker] = useState(false);
  const [isSavingAccent, setIsSavingAccent] = useState(false);
  const [accentError, setAccentError] = useState<string | null>(null);

  useEffect(() => setDraft(profile), [profile]);

  useEffect(() => {
    let cancelled = false;
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setHasCustomAccentPicker(false);
      return () => { cancelled = true; };
    }
    void (async () => {
      try {
        const { data, error: entitlementError } = await getSupabaseBrowserClient()
          .from('token_entitlements').select('item_id')
          .eq('user_id', profile.userId).eq('item_id', 'unlock_custom_accent_picker').maybeSingle();
        if (!cancelled) setHasCustomAccentPicker(!entitlementError && Boolean(data));
      } catch {
        if (!cancelled) setHasCustomAccentPicker(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile.userId]);

  const saveCustomAccent = async (color: string) => {
    setIsSavingAccent(true);
    setAccentError(null);
    try {
      const { data, error: rpcError } = await getSupabaseBrowserClient().rpc('set_profile_custom_accent', { requested_color: color || null });
      if (rpcError) throw rpcError;
      setDraft((current) => ({ ...current, customAccentColor: typeof data === 'string' ? data : null }));
    } catch (saveError) {
      setAccentError(saveError instanceof Error ? saveError.message : 'Your profile accent could not be updated.');
    } finally {
      setIsSavingAccent(false);
    }
  };

  const updateDraft = (changes: Partial<Profile>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setSaved(false);
  };

  const closeEditor = () => {
    setDraft(profile);
    onThemeChange(profile.themeColor);
    setError(null);
    setIsEditing(false);
  };

  const readImage = async (event: ChangeEvent<HTMLInputElement>, target: 'avatarUrl' | 'bannerUrl') => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
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
        username: draft.username.trim(),
        displayName: draft.displayName.trim(),
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
        visibility: draft.visibility,
        socialLinks: normalizeSocialLinks(draft.socialLinks),
      });
      setSaved(true);
      setIsEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Profile changes could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className={styles.dashboard} style={{ '--profile-color': draft.themeColor } as React.CSSProperties}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{worldType === 'guild' ? 'YOUR GUILD PROFILE' : 'YOUR SANCTUARY PROFILE'}</p>
          <span className="cosmic-badge">Your space, your style</span>
          <h1>Your profile</h1>
        </div>
        <div className={styles.profileActions}>
          {saved && !isEditing && <span role="status">Profile saved</span>}
          <button
            className={styles.editButton}
            type="button"
            onClick={() => {
              if (isEditing) closeEditor();
              else {
                setDraft(profile);
                setError(null);
                setIsEditing(true);
              }
            }}
          >
            {isEditing ? 'Cancel editing' : 'Edit profile'}
          </button>
        </div>
      </header>

      <section className={styles.showcase} aria-labelledby="showcase-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>YOUR CONTRIBUTIONS</p>
            <h2 id="showcase-heading">Your posts</h2>
          </div>
        </div>
        {isPostsLoading ? <p className={styles.emptyShowcase}>Loading your posts…</p> : posts.length === 0 ? (
          <p className={styles.emptyShowcase}>Your posts and shared media will appear here.</p>
        ) : (
          <div className={styles.showcaseGrid}>
            {posts.map((post) => (
              <article className={styles.showcaseItem} key={post.id}>
                <span className={styles.showcaseWorld}>{worldType === 'guild' ? 'GUILD' : 'SANCTUARY'}</span>
                <p>{post.content}</p>
                {post.mediaUrl && post.mediaType === 'image' && <img src={post.mediaUrl} alt="Media from your post" />}
                {post.mediaUrl && post.mediaType === 'audio' && <audio controls preload="none" src={post.mediaUrl}>Audio playback is not supported.</audio>}
                {post.mediaUrl && post.mediaType === 'video' && <video controls playsInline preload="metadata" src={post.mediaUrl}>Video playback is not supported.</video>}
                {post.storyTag && <span className={styles.storyTag}>{post.storyTag}</span>}
                <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString('en-GB')}</time>
              </article>
            ))}
          </div>
        )}
      </section>

      <ProfileCard profile={draft} />

      <SelfDiscoveryCentre worldType={worldType} />

      {isEditing && (
        <form className={`${styles.editor} grid w-full min-w-0`} onSubmit={(event) => void handleSave(event)}>
          <section className={styles.editorSection} aria-labelledby="appearance-heading">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>PERSONALIZE</p>
                <h2 id="appearance-heading">Profile details</h2>
              </div>
            </div>
            <div className={styles.accentPicker}>
              <div><strong>Custom profile accent</strong><p>{hasCustomAccentPicker ? 'Choose an accessible accent colour for your profile.' : 'Unlock the Custom Accent Picker in the Token Shop to personalise this colour.'}</p></div>
              {hasCustomAccentPicker ? (
                <select aria-label="Custom profile accent" value={draft.customAccentColor ?? ''} disabled={isSavingAccent} onChange={(event) => void saveCustomAccent(event.currentTarget.value)}>
                  <option value="">Use profile default</option>
                  <option value="#8b5cf6">Violet</option><option value="#ec4899">Rose</option><option value="#3b82f6">Blue</option><option value="#a855f7">Amethyst</option><option value="#db2777">Berry</option><option value="#0d9488">Teal</option><option value="#7c3aed">Purple</option><option value="#2563eb">Cobalt</option>
                </select>
              ) : <span className={styles.accentLocked}>Locked</span>}
              {accentError && <p className={styles.error} role="alert">{accentError}</p>}
            </div>
            <div className={styles.detailGrid}>
              <label className={styles.field}>
                <span>Display name</span>
                <input maxLength={50} value={draft.displayName} onChange={(event) => updateDraft({ displayName: event.currentTarget.value })} required />
              </label>
              <label className={styles.field}>
                <span>Username</span>
                <input minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" value={draft.username} onChange={(event) => updateDraft({ username: event.currentTarget.value })} required />
                <span className={styles.fieldHint}>3–24 letters, numbers, or underscores. Must be unique.</span>
              </label>
            </div>
            <label className={styles.themeControl}>
              <span>Profile theme</span>
              <input type="color" value={draft.themeColor} onChange={(event) => {
                const themeColor = event.currentTarget.value;
                updateDraft({ themeColor });
                onThemeChange(themeColor);
              }} />
            </label>
            <div className={styles.imageFields}>
              <label className={styles.field}>
                <span>Profile picture URL</span>
                <input type="url" value={draft.avatarUrl ?? ''} onChange={(event) => updateDraft({ avatarUrl: event.currentTarget.value || null })} placeholder="https://... or upload below" />
                <span className={styles.uploadLabel}>Upload image <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void readImage(event, 'avatarUrl')} /></span>
              </label>
              <label className={styles.field}>
                <span>Banner image URL</span>
                <input type="url" value={draft.bannerUrl ?? ''} onChange={(event) => updateDraft({ bannerUrl: event.currentTarget.value || null })} placeholder="https://... or upload below" />
                <span className={styles.uploadLabel}>Upload banner <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void readImage(event, 'bannerUrl')} /></span>
              </label>
            </div>
          </section>

          <section className={styles.editorSection} aria-labelledby="about-heading">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>ABOUT YOU</p>
                <h2 id="about-heading">About you</h2>
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
            <label className={styles.field}>
              <span>Profile visibility</span>
              <select value={draft.visibility} onChange={(event) => updateDraft({ visibility: event.currentTarget.value as Profile['visibility'] })}>
                <option value="public">Public — discoverable by the community</option>
                <option value="private">Private — hidden from discovery</option>
              </select>
            </label>
            <PrivacyToggle label="Allow direct messages" checked={draft.privacy.allowDirectMessages} onChange={(allowDirectMessages) => updateDraft({ privacy: { ...draft.privacy, allowDirectMessages } })} />
          </section>

          <section className={styles.editorSection} aria-labelledby="social-links-heading">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>CONNECT</p>
                <h2 id="social-links-heading">Social links</h2>
              </div>
            </div>
            <p className={styles.fieldHint}>Links are only public when you enable “Show social links publicly.” Only secure profiles from known services are accepted.</p>
            <div className={styles.imageFields}>
              {socialLinkFields.map(({ key, label, placeholder }) => (
                <label className={styles.field} key={key}>
                  <span>{label}</span>
                  <input
                    type="text"
                    maxLength={300}
                    autoComplete="url"
                    value={draft.socialLinks[key] ?? ''}
                    onChange={(event) => updateDraft({ socialLinks: { ...draft.socialLinks, [key]: event.currentTarget.value || null } })}
                    placeholder={placeholder}
                  />
                </label>
              ))}
            </div>
            <PrivacyToggle label="Show social links publicly" checked={draft.privacy.socialLinks} onChange={(socialLinks) => updateDraft({ privacy: { ...draft.privacy, socialLinks } })} />
          </section>

          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.saveRow}>
            <button className={styles.textButton} type="button" onClick={closeEditor}>Discard changes</button>
            <button className={styles.saveButton} type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save profile'}</button>
          </div>
        </form>
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
