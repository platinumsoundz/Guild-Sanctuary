import type { Profile } from '@/types/database';
import { profileCosmeticMeta } from '@/modules/economy';
import styles from './Profiles.module.css';
import { ProfileSocialLinks } from './ProfileSocialLinks';

interface ProfileCardProps {
  profile: Profile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const frame = profile.equippedFrame ? profileCosmeticMeta[profile.equippedFrame] : undefined;
  const effect = profile.equippedEffect ? profileCosmeticMeta[profile.equippedEffect] : undefined;
  const badge = profile.equippedBadge ? profileCosmeticMeta[profile.equippedBadge] : undefined;
  const equippedBanner = profile.equippedBanner ? profileCosmeticMeta[profile.equippedBanner] : undefined;
  const bannerUrl = equippedBanner?.bannerUrl ?? profile.bannerUrl;

  return (
    <article className={styles.profileCard} style={{ borderColor: profile.themeColor }}>
      {bannerUrl ? <img className={styles.banner} src={bannerUrl} alt="" /> : (
        <div className={styles.bannerFallback} style={{ backgroundColor: `${profile.themeColor}20` }} />
      )}
      <div className={styles.profileIdentity}>
        <div
          className={styles.avatar}
          data-frame={frame?.effectKey}
          data-effect={effect?.effectKey}
          aria-hidden="true"
          style={frame ? undefined : { borderColor: profile.themeColor }}
        >
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : profile.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className={styles.profileDetails}>
          <p className={styles.eyebrow}>COMMUNITY PROFILE</p>
          <h1>
            {profile.displayName}
            {badge?.badgeText && <span className={styles.profileBadge} aria-label="Profile badge">{badge.badgeText}</span>}
          </h1>
          <p className={styles.username}>@{profile.username}</p>
          {frame?.label && <span className={styles.frameBadge}>{frame.label}</span>}
          <p className={styles.bio}>{profile.bio ?? 'No profile introduction yet.'}</p>
          <div className={styles.personalDetails}>
            {profile.location && <span>{profile.location}</span>}
            {profile.age && <span>{profile.age}</span>}
            {profile.starSign && <span>{profile.starSign}</span>}
            {profile.belief && <span>{profile.belief}</span>}
          </div>
          {profile.privacy.socialLinks && <ProfileSocialLinks links={profile.socialLinks} />}
        </div>
      </div>
      <span className={styles.role}>{profile.role}</span>
    </article>
  );
}
