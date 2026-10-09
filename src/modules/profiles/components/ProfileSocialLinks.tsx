import type { SocialLinks } from '@/types/database';
import styles from './Profiles.module.css';

interface ProfileSocialLinksProps {
  links: SocialLinks;
}

const platforms: { key: keyof SocialLinks; label: string }[] = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'x', label: 'X / Twitter' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'xbox', label: 'Xbox' },
  { key: 'playstation', label: 'PlayStation' },
  { key: 'steam', label: 'Steam' },
  { key: 'epicGames', label: 'Epic Games' },
  { key: 'reddit', label: 'Reddit' },
];

const profileUrl: Record<keyof SocialLinks, (value: string) => string> = {
  facebook: (value) => value,
  x: (value) => value,
  youtube: (value) => value,
  xbox: (value) => value.startsWith('https://') ? value : `https://xboxgamertag.com/search/${encodeURIComponent(value)}`,
  playstation: (value) => value.startsWith('https://') ? value : `https://psnprofiles.com/${encodeURIComponent(value)}`,
  steam: (value) => value.startsWith('https://') ? value : `https://steamcommunity.com/id/${encodeURIComponent(value)}`,
  epicGames: (value) => value.startsWith('https://') ? value : `https://www.epicgames.com/site/en-US/home`,
  reddit: (value) => value.startsWith('https://') ? value : `https://www.reddit.com/user/${encodeURIComponent(value.replace(/^u\//, ''))}`,
};

export function ProfileSocialLinks({ links }: ProfileSocialLinksProps) {
  const activeLinks = platforms.filter(({ key }) => links[key]);
  if (activeLinks.length === 0) return null;

  return (
    <nav className={styles.socialLinks} aria-label="Social links">
      {activeLinks.map(({ key, label }) => {
        const value = links[key] ?? '';
        const isUrl = value.startsWith('https://');
        return isUrl ? (
          <a key={key} href={profileUrl[key](value)} target="_blank" rel="noopener noreferrer">
            {label}
          </a>
        ) : (
          <span key={key} title={`${label}: ${value}`}>{label}: {value}</span>
        );
      })}
    </nav>
  );
}
