'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { SocialLinks } from '@/types/database';
import {
  isGamertagKey,
  linkLabels,
  normalizeSocialLinks,
  type ProfileUpdate,
  type SettingsErrorHandler,
} from '../settingsData';
import styles from '../SettingsHub.module.css';

interface SocialLinksPanelProps {
  socialLinks: SocialLinks;
  onUpdateProfile: (updates: ProfileUpdate) => Promise<void>;
  onError: SettingsErrorHandler;
}

export function SocialLinksPanel({ socialLinks, onUpdateProfile, onError }: SocialLinksPanelProps) {
  const [linksDraft, setLinksDraft] = useState<SocialLinks>(socialLinks);

  useEffect(() => {
    setLinksDraft(socialLinks);
  }, [socialLinks]);

  const handleSocialLinks = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const normalized = normalizeSocialLinks(linksDraft);
      await onUpdateProfile({ socialLinks: normalized });
      setLinksDraft(normalized);
      onError(null);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Social links could not be saved.');
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="social-title">
      <h2 id="social-title">Social links</h2>
      <p className={styles.hint}>
        Use HTTPS profile links. Your links are only public when profile privacy allows them.
      </p>
      <form className={styles.linksForm} onSubmit={handleSocialLinks}>
        {linkLabels.map((item) => (
          <label className={styles.field} key={item.key}>
            <span>{item.label}</span>
            <input
              type="text"
              maxLength={300}
              autoComplete="url"
              value={linksDraft[item.key] ?? ''}
              onChange={(event) => setLinksDraft({
                ...linksDraft,
                [item.key]: event.currentTarget.value || null,
              })}
              placeholder={isGamertagKey(item.key)
                ? item.host
                : `https://${item.host}/your-profile`}
            />
          </label>
        ))}
        <button className={styles.primaryButton} type="submit">Save social links</button>
      </form>
    </section>
  );
}
