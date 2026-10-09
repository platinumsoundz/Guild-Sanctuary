import type { SocialLinks } from '@/types/database';
import styles from './Profiles.module.css';

interface ProfileSocialLinksProps {
  links: SocialLinks;
}

const platforms: { key: keyof SocialLinks; label: string }[] = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'x', label: 'X / Twitter' },
  { key: 'youtube', label: 'YouTube' },
];

export function ProfileSocialLinks({ links }: ProfileSocialLinksProps) {
  const activeLinks = platforms.filter(({ key }) => links[key]);
  if (activeLinks.length === 0) return null;

  return (
    <nav className={styles.socialLinks} aria-label="Social links">
      {activeLinks.map(({ key, label }) => (
        <a key={key} href={links[key] ?? undefined} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      ))}
    </nav>
  );
}
